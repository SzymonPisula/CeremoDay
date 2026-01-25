// CeremoDay/api/src/validation/common/string.ts
import { z } from "zod";

const NAME_REGEX = /^[A-Za-zĄąĆćĘęŁłŃńÓóŚśŹźŻż' -]+$/;

export function normalizeString(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim().replace(/\s+/g, " ");
  return s.length ? s : null;
}

function titleCaseWords(s: string): string {
  return s
    .split(" ")
    .map((w) => {
      const parts = w.split("-");
      return parts
        .map((p) => (p.length ? p[0].toUpperCase() + p.slice(1).toLowerCase() : p))
        .join("-");
    })
    .join(" ");
}

/**
 * PL name schema z parametrycznym limitem max.
 * WAŻNE: max/min muszą być na ZodString (przed transform).
 */
export const plNameOf = (max: number, label = "Pole") =>
  z
    .string()
    .min(2, `${label} jest za krótkie (min 2 znaki)`)
    .max(max, `${label} jest za długie (max ${max} znaków)`)
    .refine((v) => NAME_REGEX.test(v.trim()), {
      message: "Dozwolone są litery (w tym polskie), spacje, myślnik i apostrof.",
    })
    .transform((v) => titleCaseWords(normalizeString(v) ?? ""));

/**
 * Domyślne PL name (max 80) – zostawiamy dla wygody.
 */
export const plName = plNameOf(80, "Pole");

export const optionalText = (max: number, label = "Tekst") =>
  z
    .string()
    .max(max, `${label} jest za długi`)
    .optional()
    .nullable()
    .transform((v) => (v == null ? v : normalizeString(v) ?? ""));
