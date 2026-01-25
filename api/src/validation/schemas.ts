import { z } from "zod";
import { normalizeInputString, normalizePLPhone, titleCasePL } from "../utils/strings";
import { isStrictDecimalString } from "../utils/numbers";

const NAME_RE = /^[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż]+(?:[ -][A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż]+)*$/;
const EVENT_NAME_RE = /^[A-Za-z0-9ĄĆĘŁŃÓŚŹŻąćęłńóśźż][A-Za-z0-9ĄĆĘŁŃÓŚŹŻąćęłńóśźż \-]{1,79}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_9_RE = /^[0-9]{9}$/;

export const emailSchema = z
  .string()
  .transform((v) => normalizeInputString(v).toLowerCase())
  .refine((v) => v.length <= 254, "Email jest za długi.")
  .refine((v) => EMAIL_RE.test(v), "Podaj poprawny email (np. nazwa@domena.pl).");

export const passwordSchema = z
  .string()
  .transform((v) => normalizeInputString(v))
  .refine((v) => v.length >= 10, "Hasło musi mieć co najmniej 10 znaków.")
  .refine((v) => v.length <= 72, "Hasło jest za długie (max 72).")
  .refine((v) => !/^\s|\s$/.test(v), "Hasło nie może zaczynać się ani kończyć spacją.")
  .refine((v) => /[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż]/.test(v), "Hasło musi zawierać przynajmniej jedną literę.")
  .refine((v) => /\d/.test(v), "Hasło musi zawierać przynajmniej jedną cyfrę.");

export const adminSetPasswordSchema = z.object({
  password: passwordSchema,
});

export const nameSchema = z
  .string()
  .transform((v) => titleCasePL(normalizeInputString(v)))
  .refine((v) => v.length >= 2, "To pole jest za krótkie.")
  .refine((v) => v.length <= 80, "To pole jest za długie.")
  .refine((v) => NAME_RE.test(v), "Dozwolone są tylko litery, spacje i myślniki.");

export const adminUpdateUserSchema = z
  .object({
    email: emailSchema.optional(),
    name: z.any().transform((v) => toNullIfEmpty(v)).refine((v) => v === null || typeof v === "string", "Niepoprawne dane").transform((v) => (v === null ? null : String(v))).optional(),
    role: z.enum(["user", "admin"]).optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, "Brak danych do aktualizacji.");

// -------------------------
// ADMIN
// -------------------------

export const adminCreateUserSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema.optional().transform((v) => (v == null ? null : v)),
  role: z.enum(["user", "admin"]).optional().default("user"),
});

export const adminPatchUserSchema = z
  .object({
    email: emailSchema.optional(),
    name: nameSchema.optional().nullable(),
    role: z.enum(["user", "admin"]).optional().nullable(),
    password: passwordSchema.optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, "Brak danych do aktualizacji.");

export const phoneSchemaPL = z
  .string()
  .transform((v) => normalizePLPhone(normalizeInputString(v)))
  .refine((v) => PHONE_9_RE.test(v), "Telefon musi mieć dokładnie 9 cyfr (PL).");

export const decimalMoneyString = z
  .string()
  .transform((v) => normalizeInputString(v).replace(",", "."))
  .refine((v) => v === "" || isStrictDecimalString(v), "Podaj liczbę w formacie 0-9, max 2 miejsca po przecinku.");

export const yyyymmddSchema = z
  .string()
  .transform((v) => normalizeInputString(v))
  .refine((v) => isYYYYMMDD(v), "Niepoprawna data. Użyj formatu RRRR-MM-DD.");

export const authRegisterSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema.optional().transform((v) => (v == null ? null : v)),
});

export const authLoginSchema = z.object({
  email: emailSchema,
  password: z.string().transform((v) => normalizeInputString(v)),
});

export const eventCreateSchema = z.object({
  name: z
    .string()
    .transform((v) => normalizeInputString(v))
    .refine((v) => v.length >= 3, "Nazwa wydarzenia musi mieć min. 3 znaki.")
    .refine((v) => v.length <= 80, "Nazwa wydarzenia musi mieć max. 80 znaków.")
    .refine((v) => EVENT_NAME_RE.test(v), "Nazwa może zawierać litery, cyfry, spacje i myślniki."),
});

export const eventJoinSchema = z.object({
  access_code: z
    .string()
    .transform((v) => normalizeInputString(v).toUpperCase())
    .refine((v) => /^[A-Z0-9]{4,12}$/.test(v), "Kod dostępu jest niepoprawny."),
});

