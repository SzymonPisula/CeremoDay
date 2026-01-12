import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Calendar,
  Check,
  ClipboardList,
  Music,
  MapPin,
  Users,
  Bell,
  Sparkles,
  X,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { api } from "../lib/api";
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

const CEREMONY_OPTIONS: { value: CeremonyType; label: string; desc: string }[] = [
  { value: "civil", label: "Ślub cywilny", desc: "Wpływa na formalności i checklisty." },
  { value: "church", label: "Ślub kościelny (konkordatowy)", desc: "Wpływa na formalności i checklisty." },
  { value: "reception_only", label: "Samo przyjęcie weselne", desc: "Wpływa na checklisty i priorytety." },
];

const GUEST_RANGE_OPTIONS: { value: GuestCountRange; label: string; desc: string }[] = [
  { value: "0_30", label: "0–30", desc: "Kameralnie" },
  { value: "31_60", label: "31–60", desc: "Małe przyjęcie" },
  { value: "61_100", label: "61–100", desc: "Średnie przyjęcie" },
  { value: "101_150", label: "101–150", desc: "Duże przyjęcie" },
  { value: "150_plus", label: "150+", desc: "Bardzo duże" },
];

const GUEST_LIST_STATUS_OPTIONS: { value: GuestListStatus; label: string; desc: string }[] = [
  { value: "ready", label: "Gotowa", desc: "Masz kompletną listę." },
  { value: "partial", label: "Częściowa", desc: "Część osób już dodana." },
  { value: "not_started", label: "Nie rozpoczęta", desc: "Jeszcze nie zaczęta." },
];

const NOTIFICATION_OPTIONS: { value: NotificationFrequency; label: string; desc: string }[] = [
  { value: "daily", label: "Codziennie", desc: "Częste przypomnienia." },
  { value: "every_3_days", label: "Co 3 dni", desc: "Zbalansowanie." },
  { value: "weekly", label: "Co tydzień", desc: "Mniej powiadomień." },
  { value: "only_critical", label: "Tylko krytyczne", desc: "Tylko najważniejsze." },
];

const MUSIC_OPTIONS: { value: MusicProviderChoice; label: string; desc: string }[] = [
  { value: "DJ", label: "DJ", desc: "Elastyczny repertuar i prowadzenie." },
  { value: "BAND", label: "Orkiestra / zespół", desc: "Muzyka na żywo." },
];

const VENUE_OPTIONS: { value: VenueChoice; label: string; desc: string }[] = [
  { value: "WEDDING_HALL", label: "Sala weselna", desc: "Klasyczna opcja." },
  { value: "RURAL_VENUE", label: "Sala wiejska (gminna)", desc: "Budżetowo i lokalnie." },
];

const OPTIONAL_VENDORS: { value: VendorKey; label: string; desc: string }[] = [
  { value: "CATERING", label: "Catering", desc: "Jedzenie / obsługa." },
  { value: "PHOTOGRAPHER", label: "Fotograf", desc: "Zdjęcia i sesja." },
  { value: "VIDEOGRAPHER", label: "Kamerzysta", desc: "Film i montaż." },
  { value: "DECOR_FLORIST", label: "Dekoracje / Florysta", desc: "Wystrój i kwiaty." },
  { value: "TRANSPORT", label: "Transport", desc: "Auto, busy, logistyka." },
];

function toggleInArray<T extends string>(arr: T[], v: T): T[] {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}

type OptionCardProps = {
  title: string;
  description?: string;
  selected: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  disabled?: boolean;
};

