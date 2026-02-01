// /d:/CeremoDay/CeremoDay/web/src/pages/Vendors.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import type { InterviewResponse, VendorKey } from "../types/interview";
import type { Vendor, VendorType } from "../types/vendor";
import { api } from "../lib/api";

import {
  MapPin,
  Plus,
  Trash2,
  Search,
  ExternalLink,
  Loader2,
  Globe,
  Info,
  Mail,
  Phone,
  ReceiptText,
  Users,
  StickyNote,
  ClipboardList,
} from "lucide-react";

import VendorList from "../components/vendors/VendorList";
import RuralVenuesMap from "../components/vendors/RuralVenuesMap";
import Select, { type SelectOption } from "../ui/Select";
import VendorEditModal from "../components/vendors/VendorEditModal";
import ConfirmDialog from "../ui/ConfirmDialog";
import { useUiStore } from "../store/ui";

type Params = { id: string };

// ---------- Dodatkowe typy lokalne ----------
type VendorWithSource = Vendor & {
  county?: string;
  max_participants?: number;
  equipment?: string;
  pricing?: string;
  rental_info?: string;

  commune_office?: string;
  rural_type?: string;
  usable_area?: number;
};

// obiekty z bazy sal gminnych mogą mieć dodatkowe pola — ale NIE zapisujemy ich do event vendors (opcja A)
type RuralVenue = Vendor & {
  county?: string | null;
  max_participants?: number | null;
  equipment?: string | null;
  pricing?: string | null;
  rental_info?: string | null;

  commune_office?: string | null;
  rural_type?: string | null;
  usable_area?: number | null;

  lat?: number | null;
  lng?: number | null;
  location?: { lat?: number | null; lng?: number | null } | null;

  phone?: string | null;
  email?: string | null;
  website?: string | null;
  google_maps_url?: string | null;
};

// ---------- UI helpers ----------
const pageWrap = "w-full max-w-6xl mx-auto px-6 py-8";
const cardBase =
  "rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md " +
  "shadow-[0_24px_80px_rgba(0,0,0,0.45)]";
const box =
  "rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md " +
  "shadow-[0_18px_60px_rgba(0,0,0,0.35)]";
const sectionTitle = "text-sm font-semibold text-white/85";
const muted = "text-sm text-white/60";
const chip =
  "inline-flex items-center gap-2 px-3 py-1 rounded-full " +
  "border border-white/10 bg-white/5 text-white/80 text-xs";
const inputBase =
  "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85 " +
  "placeholder:text-white/35 outline-none focus:ring-2 focus:ring-[#c8a04b]/35";
const btnGold =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold " +
  "bg-gradient-to-r from-[#d7b45a] to-[#b98b2f] text-[#0b1b14] " +
  "shadow-[0_10px_30px_-18px_rgba(215,180,90,0.9)] " +
  "hover:brightness-105 active:translate-y-[1px] " +
  "focus:outline-none focus:ring-2 focus:ring-[#c8a04b]/45 " +
  "transition disabled:opacity-60 disabled:cursor-not-allowed";
const btnSecondary =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium " +
  "bg-white/5 text-white border border-white/10 " +
  "hover:bg-white/10 hover:border-white/15 " +
  "focus:outline-none focus:ring-2 focus:ring-[#c8a04b]/40 " +
  "transition disabled:opacity-60 disabled:cursor-not-allowed";

const tile = (active: boolean) =>
  [
    "rounded-2xl border px-4 py-3 cursor-pointer transition select-none text-left",
    "bg-white/5 backdrop-blur-md",
    active
      ? "border-[#c8a04b]/40 shadow-[0_18px_50px_-30px_rgba(215,180,90,0.85)]"
      : "border-white/10 hover:border-white/15 hover:bg-white/7",
  ].join(" ");

const inputErrorRing = " ring-2 ring-red-400/40";

// ---------- Search modes (UI) ----------
type SearchMode =
  | "DJ"
  | "BAND"
  | "HALL"
  | "RURAL_HALL"
  | "CATERING"
  | "PHOTO"
  | "VIDEO"
  | "DECOR"
  | "TRANSPORT"
  | "OTHER";

function labelForMode(m: SearchMode) {
  switch (m) {
    case "DJ":
      return "DJ";
    case "BAND":
      return "Orkiestra / zespół";
    case "HALL":
      return "Sala weselna";
    case "RURAL_HALL":
      return "Sala gminna / wiejska";
    case "CATERING":
      return "Catering";
    case "PHOTO":
      return "Fotograf";
    case "VIDEO":
      return "Kamerzysta";
    case "DECOR":
      return "Dekoracje / florysta";
    case "TRANSPORT":
      return "Transport";
    case "OTHER":
      return "Inne";
  }
}

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