export const guestCreateSchema = z.object({
  first_name: nameSchema.refine((v)=>v.length<=50,"Imię jest za długie (max 50)."),
  last_name: nameSchema.refine((v)=>v.length<=70,"Nazwisko jest za długie (max 70)."),
  phone: phoneSchemaPL,
  email: z
    .any()
    .transform((v) => toNullIfEmpty(v))
    .refine((v) => v === null || EMAIL_RE.test(String(v).toLowerCase()), "Podaj poprawny email.")
    .transform((v) => (v === null ? null : String(v).toLowerCase().trim())),
  relation: z.string().max(40).optional().transform((v)=>toNullIfEmpty(v)),
  side: z.enum(["Pani młodej","Pana młodego"]).optional().transform((v)=>v ?? null),
  rsvp: z.enum(["Potwierdzone","Odmowa","Nieznane"]).optional().transform((v)=>v ?? null),
  allergens: z.string().max(200).optional().transform((v)=>toNullIfEmpty(v)),
  notes: z.string().max(500).optional().transform((v)=>toNullIfEmpty(v)),
  parent_guest_id: z.string().uuid().optional().transform((v)=>v ?? null),
});

export const guestUpdateSchema = guestCreateSchema.partial().refine((obj)=>Object.keys(obj).length>0,"Brak danych do aktualizacji.");

export const interviewSaveSchema = z.object({
  ceremony_type: z.enum(["civil","church","reception_only"]),
  event_date: yyyymmddSchema,
  finance_initial_budget: z
    .any()
    .transform((v) => toNullIfEmpty(v))
    .refine((v) => v === null || isStrictDecimalString(String(v)), "Budżet: podaj liczbę (max 2 miejsca).")
    .transform((v) => (v === null ? null : Number(String(v).replace(",", "."))))
    .refine((v) => v === null || (Number.isFinite(v) && v >= 0 && v <= 9_999_999.99), "Budżet: zakres 0–9 999 999.99."),
  guest_count_range: z.enum(["0_30","31_60","61_100","101_150","150_plus"]),
  guest_list_status: z.enum(["ready","partial","not_started"]),
  music_provider_choice: z.enum(["DJ","BAND"]),
  venue_choice: z.enum(["WEDDING_HALL","RURAL_VENUE"]),
  required_vendors: z.array(z.string()).min(1),
  optional_vendors: z.array(z.string()).optional().default([]),
  wedding_day_enabled: z.boolean(),
  notification_frequency: z.enum(["daily","every_3_days","weekly","only_critical"]),
});

export const taskCreateSchema = z.object({
  title: z
    .string()
    .transform((v) => normalizeInputString(v))
    .refine((v) => v.length >= 3, "Tytuł min. 3 znaki.")
    .refine((v) => v.length <= 120, "Tytuł max 120."),
  description: z
    .any()
    .transform((v) => toNullIfEmpty(v))
    .refine((v) => v === null || String(v).length <= 1500, "Opis max 1500.")
    .transform((v) => (v === null ? null : String(v))),
  status: z.enum(["pending", "in_progress", "done"]).optional().default("pending"),
  category: z
    .any()
    .transform((v) => toNullIfEmpty(v))
    .refine(
      (v) =>
        v === null ||
        [
          "FORMALNOSCI",
          "ORGANIZACJA",
          "USLUGI",
          "DEKORACJE",
          "LOGISTYKA",
          "DZIEN_SLUBU",
        ].includes(String(v)),
      "Wybierz poprawną kategorię."
    )
    .transform((v) => (v === null ? null : (String(v) as any))),
  due_date: z
    .any()
    .transform((v) => toNullIfEmpty(v))
    .refine((v) => v === null || isYYYYMMDD(String(v)), "Termin: format RRRR-MM-DD.")
    .transform((v) => (v === null ? null : String(v))),
});

export const taskUpdateSchema = taskCreateSchema.partial().refine((obj)=>Object.keys(obj).length>0,"Brak danych do aktualizacji.");

export const budgetUpdateSchema = z.object({
  initial_budget: z
    .any()
    .transform((v) => toNullIfEmpty(v))
    .refine((v) => v === null || isStrictDecimalString(String(v)), "Budżet: podaj liczbę (max 2 miejsca).")
    .transform((v) => (v === null ? null : Number(String(v).replace(",", "."))))
    .refine((v) => v === null || (Number.isFinite(v) && v >= 0 && v <= 9_999_999.99), "Budżet: zakres 0–9 999 999.99."),
  currency: z.enum(["PLN"]).optional().default("PLN"),
  notes: z.any().transform((v)=>toNullIfEmpty(v)).refine((v)=>v===null || String(v).length<=500,"Notatki max 500.").transform((v)=>v===null?null:String(v)),
});

// --- FINANCE (Expenses) ---

const ExpenseCategoryEnum = z.enum([
  "HALL",
  "CATERING",
  "MUSIC",
  "OUTFITS",
  "TRANSPORT",
  "DECOR",
  "PHOTO_VIDEO",
  "OTHER",
]);

const ExpenseStatusEnum = z.enum(["PLANNED", "IN_PROGRESS", "PAID"]);

