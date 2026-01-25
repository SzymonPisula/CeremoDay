// CeremoDay/api/src/validation/auth.schema.ts
import { z } from "zod";
import { plNameOf, normalizeString } from "./common/string";

const emailSchema = z
  .string()
  .max(254, "Email jest za długi")
  .transform((v) => (normalizeString(v) ?? "").toLowerCase())
  .refine((v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Niepoprawny email");

export const registerSchema = z.object({
  first_name: plNameOf(80, "Imię"),
  last_name: plNameOf(80, "Nazwisko"),
  email: emailSchema,
  password: z.string().min(6, "Hasło min 6 znaków").max(200, "Hasło jest za długie"),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Hasło jest wymagane").max(200, "Hasło jest za długie"),
});
