// CeremoDay/api/src/validation/vendor.schema.ts
import { z } from "zod";
import { normalizeString } from "./common/normalize";

export const vendorTypeValues = [
  "venue",
  "catering",
  "music",
  "photo_video",
  "decorations",
  "transport",
  "other",
] as const;

// -------------------------------------------------
// Helpers (sanitize)
// -------------------------------------------------
const toCleanString = (v: unknown): string => normalizeString(typeof v === "string" ? v : "") ?? "";

const toCleanStringOrNull = (v: unknown): string | null => {
  if (v === null || v === undefined) return null;
  const s = toCleanString(v);
  return s ? s : null;
};

// -------------------------------------------------
// Field schemas
// -------------------------------------------------

const urlHttp = z
  .preprocess((v) => toCleanString(v), z.string().max(400, "Link jest za długi (max 400 znaków)"))
  .refine((v) => /^https?:\/\//i.test(v), {
    message: "Link musi zaczynać się od http:// lub https://",
  });

const phoneOptional = z
  .preprocess((v) => {
    if (v === null || v === undefined) return v;
    const s = toCleanString(v).replace(/[^0-9]/g, ""); // ✅ tylko cyfry 0-9
    return s;
  }, z.string().optional().nullable())
  .refine((v) => !v || /^[0-9]{9}$/.test(v), {
    message: "Telefon musi mieć 9 cyfr i składać się wyłącznie z cyfr 0-9.",
  });

const emailOptional = z
  .preprocess((v) => {
    if (v === null || v === undefined) return v;
    return toCleanString(v).toLowerCase();
  }, z.string().max(254, "Email jest za długi").optional().nullable())
  .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v), {
    message: "Nieprawidłowy format adresu email",
  });

// -------------------------------------------------
// Base schema (MUSI być ZodObject -> .extend()/.partial() działa)
// -------------------------------------------------
const vendorBaseSchema = z.object({
  name: z.preprocess(
    (v) => toCleanString(v),
    z
      .string()
      .min(2, "Nazwa usługodawcy jest za krótka (min 2 znaki)")
      .max(140, "Nazwa usługodawcy jest za długa (max 140 znaków)")
  ),

  type: z.enum(vendorTypeValues, { message: "Nieprawidłowy typ usługodawcy" }),

  phone: phoneOptional,
  email: emailOptional,

  website: urlHttp.optional().nullable(),

  notes: z.preprocess(
    (v) => toCleanStringOrNull(v),
    z.string().max(1000, "Notatki są za długie (max 1000 znaków)").optional().nullable()
  ),
});

// -------------------------------------------------
// Cross-field rule: wymagaj co najmniej jednego kontaktu (phone lub email)
// UWAGA: superRefine => ZodEffects, więc dopinamy to NA KOŃCU do gotowego obiektu
// -------------------------------------------------
function withContact<T extends z.ZodTypeAny>(schema: T) {
  return schema.superRefine((data: unknown, ctx) => {
    if (!data || typeof data !== "object") return;

    const obj = data as Record<string, unknown>;

    // ✅ OBEJŚCIE: dla sal gminnych (RURAL) nie wymagamy kontaktu
    const sourceRaw = typeof obj.source === "string" ? obj.source.trim() : "";
    const isRural = sourceRaw.toUpperCase() === "RURAL";
    if (isRural) return;

    const phone = typeof obj.phone === "string" ? obj.phone : null;
    const email = typeof obj.email === "string" ? obj.email : null;

    const hasPhone = !!phone && /^[0-9]{9}$/.test(phone);
    const hasEmail = !!email && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);

    if (!hasPhone && !hasEmail) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["phone"],
        message: "Podaj telefon (9 cyfr) lub email.",
      });
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["email"],
        message: "Podaj email lub telefon (9 cyfr).",
      });
    }
  });
}


// -------------------------------------------------
// Public schemas (front) — tu już mogą być ZodEffects
// -------------------------------------------------
export const vendorCreateSchema = withContact(vendorBaseSchema);

// Jeśli chcesz, żeby UPDATE też wymagał kontaktu — zostaw:
export const vendorUpdateSchema = withContact(vendorBaseSchema.partial());

// Jeśli wolisz, żeby UPDATE NIE wymagał kontaktu, użyj zamiast tego:
// export const vendorUpdateSchema = vendorBaseSchema.partial();

// -------------------------------------------------
// API payloads (z event_id + dodatkowymi polami snapshotu)
// -------------------------------------------------
const uuid = z
  .string()
  .uuid("Nieprawidłowy identyfikator (UUID)")
  .transform((v) => v.trim());

const optionalShortString = (max: number, label: string) =>
  z
    .preprocess((v) => (v == null ? v : toCleanString(v)), z.string().max(max, `${label} jest za długie (max ${max} znaków)`))
    .optional()
    .nullable();

const optionalNumber = (label: string) =>
  z
    .preprocess((v) => {
      if (v === null || v === undefined || v === "") return null;
      if (typeof v === "number" && Number.isFinite(v)) return v;
      if (typeof v === "string") {
        const t = v.trim().replace(",", ".");
        if (!t) return null;
        const n = Number(t);
        return Number.isFinite(n) ? n : v; // zostaw v → Zod rzuci invalid_type_error
      }
      return v;
    }, z.number({ invalid_type_error: `${label} musi być liczbą` }))
    .optional()
    .nullable();

/**
 * ✅ BAZA dla POST /vendors (ZodObject!)
 * - tutaj robimy extend/passthrough
 * - bez withContact, bo wtedy robi się ZodEffects i nie da się omit/partial dalej
 */
export const vendorCreateApiBaseSchema = vendorBaseSchema
  .extend({
    event_id: uuid,
    address: optionalShortString(220, "Adres"),
    google_maps_url: optionalShortString(400, "Link Google Maps"),

    county: optionalShortString(140, "Powiat"),
    max_participants: optionalNumber("Maks. liczba uczestników"),
    equipment: optionalShortString(900, "Wyposażenie"),
    pricing: optionalShortString(900, "Cennik"),
    rental_info: optionalShortString(900, "Informacje o wynajmie"),
    commune_office: optionalShortString(220, "Urząd / gmina"),
    rural_type: optionalShortString(120, "Typ obiektu"),
    usable_area: optionalNumber("Powierzchnia użytkowa"),

    lat: optionalNumber("Szerokość geograficzna"),
    lng: optionalNumber("Długość geograficzna"),
  })
  .passthrough();

/**
 * Payload dla POST /vendors
 * - dopiero TU dopinamy wymóg kontaktu
 */
export const vendorCreateApiSchema = withContact(vendorCreateApiBaseSchema);

/**
 * ✅ BAZA dla PUT /vendors/:id (ZodObject!)
 * - omit/partial robimy na bazie, a dopiero potem (opcjonalnie) withContact
 */
export const vendorUpdateApiBaseSchema = vendorCreateApiBaseSchema
  .omit({ event_id: true })
  .partial()
  .passthrough();

/**
 * Payload dla PUT /vendors/:id
 * - jeśli chcesz wymagać kontaktu także przy update, zostaw:
 */
export const vendorUpdateApiSchema = withContact(vendorUpdateApiBaseSchema);

// Jeśli update ma NIE wymagać kontaktu, użyj zamiast:
// export const vendorUpdateApiSchema = vendorUpdateApiBaseSchema;
