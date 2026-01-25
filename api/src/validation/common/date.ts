import { z } from "zod";

export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
  message: "Data musi być w formacie YYYY-MM-DD",
});

export const isoTime = z.string().regex(/^\d{2}:\d{2}$/, {
  message: "Czas musi być w formacie HH:mm",
});