function OptionCard({ title, description, selected, onClick, icon, disabled }: OptionCardProps) {
  const base =
    "w-full text-left rounded-2xl border px-4 py-4 transition " +
    "bg-white/5 border-white/10 hover:bg-white/7 hover:border-white/15 " +
    "focus:outline-none focus:ring-2 focus:ring-[#c8a04b]/40";
  const active =
    "bg-gradient-to-b from-white/10 to-white/5 border-[#c8a04b]/35 " +
    "shadow-[0_18px_55px_rgba(200,160,75,0.18)]";
  const off = "opacity-60 cursor-not-allowed hover:bg-white/5 hover:border-white/10";

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      aria-pressed={selected}
      disabled={disabled}
      className={`${base} ${selected ? active : ""} ${disabled ? off : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {icon ? (
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                {icon}
              </span>
            ) : null}
            <div className="font-semibold text-white">{title}</div>
          </div>
          {description ? <div className="mt-1 text-sm text-white/55">{description}</div> : null}
        </div>

        {selected ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
            <Check className="h-3.5 w-3.5" />
            Wybrane
          </span>
        ) : null}
      </div>
    </button>
  );
}

export default function Interview() {
  const { id: eventId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1) typ uroczystości
  const [ceremonyType, setCeremonyType] = useState<CeremonyType>("civil");

  // 2) data (opcjonalnie) + przełącznik Tak/Nie
  const [hasEventDate, setHasEventDate] = useState<boolean>(false);
  const [eventDate, setEventDate] = useState<string>(""); // YYYY-MM-DD albo ""

  // 3) ilu gości
  const [guestRange, setGuestRange] = useState<GuestCountRange>("31_60");

  // 4) status listy gości
  const [guestListStatus, setGuestListStatus] = useState<GuestListStatus>("not_started");

  // 5) muzyka
  const [musicChoice, setMusicChoice] = useState<MusicProviderChoice>("DJ");

  // 6) sala
  const [venueChoice, setVenueChoice] = useState<VenueChoice>("WEDDING_HALL");

  // required vendors systemowo (zawsze)
  const [requiredVendors, setRequiredVendors] = useState<VendorKey[]>(["DJ_OR_BAND", "VENUE"]);

  // 7) dodatkowe usługi (multi)
  const [optionalVendors, setOptionalVendors] = useState<VendorKey[]>([]);

  // 8) dzień ślubu (Tak/Nie)
  const [weddingDayEnabled, setWeddingDayEnabled] = useState<boolean>(true);

  // 9) powiadomienia (karty)
  const [notificationFrequency, setNotificationFrequency] =
    useState<NotificationFrequency>("every_3_days");

  const requiredSet = useMemo(() => new Set(requiredVendors), [requiredVendors]);
  const optionalSet = useMemo(() => new Set(optionalVendors), [optionalVendors]);

  // -------------------------
  // UI helpers (CeremoDay vibe)
  // -------------------------
  const cardBase =
    "rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md " +
    "shadow-[0_24px_80px_rgba(0,0,0,0.45)]";

  const inputBase =
    "w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-white placeholder:text-white/35 " +
    "outline-none focus:border-[#c8a04b]/50 focus:ring-2 focus:ring-[#c8a04b]/15 transition";

  const btnGold =
    "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold " +
    "bg-gradient-to-r from-[#d7b45a] to-[#b98b2f] text-[#0b1b14] " +
    "shadow-[0_10px_30px_-18px_rgba(215,180,90,0.9)] " +
    "hover:brightness-105 active:translate-y-[1px] " +
    "focus:outline-none focus:ring-2 focus:ring-[#c8a04b]/45 " +
    "transition disabled:opacity-60";

  const btnSecondary =
    "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium " +
    "bg-white/5 text-white border border-white/10 " +
    "hover:bg-white/10 hover:border-white/15 " +
    "focus:outline-none focus:ring-2 focus:ring-[#c8a04b]/40 " +
    "transition disabled:opacity-60";

  // -------------------------
  // load existing interview
  // -------------------------
  useEffect(() => {
    if (!eventId) return;

    let alive = true;

    (async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await api.getInterview(eventId);
        if (!alive) return;
        if (data) applyInterviewToState(data);
      } catch (e) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Błąd pobierania wywiadu");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [eventId]);

  function applyInterviewToState(data: InterviewResponse) {
    setCeremonyType(data.ceremony_type);

    const date = data.event_date ?? "";
    setHasEventDate(!!date);
    setEventDate(date);

    setGuestRange(data.guest_count_range);
    setGuestListStatus(data.guest_list_status);

    setMusicChoice(data.music_provider_choice);
    setVenueChoice(data.venue_choice);

    // required zawsze DJ_OR_BAND + VENUE
    const req = Array.isArray(data.required_vendors) ? data.required_vendors : [];
    const reqSet = new Set<VendorKey>(req);
    reqSet.add("DJ_OR_BAND");
    reqSet.add("VENUE");
    setRequiredVendors(Array.from(reqSet));

    const opt = Array.isArray(data.optional_vendors) ? data.optional_vendors : [];
    setOptionalVendors(opt.filter((v) => !reqSet.has(v)));

    setWeddingDayEnabled(!!data.wedding_day_enabled);
    setNotificationFrequency(data.notification_frequency);
  }

  function onToggleOptional(v: VendorKey) {
    setOptionalVendors((prev) => toggleInArray(prev, v));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!eventId) return;

    setSaving(true);
    setError(null);

    const reqSet = new Set<VendorKey>(requiredVendors);
    reqSet.add("DJ_OR_BAND");
    reqSet.add("VENUE");

    const payload: InterviewPayload = {
      ceremony_type: ceremonyType,

      event_date: hasEventDate && eventDate.trim() ? eventDate.trim() : null,

      guest_count_range: guestRange,
      guest_list_status: guestListStatus,

      music_provider_choice: musicChoice,
      venue_choice: venueChoice,

      required_vendors: Array.from(reqSet),
      optional_vendors: optionalVendors.filter((v) => !reqSet.has(v)),

      wedding_day_enabled: weddingDayEnabled,
      notification_frequency: notificationFrequency,
    };

    try {
      const saved = await api.saveInterview(eventId, payload);
      applyInterviewToState(saved);
      navigate(`/event/${eventId}`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd zapisu wywiadu");
    } finally {
      setSaving(false);
    }
  }

  if (!eventId) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <h1 className="text-xl font-bold text-white">Wywiad</h1>
        <p className="text-red-200 mt-2">Brak eventId w URL.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-2xl border border-white/10 bg-white/5 grid place-items-center">
            <ClipboardList className="w-5 h-5 text-[#d7b45a]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Wywiad startowy</h1>
            <p className="text-sm text-white/60 mt-1">
              Ten widok służy do <b>edycji odpowiedzi</b>. Startowy wywiad zrobimy później jako osobne sceny.
            </p>
          </div>
        </div>

        <button type="button" className={btnSecondary} onClick={() => navigate(`/event/${eventId}`)}>
          <ArrowLeft className="w-4 h-4" />
          Wróć do wydarzenia
        </button>
      </div>

      {error ? (
        <div className={`${cardBase} p-4 border-red-500/20 bg-red-500/10`}>
          <div className="text-sm text-red-200">{error}</div>
        </div>
      ) : null}

      {loading ? (
        <div className={`${cardBase} p-4`}>
          <div className="text-sm text-white/65 inline-flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Ładowanie…
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 1) Typ uroczystości -> 3 karty w poziomie */}
          <section className={`${cardBase} p-6 md:p-7`}>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-[#d7b45a]" />
              <h2 className="text-white font-semibold text-lg">1) Typ uroczystości</h2>
              <span className="ml-auto text-xs text-white/45">Wybierz jedną opcję</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {CEREMONY_OPTIONS.map((opt) => (
                <OptionCard
                  key={opt.value}
                  title={opt.label}
                  description={opt.desc}
                  selected={ceremonyType === opt.value}
                  onClick={() => setCeremonyType(opt.value)}
                  icon={<Sparkles className="h-4 w-4 text-[#d7b45a]" />}
                />
              ))}
            </div>
          </section>

          {/* 2) Data -> NIE/TAK karty + odblokowanie inputa */}
          <section className={`${cardBase} p-6 md:p-7`}>
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-[#d7b45a]" />
              <h2 className="text-white font-semibold text-lg">2) Data wydarzenia (opcjonalnie)</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <OptionCard
                title="Nie"
                description="Nie podajemy daty — bez sugerowania zadań “pod termin”."
                selected={!hasEventDate}
                onClick={() => {
                  setHasEventDate(false);
                  setEventDate("");
                }}
                icon={<X className="h-4 w-4 text-[#d7b45a]" />}
              />
              <OptionCard
                title="Tak"
                description="Podaj datę — aplikacja może proponować zadania pod termin."
                selected={hasEventDate}
                onClick={() => setHasEventDate(true)}
                icon={<Check className="h-4 w-4 text-[#d7b45a]" />}
              />
            </div>

            <div className="mt-4">
              <label className="block text-xs text-white/70 mb-1">Wybierz datę</label>
              <div className="relative">
                <input
                  type="date"
                  className={`${inputBase} pr-10 ${hasEventDate ? "" : "opacity-60"}`}
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  disabled={!hasEventDate}
                />
                <Calendar className="w-4 h-4 text-white/35 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {hasEventDate ? (
                <div className="mt-3">
                  <button
                    type="button"
                    className={btnSecondary}
                    onClick={() => {
                      setEventDate("");
                      setHasEventDate(false);
                    }}
                  >
                    <X className="w-4 h-4" />
                    Wyczyść datę
                  </button>
                </div>
              ) : (
                <p className="mt-2 text-xs text-white/45">
                  Jeśli zostawisz “Nie” — nie będziemy proponować zadań “pod termin”.
                </p>
              )}
            </div>
          </section>

          {/* 3) Ilu gości -> 5 kart */}
          <section className={`${cardBase} p-6 md:p-7`}>
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-[#d7b45a]" />
              <h2 className="text-white font-semibold text-lg">3) Ilu gości planujecie?</h2>
              <span className="ml-auto text-xs text-white/45">Wybierz jedną opcję</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {GUEST_RANGE_OPTIONS.map((opt) => (
                <OptionCard
                  key={opt.value}
                  title={opt.label}
                  description={opt.desc}
                  selected={guestRange === opt.value}
                  onClick={() => setGuestRange(opt.value)}
                  icon={<Users className="h-4 w-4 text-[#d7b45a]" />}
                />
              ))}
            </div>

            <p className="mt-3 text-xs text-white/45">
              Zakres pomaga dobrać checklisty i budżetowe podpowiedzi.
            </p>
          </section>

          {/* 4) Status listy gości -> 3 karty */}
          <section className={`${cardBase} p-6 md:p-7`}>
            <div className="flex items-center gap-2 mb-4">
              <ClipboardList className="w-5 h-5 text-[#d7b45a]" />
              <h2 className="text-white font-semibold text-lg">4) Status listy gości</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {GUEST_LIST_STATUS_OPTIONS.map((opt) => (
                <OptionCard
                  key={opt.value}
                  title={opt.label}
                  description={opt.desc}
                  selected={guestListStatus === opt.value}
                  onClick={() => setGuestListStatus(opt.value)}
                  icon={<ClipboardList className="h-4 w-4 text-[#d7b45a]" />}
                />
              ))}
            </div>
          </section>

          {/* 5) Muzyka -> 2 karty */}
          <section className={`${cardBase} p-6 md:p-7`}>
            <div className="flex items-center gap-2 mb-4">
              <Music className="w-5 h-5 text-[#d7b45a]" />
              <h2 className="text-white font-semibold text-lg">5) Muzyka</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {MUSIC_OPTIONS.map((opt) => (
                <OptionCard
                  key={opt.value}
                  title={opt.label}
                  description={opt.desc}
                  selected={musicChoice === opt.value}
                  onClick={() => setMusicChoice(opt.value)}
                  icon={<Music className="h-4 w-4 text-[#d7b45a]" />}
                />
              ))}
            </div>

            <p className="mt-3 text-xs text-white/45">
              Systemowo zapisujemy wymagane: <b>DJ_OR_BAND</b> oraz <b>VENUE</b>. Tutaj ustawiasz preferencję.
            </p>
          </section>

          {/* 6) Sala -> 2 karty */}
          <section className={`${cardBase} p-6 md:p-7`}>
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-[#d7b45a]" />
              <h2 className="text-white font-semibold text-lg">6) Sala</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {VENUE_OPTIONS.map((opt) => (
                <OptionCard
                  key={opt.value}
                  title={opt.label}
                  description={opt.desc}
                  selected={venueChoice === opt.value}
                  onClick={() => setVenueChoice(opt.value)}
                  icon={<MapPin className="h-4 w-4 text-[#d7b45a]" />}
                />
              ))}
            </div>
          </section>

          {/* 7) Usługi dodatkowe -> multi karty */}
          <section className={`${cardBase} p-6 md:p-7`}>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-[#d7b45a]" />
              <h2 className="text-white font-semibold text-lg">7) Usługi dodatkowe</h2>
              <span className="ml-auto text-xs text-white/45">Możesz wybrać wiele</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {OPTIONAL_VENDORS.map((opt) => (
                <OptionCard
                  key={opt.value}
                  title={opt.label}
                  description={opt.desc}
                  selected={optionalSet.has(opt.value)}
                  onClick={() => onToggleOptional(opt.value)}
                  icon={<Sparkles className="h-4 w-4 text-[#d7b45a]" />}
                  disabled={requiredSet.has(opt.value)}
                />
              ))}
            </div>

            <p className="mt-3 text-xs text-white/45">
              Wybrane usługi wpływają na sugestie checklist i priorytetów.
            </p>
          </section>

          {/* 8) Dzień ślubu -> Tak/Nie */}
          <section className={`${cardBase} p-6 md:p-7`}>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-[#d7b45a]" />
              <h2 className="text-white font-semibold text-lg">
                8) Czy chcesz korzystać z modułu „Dzień ślubu”?
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <OptionCard
                title="Nie"
                description="Nie używam modułu „Dzień ślubu”."
                selected={!weddingDayEnabled}
                onClick={() => setWeddingDayEnabled(false)}
                icon={<X className="h-4 w-4 text-[#d7b45a]" />}
              />
              <OptionCard
                title="Tak"
                description="Chcę checklistę i plan dnia w jednym miejscu."
                selected={weddingDayEnabled}
                onClick={() => setWeddingDayEnabled(true)}
                icon={<Check className="h-4 w-4 text-[#d7b45a]" />}
              />
            </div>
          </section>

          {/* 9) Powiadomienia -> karty */}
          <section className={`${cardBase} p-6 md:p-7`}>
            <div className="flex items-center gap-2 mb-4">
              <Bell className="w-5 h-5 text-[#d7b45a]" />
              <h2 className="text-white font-semibold text-lg">9) Powiadomienia — częstotliwość</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {NOTIFICATION_OPTIONS.map((opt) => (
                <OptionCard
                  key={opt.value}
                  title={opt.label}
                  description={opt.desc}
                  selected={notificationFrequency === opt.value}
                  onClick={() => setNotificationFrequency(opt.value)}
                  icon={<Bell className="h-4 w-4 text-[#d7b45a]" />}
                />
              ))}
            </div>
          </section>

          {/* Footer actions */}
          <div className={`${cardBase} p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4`}>
            <div className="text-sm text-white/60">
              Zawsze możesz wrócić do edycji odpowiedzi z menu.
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className={btnSecondary}
                onClick={() => navigate(`/event/${eventId}`)}
                disabled={saving}
              >
                Anuluj
              </button>

              <button type="submit" disabled={saving} className={btnGold}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {saving ? "Zapisywanie…" : "Zapisz i przejdź dalej"}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
