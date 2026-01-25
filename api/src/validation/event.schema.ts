// CeremoDay/api/src/validation/event.schema.ts
import { z } from "zod";
import { normalizeString } from "./common/normalize";

const EVENT_NAME_REGEX = /^[A-Za-z0-9ĄĆĘŁŃÓŚŹŻąćęłńóśźż \-]+$/;
const ACCESS_CODE_REGEX = /^[A-Z0-9]{6,12}$/;

export const eventCreateSchema = z.object({
  name: z
    .string()
    .min(3, "Nazwa wydarzenia jest za krótka (min 3 znaki)")
    .max(80, "Nazwa wydarzenia jest za długa (max 80 znaków)")
    .regex(EVENT_NAME_REGEX, {
      message: "Nazwa może zawierać tylko litery, cyfry, spacje i myślniki",
    })
    // normalizeString w Twoim projekcie zwraca string | null → robimy zawsze string
    .transform((v) => normalizeString(v) ?? ""),
});

export const eventJoinSchema = z.object({
  access_code: z
    .string()
    .transform((v) => (normalizeString(v) ?? "").toUpperCase())
    .refine((v) => ACCESS_CODE_REGEX.test(v), {
      message: "Kod dostępu musi mieć 6–12 znaków i składać się z A-Z oraz 0-9",
    }),
});

export const eventUserRoleUpdateSchema = z.object({
  role: z.enum(["coorganizer", "guest"], {
    message: "Nieprawidłowa rola użytkownika",
  }),
});

// =========================
// Wedding Day (schedule / checklist / contacts)
// =========================

const hhmm = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Czas musi być w formacie HH:mm")
  .transform((v) => v.trim());

export const weddingDayScheduleCreateSchema = z.object({
  time: hhmm,
  title: z
    .string()
    .min(2, "Tytuł jest za krótki (min 2 znaki)")
    .max(140, "Tytuł jest za długi (max 140)")
    .trim(),
  description: z
    .string()
    .max(1200, "Opis jest za długi (max 1200)")
    .optional()
    .nullable()
    .transform((v) => (v == null ? v : v.trim())),
  location: z
    .string()
    .max(220, "Miejsce jest za długie (max 220)")
    .optional()
    .nullable()
    .transform((v) => (v == null ? v : v.trim())),
  responsible: z
    .string()
    .max(140, "Osoba odpowiedzialna jest za długa (max 140)")
    .optional()
    .nullable()
    .transform((v) => (v == null ? v : v.trim())),
  status: z
    .enum(["planned", "in_progress", "done"], {
      message: "Nieprawidłowy status",
    })
    .optional(),
});

export const weddingDayScheduleUpdateSchema = weddingDayScheduleCreateSchema.partial();

export const weddingDayChecklistCreateSchema = z.object({
  title: z
    .string()
    .min(2, "Nazwa punktu jest za krótka (min 2 znaki)")
    .max(160, "Nazwa punktu jest za długa (max 160)")
    .trim(),
  done: z.boolean().optional(),
  note: z
    .string()
    .max(1200, "Notatka jest za długa (max 1200)")
    .optional()
    .nullable()
    .transform((v) => (v == null ? v : v.trim())),
  schedule_item_id: z
    .string()
    .uuid("Nieprawidłowy identyfikator pozycji harmonogramu")
    .optional()
    .nullable(),
});

export const weddingDayChecklistUpdateSchema = weddingDayChecklistCreateSchema.partial();

export const weddingDayContactCreateSchema = z.object({
  name: z
    .string()
    .min(2, "Imię/nazwa kontaktu jest za krótka (min 2 znaki)")
    .max(140, "Imię/nazwa kontaktu jest za długa (max 140)")
    .trim(),
  role: z
    .string()
    .max(120, "Rola jest za długa (max 120)")
    .optional()
    .nullable()
    .transform((v) => (v == null ? v : v.trim())),
  phone: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v == null ? v : v.replace(/[^0-9]/g, "")))
    .refine((v) => !v || /^[0-9]{9}$/.test(v), {
      message: "Telefon musi mieć 9 cyfr (zignorujemy spacje i +48)",
    }),
  email: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v == null ? v : v.trim().toLowerCase()))
    .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v), {
      message: "Nieprawidłowy format adresu email",
    }),
  note: z
    .string()
    .max(1200, "Notatka jest za długa (max 1200)")
    .optional()
    .nullable()
    .transform((v) => (v == null ? v : v.trim())),
});

export const weddingDayContactUpdateSchema = weddingDayContactCreateSchema.partial();
