// CeremoDay/api/src/config/database.ts
import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config();


const DB_NAME = process.env.DB_NAME || "ceremo_day";
const DB_USER = process.env.DB_USER || "root";
const DB_PASSWORD = process.env.DB_PASSWORD ?? process.env.DB_PASS ?? "";
const DB_HOST = process.env.DB_HOST || "localhost";

// Opcjonalnie port, jeśli kiedyś zechcesz inaczej niż 3306
const DB_PORT = Number(process.env.DB_PORT || 3306);

export const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: "mysql",
  logging: false,
});

export async function connectDB(): Promise<void> {
  try {
    await sequelize.authenticate();
    console.log("✅ Połączono z bazą danych!");
  } catch (error) {
    console.error("❌ Błąd połączenia z bazą:", error);
    throw error; // ważne: w docker/prod lepiej przerwać start niż działać "pół-żywy"
  }
}
