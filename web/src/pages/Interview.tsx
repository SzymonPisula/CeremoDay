import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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

const CEREMONY_OPTIONS: { value: CeremonyType; label: string }[] = [
  { value: "civil", label: "Ślub cywilny" },
  { value: "church", label: "Ślub kościelny (konkordatowy)" },
  { value: "reception_only", label: "Samo przyjęcie weselne" },
];

const GUEST_RANGE_OPTIONS: { value: GuestCountRange; label: string }[] = [
  { value: "0_30", label: "0–30" },
  { value: "31_60", label: "31–60" },
  { value: "61_100", label: "61–100" },
  { value: "101_150", label: "101–150" },
  { value: "150_plus", label: "150+" },
];

const GUEST_LIST_STATUS_OPTIONS: { value: GuestListStatus; label: string }[] = [
  { value: "ready", label: "Gotowa" },
  { value: "partial", label: "Częściowa" },
  { value: "not_started", label: "Nie rozpoczęta" },
];

const NOTIFICATION_OPTIONS: { value: NotificationFrequency; label: string }[] = [
  { value: "daily", label: "Codziennie" },
  { value: "every_3_days", label: "Co 3 dni" },
  { value: "weekly", label: "Co tydzień" },
  { value: "only_critical", label: "Tylko krytyczne" },
];

const MUSIC_OPTIONS: { value: MusicProviderChoice; label: string }[] = [
  { value: "DJ", label: "DJ" },
  { value: "BAND", label: "Orkiestra / zespół" },
];

const VENUE_OPTIONS: { value: VenueChoice; label: string }[] = [
  { value: "WEDDING_HALL", label: "Sala weselna" },
  { value: "RURAL_VENUE", label: "Sala wiejska (gminna)" },
];

const OPTIONAL_VENDORS: { value: VendorKey; label: string }[] = [
  { value: "CATERING", label: "Catering" },
  { value: "PHOTOGRAPHER", label: "Fotograf" },
  { value: "VIDEOGRAPHER", label: "Kamerzysta" },
  { value: "DECOR_FLORIST", label: "Dekoracje / Florysta" },
  { value: "TRANSPORT", label: "Transport" },
];

function toggleInArray<T extends string>(arr: T[], v: T): T[] {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}

