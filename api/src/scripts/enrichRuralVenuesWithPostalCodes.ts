// CeremoDay/api/src/scripts/enrichRuralVenuesWithPostalCodes.ts
import "dotenv/config";
import path from "path";
import * as XLSX from "xlsx";
import { sequelize } from "../config/database";
import RuralVenue from "../models/RuralVenue";

/**
 * Prosty typ reprezentujący wiersz z XLSX
 * (kod, województwo, powiat, miejscowość, uwagi)
 */
interface PostalRow {
  postal_code: string;
  voivodeship: string;
  county: string;
  place: string;
  note?: string | null;
}

/**
 * Normalizacja nazw (żeby "Zagórz" i "zagorz" dało się dopasować).
 */
function normalizeName(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    // uproszczona zamiana polskich znaków
    .replace(/ą/g, "a")
    .replace(/ć/g, "c")
    .replace(/ę/g, "e")
    .replace(/ł/g, "l")
    .replace(/ń/g, "n")
    .replace(/ó/g, "o")
    .replace(/ś/g, "s")
    .replace(/ż/g, "z")
    .replace(/ź/g, "z");
}

/**
 * Wyciąga nazwę gminy z pola "commune_office", np.:
 * "Urząd Gminy Zagórz" → "Zagórz"
 * "Urząd Gminy i Miasta Domaradz" → "Domaradz"
 */
function extractCommuneName(communeOffice: string): string {
  if (!communeOffice) return "";

  let value = communeOffice.trim();

  // kilka typowych prefixów
  const patterns = [
    /^urząd gminy i miasta\s+/i,
    /^urząd miasta i gminy\s+/i,
    /^urząd gminy\s+/i,
    /^urząd miasta\s+/i,
  ];

  for (const p of patterns) {
    value = value.replace(p, "");
  }

  return value.trim();
}

/**
 * Wczytanie Excela z listą kodów pocztowych.
 * Uwaga: plik NIE ma nagłówka, więc używamy header: 1 i indeksów kolumn.
 *
 *  kolumna 0 – kod pocztowy (np. "38-516")
 *  kolumna 1 – województwo (np. "podkarpackie")
 *  kolumna 2 – powiat (np. "sanocki")
 *  kolumna 3 – miejscowość (np. "Zagórz")
 *  kolumna 4 – uwagi (opcjonalnie)
 */
function loadPostalCodes(): Map<string, string[]> {
  const filePath = path.resolve(
    __dirname,
    "../data/Lista_kodow_pocztowych_podkarpackie.xlsx"
  );

  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // header: 1 → dostajemy tablicę tablic [kod, województwo, powiat, miejscowość, uwagi]
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: false,
  });

  const map = new Map<string, string[]>();
  let count = 0;

  for (const row of rows) {
    if (!row || row.length < 4) continue;

    const postal_code = String(row[0] ?? "").trim();
    const voivodeship = String(row[1] ?? "").trim();
    const county = String(row[2] ?? "").trim();
    const place = String(row[3] ?? "").trim();
    const note = row[4] ? String(row[4]) : null;

    if (!postal_code || !place) continue;
    if (
      voivodeship.toLowerCase() !== "podkarpackie" &&
      voivodeship.toLowerCase() !== "woj. podkarpackie"
    ) {
      continue;
    }

    const key = normalizeName(place);
    const existing = map.get(key) ?? [];

    existing.push(postal_code);
    map.set(key, existing);
    count++;
  }

  console.log(`📦 Wczytano ${count} rekordów z kodami pocztowymi (po filtrach).`);

  return map;
}

/**
 * Dla gminy (np. "Zagórz") wybierz "główny" kod pocztowy.
 * Na razie: pierwszy na liście, ale jeśli chcesz, możesz brać
 * najniższy liczbowo.
 */
function pickMainPostalCode(codes: string[]): string {
  if (!codes || codes.length === 0) return "";
  // ewentualnie można posortować:
  // return [...codes].sort()[0];
  return codes[0];
}

async function main() {
  console.log("🚀 Start normalizacji adresów sal gminnych (UPROSZCZONA WERSJA)...");

  try {
    await sequelize.authenticate();
    console.log("✅ Połączono z bazą.");

    const postalMap = loadPostalCodes();

    const venues = await RuralVenue.findAll();
    console.log(`🔎 Liczba sal w bazie: ${venues.length}`);

    let updatedCount = 0;

    for (const venue of venues) {
      const communeRaw = venue.commune_office || "";
      const communeName = extractCommuneName(communeRaw);

      console.log("───────────────");
      console.log(`ID: ${venue.id}`);
      console.log(`  Nazwa:        ${venue.name}`);
      console.log(`  Gmina (raw):  ${communeRaw}`);

      if (!communeName) {
        console.log("  ⚠️  Nie udało się wyciągnąć nazwy gminy z pola 'commune_office'.");
        continue;
      }

      const key = normalizeName(communeName);
      const codes = postalMap.get(key);

      if (!codes || codes.length === 0) {
        console.log(
          `  ⚠️  Nie znaleziono kodu pocztowego dla gminy: "${communeName}"`
        );
        continue;
      }

      const mainCode = pickMainPostalCode(codes);

      // UPROSZCZONY WZÓR ADRESU:
      //   [Nazwa obiektu], [adres z bazy], [kod] [gmina], Polska
      //
      // Przykład:
      //   "Dom Kultury w Czaszynie, Czaszyn 37, 38-516 Zagórz, Polska"
      const parts: string[] = [];

      if (venue.name) {
        parts.push(venue.name.trim());
      }

      if (venue.address) {
        parts.push(venue.address.trim());
      }

      parts.push(`${mainCode} ${communeName}`);

      const canonicalAddress = parts.join(", ") + ", Polska";

      console.log(`  Kod pocztowy: ${mainCode}`);
      console.log(`  Adres oryg.:  ${venue.address}`);
      console.log(`  Adres NOWY:   ${canonicalAddress}`);

      // Zapis do bazy – nadpisujemy address uproszczonym formatem
      venue.address = canonicalAddress;
      await venue.save();

      updatedCount++;
    }

    console.log("🏁 Koniec.");
    console.log(`   🔧 Zaktualizowanych rekordów: ${updatedCount}`);
  } catch (err) {
    console.error(
      "[ERROR] Normalizacja adresów nie powiodła się:",
      err
    );
  } finally {
    await sequelize.close();
    console.log("🔌 Zamknięto połączenie z bazą.");
  }
}

void main();
