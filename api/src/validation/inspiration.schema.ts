// CeremoDay/api/src/validation/inspiration.schema.ts
import { z } from "zod";
import { normalizeString } from "./common/normalize";

const optText = (max: number, msg: string) =>
  z
    .string()
    .max(max, msg)
    .optional()
    .nullable()
    .transform((v) => (v == null ? v : normalizeString(v)));

export const inspirationCategoryValues = ["DEKORACJE", "KWIATY", "STROJE", "PAPETERIA", "INNE"] as const;

export const inspirationBoardCreateSchema = z.object({
  name: z
    .string()
    .min(2, "Nazwa tablicy jest za krótka (min 2 znaki)")
    .max(80, "Nazwa tablicy jest za długa (max 80 znaków)")
    .transform(normalizeString),
  description: optText(2000, "Opis tablicy jest za długi (max 2000)"),
  color: optText(32, "Kolor jest za długi (max 32)"),
  emoji: optText(8, "Emoji jest za długie (max 8)"),
});

export const inspirationBoardUpdateSchema = inspirationBoardCreateSchema.partial();

export const inspirationItemCreateSchema = z.object({
  title: z
    .string()
    .min(2, "Tytuł inspiracji jest za krótki (min 2 znaki)")
    .max(120, "Tytuł inspiracji jest za długi (max 120)")
    .transform(normalizeString),
  description: optText(4000, "Opis inspiracji jest za długi (max 4000)"),
  category: z.enum(inspirationCategoryValues).optional().nullable(),
  tags: optText(500, "Tagi są za długie (max 500)"),
  source_url: z
    .string()
    .url("Nieprawidłowy URL źródła")
    .max(2048, "URL jest za długi")
    .optional()
    .nullable(),
});

export const inspirationItemUpdateSchema = inspirationItemCreateSchema.partial();
