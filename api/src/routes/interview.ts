import { Router, Response } from "express";
import type { AuthRequest } from "../middleware/auth";
import { authMiddleware } from "../middleware/auth";
import Budget from "../models/Budget";

import EventInterview, {
  ModelCeremonyType,
  ModelGuestCountRange,
  ModelGuestListStatus,
  ModelNotificationFrequency,
  ModelMusicProviderChoice,
  ModelVenueChoice,
  VendorKey as ModelVendorKey,
} from "../models/EventInterview";

import type {
  CeremonyType,
  GuestCountRange,
  GuestListStatus,
  InterviewPayload,
  InterviewResponse,
  NotificationFrequency,
  VendorKey,
  MusicProviderChoice,
  VenueChoice,
  
} from "../types/interview";

const router = Router();

// ---------- allowed values (API) ----------
const CEREMONY_TYPES: CeremonyType[] = ["civil", "church", "reception_only"];
const GUEST_RANGES: GuestCountRange[] = ["0_30", "31_60", "61_100", "101_150", "150_plus"];
const GUEST_LIST_STATUSES: GuestListStatus[] = ["ready", "partial", "not_started"];

const VENDOR_KEYS: VendorKey[] = [
  "DJ_OR_BAND",
  "VENUE",
  "CATERING",
  "PHOTOGRAPHER",
  "VIDEOGRAPHER",
  "DECOR_FLORIST",
  "TRANSPORT",
];

const NOTIFICATION_FREQUENCIES: NotificationFrequency[] = ["daily", "every_3_days", "weekly", "only_critical"];
const MUSIC_CHOICES: MusicProviderChoice[] = ["DJ", "BAND"];
const VENUE_CHOICES: VenueChoice[] = ["WEDDING_HALL", "RURAL_VENUE"];



// --------- helpers ---------
function isOneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

function normalizeDate(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value !== "string") return null;
  const s = value.trim();
  if (!s) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return s;
}