// Zewnętrzne Google Maps (tylko link)
function buildGoogleMapsSearchUrl(args: { modeLabel: string; q?: string; location: string }): string {
  const extra = args.q?.trim() ? ` ${args.q.trim()}` : "";
  const query = `${args.modeLabel}${extra} ${args.location}`.trim();
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function str(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t ? t : undefined;
}

function num(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const txt = v.trim();
    if (!txt) return undefined;

    const m = txt.match(/\d+(?:[.,]\d+)?/);
    if (!m) return undefined;

    const n = Number(m[0].replace(",", "."));
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function normalizeRuralVenue(raw: unknown) {
  const r = raw as Record<string, unknown>;

  return {
    ...r,
    county: str(r.county) ?? str(r.powiat) ?? str(r.county_name) ?? undefined,
    max_participants: num(r.max_participants) ?? num(r.max_osob) ?? num(r.max_people) ?? undefined,
    equipment: str(r.equipment) ?? str(r.wyposazenie) ?? undefined,
    pricing: str(r.pricing) ?? str(r.cennik) ?? str(r.price) ?? undefined,
    rental_info: str(r.rental_info) ?? str(r.wynajem) ?? str(r.rental) ?? undefined,

    commune_office:
      str(r.commune_office) ?? str(r.urzad) ?? str(r.urzad_gminy) ?? str(r.communeOffice) ?? undefined,
    rural_type: str(r.rural_type) ?? str(r.type) ?? str(r.typ) ?? undefined,
    usable_area: num(r.usable_area) ?? num(r.powierzchnia_uzytkowa) ?? num(r.usableArea) ?? undefined,
  };
}

function normalizeVendorType(raw: unknown): VendorType {
  const v = String(raw ?? "").trim();

  const allowed: VendorType[] = ["venue", "catering", "music", "photo_video", "decorations", "transport", "other"];
  if ((allowed as string[]).includes(v)) return v as VendorType;

  const lower = v.toLowerCase();

  // mapowanie starych enumów (gdyby gdzieś jeszcze wracały)
  if (lower === "hall") return "venue";
  if (lower === "dj" || lower === "band") return "music";
  if (lower === "catering") return "catering";
  if (lower === "photo" || lower === "video") return "photo_video";
  if (lower === "decor") return "decorations";
  if (lower === "transport") return "transport";
  if (lower === "other") return "other";

  // mapowanie labeli z UI
  if (lower.includes("sala")) return "venue";
  if (lower.includes("catering")) return "catering";
  if (lower.includes("muzyka") || lower === "dj" || lower.includes("orkiestra") || lower.includes("zesp")) return "music";
  if (lower.includes("foto") || lower.includes("wideo") || lower.includes("kamer")) return "photo_video";
  if (lower.includes("dekor") || lower.includes("flor")) return "decorations";
  if (lower.includes("transport")) return "transport";

  return "other";
}



function truthyText(v: unknown) {
  if (typeof v !== "string") return Boolean(v);
  const t = v.trim().toLowerCase();
  if (!t) return false;
  if (t === "null" || t === "undefined" || t === "brak danych") return false;
  return true;
}

function normalizeMyVendor(raw: unknown): VendorWithSource {
  const r = (raw ?? {}) as Record<string, unknown>;

  const county = str(r.county) ?? str(r.powiat);
  const max_participants = num(r.max_participants) ?? num(r.maxParticipants) ?? num(r.max_osob);
  const equipment = str(r.equipment) ?? str(r.wyposazenie);
  const pricing = str(r.pricing) ?? str(r.cennik);
  const rental_info = str(r.rental_info) ?? str(r.rentalInfo) ?? str(r.wynajem);

  const commune_office = str(r.commune_office) ?? str(r.communeOffice) ?? str(r.urzad_gminy) ?? str(r.urzad);
  const rural_type = str(r.rural_type) ?? str(r.ruralType) ?? str(r.type_name) ?? str(r.typ);
  const usable_area = num(r.usable_area) ?? num(r.usableArea) ?? num(r.powierzchnia_uzytkowa);

  const hasRuralSnapshot =
    truthyText(county) ||
    max_participants != null ||
    truthyText(equipment) ||
    truthyText(pricing) ||
    truthyText(rental_info) ||
    truthyText(commune_office) ||
    truthyText(rural_type) ||
    usable_area != null;

  const rawSource = str(r.source) ?? str(r.vendor_source) ?? str(r.vendorSource) ?? undefined;
  const source = (rawSource ?? (hasRuralSnapshot ? "RURAL" : "CUSTOM")) as VendorWithSource["source"];

  const id = typeof r.id === "string" ? r.id : String(r.id ?? "");
  const name = typeof r.name === "string" ? r.name : "";
  const address = typeof r.address === "string" ? r.address : "";

  const locRaw = r.location as unknown;
  const location =
    locRaw && typeof locRaw === "object"
      ? {
          lat: num((locRaw as Record<string, unknown>).lat) ?? 0,
          lng: num((locRaw as Record<string, unknown>).lng) ?? 0,
        }
      : null;

  const type = (typeof r.type === "string" ? (r.type as VendorType) : undefined) as VendorWithSource["type"];

  const phone = str(r.phone);
  const email = str(r.email);
  const website = str(r.website);
  const google_maps_url = str(r.google_maps_url);
  const notes = str(r.notes);

  const lat = num(r.lat) ?? null;
  const lng = num(r.lng) ?? null;

  return {
    id,
    source,
    name,
    address,
    location,

    type,
    phone,
    email,
    website,
    google_maps_url,
    notes,
    lat,
    lng,

    county,
    max_participants,
    equipment,
    pricing,
    rental_info,

    commune_office,
    rural_type,
    usable_area,
  };
}

// mapowanie z interview VendorKey -> SearchMode
function vendorKeyToMode(k: VendorKey): SearchMode | null {
  switch (k) {
    case "CATERING":
      return "CATERING";
    case "PHOTOGRAPHER":
      return "PHOTO";
    case "VIDEOGRAPHER":
      return "VIDEO";
    case "DECOR_FLORIST":
      return "DECOR";
    case "TRANSPORT":
      return "TRANSPORT";
    default:
      return null;
  }
}

function modeToVendorType(mode: SearchMode): VendorType {
  switch (mode) {
    case "DJ":
    case "BAND":
      return "music";
    case "HALL":
    case "RURAL_HALL":
      return "venue";
    case "CATERING":
      return "catering";
    case "PHOTO":
    case "VIDEO":
      return "photo_video";
    case "DECOR":
      return "decorations";
    case "TRANSPORT":
      return "transport";
    default:
      return "other";
  }
}


function isHttpUrl(v?: string | null) {
  if (!v) return false;
  const t = v.trim().toLowerCase();
  return t.startsWith("http://") || t.startsWith("https://");
}

function withHttp(v?: string | null) {
  if (!v) return undefined;
  const t = v.trim();
  if (!t) return undefined;
  return isHttpUrl(t) ? t : `https://${t}`;
}

function telHref(v?: string | null) {
  if (!v) return undefined;
  const t = v.trim();
  if (!t) return undefined;
  const cleaned = t.replace(/\s+/g, "");
  return `tel:${cleaned}`;
}

function mailHref(v?: string | null) {
  if (!v) return undefined;
  const t = v.trim();
  if (!t) return undefined;
  return `mailto:${t}`;
}

function normalizePhone9(v?: string | null): string | undefined {
  if (!v) return undefined;
  const digits = onlyDigits(v);
  return digits.length === 9 ? digits : undefined;
}

function normalizeEmail(v?: string | null): string | undefined {
  if (!v) return undefined;
  const e = v.trim().toLowerCase();
  return e && isValidEmail(e) ? e : undefined;
}

function normalizeWebsiteHttp(v?: string | null): string | undefined {
  if (!v) return undefined;
  const w = v.trim();
  if (!w) return undefined;
  return isHttpUrl(w) ? w : undefined;
}


function toPhone9Input(raw: string) {
  return raw.replace(/[^0-9]/g, "").slice(0, 9);
}



// ---------- Walidacja ----------
type FieldErrors = Partial<Record<"name" | "type" | "phone" | "email" | "website" | "google_maps_url" | "notes", string>>;
type CreateVendorPayload = {
  name: string;
  type: VendorType;

  phone?: string;
  email?: string;
  website?: string;
  google_maps_url?: string;
  notes?: string;
};

function onlyDigits(v: string) {
  return v.replace(/\D+/g, "");
}

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

function validateVendorForm(input: {
  name: string;
  type: VendorType | string;
  phone: string;
  email: string;
  website: string;
  google_maps_url: string;
  notes: string;
}): { ok: boolean; errors: FieldErrors; payload: CreateVendorPayload } {
  const errors: FieldErrors = {};

  // Nazwa
  const name = input.name.trim();
  if (name.length < 2) errors.name = "Podaj nazwę (min. 2 znaki).";

  // Typ
  const type = normalizeVendorType(input.type);
  if (!type) errors.type = "Wybierz typ usługodawcy.";

  // Telefon: tylko cyfry + dokładnie 9 jeśli wpisany
  const phoneDigits = onlyDigits(input.phone);
  const phoneProvided = phoneDigits.length > 0;

  if (phoneProvided && phoneDigits.length !== 9) {
    errors.phone = "Telefon musi mieć dokładnie 9 cyfr (0-9).";
  }

  // Email: jeśli wpisany -> poprawny
  const email = input.email.trim().toLowerCase();
  const emailProvided = email.length > 0;

  if (emailProvided && !isValidEmail(email)) {
    errors.email = "Podaj poprawny adres email.";
  }

  // ✅ WYMÓG: co najmniej jedno z dwóch: telefon(9 cyfr) lub poprawny email
  const hasValidPhone = phoneDigits.length === 9;
  const hasValidEmail = emailProvided && isValidEmail(email);

  if (!hasValidPhone && !hasValidEmail) {
    errors.phone = "Podaj telefon (9 cyfr) lub email.";
    errors.email = "Podaj email lub telefon (9 cyfr).";
  }

  // WWW: jeśli wpisane -> dopinamy https:// gdy brak
  const websiteRaw = input.website.trim();
let website: string | undefined = undefined;

if (websiteRaw) {
  if (!isHttpUrl(websiteRaw)) {
    errors.website = "Link musi zaczynać się od http:// lub https://";
  } else {
    website = websiteRaw;
  }
}


  // Google Maps: jeśli wpisane -> musi zaczynać się od http(s) (nie dopinamy)
  const mapsRaw = input.google_maps_url.trim();
  if (mapsRaw && !isHttpUrl(mapsRaw)) {
    errors.google_maps_url = "Link musi zaczynać się od http:// lub https://";
  }

  // Notes
  const notes = input.notes.trim();

  const ok = Object.keys(errors).length === 0;

  const payload: CreateVendorPayload = {
    name,
    type,
    phone: hasValidPhone ? phoneDigits : undefined,
    email: hasValidEmail ? email : undefined,
    website,
    google_maps_url: mapsRaw ? mapsRaw : undefined,
    notes: notes ? notes : undefined,
  };

  return { ok, errors, payload };
}



export default function Vendors() {
  const { id: eventId } = useParams<Params>();

  const [interview, setInterview] = useState<InterviewResponse | null>(null);
  const [interviewLoading, setInterviewLoading] = useState(true);

  // Moi usługodawcy
  const [myVendors, setMyVendors] = useState<VendorWithSource[]>([]);
  const [myLoading, setMyLoading] = useState(false);

  // Formularz “Dodaj własnego”
  const [createForm, setCreateForm] = useState<{
    name: string;
    type: VendorType;
    phone: string;
    email: string;
    website: string;
    google_maps_url: string;
    notes: string;
  }>({
    name: "",
    type: "other",
    phone: "",
    email: "",
    website: "",
    google_maps_url: "",
    notes: "",
  });

  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createFieldErrors, setCreateFieldErrors] = useState<FieldErrors>({});

  // Toast (global, spójny w całej aplikacji)
  const uiToast = useUiStore((s) => s.toast);
  const showToast = (type: "success" | "error", text: string) => {
    uiToast({
      tone: type === "success" ? "success" : "danger",
      title: type === "success" ? "Sukces" : "Błąd",
      message: text,
    });
  };

  // Confirm
  const [confirm, setConfirm] = useState<null | {
    title: string;
    message: string;
    confirmText: string;
    danger?: boolean;
    onConfirm: () => Promise<void> | void;
  }>(null);

  // Edit modal
  const [editingVendor, setEditingVendor] = useState<VendorWithSource | null>(null);
  const openEditModal = (vendor: VendorWithSource) => setEditingVendor(vendor);

  // Search state
  const [activeMode, setActiveMode] = useState<SearchMode>("HALL");
  const [q, setQ] = useState("");
  const [location, setLocation] = useState<string>("Rzeszów");

  // Rural results
  const [ruralLoading, setRuralLoading] = useState(false);
  const [ruralResults, setRuralResults] = useState<RuralVenue[]>([]);
  const [selectedRural, setSelectedRural] = useState<RuralVenue | null>(null);

  const [error, setError] = useState<string | null>(null);

  const allowedModes = useMemo<SearchMode[]>(() => {
    if (!interview) {
      return ["HALL", "RURAL_HALL", "DJ", "BAND", "CATERING", "PHOTO", "VIDEO", "DECOR", "TRANSPORT", "OTHER"];
    }

    const modes: SearchMode[] = [];
    if (interview.venue_choice === "WEDDING_HALL") modes.push("HALL");
    if (interview.venue_choice === "RURAL_VENUE") modes.push("RURAL_HALL");
    if (interview.music_provider_choice === "DJ") modes.push("DJ");
    if (interview.music_provider_choice === "BAND") modes.push("BAND");

    const opt = new Set<VendorKey>(interview.optional_vendors ?? []);
    for (const k of opt) {
      const m = vendorKeyToMode(k);
      if (m) modes.push(m);
    }

    modes.push("OTHER");
    return uniq(modes);
  }, [interview]);

  useEffect(() => {
    if (!allowedModes.length) return;
    if (!allowedModes.includes(activeMode)) {
      setActiveMode(allowedModes[0]);
      setRuralResults([]);
      setSelectedRural(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowedModes.join("|")]);

  useEffect(() => {
    if (!eventId) return;
    let alive = true;

    const load = async () => {
      setError(null);
      setInterviewLoading(true);
      setMyLoading(true);

      try {
        const ev = await api.getEvent(eventId);
        if (!alive) return;
        const loc = (ev.location ?? "").trim();
        if (loc) setLocation(loc);

        const i = await api.getInterview(eventId);
        if (!alive) return;
        setInterview(i);

        const rawList = await api.getEventVendors(eventId);
        if (!alive) return;

        const list = (Array.isArray(rawList) ? rawList : []).map(normalizeMyVendor);
        setMyVendors(list);
      } catch (e) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Nie udało się pobrać usługodawców");
      } finally {
        if (alive) {
          setInterviewLoading(false);
          setMyLoading(false);
        }
      }
    };

    void load();
    return () => {
      alive = false;
    };
  }, [eventId]);

  const reloadMyVendors = async () => {
    if (!eventId) return;
    const rawList = await api.getEventVendors(eventId);
    const list = (Array.isArray(rawList) ? rawList : []).map(normalizeMyVendor);
    setMyVendors(list);
  };

  const removeMyVendor = async (id: string) => {
    const vendor = myVendors.find((x) => x.id === id);
    if (!vendor) return;

    setConfirm({
      title: "Usunąć usługodawcę?",
      message: `Usługodawca "${vendor.name}" zostanie trwale usunięty z wydarzenia.`,
      confirmText: "Usuń usługodawcę",
      danger: true,
      onConfirm: async () => {
        try {
          setError(null);
          await api.deleteVendor(id);
          setMyVendors((prev) => prev.filter((x) => x.id !== id));
          setConfirm(null);
          showToast("success", "Usługodawca został usunięty.");
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Nie udało się usunąć usługodawcy";
          setError(msg);
          setConfirm(null);
          showToast("error", msg);
        }
      },
    });
  };

const addRuralToMy = async (v: RuralVenue) => {
  if (!eventId) return;

  try {
    setError(null);

    const lat = v.location?.lat ?? v.lat ?? undefined;
    const lng = v.location?.lng ?? v.lng ?? undefined;

    // ✅ SANITYZACJA pod backendowe walidacje
    // (dla RURAL kontakt jest opcjonalny, ale jak jest -> musi być poprawny)
    const safePhone = normalizePhone9(v.phone ?? null);
    const safeEmail = normalizeEmail(v.email ?? null);
    const safeWebsite = normalizeWebsiteHttp(v.website ?? null);

    await api.createVendor({
      event_id: eventId,
      name: v.name,
      source: "RURAL",

      // ✅ backendowy typ
      type: "venue",

      address: v.address ?? undefined,

      // ✅ Kontakt opcjonalny dla RURAL (backend ma obejście)
      phone: safePhone,
      email: safeEmail,
      website: safeWebsite,

      google_maps_url: v.google_maps_url ?? undefined,
      notes: undefined,
      lat,
      lng,

      county: v.county ?? undefined,
      max_participants: v.max_participants ?? undefined,
      equipment: v.equipment ?? undefined,
      pricing: v.pricing ?? undefined,
      rental_info: v.rental_info ?? undefined,

      commune_office: v.commune_office ?? undefined,
      rural_type: v.rural_type ?? undefined,
      usable_area: v.usable_area ?? undefined,
    });

    await reloadMyVendors();
    showToast("success", "Dodano obiekt do moich usługodawców.");
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Nie udało się dodać usługodawcy";
    setError(msg);
    showToast("error", msg);
  }
};



  const handleCreateCustomVendor = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!eventId) return;

    setCreateError(null);
    setCreateFieldErrors({});
    setCreateLoading(true);

    try {
      const v = validateVendorForm(createForm);
      if (!v.ok) {
        setCreateFieldErrors(v.errors);
        setCreateError("Popraw pola w formularzu.");
        return;
      }

      await api.createVendor({
        event_id: eventId,
        source: "CUSTOM",
        address: undefined,
        lat: undefined,
        lng: undefined,
        ...v.payload,
      });

      setCreateForm({
        name: "",
        type: "other",
        phone: "",
        email: "",
        website: "",
        google_maps_url: "",
        notes: "",
      });

      await reloadMyVendors();
      showToast("success", "Usługodawca został dodany.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Nie udało się dodać usługodawcy.";
      setCreateError(msg);
      showToast("error", msg);
    } finally {
      setCreateLoading(false);
    }
  };

  const runSearch = async () => {
    if (!eventId) return;
    setError(null);

    if (activeMode !== "RURAL_HALL") {
      const url = buildGoogleMapsSearchUrl({
        modeLabel: labelForMode(activeMode),
        q,
        location,
      });

      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }

    setRuralLoading(true);
    setRuralResults([]);
    setSelectedRural(null);

    try {
      const raw = await api.getRuralVenues({ q: q.trim() ? q.trim() : undefined });
      const list = (Array.isArray(raw) ? raw : []).map((x) => normalizeRuralVenue(x)) as RuralVenue[];

      setRuralResults(list);
      setSelectedRural(list[0] ?? null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Nie udało się wyszukać sal gminnych";
      setError(msg);
      showToast("error", msg);
    } finally {
      setRuralLoading(false);
    }
  };

  const modeLabel = useMemo(() => {
    if (!interview?.ceremony_type) return "—";
    if (interview.ceremony_type === "reception_only") return "Samo przyjęcie";
    if (interview.ceremony_type === "civil") return "Ślub cywilny";
    if (interview.ceremony_type === "church") return "Ślub kościelny";
    return interview.ceremony_type;
  }, [interview?.ceremony_type]);

const myTypeLabel = (t?: VendorType) => {
  if (!t) return "—";
  switch (t) {
    case "venue":
      return "Sala";
    case "catering":
      return "Catering";
    case "music":
      return "Muzyka (DJ / zespół)";
    case "photo_video":
      return "Foto / wideo";
    case "decorations":
      return "Dekoracje / florysta";
    case "transport":
      return "Transport";
    case "other":
      return "Inne";
    default:
      return t;
  }
};


 const vendorTypeOptions = useMemo<ReadonlyArray<SelectOption<VendorType>>>(
  () => [
    { value: "venue", label: "Sala (weselna / gminna)" },
    { value: "catering", label: "Catering" },
    { value: "music", label: "Muzyka (DJ / zespół)" },
    { value: "photo_video", label: "Fotograf / kamerzysta" },
    { value: "decorations", label: "Dekoracje / florysta" },
    { value: "transport", label: "Transport" },
    { value: "other", label: "Inne" },
  ],
  []
);


  return (
    <div className={pageWrap}>
      <div className={`${cardBase} p-6 md:p-8`}>
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-[#d7b45a]" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-white">Usługodawcy</h1>
              <p className={muted}>Moi usługodawcy + wyszukiwarka dopasowana do wywiadu.</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2">
            {interviewLoading ? (
              <span className="text-xs text-white/50">Ładowanie wywiadu…</span>
            ) : (
              <span className="text-xs text-white/50">Tryb: {modeLabel}</span>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-2xl border border-red-400/20 bg-red-500/10 text-red-100 px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {/* A) Moi usługodawcy */}
        <section className={`${box} p-5 mb-6`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className={sectionTitle}>Moi usługodawcy</h2>
              <p className="text-sm text-white/55 mt-1">Lista usługodawców przypisanych do wydarzenia.</p>
            </div>
            <span className={chip}>{myLoading ? "Ładowanie…" : `${myVendors.length} pozycji`}</span>
          </div>

          {myVendors.length === 0 && !myLoading ? (
            <div className="mt-4 text-sm text-white/60">
              Nie masz jeszcze żadnych usługodawców. Dodaj pierwszego z panelu poniżej lub z wyszukiwarki.
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {myVendors.map((v) => {
                const isRural = v.source === "RURAL";
                const hasRural =
                  truthyText(v.county) ||
                  v.max_participants != null ||
                  truthyText(v.equipment) ||
                  truthyText(v.pricing) ||
                  truthyText(v.rental_info) ||
                  truthyText(v.commune_office) ||
                  truthyText(v.rural_type) ||
                  v.usable_area != null;

                const websiteUrl = withHttp(v.website ?? null);
                const mapsUrl = v.google_maps_url ? v.google_maps_url.trim() : undefined;
                const phoneUrl = telHref(v.phone ?? null);
                const emailUrl = mailHref(v.email ?? null);

                return (
                  <div
                    key={v.id}
                    className={[
                      "rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md",
                      "shadow-[0_18px_60px_rgba(0,0,0,0.35)]",
                      "px-5 py-5 md:px-6 md:py-6",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-4">
                      {/* LEFT */}
                      <div className="min-w-0 w-full">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-[18px] md:text-[20px] font-semibold text-white leading-snug truncate">
                            {v.name}
                          </div>

                          <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[12px] text-white/80">
                            {myTypeLabel(v.type)}
                          </span>
                        </div>

                        {v.address ? (
                          <div className="mt-3 flex items-start gap-2 text-[14px] md:text-[15px] text-white/80">
                            <MapPin className="w-4 h-4 mt-[2px] text-[#d7b45a]" />
                            <span className="min-w-0 break-words">{v.address}</span>
                          </div>
                        ) : null}

                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2">
                          {v.phone ? (
                            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                              <div className="flex items-center gap-2 text-[12px] tracking-wider uppercase text-white/50">
                                <Phone className="w-4 h-4 text-[#d7b45a]" />
                                Telefon
                              </div>
                              <div className="mt-1 text-[14px] md:text-[15px] text-white/85">
                                {phoneUrl ? (
                                  <a className="hover:underline" href={phoneUrl}>
                                    {v.phone}
                                  </a>
                                ) : (
                                  v.phone
                                )}
                              </div>
                            </div>
                          ) : null}

                          {v.email ? (
                            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                              <div className="flex items-center gap-2 text-[12px] tracking-wider uppercase text-white/50">
                                <Mail className="w-4 h-4 text-[#d7b45a]" />
                                Email
                              </div>
                              <div className="mt-1 text-[14px] md:text-[15px] text-white/85 break-all">
                                {emailUrl ? (
                                  <a className="hover:underline" href={emailUrl}>
                                    {v.email}
                                  </a>
                                ) : (
                                  v.email
                                )}
                              </div>
                            </div>
                          ) : null}

                          {websiteUrl ? (
                            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                              <div className="flex items-center gap-2 text-[12px] tracking-wider uppercase text-white/50">
                                <Globe className="w-4 h-4 text-[#d7b45a]" />
                                WWW
                              </div>
                              <div className="mt-1 text-[14px] md:text-[15px] text-white/85 break-all">
                                <a className="hover:underline" href={websiteUrl} target="_blank" rel="noopener noreferrer">
                                  {v.website}
                                </a>
                              </div>
                            </div>
                          ) : null}

                          {mapsUrl ? (
                            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                              <div className="flex items-center gap-2 text-[12px] tracking-wider uppercase text-white/50">
                                <MapPin className="w-4 h-4 text-[#d7b45a]" />
                                Google Maps
                              </div>
                              <div className="mt-1 text-[14px] md:text-[15px] text-white/85 break-all">
                                <a className="hover:underline" href={mapsUrl} target="_blank" rel="noopener noreferrer">
                                  Otwórz mapę
                                </a>
                              </div>
                            </div>
                          ) : null}
                        </div>

                        {v.notes ? (
                          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                            <div className="flex items-center gap-2 text-[12px] tracking-wider uppercase text-white/55">
                              <StickyNote className="w-4 h-4 text-[#d7b45a]" />
                              Notatki
                            </div>
                            <div className="mt-2 text-[14px] md:text-[15px] text-white/85 whitespace-pre-wrap leading-relaxed">
                              {v.notes}
                            </div>
                          </div>
                        ) : null}

                        {isRural && hasRural ? (
                          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 md:p-5">
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-[12px] tracking-wider uppercase text-white/55">Dane sali gminnej (podgląd)</div>
                              <div className="text-[12px] text-white/45">bez edycji</div>
                            </div>

                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                              {v.county ? (
                                <div className="rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3">
                                  <div className="text-[11px] tracking-wider uppercase text-white/50">Powiat</div>
                                  <div className="mt-1 text-[15px] text-white/90 font-medium">{v.county}</div>
                                </div>
                              ) : null}

                              {v.max_participants != null ? (
                                <div className="rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3">
                                  <div className="text-[11px] tracking-wider uppercase text-white/50">Max osób</div>
                                  <div className="mt-1 text-[15px] text-white/90 font-medium">{v.max_participants}</div>
                                </div>
                              ) : null}

                              {v.commune_office ? (
                                <div className="md:col-span-2 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3">
                                  <div className="text-[11px] tracking-wider uppercase text-white/50">Podlegający urząd</div>
                                  <div className="mt-1 text-[14px] md:text-[15px] text-white/90 font-medium">{v.commune_office}</div>
                                </div>
                              ) : null}

                              {v.rural_type ? (
                                <div className="rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3">
                                  <div className="text-[11px] tracking-wider uppercase text-white/50">Typ obiektu</div>
                                  <div className="mt-1 text-[15px] text-white/90 font-medium">{v.rural_type}</div>
                                </div>
                              ) : null}

                              {v.usable_area != null ? (
                                <div className="rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3">
                                  <div className="text-[11px] tracking-wider uppercase text-white/50">Powierzchnia</div>
                                  <div className="mt-1 text-[15px] text-white/90 font-medium">{v.usable_area} m²</div>
                                </div>
                              ) : null}

                              {v.equipment ? (
                                <div className="md:col-span-2 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3">
                                  <div className="text-[11px] tracking-wider uppercase text-white/50">Wyposażenie</div>
                                  <div className="mt-1 text-[14px] md:text-[15px] text-white/85 whitespace-pre-wrap">{v.equipment}</div>
                                </div>
                              ) : null}

                              {v.pricing ? (
                                <div className="md:col-span-2 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3">
                                  <div className="text-[11px] tracking-wider uppercase text-white/50">Cennik / warunki</div>
                                  <div className="mt-1 text-[14px] md:text-[15px] text-white/85 whitespace-pre-wrap">{v.pricing}</div>
                                </div>
                              ) : null}

                              {v.rental_info ? (
                                <div className="md:col-span-2 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3">
                                  <div className="text-[11px] tracking-wider uppercase text-white/50">Informacje o wynajmie</div>
                                  <div className="mt-1 text-[14px] md:text-[15px] text-white/85 whitespace-pre-wrap">{v.rental_info}</div>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        ) : null}
                      </div>

                      {/* RIGHT actions */}
                      <div className="shrink-0 flex flex-col gap-2">
                        <button
                          type="button"
                          className={[
                            "h-10 px-4 rounded-xl",
                            "border border-white/10 bg-white/5 text-white/85",
                            "hover:bg-white/10 hover:border-white/15 transition",
                            "inline-flex items-center gap-2",
                          ].join(" ")}
                          onClick={() => openEditModal(v)}
                          title="Edytuj"
                        >
                          <span className="text-[#d7b45a]">✎</span>
                          <span className="text-[14px]">Edytuj</span>
                        </button>

                        <button
                          type="button"
                          className={[
                            "h-10 px-4 rounded-xl",
                            "border border-white/10 bg-white/5 text-white/70",
                            "hover:bg-red-500/10 hover:border-red-300/20 hover:text-red-100 transition",
                            "inline-flex items-center gap-2",
                          ].join(" ")}
                          onClick={() => void removeMyVendor(v.id)}
                          title="Usuń"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="text-[14px]">Usuń</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* B) Dodaj własnego usługodawcę */}
        <section className={`${box} p-5 mb-6`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className={sectionTitle}>Dodaj własnego usługodawcę</h2>
              <p className="text-sm text-white/55 mt-1">Dodaj firmę ręcznie — będzie zawsze pod ręką.</p>
            </div>
            <span className={chip}>Własne</span>
          </div>

          {createError && (
            <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-500/10 text-red-100 px-4 py-3 text-sm">
              {createError}
            </div>
          )}

          <form onSubmit={handleCreateCustomVendor} className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-white/55">Nazwa *</label>
                <input
                  className={inputBase + (createFieldErrors.name ? inputErrorRing : "")}
                  value={createForm.name}
                  onChange={(e) => setCreateForm((s) => ({ ...s, name: e.target.value }))}
                  placeholder="np. Foto Studio XYZ"
                />
                {createFieldErrors.name && <div className="mt-1 text-xs text-red-200">{createFieldErrors.name}</div>}
              </div>

              <div className="relative z-[5]">
                <div className={createFieldErrors.type ? `rounded-2xl ${inputErrorRing}` : ""}>
                  <Select<VendorType>
                    label="Typ *"
                    value={createForm.type}
                    onChange={(v) => setCreateForm((s) => ({ ...s, type: v }))}
                    options={vendorTypeOptions}
                  />
                </div>
                {createFieldErrors.type && <div className="mt-1 text-xs text-red-200">{createFieldErrors.type}</div>}
              </div>

              <div>
                <label className="text-xs text-white/55">Telefon</label>
                <input
  className={inputBase + (createFieldErrors.phone ? inputErrorRing : "")}
  value={createForm.phone}
  inputMode="numeric"
  pattern="[0-9]*"
  maxLength={9}
  onChange={(e) =>
    setCreateForm((s) => ({
      ...s,
      phone: toPhone9Input(e.target.value),
    }))
  }
  placeholder="600000000"
/>

                {createFieldErrors.phone && <div className="mt-1 text-xs text-red-200">{createFieldErrors.phone}</div>}
                <div className="mt-1 text-[11px] text-white/45">Wpisz 9 cyfr (bez spacji i +48).</div>
              </div>

              <div>
                <label className="text-xs text-white/55">Email</label>
                <input
                  className={inputBase + (createFieldErrors.email ? inputErrorRing : "")}
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm((s) => ({ ...s, email: e.target.value }))}
                  placeholder="kontakt@firma.pl"
                />
                {createFieldErrors.email && <div className="mt-1 text-xs text-red-200">{createFieldErrors.email}</div>}
              </div>

              <div>
                <label className="text-xs text-white/55">WWW</label>
                <input
                  className={inputBase + (createFieldErrors.website ? inputErrorRing : "")}
                  value={createForm.website}
                  onChange={(e) => setCreateForm((s) => ({ ...s, website: e.target.value }))}
                  placeholder="twojastrona.pl lub https://twojastrona.pl"
                />
                {createFieldErrors.website && <div className="mt-1 text-xs text-red-200">{createFieldErrors.website}</div>}
                <div className="mt-1 text-[11px] text-white/45">Adres powinien zaczynać się od http:// lub https:// </div>
              </div>

              <div>
                <label className="text-xs text-white/55">Link Google Maps</label>
                <input
                  className={inputBase + (createFieldErrors.google_maps_url ? inputErrorRing : "")}
                  value={createForm.google_maps_url}
                  onChange={(e) => setCreateForm((s) => ({ ...s, google_maps_url: e.target.value }))}
                  placeholder="https://maps.google.com/?q=..."
                />
                {createFieldErrors.google_maps_url && (
                  <div className="mt-1 text-xs text-red-200">{createFieldErrors.google_maps_url}</div>
                )}
                <div className="mt-1 text-[11px] text-white/45">Wklej pełny link z Google Maps (musi zaczynać się od http:// lub https://).</div>
              </div>

              <div className="md:col-span-2">
                <label className="text-xs text-white/55">Notatki</label>
                <textarea
                  className={`${inputBase} min-h-[110px] py-3`}
                  value={createForm.notes}
                  onChange={(e) => setCreateForm((s) => ({ ...s, notes: e.target.value }))}
                  placeholder="np. ustalenia, ceny, terminy, kontakt do menedżera…"
                />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end gap-3">
              <button type="submit" className={btnGold} disabled={createLoading}>
                {createLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Dodaj do moich
              </button>
            </div>
          </form>
        </section>

        {/* C) Wyszukaj */}
        <section className={`${box} p-5`}>
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className={sectionTitle}>Wyszukaj</h2>
              <p className="text-sm text-white/55 mt-1">
                Dla większości opcji otwieramy zewnętrzne Google Maps. Wyjątek:{" "}
                <span className="text-white font-semibold">Sala gminna / wiejska</span> – mapa w aplikacji (OSM).
              </p>
            </div>
            <span className={chip}>{allowedModes.length ? `${allowedModes.length} opcji` : "—"}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {allowedModes.map((m) => (
              <button
                key={m}
                type="button"
                className={tile(activeMode === m)}
                onClick={() => {
                  setActiveMode(m);
                  setRuralResults([]);
                  setSelectedRural(null);
                  setCreateForm((s) => ({ ...s, type: modeToVendorType(m) }));
                }}
              >
                <div className="text-sm font-semibold text-white">{labelForMode(m)}</div>
                <div className="text-xs text-white/55 mt-1">
                  {m === "RURAL_HALL" ? "Wewnętrzna baza + lista + mapa" : "Otworzy Google Maps w nowej karcie"}
                </div>
              </button>
            ))}
          </div>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="text-xs text-white/55">Fraza / nazwa (opcjonalnie)</label>
              <input className={inputBase} value={q} onChange={(e) => setQ(e.target.value)} placeholder="np. 'Dworek', 'foto', 'dekoracje'…" />
            </div>

            {activeMode !== "RURAL_HALL" && (
              <div>
                <label className="text-xs text-white/55">Lokalizacja</label>
                <input className={inputBase} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="np. Warszawa / Kraków / adres" />
              </div>
            )}
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button type="button" className={btnGold} onClick={() => void runSearch()} disabled={ruralLoading}>
              {ruralLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : activeMode === "RURAL_HALL" ? (
                <Search className="w-4 h-4" />
              ) : (
                <ExternalLink className="w-4 h-4" />
              )}
              {activeMode === "RURAL_HALL" ? "Szukaj w bazie" : "Otwórz w Google Maps"}
            </button>
          </div>

          {activeMode === "RURAL_HALL" && (
            <div className="mt-6">
              {ruralLoading ? (
                <div className="text-sm text-white/60">Szukam sal gminnych…</div>
              ) : ruralResults.length === 0 ? (
                <div className="text-sm text-white/55">Brak wyników.</div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                  <div className="lg:col-span-4 rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
                    <div className="px-4 py-3 border-b border-white/10">
                      <div className="text-sm font-semibold text-white">Lista</div>
                      <div className="text-xs text-white/55 mt-1">{ruralResults.length} wyników</div>
                    </div>

                    <div className="h-[520px] overflow-y-auto overflow-x-hidden">
                      <VendorList vendors={ruralResults} selectedId={selectedRural?.id ?? null} onSelect={(v) => setSelectedRural(v as RuralVenue)} />
                    </div>
                  </div>

                  <div className="lg:col-span-8">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="text-sm text-white/70 min-w-0 truncate">
                        {selectedRural ? (
                          <>
                            Wybrano: <span className="text-white font-semibold">{selectedRural.name}</span>
                          </>
                        ) : (
                          "Wybierz obiekt z listy lub kliknij pinezkę"
                        )}
                      </div>
                    </div>

                    <div className="h-[520px] rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
                      <RuralVenuesMap venues={ruralResults} selectedId={selectedRural?.id ?? null} onSelect={(v) => setSelectedRural(v as RuralVenue)} />
                    </div>
                  </div>

                  <div className="lg:col-span-12">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-sm font-semibold text-white/85">Szczegóły obiektu</div>
                          <div className="text-xs text-white/55 mt-1">
                            Kliknij na liście lub na pinezce — tutaj pokażemy dane z bazy sal gminnych.
                          </div>
                        </div>

                        {selectedRural && (
                          <button type="button" className={btnSecondary} onClick={() => void addRuralToMy(selectedRural)}>
                            <Plus className="w-4 h-4 text-[#d7b45a]" />
                            Dodaj do moich
                          </button>
                        )}
                      </div>

                      {!selectedRural ? (
                        <div className="mt-4 text-sm text-white/60">Brak wybranego obiektu.</div>
                      ) : (
                        <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
                          <div className="lg:col-span-5 rounded-2xl border border-white/10 bg-white/5 p-5">
                            <div className="text-lg font-semibold text-white leading-snug">{selectedRural.name}</div>

                            {selectedRural.address ? (
                              <div className="mt-2 flex items-center gap-2 text-sm text-white/70">
                                <MapPin className="w-4 h-4 text-white/55" />
                                <span>{selectedRural.address}</span>
                              </div>
                            ) : null}

                            <div className="mt-4 grid gap-2">
                              {selectedRural.county ? (
                                <div className="text-sm text-white/70">
                                  Powiat: <span className="text-white/90 font-medium">{selectedRural.county}</span>
                                </div>
                              ) : null}

                              {selectedRural.commune_office ? (
                                <div className="text-sm text-white/70">
                                  Podlegający urząd: <span className="text-white/90 font-medium">{selectedRural.commune_office}</span>
                                </div>
                              ) : null}

                              {typeof selectedRural.max_participants === "number" ? (
                                <div className="flex items-center gap-2 text-sm text-white/70">
                                  <Users className="w-4 h-4 text-white/55" />
                                  <span>
                                    Max. uczestników: <span className="text-white/90 font-medium">{selectedRural.max_participants}</span>
                                  </span>
                                </div>
                              ) : null}

                              {selectedRural.rural_type ? (
                                <div className="text-sm text-white/70">
                                  Typ obiektu: <span className="text-white/90 font-medium">{selectedRural.rural_type}</span>
                                </div>
                              ) : null}

                              {typeof selectedRural.usable_area === "number" ? (
                                <div className="text-sm text-white/70">
                                  Powierzchnia: <span className="text-white/90 font-medium">{selectedRural.usable_area} m²</span>
                                </div>
                              ) : null}
                            </div>

                            <div className="mt-5 grid gap-2">
                              {selectedRural.phone ? (
                                <div className="flex items-center gap-2 text-sm text-white/70">
                                  <Phone className="w-4 h-4 text-white/55" />
                                  <span>{selectedRural.phone}</span>
                                </div>
                              ) : null}

                              {selectedRural.email ? (
                                <div className="flex items-center gap-2 text-sm text-white/70">
                                  <Mail className="w-4 h-4 text-white/55" />
                                  <span>{selectedRural.email}</span>
                                </div>
                              ) : null}

                              {selectedRural.website ? (
                                <div className="flex items-center gap-2 text-sm text-white/70">
                                  <Globe className="w-4 h-4 text-white/55" />
                                  <span className="truncate">{selectedRural.website}</span>
                                </div>
                              ) : null}
                            </div>
                          </div>

                          <div className="lg:col-span-7 rounded-2xl border border-white/10 bg-white/5 p-5">
                            {selectedRural.pricing ? (
                              <div className="mb-4">
                                <div className="flex items-center gap-2 text-sm font-semibold text-white/85">
                                  <ReceiptText className="w-4 h-4 text-[#d7b45a]" />
                                  Cennik / warunki
                                </div>
                                <div className="mt-2 text-sm text-white/75 whitespace-pre-wrap leading-relaxed">{selectedRural.pricing}</div>
                              </div>
                            ) : null}

                            {selectedRural.equipment ? (
                              <div className="mb-4">
                                <div className="flex items-center gap-2 text-sm font-semibold text-white/85">
                                  <ClipboardList className="w-4 h-4 text-[#d7b45a]" />
                                  Wyposażenie
                                </div>
                                <div className="mt-2 text-sm text-white/75 whitespace-pre-wrap leading-relaxed">{selectedRural.equipment}</div>
                              </div>
                            ) : null}

                            {selectedRural.rental_info ? (
                              <div>
                                <div className="flex items-center gap-2 text-sm font-semibold text-white/85">
                                  <Info className="w-4 h-4 text-[#d7b45a]" />
                                  Informacje o wynajmie
                                </div>
                                <div className="mt-2 text-sm text-white/75 whitespace-pre-wrap leading-relaxed">{selectedRural.rental_info}</div>
                              </div>
                            ) : null}

                            {!selectedRural.pricing && !selectedRural.rental_info ? (
                              <div className="text-sm text-white/60">Brak dodatkowych danych.</div>
                            ) : null}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {/* Edit modal */}
      <VendorEditModal
        open={!!editingVendor}
        vendor={editingVendor}
        vendorTypeOptions={vendorTypeOptions}
        onClose={() => setEditingVendor(null)}
        onSave={async (payload) => {
          if (!editingVendor) return;
          try {
            await api.updateVendor(editingVendor.id, payload);
            await reloadMyVendors();
            showToast("success", "Zmiany zostały zapisane.");
          } catch (e) {
            const msg = e instanceof Error ? e.message : "Nie udało się zapisać zmian.";
            showToast("error", msg);
            throw e;
          }
        }}
      />

      {/* ConfirmDialog */}
      {confirm && (
        <ConfirmDialog
          open={true}
          title={confirm.title}
          message={confirm.message}
          confirmText={confirm.confirmText}
          cancelText="Anuluj"
          danger={confirm.danger}
          onClose={() => setConfirm(null)}
          onConfirm={async () => {
            await confirm.onConfirm();
          }}
        />
      )}

      {/* Toasty są globalne (ToastHost w AppLayout) */}
    </div>
  );
}
