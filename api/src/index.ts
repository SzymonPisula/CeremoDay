import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import { errorHandler } from "./middleware/errorHandler";
import authRoutes from "./routes/auth";
import eventRoutes from "./routes/events";
import guestRouter from "./routes/guest"; 
import documentsRouter from './routes/documents'; 
import googlePlacesRouter from "./routes/googlePlaces";
import inspirationsRouter from "./routes/inspirations";
import tasksRouter from "./routes/tasks";
import vendorsRuralRouter from "./routes/vendorsRural";
import "./models/RuralVenue";
import "./models/Vendor";
import vendorsRouter from "./routes/vendors";
import financeRoutes from "./routes/finance";
import reportsRouter from "./routes/reports";
import interviewRoutes from "./routes/interview";
import usersRoutes from "./routes/users";
import generateRouter from "./routes/generate";
import notificationsRouter from "./routes/notifications";
import adminRouter from "./routes/admin";

import { sequelize } from "./config/database";
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
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());

// =======================
// TEST API
// =======================
app.get("/", (_, res) => res.send("✅ API działa!"));

// =======================
// Endpointy
// =======================
app.use("/auth", authRoutes);
app.use("/users", usersRoutes);
app.use("/events", eventRoutes);
app.use("/guests", guestRouter);
app.use("/documents", documentsRouter);
app.use("/tasks", tasksRouter);
app.use("/vendors/rural", vendorsRuralRouter);
app.use("/vendors", vendorsRouter);
app.use("/finance", financeRoutes);
app.use("/reports", reportsRouter);
app.use("/interview", interviewRoutes);
app.use("/admin", adminRouter);

app.use("/uploads", express.static("uploads"));
app.use("/api/google", googlePlacesRouter);
app.use("/inspirations", inspirationsRouter);


// =======================
// GENEROWANIE ZADAŃ
// =======================
app.use(generateRouter);
app.use(notificationsRouter);



// =======================
// START SERWERA
// =======================
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Serwer działa na http://localhost:${PORT}`);
});