// API -> number|null (akceptujemy number albo string "123,45")
function normalizeBudget(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const s = value.trim().replace(",", ".");
    if (!s) return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

// number|null -> string|null dla DB (DECIMAL)
function toDecimalStringOrNull(v: number | null): string | null {
  if (v === null) return null;
  if (!Number.isFinite(v)) return null;
  return v.toFixed(2);
}

// string/number -> number|null dla response
function toNumberOrNull(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function toIsoMaybe(d?: Date | string | null): string | undefined {
  if (!d) return undefined;
  if (d instanceof Date) return d.toISOString();
  if (typeof d === "string") return d;
  return undefined;
}

// --------- validate ---------
function validatePayload(
  body: unknown
): { ok: true; payload: InterviewPayload } | { ok: false; message: string } {
  if (!body || typeof body !== "object") return { ok: false, message: "Brak body." };
  const b = body as Record<string, unknown>;

  const ceremony_type = b.ceremony_type;
  const event_date = normalizeDate(b.event_date);

  const finance_initial_budget = normalizeBudget(b.finance_initial_budget);

  const guest_count_range = b.guest_count_range;
  const guest_list_status = b.guest_list_status;

  const music_provider_choice = b.music_provider_choice;
  const venue_choice = b.venue_choice;

  const required_vendors = b.required_vendors;
  const optional_vendors = b.optional_vendors;

  const wedding_day_enabled = b.wedding_day_enabled;
  const notification_frequency = b.notification_frequency;

  if (!isOneOf(ceremony_type, CEREMONY_TYPES))
    return {
      ok: false,
      message: `Niepoprawne ceremony_type: ${String(ceremony_type)}. Dozwolone: ${CEREMONY_TYPES.join(", ")}.`,
    };


  if (finance_initial_budget != null && finance_initial_budget < 0)
    return { ok: false, message: "finance_initial_budget nie może być ujemny." };

  if (!isOneOf(guest_count_range, GUEST_RANGES))
    return {
      ok: false,
      message: `Niepoprawne guest_count_range: ${String(guest_count_range)}. Dozwolone: ${GUEST_RANGES.join(", ")}.`,
    };

  if (!isOneOf(guest_list_status, GUEST_LIST_STATUSES))
    return {
      ok: false,
      message: `Niepoprawne guest_list_status: ${String(guest_list_status)}. Dozwolone: ${GUEST_LIST_STATUSES.join(", ")}.`,
    };

  if (!isOneOf(music_provider_choice, MUSIC_CHOICES))
    return {
      ok: false,
      message: `Niepoprawne music_provider_choice: ${String(music_provider_choice)}. Dozwolone: ${MUSIC_CHOICES.join(", ")}.`,
    };

  if (!isOneOf(venue_choice, VENUE_CHOICES))
    return {
      ok: false,
      message: `Niepoprawne venue_choice: ${String(venue_choice)}. Dozwolone: ${VENUE_CHOICES.join(", ")}.`,
    };

  if (!isStringArray(required_vendors) || !required_vendors.every((v) => VENDOR_KEYS.includes(v as VendorKey)))
    return {
      ok: false,
      message: `Niepoprawne required_vendors: ${String(required_vendors)}. Dozwolone: ${VENDOR_KEYS.join(", ")}.`,
    };

  if (!isStringArray(optional_vendors) || !optional_vendors.every((v) => VENDOR_KEYS.includes(v as VendorKey)))
    return {
      ok: false,
      message: `Niepoprawne optional_vendors: ${String(optional_vendors)}. Dozwolone: ${VENDOR_KEYS.join(", ")}.`,
    };

  if (typeof wedding_day_enabled !== "boolean")
    return { ok: false, message: `Niepoprawne wedding_day_enabled: ${String(wedding_day_enabled)}.` };

  if (!isOneOf(notification_frequency, NOTIFICATION_FREQUENCIES))
    return {
      ok: false,
      message: `Niepoprawne notification_frequency: ${String(notification_frequency)}. Dozwolone: ${NOTIFICATION_FREQUENCIES.join(", ")}.`,
    };

  // required zawsze DJ_OR_BAND i VENUE
  const req = required_vendors as VendorKey[];
  const requiredSet = new Set(req);
  requiredSet.add("DJ_OR_BAND");
  requiredSet.add("VENUE");

  const opt = (optional_vendors as VendorKey[]).filter((v) => !requiredSet.has(v));

  return {
    ok: true,
    payload: {
      ceremony_type: ceremony_type as CeremonyType,
      event_date,

      finance_initial_budget,

      guest_count_range: guest_count_range as GuestCountRange,
      guest_list_status: guest_list_status as GuestListStatus,

      music_provider_choice: music_provider_choice as MusicProviderChoice,
      venue_choice: venue_choice as VenueChoice,

      required_vendors: Array.from(requiredSet),
      optional_vendors: opt,

      wedding_day_enabled,
      notification_frequency: notification_frequency as NotificationFrequency,
    },
  };
}

// ---------- mapping API <-> DB ----------
function mapCeremonyToModel(v: CeremonyType): ModelCeremonyType {
  switch (v) {
    case "civil":
      return "CIVIL";
    case "church":
      return "CHURCH";
    case "reception_only":
      return "RECEPTION_ONLY";
  }
}
function mapCeremonyFromModel(v: ModelCeremonyType): CeremonyType {
  switch (v) {
    case "CIVIL":
      return "civil";
    case "CHURCH":
      return "church";
    case "RECEPTION_ONLY":
      return "reception_only";
  }
}

function mapGuestRangeToModel(v: GuestCountRange): ModelGuestCountRange {
  return v === "150_plus" ? "150_PLUS" : v;
}
function mapGuestRangeFromModel(v: ModelGuestCountRange): GuestCountRange {
  return v === "150_PLUS" ? "150_plus" : v;
}

function mapGuestStatusToModel(v: GuestListStatus): ModelGuestListStatus {
  switch (v) {
    case "ready":
      return "READY";
    case "partial":
      return "PARTIAL";
    case "not_started":
      return "NOT_STARTED";
  }
}
function mapGuestStatusFromModel(v: ModelGuestListStatus): GuestListStatus {
  switch (v) {
    case "READY":
      return "ready";
    case "PARTIAL":
      return "partial";
    case "NOT_STARTED":
      return "not_started";
  }
}

function mapNotifToModel(v: NotificationFrequency): ModelNotificationFrequency {
  switch (v) {
    case "daily":
      return "DAILY";
    case "every_3_days":
      return "EVERY_3_DAYS";
    case "weekly":
      return "WEEKLY";
    case "only_critical":
      return "ONLY_CRITICAL";
  }
}
function mapNotifFromModel(v: ModelNotificationFrequency): NotificationFrequency {
  switch (v) {
    case "DAILY":
      return "daily";
    case "EVERY_3_DAYS":
      return "every_3_days";
    case "WEEKLY":
      return "weekly";
    case "ONLY_CRITICAL":
      return "only_critical";
  }
}

function mapMusicToModel(v: MusicProviderChoice): ModelMusicProviderChoice {
  return v;
}
function mapMusicFromModel(v: ModelMusicProviderChoice): MusicProviderChoice {
  return v;
}
function mapVenueToModel(v: VenueChoice): ModelVenueChoice {
  return v;
}
function mapVenueFromModel(v: ModelVenueChoice): VenueChoice {
  return v;
}

function toResponse(row: EventInterview): InterviewResponse {
  const required = Array.isArray(row.required_vendors) ? row.required_vendors : [];
  const optional = Array.isArray(row.optional_vendors) ? row.optional_vendors : [];

  return {
    id: row.id,
    event_id: row.event_id,

    ceremony_type: mapCeremonyFromModel(row.ceremony_type),
    event_date: row.event_date,

    // DB trzyma string(DECIMAL) lub null -> API daje number|null
    finance_initial_budget: toNumberOrNull(row.finance_initial_budget),

    guest_count_range: mapGuestRangeFromModel(row.guest_count_range),
    guest_list_status: mapGuestStatusFromModel(row.guest_list_status),

    music_provider_choice: mapMusicFromModel(row.music_provider_choice),
    venue_choice: mapVenueFromModel(row.venue_choice),

    required_vendors: required,
    optional_vendors: optional,

    wedding_day_enabled: row.wedding_day_enabled,
    notification_frequency: mapNotifFromModel(row.notification_frequency),

    created_at: toIsoMaybe(row.created_at),
    updated_at: toIsoMaybe(row.updated_at),
    has_date: !!row.event_date,
  };
}
async function upsertFinanceBudgetFromInterview(eventId: string, initialBudget: number) {
  const existing = await Budget.findOne({ where: { event_id: eventId } });

  if (!existing) {
    await Budget.create({
      event_id: eventId,
      initial_budget: initialBudget,
      currency: "PLN",
      notes: null,
    });
    return;
  }

  existing.initial_budget = initialBudget;
  existing.currency = "PLN";
  await existing.save();
}


// GET /interview/:eventId
router.get("/:eventId", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    const interview = await EventInterview.findOne({ where: { event_id: eventId } });
    return res.json(interview ? toResponse(interview) : null);
  } catch (err) {
    console.error("Error getting interview", err);
    return res.status(500).json({ message: "Błąd pobierania wywiadu" });
  }
});

