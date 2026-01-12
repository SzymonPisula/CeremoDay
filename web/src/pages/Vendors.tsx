// /d:/CeremoDay/CeremoDay/web/src/pages/Vendors.tsx
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import type { InterviewResponse, VendorKey } from "../types/interview";
import type { Vendor, VendorType } from "../types/vendor";
import { api } from "../lib/api";

import { MapPin, Plus, Trash2, Search, ExternalLink, Loader2,  Globe, Info, Mail, Phone, ReceiptText, Users, StickyNote } from "lucide-react";

import VendorList from "../components/vendors/VendorList";
import RuralVenuesMap from "../components/vendors/RuralVenuesMap";
import Select, { type SelectOption } from "../ui/Select";
import VendorEditModal from "../components/vendors/VendorEditModal";

type Params = { id: string };

// ---------- Dodatkowe typy lokalne ----------
type VendorWithSource = Vendor & {
  // source już jest w Vendor: VendorSource
  county?: string;
  max_participants?: number;
  equipment?: string;
  pricing?: string;
  rental_info?: string;
};


// obiekty z bazy sal gminnych mogą mieć dodatkowe pola — ale NIE zapisujemy ich do event vendors (opcja A)
type RuralVenue = Vendor & {
  county?: string | null;
  max_participants?: number | null;
  equipment?: string | null;
  pricing?: string | null;
  rental_info?: string | null;

  // czasem lat/lng są wprost na obiekcie, czasem w location
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
    const n = Number(v.trim());
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function normalizeRuralVenue(raw: unknown) {
  // bazujemy na tym co już masz w typie RuralVenue, ale łapiemy różne nazwy pól
  const r = raw as Record<string, unknown>;

  return {
    ...r,
    county:
      str(r.county) ??
      str(r.powiat) ??
      str(r.county_name) ??
      undefined,

    max_participants:
      num(r.max_participants) ??
      num(r.max_osob) ??
      num(r.max_people) ??
      undefined,

    equipment:
      str(r.equipment) ??
      str(r.wyposazenie) ??
      undefined,

    pricing:
      str(r.pricing) ??
      str(r.cennik) ??
      str(r.price) ??
      undefined,

    rental_info:
      str(r.rental_info) ??
      str(r.wynajem) ??
      str(r.rental) ??
      undefined,
  };
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

  // snapshot: zawsze undefined, nigdy null
  const county = str(r.county) ?? str(r.powiat);
  const max_participants = num(r.max_participants) ?? num(r.maxParticipants) ?? num(r.max_osob);
  const equipment = str(r.equipment) ?? str(r.wyposazenie);
  const pricing = str(r.pricing) ?? str(r.cennik);
  const rental_info = str(r.rental_info) ?? str(r.rentalInfo) ?? str(r.wynajem);

  const hasRuralSnapshot =
    truthyText(county) ||
    max_participants != null ||
    truthyText(equipment) ||
    truthyText(pricing) ||
    truthyText(rental_info);

  // source: próbujemy wyciągnąć z kilku nazw, a jak nie ma — wnioskujemy po snapshot
  const rawSource =
    str(r.source) ??
    str(r.vendor_source) ??
    str(r.vendorSource) ??
    undefined;

  const source = (rawSource ?? (hasRuralSnapshot ? "RURAL" : "CUSTOM")) as VendorWithSource["source"];

  // wymagane pola Vendor
  const id = typeof r.id === "string" ? r.id : String(r.id ?? "");
  const name = typeof r.name === "string" ? r.name : "";
  const address = typeof r.address === "string" ? r.address : "";

  // location może przyjść jako {lat,lng} albo null
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
      return "DJ";
    case "BAND":
      return "BAND";
    case "HALL":
    case "RURAL_HALL":
      return "HALL";
    case "CATERING":
      return "CATERING";
    case "PHOTO":
      return "PHOTO";
    case "VIDEO":
      return "VIDEO";
    case "DECOR":
      return "DECOR";
    case "TRANSPORT":
      return "TRANSPORT";
    default:
      return "OTHER";
  }
}

