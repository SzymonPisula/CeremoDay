import express from "express";
import cors from "cors";

import { errorHandler } from "./middleware/errorHandler";

import authRoutes from "./routes/auth";
import usersRoutes from "./routes/users";
import eventRoutes from "./routes/events";
import guestRouter from "./routes/guest";
import documentsRouter from "./routes/documents";
import tasksRouter from "./routes/tasks";
import vendorsRuralRouter from "./routes/vendorsRural";
import vendorsRouter from "./routes/vendors";
import financeRoutes from "./routes/finance";
import reportsRouter from "./routes/reports";
import interviewRoutes from "./routes/interview";
import adminRouter from "./routes/admin";
import googlePlacesRouter from "./routes/googlePlaces";
import inspirationsRouter from "./routes/inspirations";
import generateRouter from "./routes/generate";
import notificationsRouter from "./routes/notifications";

function parseCorsOrigins(value: string | undefined): (string | RegExp)[] {
  if (!value) return ["http://localhost"];
  const trimmed = value.trim();
  if (trimmed === "*") return [/^.*$/];
  return trimmed
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function createApp() {
  const app = express();

  const allowed = parseCorsOrigins(process.env.CORS_ORIGIN);

  app.use(
    cors({
      origin: (origin, cb) => {
        // zapytania bez Origin (np. curl) dopuszczamy
        if (!origin) return cb(null, true);

        const ok = allowed.some((o) =>
          typeof o === "string" ? o === origin : o.test(origin)
        );

        return ok ? cb(null, true) : cb(new Error("CORS blocked"), false);
      },
      credentials: true,
    })
  );

  app.use(express.json());

  app.get("/", (_, res) => res.send("✅ API działa!"));

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

  app.use(generateRouter);
  app.use(notificationsRouter);

  app.use(errorHandler);

  return app;
}
