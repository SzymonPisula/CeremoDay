// CeremoDay/api/src/validation/document.schema.ts
import { z } from "zod";
import { normalizeString } from "./common/normalize";
import { isoDate } from "./common/date";

export const documentStatusValues = ["todo", "in_progress", "done"] as const;
export const documentTypeValues = ["civil", "concordat", "custom", "church"] as const;

const optText = (max: number, msg: string) =>
  z
    .string()
    .max(max, msg)
    .optional()
    .nullable()
    .transform((v) => (v == null ? v : normalizeString(v)));

const optDate = () => isoDate.optional().nullable();

/**
 * UWAGA:
 * - include_extras domyślnie TRUE (zgodnie z route: include_extras ?? true)
 */
export const documentGenerateDefaultSchema = z.object({
  ceremony_type: z.enum(["civil", "concordat"], {
    message: "Nieprawidłowy typ ceremonii",
  }),
  include_extras: z.boolean().optional().default(true),
});

export const documentCreateSchema = z.object({
  name: z
    .string()
    .min(3, "Nazwa dokumentu jest za krótka (min 3 znaki)")
    .max(120, "Nazwa dokumentu jest za długa (max 120 znaków)")
    .transform(normalizeString),

  description: optText(2000, "Opis dokumentu jest za długi (max 2000 znaków)"),

  category: optText(80, "Kategoria jest za długa (max 80 znaków)"),
  holder: optText(140, "Właściciel/posiadacz jest za długi (max 140 znaków)"),

  // daty jako ISO YYYY-MM-DD (mogą być null/undefined)
  due_date: optDate(),
  valid_until: optDate(),

  // UI może wysłać boolean lub string "true"/"false"
  is_pinned: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((v) => {
      if (typeof v === "boolean") return v;
      if (typeof v === "string") return v === "true";
      return false;
    }),

  type: z
    .enum(documentTypeValues)
    .optional()
    .transform((v) => (v === "church" ? "concordat" : v ?? "custom")) as any,

  status: z
    .enum(documentStatusValues, { message: "Nieprawidłowy status dokumentu" })
    .optional()
    .default("todo"),
});

export const documentUpdateSchema = documentCreateSchema.partial();
