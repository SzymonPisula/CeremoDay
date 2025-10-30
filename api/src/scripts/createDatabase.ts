import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

async function createDB() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || "localhost",
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASS || "",
    });

    await connection.query(
      `CREATE DATABASE IF NOT EXISTS ceremo_day CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;`
    );

    console.log("✅ Baza danych utworzona / istnieje");
    await connection.end();
  } catch (err) {
    console.error("❌ Błąd przy tworzeniu bazy danych:", err);
  }
}

createDB();
