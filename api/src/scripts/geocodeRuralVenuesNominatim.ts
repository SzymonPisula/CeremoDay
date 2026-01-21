// CeremoDay/api/src/scripts/geocodeRuralVenuesNominatim.ts
import "dotenv/config";
import axios from "axios";
import { sequelize } from "../config/database";
import RuralVenue from "../models/RuralVenue";

const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org/search";

// bardzo ważne – Nominatim wymaga sensownego User-Agent
const USER_AGENT = "CeremoDay/1.0 (kontakt@twojadomena.pl)";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Lekka normalizacja adresu:
 * - czyścimy wielokrotne spacje
 * - poprawiamy oczywiste literówki
 * - zdejmujemy duplikujące się fragmenty "XX-XXX Miejscowość, XX-XXX Miejscowość"
 */
function normalizeAddress(raw: string): string {
  let out = (raw ?? "").trim();

  // spłaszczamy spacje
  out = out.replace(/\s+/g, " ");

  // poprawki literówek / dziwnych zapisów
  out = out
    .replace(/Zaggórz|Zagórrz|Zafgórz/gi, "Zagórz")
    .replace(/Buukowsko/gi, "Bukowsko")
    .replace(/Rzepdź/gi, "Rzepedź")
    .replace(/Polskaa/gi, "Polska");

  // zdublowane "XX-XXX Miejscowość, XX-XXX Miejscowość"
  out = out.replace(
    /(\d{2}-\d{3}\s+[A-Za-zĄĆĘŁŃÓŚŹŻąąćęłńóśźż]+),\s*\1/gi,
    "$1"
  );

  return out.trim();
}

/**
 * Wyciąga nazwę miejscowości z segmentu "Miejscowość 123" itp.
 * Przykład: "Średnie Wielkie 66" → "Średnie Wielkie"
 */
function extractLocalityFromAddress(address: string): string | null {
  const parts = address.split(",");
  for (const p of parts) {
    const trimmed = p.trim();
    const m = trimmed.match(/^([A-Za-zĄĆĘŁŃÓŚŹŻąąćęłńóśźż\s\-]+)\s+\d+[A-Za-z]?$/);
    if (m) {
      return m[1].trim();
    }
  }
  return null;
}

/**
 * Prosty filtr geograficzny – akceptujemy tylko wyniki
 * mniej więcej w okolicy Podkarpacia (Sanok / Domaradz / Besko itd.).
 *
 * Współrzędne przybliżone:
 *  lat: 49.0 – 50.5
 *  lng: 21.0 – 23.5
 */
function isWithinExpectedBBox(lat: number, lng: number): boolean {
  if (Number.isNaN(lat) || Number.isNaN(lng)) return false;
  return lat >= 49.0 && lat <= 50.5 && lng >= 21.0 && lng <= 23.5;
}

async function geocodeWithQuery(query: string) {
  console.log(`   🔍 Próba z zapytaniem: "${query}"`);

  const url = `${NOMINATIM_BASE_URL}?format=json&limit=1&q=${encodeURIComponent(
    query
  )}`;

  const response = await axios.get(url, {
    headers: {
      "User-Agent": USER_AGENT,
    },
    timeout: 10000,
  });

  const data = response.data as Array<{
    lat: string;
    lon: string;
    display_name: string;
  }>;

  if (!Array.isArray(data) || data.length === 0) {
    console.log("   ⚠️ Brak wyników dla tego wariantu.");
    return null;
  }

  const first = data[0];
  const lat = Number(first.lat);
  const lng = Number(first.lon);

  if (!isWithinExpectedBBox(lat, lng)) {
    console.warn(
      `   ⚠️ Wynik poza oczekiwanym regionem (lat=${lat.toFixed(
        6
      )}, lng=${lng.toFixed(6)}), odrzucam.`
    );
    return null;
  }

  console.log(
    `   ✅ Trafiony wariant: "${query}" → lat=${lat.toFixed(
      6
    )}, lng=${lng.toFixed(6)}`
  );

  return { lat, lng };
}