export default function Interview() {
  const { id: eventId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- state (defaulty) ---
  const [ceremonyType, setCeremonyType] = useState<CeremonyType>("civil");
  const [eventDate, setEventDate] = useState<string>(""); // YYYY-MM-DD albo ""
  const [guestRange, setGuestRange] = useState<GuestCountRange>("31_60");
  const [guestListStatus, setGuestListStatus] = useState<GuestListStatus>("not_started");

  // wymagane wybory:
  const [musicChoice, setMusicChoice] = useState<MusicProviderChoice>("DJ");
  const [venueChoice, setVenueChoice] = useState<VenueChoice>("WEDDING_HALL");

  // required vendors systemowo:
  const [requiredVendors, setRequiredVendors] = useState<VendorKey[]>(["DJ_OR_BAND", "VENUE"]);
  const [optionalVendors, setOptionalVendors] = useState<VendorKey[]>([]);

  const [weddingDayEnabled, setWeddingDayEnabled] = useState<boolean>(true);
  const [notificationFrequency, setNotificationFrequency] = useState<NotificationFrequency>("every_3_days");

  const requiredSet = useMemo(() => new Set(requiredVendors), [requiredVendors]);
  const optionalSet = useMemo(() => new Set(optionalVendors), [optionalVendors]);

  // --- load existing interview ---
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
        // ✅ bez return w finally (no-unsafe-finally)
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [eventId]);

  function applyInterviewToState(data: InterviewResponse) {
    setCeremonyType(data.ceremony_type);
    setEventDate(data.event_date ?? "");
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
      event_date: eventDate.trim() ? eventDate.trim() : null,
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
        <h1 className="text-xl font-bold">Wywiad</h1>
        <p className="text-red-600 mt-2">Brak eventId w URL.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Wywiad startowy</h1>
          <p className="text-gray-600 mt-1">
            Ustawienia wpływają na to, co aplikacja Ci podpowiada i co jest priorytetem.
          </p>
        </div>

        <button
          type="button"
          className="px-3 py-2 rounded bg-white shadow hover:bg-gray-50"
          onClick={() => navigate(`/event/${eventId}`)}
        >
          ← Wróć do wydarzenia
        </button>
      </div>

      {loading ? (
        <div className="mt-6 p-4 bg-white shadow rounded">Ładowanie…</div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {error && (
            <div className="p-3 rounded bg-red-50 text-red-700 border border-red-200">
              {error}
            </div>
          )}

          {/* 1) typ uroczystości */}
          <section className="p-4 bg-white shadow rounded space-y-3">
            <h2 className="font-semibold">1) Jaki typ uroczystości planujecie?</h2>
            <div className="space-y-2">
              {CEREMONY_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="ceremony"
                    value={opt.value}
                    checked={ceremonyType === opt.value}
                    onChange={() => setCeremonyType(opt.value)}
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </section>

          {/* 2) data */}
          <section className="p-4 bg-white shadow rounded space-y-3">
            <h2 className="font-semibold">2) Czy macie już datę?</h2>
            <div className="flex flex-col gap-2">
              <label className="text-sm text-gray-700">Data (opcjonalnie)</label>
              <input
                type="date"
                className="border rounded px-3 py-2"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                Jeśli zostawisz puste – aplikacja nie będzie sugerowała zadań “pod termin”.
              </p>
            </div>
          </section>

          {/* 3) ilu gości */}
          <section className="p-4 bg-white shadow rounded space-y-3">
            <h2 className="font-semibold">3) Ilu gości planujecie?</h2>
            <select
              className="border rounded px-3 py-2 w-full"
              value={guestRange}
              onChange={(e) => setGuestRange(e.target.value as GuestCountRange)}
            >
              {GUEST_RANGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </section>

          {/* 4) lista gości */}
          <section className="p-4 bg-white shadow rounded space-y-3">
            <h2 className="font-semibold">4) Status listy gości</h2>
            <select
              className="border rounded px-3 py-2 w-full"
              value={guestListStatus}
              onChange={(e) => setGuestListStatus(e.target.value as GuestListStatus)}
            >
              {GUEST_LIST_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </section>

          {/* D) usługodawcy */}
          <section className="p-4 bg-white shadow rounded space-y-4">
            <h2 className="font-semibold">D) Usługodawcy</h2>

            <div className="space-y-2">
              <div className="font-medium text-sm">Wymagane – wybierz:</div>

              <div className="p-3 border rounded space-y-2">
                <div className="text-sm font-medium">Muzyka</div>
                {MUSIC_OPTIONS.map((opt) => (
                  <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="music_choice"
                      checked={musicChoice === opt.value}
                      onChange={() => setMusicChoice(opt.value)}
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>

              <div className="p-3 border rounded space-y-2">
                <div className="text-sm font-medium">Sala</div>
                {VENUE_OPTIONS.map((opt) => (
                  <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="venue_choice"
                      checked={venueChoice === opt.value}
                      onChange={() => setVenueChoice(opt.value)}
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>

              <div className="text-xs text-gray-500">
                (Systemowo i tak zapisujemy jako wymagane: <b>DJ_OR_BAND</b> oraz <b>VENUE</b>, a powyższe to wybór preferencji.)
              </div>
            </div>

            <div className="pt-1">
              <div className="font-medium text-sm">Dodatkowe (checklista):</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                {OPTIONAL_VENDORS.map((opt) => (
                  <label
                    key={opt.value}
                    className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={optionalSet.has(opt.value)}
                      onChange={() => onToggleOptional(opt.value)}
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="text-xs text-gray-500 mt-2">
              required_vendors: {Array.from(requiredSet).join(", ")} <br />
              optional_vendors: {Array.from(optionalSet).join(", ")}
            </div>
          </section>

          {/* E) dzień ślubu */}
          <section className="p-4 bg-white shadow rounded space-y-3">
            <h2 className="font-semibold">E) Dzień ślubu</h2>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={weddingDayEnabled}
                onChange={(e) => setWeddingDayEnabled(e.target.checked)}
              />
              <span>Chcę korzystać z modułu “Dzień ślubu”</span>
            </label>
          </section>

          {/* G) powiadomienia */}
          <section className="p-4 bg-white shadow rounded space-y-3">
            <h2 className="font-semibold">G) Powiadomienia – częstotliwość</h2>
            <select
              className="border rounded px-3 py-2 w-full"
              value={notificationFrequency}
              onChange={(e) => setNotificationFrequency(e.target.value as NotificationFrequency)}
            >
              {NOTIFICATION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </section>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded bg-black text-white hover:bg-gray-800 disabled:opacity-60"
            >
              {saving ? "Zapisywanie…" : "Zapisz i przejdź dalej"}
            </button>

            <span className="text-sm text-gray-500">
              Zawsze możesz wrócić do edycji odpowiedzi z menu.
            </span>
          </div>
        </form>
      )}
    </div>
  );
}