// PUT /interview/:eventId (upsert)
router.put("/:eventId", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;

    const validated = validatePayload(req.body);
    if (!validated.ok) return res.status(400).json({ message: validated.message });

    const payload = validated.payload;

    const dbPayload = {
      event_id: eventId,
      ceremony_type: mapCeremonyToModel(payload.ceremony_type),
      event_date: payload.event_date,

      // KLUCZ: DB ma string|null (DECIMAL)
      finance_initial_budget: toDecimalStringOrNull(payload.finance_initial_budget),

      guest_count_range: mapGuestRangeToModel(payload.guest_count_range),
      guest_list_status: mapGuestStatusToModel(payload.guest_list_status),

      music_provider_choice: mapMusicToModel(payload.music_provider_choice),
      venue_choice: mapVenueToModel(payload.venue_choice),

      required_vendors: payload.required_vendors as ModelVendorKey[],
      optional_vendors: payload.optional_vendors as ModelVendorKey[],

      wedding_day_enabled: payload.wedding_day_enabled,
      notification_frequency: mapNotifToModel(payload.notification_frequency),
    };

    const existing = await EventInterview.findOne({ where: { event_id: eventId } });

    if (!existing) {
      const created = await EventInterview.create(dbPayload);

// >>> DOPISZ TO
if (payload.finance_initial_budget != null) {
  await upsertFinanceBudgetFromInterview(eventId, payload.finance_initial_budget);
}

return res.status(201).json(toResponse(created));

    }

    existing.ceremony_type = dbPayload.ceremony_type;
    existing.event_date = dbPayload.event_date;

    existing.finance_initial_budget = dbPayload.finance_initial_budget;

    existing.guest_count_range = dbPayload.guest_count_range;
    existing.guest_list_status = dbPayload.guest_list_status;

    existing.music_provider_choice = dbPayload.music_provider_choice;
    existing.venue_choice = dbPayload.venue_choice;

    existing.required_vendors = dbPayload.required_vendors;
    existing.optional_vendors = dbPayload.optional_vendors;

    existing.wedding_day_enabled = dbPayload.wedding_day_enabled;
    existing.notification_frequency = dbPayload.notification_frequency;

    await existing.save();
    if (payload.finance_initial_budget != null) {
  await upsertFinanceBudgetFromInterview(eventId, payload.finance_initial_budget);
}
    return res.json(toResponse(existing));
  } catch (err) {
    console.error("Error saving interview", err);
    return res.status(500).json({ message: "Błąd zapisu wywiadu" });
  }
});

export default router;
