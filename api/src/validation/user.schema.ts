// CeremoDay/api/src/validation/user.schema.ts
import { z } from "zod";
import { plNameOf, normalizeString } from "./common/string";

const emailSchema = z
  .string()
  .max(254, "Email jest za długi")
  .transform((v) => (normalizeString(v) ?? "").toLowerCase())
  .refine((v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Niepoprawny email");

export const userUpdateSchema = z
  .object({
    first_name: plNameOf(80, "Imię").optional(),
    last_name: plNameOf(80, "Nazwisko").optional(),
    email: emailSchema.optional(),
    password: z.string().min(6, "Hasło min 6 znaków").max(200, "Hasło jest za długie").optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, "Brak danych do aktualizacji");
