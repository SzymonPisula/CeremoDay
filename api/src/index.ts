// CeremoDay/api/src/index.ts
import dotenv from "dotenv";
dotenv.config();

import { sequelize } from "./config/database";
import { applyAssociations } from "./models/Associations";
import { createApp } from "./app";
import { seedRuralVenuesIfEmpty } from "./scripts/seedRuralVenues";

// Side-effect imports modeli (ważne dla sequelize.sync)
import "./models/RuralVenue";
import "./models/Vendor";

// =======================
// RELACJE MODELI
// =======================
applyAssociations();

async function initDB() {
  await sequelize.authenticate();
  console.log("✅ Połączono z bazą danych!");

  const shouldSync = (process.env.RUN_DB_SYNC ?? "true") === "true";
  if (shouldSync) {
    await sequelize.sync({ alter: true });
    console.log("✅ Baza danych zsynchronizowana");
  }

  // seed dopiero po sync (żeby tabela istniała)
  await seedRuralVenuesIfEmpty();
}

async function bootstrap() {
  try {
    await initDB();
  } catch (err) {
    console.error("❌ Błąd przy inicjalizacji bazy:", err);
    process.exit(1);
  }

  const app = createApp();
  const PORT = Number(process.env.PORT || 4000);

  app.listen(PORT, () => {
    console.log(`🚀 Serwer działa na http://localhost:${PORT}`);
  });
}

void bootstrap();
