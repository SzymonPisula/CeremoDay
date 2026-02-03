// CeremoDay/api/src/scripts/seedRuralVenues.ts
import fs from "fs";
import path from "path";
import { sequelize } from "../config/database";

type CountRow = { cnt: number | string };

function toInt(value: unknown, fallback = 0) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Dzieli SQL na statementy po średniku,
 * ale tylko wtedy, gdy NIE jesteśmy w środku stringa (', ", `).
 */
function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];

  let buf = "";
  let inSingle = false;
  let inDouble = false;
  let inBacktick = false;
  let prev = "";

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];

    // togglowanie trybów stringów (ignorujemy escapowane znaki)
    if (ch === "'" && !inDouble && !inBacktick && prev !== "\\") inSingle = !inSingle;
    if (ch === `"` && !inSingle && !inBacktick && prev !== "\\") inDouble = !inDouble;
    if (ch === "`" && !inSingle && !inDouble && prev !== "\\") inBacktick = !inBacktick;

    // separator statementów
    if (ch === ";" && !inSingle && !inDouble && !inBacktick) {
      const stmt = buf.trim();
      if (stmt) statements.push(stmt);
      buf = "";
      prev = ch;
      continue;
    }

    buf += ch;
    prev = ch;
  }

  const last = buf.trim();
  if (last) statements.push(last);

  return statements;
}

function pickSqlFile(): string | null {
  // dist/scripts -> dist/data
  const candidates = [
    path.resolve(__dirname, "..", "..", "data", "rural_venues.sql"), // /app/dist/data/rural_venues.sql
    path.resolve(__dirname, "..", "..", "..", "src", "data", "rural_venues.sql"), // fallback dla uruchomień TS (czasem)
    path.resolve(process.cwd(), "dist", "data", "rural_venues.sql"),
    path.resolve(process.cwd(), "src", "data", "rural_venues.sql"),
    path.resolve(process.cwd(), "data", "rural_venues.sql"),
  ];

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

export async function seedRuralVenuesIfEmpty() {
  const [rows] = await sequelize.query("SELECT COUNT(*) as cnt FROM rural_venues");
  const first = Array.isArray(rows) ? (rows as CountRow[])[0] : undefined;
  const cnt = toInt(first?.cnt, 0);

  if (cnt > 0) return;

  console.log("🌱 Seed rural_venues — import danych początkowych");

  const sqlPath = pickSqlFile();
  if (!sqlPath) {
    console.warn("⚠️ Seed rural_venues pominięty — brak pliku rural_venues.sql (sprawdź /dist/data lub /src/data)");
    return; // nie wywalaj kontenera
  }

  try {
    // usuń BOM jeśli jest (czasem psuje parser)
    let sql = fs.readFileSync(sqlPath, "utf-8");
    sql = sql.replace(/^\uFEFF/, "");

    const statements = splitSqlStatements(sql);

    // filtrujemy rzeczy, które nie są potrzebne / mogą robić konflikt:
    // - START TRANSACTION / COMMIT (my robimy transakcję Sequelize)
    // - ALTER TABLE ... ADD PRIMARY KEY (PK powinien być już w modelu/migracjach)
    const runnable = statements.filter((s) => {
      const x = s.trim().replace(/\s+/g, " ").toUpperCase();

      if (!x) return false;
      if (x.startsWith("START TRANSACTION")) return false;
      if (x === "COMMIT") return false;
      if (x.startsWith("ALTER TABLE")) return false;

      return true;
    });

    if (runnable.length === 0) {
      console.warn(`⚠️ Seed rural_venues pominięty — brak wykonywalnych statementów w: ${sqlPath}`);
      return;
    }

    // Wykonujemy w jednej transakcji
    const t = await sequelize.transaction();
    try {
      for (let i = 0; i < runnable.length; i++) {
        const stmt = runnable[i];

        // mały log, żeby było wiadomo na czym jesteśmy (przy debug)
        const head = stmt.trim().slice(0, 60).replace(/\s+/g, " ");
        console.log(`   ↪️ SQL #${i + 1}/${runnable.length}: ${head}${stmt.length > 60 ? "..." : ""}`);

        await sequelize.query(stmt, { transaction: t });
      }

      await t.commit();
      console.log("✅ Seed rural_venues — zakończony");
    } catch (e) {
      await t.rollback();
      throw e;
    }
  } catch (e) {
    console.warn(`⚠️ Seed rural_venues pominięty — błąd podczas seeda:`, e);
    return; // nie wywalaj kontenera
  }
}
