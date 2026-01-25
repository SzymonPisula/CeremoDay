import { z } from "zod";

/**
 * Kwota: 1-9 cyfr, opcjonalnie separator . lub , i 1-2 miejsc.
 * Zakaz e/E, +, -, spacji, liter.
 */
export const money = z
  .string()
  .regex(/^[0-9]{1,9}([.,][0-9]{1,2})?$/, {
    message:
      "Kwota musi być liczbą (max 9 cyfr) i może mieć maks. 2 miejsca po przecinku. Bez liter, spacji i znaków typu e/E.",
  })
  .transform((v) => Number(v.replace(",", ".")))
  .refine((v) => Number.isFinite(v), { message: "Nieprawidłowa liczba" });

export const intString = (label = "Wartość", maxDigits = 6) =>
  z
    .string()
    .regex(new RegExp(`^[0-9]{1,${maxDigits}}$`), {
      message: `${label} musi być liczbą całkowitą (tylko cyfry)`,
    })
    .transform((v) => Number(v))
    .refine((v) => Number.isFinite(v), { message: `${label} jest nieprawidłowy` });