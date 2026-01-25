// CeremoDay/api/src/validation/task.schema.ts
import { z } from "zod";
import { normalizeString } from "./common/normalize";
import { isoDate } from "./common/date";

export const taskStatusValues = ["todo", "in_progress", "done"] as const;

/**
 * Problem:
 * - .transform() => ZodEffects => nie można potem .min/.max
 * - normalizeString u Ciebie zwraca string | null, więc trzeba "domknąć" do stringa
 *
 * Rozwiązanie:
 * - .min/.max przed transformacją
 * - transform zwraca zawsze string
 * - dla optional/nullable transform warunkowy
 */

export const taskCreateSchema = z.object({
  title: z
    .string()
    .min(3, "Nazwa zadania jest za krótka (min 3 znaki)")
    .max(120, "Nazwa zadania jest za długa (max 120 znaków)")
    .transform((v) => normalizeString(v) ?? ""),

  description: z
    .string()
    .max(1500, "Opis jest za długi (max 1500 znaków)")
    .optional()
    .nullable()
    .transform((v) => (v == null ? v : normalizeString(v) ?? "")),

  status: z.enum(taskStatusValues, { message: "Nieprawidłowy status zadania" }),

  category: z
    .string()
    .max(60, "Kategoria jest za długa")
    .optional()
    .nullable()
    .transform((v) => (v == null ? v : normalizeString(v) ?? "")),

  due_date: isoDate.optional().nullable(),
});

export const taskUpdateSchema = taskCreateSchema.partial();
