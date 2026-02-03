// CeremoDay/api/src/scripts/seedRuralVenues.ts
import fs from "fs";
import path from "path";
import { sequelize } from "../config/database";

export async function seedRuralVenuesIfEmpty() {
  const [rows] = await sequelize.query("SELECT COUNT(*) as cnt FROM rural_venues");
  const cnt = Array.isArray(rows) ? (rows as any)[0]?.cnt : 0;
  if (Number(cnt) > 0) return;

  console.log("🌱 Seed rural_venues — import danych początkowych");

  // dist/scripts -> (.. ..) -> /app
  const sqlPath = path.resolve(__dirname, "..", "..", "data", "rural_venues.sql");

  if (!fs.existsSync(sqlPath)) {
    console.warn(`⚠️ Seed rural_venues pominięty — brak pliku: ${sqlPath}`);
    return; // nie wywalaj kontenera
  }

  const sql = fs.readFileSync(sqlPath, "utf-8");
  await sequelize.query(sql);

  console.log("✅ Seed rural_venues — zakończony");
}