const toNullIfEmpty = (v: unknown) => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length ? v : null;
};

const isYYYYMMDD = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);

const todayISO = () => new Date().toISOString().slice(0, 10);

const parseMoney = (v: unknown) => {
  const x = toNullIfEmpty(v);
  if (x === null) return null;
  const s = String(x).replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
};

export const expenseCreateBase = z.object({
  name: z
    .string()
    .min(2, "Nazwa min. 2 znaki.")
    .max(120, "Nazwa max 120.")
    .transform((v) => v.trim()),

  category: ExpenseCategoryEnum,

  status: ExpenseStatusEnum.optional().default("PLANNED"),

  planned_amount: z
    .any()
    .transform(parseMoney)
    .refine(
      (v) => v === null || (Number.isFinite(v) && v >= 0),
      "Kwota planowana: podaj liczbę (>= 0)."
    ),

  actual_amount: z
    .any()
    .transform(parseMoney)
    .refine(
      (v) => v === null || (Number.isFinite(v) && v >= 0),
      "Kwota faktyczna: podaj liczbę (>= 0)."
    ),

  due_date: z
    .any()
    .transform((v) => (toNullIfEmpty(v) === null ? null : String(v)))
    .refine((v) => v === null || isYYYYMMDD(v), "Termin: format RRRR-MM-DD.")
    .transform((v) => (v === null ? null : v)),

  paid_date: z
    .any()
    .transform((v) => (toNullIfEmpty(v) === null ? null : String(v)))
    .refine((v) => v === null || isYYYYMMDD(v), "Data płatności: format RRRR-MM-DD.")
    .transform((v) => (v === null ? null : v)),

  vendor_name: z
    .any()
    .transform((v) => (toNullIfEmpty(v) === null ? null : String(v).trim()))
    .refine((v) => v === null || v.length <= 120, "Usługodawca max 120.")
    .transform((v) => v),

  notes: z
    .any()
    .transform((v) => (toNullIfEmpty(v) === null ? null : String(v).trim()))
    .refine((v) => v === null || v.length <= 800, "Notatki max 800.")
    .transform((v) => v),
});

export const expenseCreateSchema = expenseCreateBase.superRefine((obj, ctx) => {
  const t = todayISO();

  if (obj.status === "PLANNED") {
    if (obj.actual_amount !== null)
      ctx.addIssue({ code: "custom", path: ["actual_amount"], message: "Dla Planowane: kwota faktyczna musi być pusta." });
    if (obj.due_date !== null)
      ctx.addIssue({ code: "custom", path: ["due_date"], message: "Dla Planowane: termin płatności musi być pusty." });
    if (obj.paid_date !== null)
      ctx.addIssue({ code: "custom", path: ["paid_date"], message: "Dla Planowane: data płatności musi być pusta." });
  }

  if (obj.status === "IN_PROGRESS") {
    if (!obj.due_date)
      ctx.addIssue({ code: "custom", path: ["due_date"], message: "Dla W trakcie: wymagany termin płatności." });
    if (obj.due_date && obj.due_date < t)
      ctx.addIssue({ code: "custom", path: ["due_date"], message: "Termin płatności nie może być w przeszłości." });
    if (obj.actual_amount === null)
      ctx.addIssue({ code: "custom", path: ["actual_amount"], message: "Dla W trakcie: wymagana kwota faktyczna." });
    if (obj.paid_date !== null)
      ctx.addIssue({ code: "custom", path: ["paid_date"], message: "Dla W trakcie: data płatności musi być pusta." });
  }

  if (obj.status === "PAID") {
    if (!obj.paid_date)
      ctx.addIssue({ code: "custom", path: ["paid_date"], message: "Dla Opłacone: wymagana data płatności." });
    if (obj.paid_date && obj.paid_date > t)
      ctx.addIssue({ code: "custom", path: ["paid_date"], message: "Data płatności nie może być w przyszłości." });
    if (obj.actual_amount === null)
      ctx.addIssue({ code: "custom", path: ["actual_amount"], message: "Dla Opłacone: wymagana kwota faktyczna." });
  }
});

// ✅ update: partial na BASE, nie na EFFECTS
export const expenseUpdateSchema = expenseCreateBase
  .partial()
  .refine(
    (obj: Partial<z.infer<typeof expenseCreateBase>>) => Object.keys(obj).length > 0,
    "Brak danych do aktualizacji."
  );

// -------------------------
// NOTIFICATIONS
// -------------------------

export const notificationsMarkReadSchema = z.object({
  ids: z
    .array(z.string().uuid("ID powiadomienia musi być poprawnym UUID"))
    .max(200, "Możesz zaznaczyć maksymalnie 200 powiadomień naraz")
    .optional()
    .transform((v) => (v === undefined ? null : v)),
});