function toOpt(v: string): string | undefined {
  const t = v.trim();
  return t ? t : undefined;
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
    type: "OTHER",
    phone: "",
    email: "",
    website: "",
    google_maps_url: "",
    notes: "",
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit modal
  const [editingVendor, setEditingVendor] = useState<VendorWithSource | null>(null);

const openEditModal = (vendor: VendorWithSource) => {
  setEditingVendor(vendor);
};


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
    // 1) event -> location
    const ev = await api.getEvent(eventId);
    if (!alive) return;

    const loc = (ev.location ?? "").trim();
    if (loc) setLocation(loc);

    // 2) interview
    const i = await api.getInterview(eventId);
    if (!alive) return;
    setInterview(i);

    // 3) my vendors
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
    try {
      setError(null);
      await api.deleteVendor(id);
      setMyVendors((prev) => prev.filter((x) => x.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nie udało się usunąć usługodawcy");
    }
  };

  const addRuralToMy = async (v: RuralVenue) => {
    if (!eventId) return;

    try {
      setError(null);

      const lat = v.location?.lat ?? v.lat ?? undefined;
      const lng = v.location?.lng ?? v.lng ?? undefined;

      await api.createVendor({
  event_id: eventId,
  name: v.name,
  source: "RURAL",
  type: "HALL",

  address: v.address ?? undefined,
  phone: v.phone ?? undefined,
  email: v.email ?? undefined,
  website: v.website ?? undefined,
  google_maps_url: v.google_maps_url ?? undefined,
  notes: undefined,

  lat,
  lng,

  // ✅ snapshot z bazy sal
  county: v.county ?? undefined,
  max_participants: v.max_participants ?? undefined,
  equipment: v.equipment ?? undefined,
  pricing: v.pricing ?? undefined,
  rental_info: v.rental_info ?? undefined,
});


      await reloadMyVendors();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nie udało się dodać usługodawcy");
    }
  };

  const handleCreateCustomVendor = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!eventId) return;

    setCreateError(null);
    setCreateLoading(true);

    try {
      const name = createForm.name.trim();
      if (name.length < 2) {
        setCreateError("Nazwa jest wymagana (min. 2 znaki).");
        return;
      }

      await api.createVendor({
        event_id: eventId,
        name,
        source: "CUSTOM",
        type: createForm.type,
        address: undefined,
        phone: toOpt(createForm.phone),
        email: toOpt(createForm.email),
        website: toOpt(createForm.website),
        google_maps_url: toOpt(createForm.google_maps_url),
        notes: toOpt(createForm.notes),
        lat: undefined,
        lng: undefined,
      });

      setCreateForm({
        name: "",
        type: "OTHER",
        phone: "",
        email: "",
        website: "",
        google_maps_url: "",
        notes: "",
      });

      await reloadMyVendors();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Nie udało się dodać usługodawcy.");
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
      const raw = await api.getRuralVenues({
  q: q.trim() ? q.trim() : undefined,
});

const list = (Array.isArray(raw) ? raw : []).map((x) => normalizeRuralVenue(x)) as RuralVenue[];

setRuralResults(list);
setSelectedRural(list[0] ?? null);

    } catch (e) {
      setError(e instanceof Error ? e.message : "Nie udało się wyszukać sal gminnych");
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
      case "HALL":
        return "Sala";
      case "CATERING":
        return "Catering";
      case "DJ":
        return "DJ";
      case "BAND":
        return "Zespół";
      case "PHOTO":
        return "Fotograf";
      case "VIDEO":
        return "Kamerzysta";
      case "DECOR":
        return "Dekoracje";
      case "TRANSPORT":
        return "Transport";
      case "OTHER":
        return "Inne";
      default:
        return t;
    }
  };

  const vendorTypeOptions = useMemo<ReadonlyArray<SelectOption<VendorType>>>(
    () => [
      { value: "HALL", label: "Sala (weselna / gminna)" },
      { value: "DJ", label: "DJ" },
      { value: "BAND", label: "Orkiestra / zespół" },
      { value: "CATERING", label: "Catering" },
      { value: "PHOTO", label: "Fotograf" },
      { value: "VIDEO", label: "Kamerzysta" },
      { value: "DECOR", label: "Dekoracje / florysta" },
      { value: "TRANSPORT", label: "Transport" },
      { value: "OTHER", label: "Inne" },
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
  truthyText(v.rental_info);


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
            {/* Title row */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-[18px] md:text-[20px] font-semibold text-white leading-snug truncate">
                {v.name}
              </div>

              <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[12px] text-white/80">
                {myTypeLabel(v.type)}
              </span>

              
            </div>

            {/* Address */}
            {v.address ? (
              <div className="mt-3 flex items-start gap-2 text-[14px] md:text-[15px] text-white/80">
                <MapPin className="w-4 h-4 mt-[2px] text-[#d7b45a]" />
                <span className="min-w-0 break-words">{v.address}</span>
              </div>
            ) : null}

            {/* Contact + links */}
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
                    <a
                      className="hover:underline"
                      href={websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
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
                    <a
                      className="hover:underline"
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Otwórz mapę
                    </a>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Notes */}
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

            {/* Rural snapshot – styled like edit */}
            {isRural && hasRural ? (
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 md:p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[12px] tracking-wider uppercase text-white/55">
                    Dane sali gminnej (podgląd)
                  </div>
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

                  {v.equipment ? (
                    <div className="md:col-span-2 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3">
                      <div className="text-[11px] tracking-wider uppercase text-white/50">Wyposażenie</div>
                      <div className="mt-1 text-[14px] md:text-[15px] text-white/85 whitespace-pre-wrap">
                        {v.equipment}
                      </div>
                    </div>
                  ) : null}

                  {v.pricing ? (
                    <div className="md:col-span-2 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3">
                      <div className="text-[11px] tracking-wider uppercase text-white/50">Cennik / warunki</div>
                      <div className="mt-1 text-[14px] md:text-[15px] text-white/85 whitespace-pre-wrap">
                        {v.pricing}
                      </div>
                    </div>
                  ) : null}

                  {v.rental_info ? (
                    <div className="md:col-span-2 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3">
                      <div className="text-[11px] tracking-wider uppercase text-white/50">Informacje o wynajmie</div>
                      <div className="mt-1 text-[14px] md:text-[15px] text-white/85 whitespace-pre-wrap">
                        {v.rental_info}
                      </div>
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
                  className={inputBase}
                  value={createForm.name}
                  onChange={(e) => setCreateForm((s) => ({ ...s, name: e.target.value }))}
                  placeholder="np. Foto Studio XYZ"
                />
              </div>

              <div className="relative z-[5]">
                <Select<VendorType>
                  label="Typ *"
                  value={createForm.type}
                  onChange={(v) => setCreateForm((s) => ({ ...s, type: v }))}
                  options={vendorTypeOptions}
                />
              </div>

              <div>
                <label className="text-xs text-white/55">Telefon</label>
                <input
                  className={inputBase}
                  value={createForm.phone}
                  onChange={(e) => setCreateForm((s) => ({ ...s, phone: e.target.value }))}
                  placeholder="+48 600 000 000"
                />
              </div>

              <div>
                <label className="text-xs text-white/55">Email</label>
                <input
                  className={inputBase}
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm((s) => ({ ...s, email: e.target.value }))}
                  placeholder="kontakt@firma.pl"
                />
              </div>

              <div>
                <label className="text-xs text-white/55">WWW</label>
                <input
                  className={inputBase}
                  value={createForm.website}
                  onChange={(e) => setCreateForm((s) => ({ ...s, website: e.target.value }))}
                  placeholder="https://twojastrona.pl"
                />
              </div>

              <div>
                <label className="text-xs text-white/55">Link Google Maps</label>
                <input
                  className={inputBase}
                  value={createForm.google_maps_url}
                  onChange={(e) => setCreateForm((s) => ({ ...s, google_maps_url: e.target.value }))}
                  placeholder="https://maps.google.com/?q=..."
                />
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

          {/* wybór trybu */}
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

          {/* parametry */}
          <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="text-xs text-white/55">Fraza / nazwa (opcjonalnie)</label>
              <input
                className={inputBase}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="np. 'Dworek', 'foto', 'dekoracje'…"
              />
            </div>

            {activeMode !== "RURAL_HALL" && (
              <div>
                <label className="text-xs text-white/55">Lokalizacja</label>
                <input
                  className={inputBase}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="np. Warszawa / Kraków / adres"
                />
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

          {/* RURAL split */}
          {activeMode === "RURAL_HALL" && (
            <div className="mt-6">
              {ruralLoading ? (
                <div className="text-sm text-white/60">Szukam sal gminnych…</div>
              ) : ruralResults.length === 0 ? (
                <div className="text-sm text-white/55">Brak wyników.</div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                  {/* LISTA */}
                  <div className="lg:col-span-4 rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
                    <div className="px-4 py-3 border-b border-white/10">
                      <div className="text-sm font-semibold text-white">Lista</div>
                      <div className="text-xs text-white/55 mt-1">{ruralResults.length} wyników</div>
                    </div>

                    {/* ✅ ograniczamy wysokość listy – spójnie z mapą */}
                    <div className="max-h-[520px] overflow-auto">
                      <VendorList
                        vendors={ruralResults}
                        selectedId={selectedRural?.id ?? null}
                        onSelect={(v) => setSelectedRural(v as RuralVenue)}
                      />
                    </div>
                  </div>

                  {/* MAPA */}
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

                      {selectedRural && (
                        <button type="button" className={btnSecondary} onClick={() => void addRuralToMy(selectedRural)}>
                          <Plus className="w-4 h-4 text-[#d7b45a]" />
                          Dodaj do moich
                        </button>
                      )}
                    </div>

                    {/* ✅ rama wysokości mapy */}
                    <div className="h-[520px] rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
                      <RuralVenuesMap
                        venues={ruralResults}
                        selectedId={selectedRural?.id ?? null}
                        onSelect={(v) => setSelectedRural(v as RuralVenue)}
                      />
                    </div>
                  </div>

                  {/* ✅ WRACA PANEL SZCZEGÓŁÓW POD SPODem */}
                  <div className="lg:col-span-12">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-sm font-semibold text-white/85">Szczegóły obiektu</div>
                          <div className="text-xs text-white/55 mt-1">
                            Kliknij na liście lub na pinezce — tutaj pokażemy dane z bazy sal gminnych.
                          </div>
                        </div>
                        {selectedRural && <span className={chip}>Wybrano</span>}
                      </div>

                      {!selectedRural ? (
  <div className="mt-4 text-sm text-white/60">Brak wybranego obiektu.</div>
) : (
  <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
    {/* główne */}
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

        {typeof selectedRural.max_participants === "number" ? (
          <div className="flex items-center gap-2 text-sm text-white/70">
            <Users className="w-4 h-4 text-white/55" />
            <span>
              Max. uczestników:{" "}
              <span className="text-white/90 font-medium">{selectedRural.max_participants}</span>
            </span>
          </div>
        ) : null}

        {selectedRural.equipment ? (
          <div className="mt-1 text-sm text-white/70">
            Wyposażenie: <span className="text-white/90 font-medium">{selectedRural.equipment}</span>
          </div>
        ) : null}
      </div>

      {/* szybkie akcje / kontakt */}
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

    {/* opisy */}
    <div className="lg:col-span-7 rounded-2xl border border-white/10 bg-white/5 p-5">
      {selectedRural.pricing ? (
        <div className="mb-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-white/85">
            <ReceiptText className="w-4 h-4 text-[#d7b45a]" />
            Cennik / warunki
          </div>
          <div className="mt-2 text-sm text-white/75 whitespace-pre-wrap leading-relaxed">
            {selectedRural.pricing}
          </div>
        </div>
      ) : null}

      {selectedRural.rental_info ? (
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-white/85">
            <Info className="w-4 h-4 text-[#d7b45a]" />
            Informacje o wynajmie
          </div>
          <div className="mt-2 text-sm text-white/75 whitespace-pre-wrap leading-relaxed">
            {selectedRural.rental_info}
          </div>
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
<VendorEditModal
  open={!!editingVendor}
  vendor={editingVendor}
  vendorTypeOptions={vendorTypeOptions}
  onClose={() => setEditingVendor(null)}
  onSave={async (payload) => {
    if (!editingVendor) return;

    await api.updateVendor(editingVendor.id, payload);
    await reloadMyVendors();
  }}
/>

      
    </div>
  );
}
