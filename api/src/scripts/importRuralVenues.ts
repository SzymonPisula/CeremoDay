// CeremoDay/api/src/scripts/importRuralVenues.ts
import "dotenv/config";
import path from "path";
import * as XLSX from "xlsx";
import { sequelize } from "../config/database";
import RuralVenue from "../models/RuralVenue";

async function main() {
  try {
    console.log("🔄 Łączenie z bazą...");
    await sequelize.authenticate();
    console.log("✅ Połączono z bazą");

    // Upewniamy się, że tabela istnieje
    await sequelize.sync();

    const filePath = path.join(
      __dirname,
      "..",
      "data",
      "Baza_danych_obiektów_gminnnych.xlsx"
    );

    console.log("📂 Wczytywanie pliku:", filePath);

    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const rows = XLSX.utils.sheet_to_json<any>(sheet, {
      defval: null,
    });

    console.log(`📊 Znaleziono wierszy: ${rows.length}`);

    let count = 0;

    for (const row of rows) {
      // Mapowanie kolumn z Excela na nasze pola
      const communeOffice = row["Urząd Gminy"] ?? "";
      const name = row["Nazwa obiektu"] ?? "";
      const address = row["Dokładna lokalizacja"] ?? "";
      const type = row["Typ obiektu"] ?? null;

      const usableAreaRaw = row["Powierzchnia użytkowa"];
      const usableArea =
        usableAreaRaw !== null && usableAreaRaw !== undefined
          ? String(usableAreaRaw)
          : null;

      const maxParticipantsRaw =
        row["Maksymalna liczba uczestników"];
      let maxParticipants: number | null = null;
      if (typeof maxParticipantsRaw === "number") {
        maxParticipants = maxParticipantsRaw;
      } else if (
        typeof maxParticipantsRaw === "string" &&
        maxParticipantsRaw.trim() !== ""
      ) {
        const parsed = parseInt(maxParticipantsRaw, 10);
        maxParticipants = Number.isNaN(parsed) ? null : parsed;
      }

      const equipment = row["Wyposażenie"] ?? null;
      const rentalInfo =
        row["Informacje dotyczące możliwości wynajmu"] ?? null;
      const pricing = row["Obowiązujące stawki"] ?? null;
      const county = row["Powiat"] ?? null;
      const notes = row["Notatki"] ?? null;

      if (!name || !address) {
        console.log(
          "⚠️ Pominięto wiersz bez nazwy/adresu:",
          row
        );
        continue;
      }

      await RuralVenue.create({
        commune_office: communeOffice,
        name,
        address,
        type,
        usable_area: usableArea,
        max_participants: maxParticipants,
        equipment,
        rental_info: rentalInfo,
        pricing,
        county,
        notes,
        lat: null,
        lng: null,
      });

      count += 1;
    }

    console.log(`✅ Zaimportowano obiektów: ${count}`);
  } catch (err) {
    console.error("❌ Błąd importu sal gminnych:", err);
  } finally {
    await sequelize.close();
    console.log("🔌 Zamknięto połączenie z bazą");
  }
}

void main();
