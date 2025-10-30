// src/config/database.ts
import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config();

export const sequelize = new Sequelize(
  process.env.DB_NAME || "ceremo_day",
  process.env.DB_USER || "root",
  process.env.DB_PASS || "",
  {
    host: process.env.DB_HOST || "localhost",
    dialect: "mysql",
    logging: false,
  }
);

export async function connectDB(): Promise<void> {
  try {
    await sequelize.authenticate();
    console.log("✅ Połączono z bazą danych!");
  } catch (error) {
    console.error("❌ Błąd połączenia z bazą:", error);
  }
}