async function geocodeOne(venue: RuralVenue): Promise<{ lat: number; lng: number } | null> {
  const name = (venue.name ?? "").trim();
  const rawAddress = (venue.address ?? "").trim();
  const county = (venue.county ?? "").trim();
  const communeOffice = (venue.commune_office ?? "")
    .replace(/^Urząd\s+Gminy\s*/i, "")
    .trim(); // usuwamy "Urząd Gminy"

  if (!rawAddress && !name) {
    console.warn(`⚠️ Brak danych adresowych/nazwy dla obiektu ID=${venue.id}, pomijam.`);
    return null;
  }

  const normalizedAddress = normalizeAddress(rawAddress);

  console.log(
    `➡️ Geokoduję ID=${venue.id} (nazwa: "${name}", adres raw: "${rawAddress}")`
  );
  if (normalizedAddress !== rawAddress) {
    console.log(`   ✨ Adres po normalizacji: "${normalizedAddress}"`);
  }

  const queries: string[] = [];

  // Spróbujmy oderwać nazwę obiektu od reszty adresu:
  // np. "Świetlica Wiejska w Olchowej, Olchowa 22, 38-516 ..." → "Olchowa 22, 38-516 ..."
  let addressWithoutPlaceName = normalizedAddress;
  const commaIndex = normalizedAddress.indexOf(",");
  if (commaIndex !== -1) {
    addressWithoutPlaceName = normalizedAddress.slice(commaIndex + 1).trim();
  }

  const locality = extractLocalityFromAddress(normalizedAddress);

  // 1) goły adres (bez nazwy obiektu) – najprostsza forma
  if (addressWithoutPlaceName) {
    queries.push(`${addressWithoutPlaceName}`);
    if (county) {
      queries.push(`${addressWithoutPlaceName}, powiat ${county}`);
      queries.push(`${addressWithoutPlaceName}, powiat ${county}, województwo podkarpackie`);
    }
  }

  // 2) pełny znormalizowany adres + powiat / województwo
  if (normalizedAddress) {
    if (county) {
      queries.push(`${normalizedAddress}, powiat ${county}`);
      queries.push(`${normalizedAddress}, powiat ${county}, województwo podkarpackie`);
    }
    queries.push(`${normalizedAddress}, Polska`);
  }

  // 3) sama nazwa obiektu + powiat / gmina / Polska (to już miałeś, ale zostawiamy)
  if (name) {
    if (county) {
      queries.push(`${name}, powiat ${county}, Polska`);
    }
    if (communeOffice) {
      queries.push(`${name}, ${communeOffice}, Polska`);
      queries.push(`${name}, gmina ${communeOffice}, Polska`);
    }
    queries.push(`${name}, Polska`);
  }

  // 4) fallback na samą miejscowość – bez numeru domu
  if (locality) {
    if (county) {
      queries.push(`${locality}, powiat ${county}, Polska`);
      queries.push(`${locality}, powiat ${county}, województwo podkarpackie`);
    }
    if (communeOffice) {
      queries.push(`${locality}, gmina ${communeOffice}, Polska`);
    }
    queries.push(`${locality}, Polska`);
  }

  // Ostateczny fallback: jeżeli jakimś cudem wszystko pustka
  if (queries.length === 0) {
    console.warn(
      `⚠️ Nie udało się zbudować sensownych zapytań dla obiektu ID=${venue.id}, pomijam.`
    );
    return null;
  }

  // Usuwamy duplikaty, żeby nie walić w Nominatim tym samym tekstem
  const uniqueQueries = Array.from(new Set(queries));

  for (const q of uniqueQueries) {
    try {
      const result = await geocodeWithQuery(q);
      if (result) {
        return result;
      }

      await sleep(900);
    } catch (err) {
      console.error(`   ❌ Błąd przy zapytaniu "${q}":`, err);
    }
  }

  console.warn(`⚠️ Żaden wariant nie zadziałał dla obiektu ID=${venue.id}`);
  return null;
}

async function main() {
  console.log("🚀 Start geokodowania sal gminnych...");

  try {
    await sequelize.authenticate();
    console.log("✅ Połączono z bazą danych.");

    const venues = await RuralVenue.findAll({
      where: {
        lat: null,
      },
    });

    console.log(`🔎 Do geokodowania: ${venues.length} obiektów.`);

    let success = 0;
    let fail = 0;

    for (const venue of venues) {
      const result = await geocodeOne(venue);

      if (result) {
        venue.lat = result.lat;
        venue.lng = result.lng;
        await venue.save();
        success += 1;
      } else {
        fail += 1;
      }

      // minimalnie >1s per obiekt 
      await sleep(1200);
    }

    console.log("🏁 Zakończono geokodowanie.");
    console.log(`   ✅ Sukcesy: ${success}`);
    console.log(`   ❌ Błędy:   ${fail}`);
  } catch (err) {
    console.error("❌ Błąd w trakcie geokodowania:", err);
  } finally {
    await sequelize.close();
    console.log("🔌 Zamknięto połączenie z bazą.");
  }
}

void main();
