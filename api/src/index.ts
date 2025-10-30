import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/database";
import authRoutes from "./routes/auth";
import eventRoutes from "./routes/events";
import guestRouter from "./routes/guest"; 


dotenv.config();

// =======================
// IMPORTY BAZY I MODELI
// =======================
import { sequelize } from "./config/database";

import { User } from "./models/User";
import { UserSetting } from "./models/UserSetting";

import { Event } from "./models/Event";
import { EventSetting } from "./models/EventSetting";

import { Guest } from "./models/Guest";
import { Task } from "./models/Task";
import { Notification } from "./models/Notification";

import { Budget } from "./models/Budget";
import { Expense } from "./models/Expense";
import { Vendor } from "./models/Vendor";

import { Document } from "./models/Document";
import { Inspiration } from "./models/Inspiration";
import { WeddingDaySchedule } from "./models/WeddingDaySchedule";
import { File } from "./models/File";
import { SyncLog } from "./models/SyncLog";

import { applyAssociations } from "./models/Associations";

// =======================
// RELACJE MODELI
// =======================
applyAssociations();

// =======================
// INICJALIZACJA BAZY
// =======================
async function initDB() {
  try {
    await sequelize.authenticate();
    console.log("✅ Połączono z bazą danych!");

    await sequelize.sync({ alter: true });
    console.log("✅ Baza danych zsynchronizowana");
  } catch (err) {
    console.error("❌ Błąd przy inicjalizacji bazy:", err);
  }
}

initDB();

// =======================
// KONFIGURACJA SERWERA
// =======================
const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// =======================
// TEST API
// =======================
app.get("/", (_, res) => res.send("✅ API działa!"));

// =======================
// Endpointy
// =======================
app.use("/auth", authRoutes);
app.use("/events", eventRoutes);
app.use("/guests", guestRouter);

// =======================
// START SERWERA
// =======================
app.listen(PORT, () => {
  console.log(`🚀 Serwer działa na http://localhost:${PORT}`);
});


app.use(cors({ origin: "http://localhost:5173", credentials: true }));
