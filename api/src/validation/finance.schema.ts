// CeremoDay/api/src/validation/finance.schema.ts
import { z } from "zod";
import { money } from "./common/number";
import { isoDate } from "./common/date";
import { normalizeString } from "./common/normalize";

export const expenseStatusValues = ["planned", "in_progress", "paid"] as const;

/**
 * Problem: .transform() zwraca ZodEffects -> nie można potem .min/.max
 * Rozwiązanie: walidacje .min/.max robimy przed transformacją.
 * Dla optional/nullable transform robimy warunkowo (null/undefined zostają).
 */

export const budgetSchema = z.object({
  initial_budget: money.optional().nullable(),
  currency: z.enum(["PLN"], { message: "Waluta musi być PLN" }),
  notes: z
    .string()
    .max(500, "Notatki są za długie (max 500 znaków)")
    .optional()
    .nullable()
    .transform((v) => (v == null ? v : normalizeString(v))),
});

export const expenseCreateSchema = z.object({
  name: z
    .string()
    .min(3, "Nazwa wydatku jest za krótka (min 3 znaki)")
    .max(120, "Nazwa wydatku jest za długa (max 120 znaków)")
    .transform(normalizeString),

  category: z
    .string()
    .max(60, "Kategoria jest za długa")
    .optional()
    .nullable()
    .transform((v) => (v == null ? v : normalizeString(v))),

  status: z.enum(expenseStatusValues, { message: "Nieprawidłowy status wydatku" }),

  plan_amount: money.optional().nullable(),
  actual_amount: money.optional().nullable(),

  due_date: isoDate.optional().nullable(),
  paid_date: isoDate.optional().nullable(),

  vendor_id: z
    .string()
    .uuid("Usługodawca musi mieć poprawny identyfikator")
    .optional()
    .nullable(),
});

export const expenseUpdateSchema = expenseCreateSchema.partial();
