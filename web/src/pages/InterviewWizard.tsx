import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, ClipboardList, Loader2 } from "lucide-react";
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

type WizardState = {
  // 1
  ceremonyType: CeremonyType;

  // 2
  hasEventDate: boolean;
  eventDate: string; // YYYY-MM-DD or ""

    // 10 finanse
  hasBudget: boolean;
  financeInitial: string;


  // 3
  guestRange: GuestCountRange;

  // 4
  guestListStatus: GuestListStatus;

  // 5
  musicChoice: MusicProviderChoice;

  // 6
  venueChoice: VenueChoice;

  // 7
  optionalVendors: VendorKey[];

  // 8
  weddingDayEnabled: boolean;

  // 9
  notificationFrequency: NotificationFrequency;

  // progress
  step: number; // 0 intro, 1..9 questions
};

const DEFAULT_STATE: WizardState = {
  ceremonyType: "civil",
  hasEventDate: false,
  eventDate: "",
  hasBudget: false,
  financeInitial: "",
  guestRange: "31_60",
  guestListStatus: "not_started",
  musicChoice: "DJ",
  venueChoice: "WEDDING_HALL",
  optionalVendors: [],
  weddingDayEnabled: true,
  notificationFrequency: "every_3_days",
  step: 0,
};

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

const NOTIFICATION_OPTIONS: { value: NotificationFrequency; label: string; desc: string }[] = [
  { value: "daily", label: "Codziennie", desc: "Częste przypomnienia." },
  { value: "every_3_days", label: "Co 3 dni", desc: "Zbalansowanie." },
  { value: "weekly", label: "Co tydzień", desc: "Mniej powiadomień." },
  { value: "only_critical", label: "Tylko krytyczne", desc: "Tylko najważniejsze." },
];

function toggleInArray<T extends string>(arr: T[], v: T): T[] {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}

type OptionCardProps = {
  title: string;
  description?: string;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
};

function OptionCard({ title, description, selected, onClick, disabled }: OptionCardProps) {
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
          <div className="font-semibold text-white">{title}</div>
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

function sessionKey(eventId: string) {
  return `ceremoday:interview-wizard:${eventId}`;
}

function safeParseWizardState(raw: string | null): WizardState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<WizardState>;
    // minimalna walidacja
    if (typeof parsed !== "object" || parsed == null) return null;
    return { ...DEFAULT_STATE, ...parsed };
  } catch {
    return null;
  }
}

export default function InterviewWizard() {
  const { id: eventId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [state, setState] = useState<WizardState>(DEFAULT_STATE);

  const cardBase =
    "rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md " +
    "shadow-[0_24px_80px_rgba(0,0,0,0.45)]";

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

  const inputBase =
    "w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-white placeholder:text-white/35 " +
    "outline-none focus:border-[#c8a04b]/50 focus:ring-2 focus:ring-[#c8a04b]/15 transition";

  // 1) Load: jeśli interview już istnieje => nie ma sensu robić wizard (przekieruj na event)
  // 2) Load: jeśli jest stan w sessionStorage => wznów
  useEffect(() => {
    if (!eventId) return;
    let alive = true;

    (async () => {
      setLoading(true);
      setError(null);

      try {
        // jeśli wywiad istnieje => wizard niepotrzebny
        const existing = (await api.getInterview(eventId)) as InterviewResponse | null;
        if (!alive) return;

        if (existing) {
          navigate(`/event/${eventId}`, { replace: true });
          return;
        }

        const cached = safeParseWizardState(sessionStorage.getItem(sessionKey(eventId)));
        if (cached) setState(cached);
      } catch (e) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Błąd pobierania danych wywiadu.");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [eventId, navigate]);

  // autosave do sessionStorage (szybki back/refresh)
  useEffect(() => {
    if (!eventId) return;
    sessionStorage.setItem(sessionKey(eventId), JSON.stringify(state));
  }, [eventId, state]);

  const totalQuestions = 10;
  const currentStep = state.step; // 0..9
  const isIntro = currentStep === 0;
  const isLast = currentStep === totalQuestions;

  const progressPercent = useMemo(() => {
    if (isIntro) return 0;
    return Math.round(((currentStep - 1) / (totalQuestions - 1)) * 100);
  }, [currentStep, isIntro]);

  function goNext() {
    setState((prev) => ({ ...prev, step: Math.min(prev.step + 1, totalQuestions) }));
  }

  function goBack() {
    setState((prev) => ({ ...prev, step: Math.max(prev.step - 1, 0) }));
  }

  async function finishAndSave() {
    if (!eventId) return;

    setSaving(true);
    setError(null);

    // required zawsze
    const reqSet = new Set<VendorKey>(["DJ_OR_BAND", "VENUE"]);

    const payload: InterviewPayload = {
      ceremony_type: state.ceremonyType,
      event_date: state.hasEventDate && state.eventDate.trim() ? state.eventDate.trim() : null,
      finance_initial_budget:
        state.hasBudget && state.financeInitial.trim()
          ? Number(state.financeInitial.trim().replace(",", "."))
          : null,

      guest_count_range: state.guestRange,
      guest_list_status: state.guestListStatus,
      music_provider_choice: state.musicChoice,
      venue_choice: state.venueChoice,
      required_vendors: Array.from(reqSet),
      optional_vendors: state.optionalVendors.filter((v) => !reqSet.has(v)),
      wedding_day_enabled: state.weddingDayEnabled,
      notification_frequency: state.notificationFrequency,
    };

    try {
      await api.saveInterview(eventId, payload);
      sessionStorage.removeItem(sessionKey(eventId));
      navigate(`/event/${eventId}`, { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd zapisu wywiadu.");
    } finally {
      setSaving(false);
    }
  }

  if (!eventId) {
    return <div className="p-6 text-red-200">Brak eventId w URL.</div>;
  }

  return (
    // overlay “osobna scena” – przykrywa UI, skupia uwagę
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-md" />

      <div className="relative h-full w-full overflow-y-auto">
        <div className="min-h-full flex items-center justify-center p-4 md:p-10">
          <div className="w-full max-w-4xl">
            <div className={`${cardBase} p-6 md:p-8`}>
              {/* Header */}
              <div className="flex items-start justify-between gap-4 mb-5">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-2xl border border-white/10 bg-white/5 grid place-items-center">
                    <ClipboardList className="w-5 h-5 text-[#d7b45a]" />
                  </div>
                  <div>
                    <div className="text-white text-xl font-bold">Wywiad startowy</div>
                    <div className="text-sm text-white/60 mt-1">
                      {isIntro
                        ? "Krótki test dopasowujący aplikację do Waszych potrzeb."
                        : "Odpowiedzi zapisujemy w sesji — możesz cofnąć się do poprzednich pytań."}
                    </div>
                  </div>
                </div>

                {/* Na wizardzie nie pozwalamy wrócić do eventu, bo event jest zablokowany do ukończenia */}
              </div>

              {error ? (
                <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
                  {error}
                </div>
              ) : null}

              {loading ? (
                <div className="p-4 text-sm text-white/65 inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Ładowanie…
                </div>
              ) : (
                <>
                  {/* CONTENT */}
                  <div
                    key={currentStep}
                    className="transition-all duration-300 ease-out motion-reduce:transition-none
                               opacity-100 translate-y-0"
                  >
                    {isIntro ? (
                      <div className="py-8 md:py-10 text-center">
                        <div className="text-white text-2xl md:text-3xl font-bold">
                          Przed Tobą 9 krótkich pytań
                        </div>
                        <div className="mt-3 text-white/65 max-w-2xl mx-auto">
                          Dostosują aplikację do Twoich wymagań. Bez obaw — w każdej chwili możesz wrócić do edycji
                          i dokonać zmian.
                        </div>

                        <div className="mt-8">
                          <button type="button" className={btnGold} onClick={goNext}>
                            Zaczynamy!
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-5">
                        {/* Pytania 1..10 */}
                        {currentStep === 1 && (
                          <>
                            <div className="text-white text-lg font-semibold">1) Typ uroczystości</div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              {CEREMONY_OPTIONS.map((opt) => (
                                <OptionCard
                                  key={opt.value}
                                  title={opt.label}
                                  description={opt.desc}
                                  selected={state.ceremonyType === opt.value}
                                  onClick={() =>
                                    setState((p) => ({ ...p, ceremonyType: opt.value }))
                                  }
                                />
                              ))}
                            </div>
                          </>
                        )}

                        {currentStep === 2 && (
                          <>
                            <div className="text-white text-lg font-semibold">2) Czy macie już datę?</div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <OptionCard
                                title="Nie"
                                description="Nie podajemy daty — bez zadań “pod termin”."
                                selected={!state.hasEventDate}
                                onClick={() =>
                                  setState((p) => ({ ...p, hasEventDate: false, eventDate: "" }))
                                }
                              />
                              <OptionCard
                                title="Tak"
                                description="Podaj datę — aplikacja dopasuje sugestie."
                                selected={state.hasEventDate}
                                onClick={() => setState((p) => ({ ...p, hasEventDate: true }))}
                              />
                            </div>

                            <div className="mt-3">
                              <label className="block text-xs text-white/70 mb-1">Data (opcjonalnie)</label>
                              <input
                                type="date"
                                className={`${inputBase} ${state.hasEventDate ? "" : "opacity-60"}`}
                                value={state.eventDate}
                                onChange={(e) => setState((p) => ({ ...p, eventDate: e.target.value }))}
                                disabled={!state.hasEventDate}
                              />
                              <div className="mt-2 text-xs text-white/45">
                                Jeśli zostawisz puste — nie będziemy sugerować zadań “pod termin”.
                              </div>
                            </div>
                          </>
                        )}

                        {currentStep === 3 && (
                          <>
                            <div className="text-white text-lg font-semibold">
                              3) Finanse — czy macie budżet?
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <OptionCard
                                title="Nie mam budżetu"
                                description="Pominiemy budżet startowy."
                                selected={!state.hasBudget}
                                onClick={() =>
                                  setState((p) => ({ ...p, hasBudget: false, financeInitial: "" }))
                                }
                              />
                              <OptionCard
                                title="Mam budżet"
                                description="Ustawimy budżet startowy i walutę."
                                selected={state.hasBudget}
                                onClick={() => setState((p) => ({ ...p, hasBudget: true }))}
                              />
                            </div>

                            <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                              <div className="md:col-span-2">
                                <label className="block text-xs text-white/70 mb-1">Budżet początkowy</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  className={`${inputBase} ${state.hasBudget ? "" : "opacity-60"}`}
                                  value={state.financeInitial}
                                  onChange={(e) => setState((p) => ({ ...p, financeInitial: e.target.value }))}
                                  disabled={!state.hasBudget}
                                  placeholder="np. 45000"
                                />
                              </div>

                              
                            </div>

                            <div className="mt-3 text-sm text-white/60">
                              Na końcu zapiszemy ustawienia i przejdziemy do wydarzenia.
                            </div>
                          </>
                        )}

                        {currentStep === 4 && (
                          <>
                            <div className="text-white text-lg font-semibold">4) Ilu gości planujecie?</div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                              {GUEST_RANGE_OPTIONS.map((opt) => (
                                <OptionCard
                                  key={opt.value}
                                  title={opt.label}
                                  description={opt.desc}
                                  selected={state.guestRange === opt.value}
                                  onClick={() => setState((p) => ({ ...p, guestRange: opt.value }))}
                                />
                              ))}
                            </div>
                          </>
                        )}

                        {currentStep === 5 && (
                          <>
                            <div className="text-white text-lg font-semibold">5) Status listy gości</div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              {GUEST_LIST_STATUS_OPTIONS.map((opt) => (
                                <OptionCard
                                  key={opt.value}
                                  title={opt.label}
                                  description={opt.desc}
                                  selected={state.guestListStatus === opt.value}
                                  onClick={() => setState((p) => ({ ...p, guestListStatus: opt.value }))}
                                />
                              ))}
                            </div>
                          </>
                        )}

                        {currentStep === 6 && (
                          <>
                            <div className="text-white text-lg font-semibold">6) Muzyka</div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {MUSIC_OPTIONS.map((opt) => (
                                <OptionCard
                                  key={opt.value}
                                  title={opt.label}
                                  description={opt.desc}
                                  selected={state.musicChoice === opt.value}
                                  onClick={() => setState((p) => ({ ...p, musicChoice: opt.value }))}
                                />
                              ))}
                            </div>
                          </>
                        )}

                        {currentStep === 7 && (
                          <>
                            <div className="text-white text-lg font-semibold">7) Sala</div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {VENUE_OPTIONS.map((opt) => (
                                <OptionCard
                                  key={opt.value}
                                  title={opt.label}
                                  description={opt.desc}
                                  selected={state.venueChoice === opt.value}
                                  onClick={() => setState((p) => ({ ...p, venueChoice: opt.value }))}
                                />
                              ))}
                            </div>
                          </>
                        )}

                        {currentStep === 8 && (
                          <>
                            <div className="text-white text-lg font-semibold">8) Usługi dodatkowe</div>
                            <div className="text-sm text-white/55">
                              Możesz wybrać wiele opcji.
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                              {OPTIONAL_VENDORS.map((opt) => (
                                <OptionCard
                                  key={opt.value}
                                  title={opt.label}
                                  description={opt.desc}
                                  selected={state.optionalVendors.includes(opt.value)}
                                  onClick={() =>
                                    setState((p) => ({
                                      ...p,
                                      optionalVendors: toggleInArray(p.optionalVendors, opt.value),
                                    }))
                                  }
                                />
                              ))}
                            </div>
                          </>
                        )}

                        {currentStep === 9 && (
                          <>
                            <div className="text-white text-lg font-semibold">
                              9) Czy chcesz korzystać z modułu „Dzień ślubu”?
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <OptionCard
                                title="Nie"
                                description="Nie używam modułu."
                                selected={!state.weddingDayEnabled}
                                onClick={() => setState((p) => ({ ...p, weddingDayEnabled: false }))}
                              />
                              <OptionCard
                                title="Tak"
                                description="Chcę checklistę i plan dnia w jednym miejscu."
                                selected={state.weddingDayEnabled}
                                onClick={() => setState((p) => ({ ...p, weddingDayEnabled: true }))}
                              />
                            </div>
                          </>
                        )}

                        {currentStep === 10 && (
                          <>
                            <div className="text-white text-lg font-semibold">
                              10) Powiadomienia — częstotliwość
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {NOTIFICATION_OPTIONS.map((opt) => (
                                <OptionCard
                                  key={opt.value}
                                  title={opt.label}
                                  description={opt.desc}
                                  selected={state.notificationFrequency === opt.value}
                                  onClick={() =>
                                    setState((p) => ({ ...p, notificationFrequency: opt.value }))
                                  }
                                />
                              ))}
                            </div>

                            <div className="mt-4 text-sm text-white/60">
                              Na końcu zapiszemy ustawienia i przejdziemy do wydarzenia.
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* PROGRESS + NAV */}
                  {!isIntro ? (
                    <div className="mt-7">
                      <div className="flex items-center justify-between text-xs text-white/55 mb-2">
                        <span>
                          Pytanie <b className="text-white">{currentStep}</b> z{" "}
                          <b className="text-white">{totalQuestions}</b>
                        </span>
                        <span>{progressPercent}%</span>
                      </div>

                      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full bg-[#c8a04b]/70 transition-all duration-300"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>
                  ) : null}

                  {/* Buttons */}
                  <div className="mt-6 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      className={btnSecondary}
                      onClick={goBack}
                      disabled={saving || isIntro}
                      title="Wróć"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Wróć
                    </button>

                    {!isIntro ? (
                      <div className="text-xs text-white/45">
                        Odpowiedzi zapisujemy w sesji (możesz cofać).
                      </div>
                    ) : (
                      <div />
                    )}

                    {isIntro ? (
                      <div />
                    ) : isLast ? (
                      <button
                        type="button"
                        className={btnGold}
                        onClick={finishAndSave}
                        disabled={saving}
                        title="Zapisz"
                      >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        {saving ? "Zapisywanie…" : "Zapisz i wejdź do wydarzenia"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={btnGold}
                        onClick={goNext}
                        disabled={saving}
                        title="Dalej"
                      >
                        Dalej
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Mała stopka “legalna” */}
            <div className="mt-3 text-center text-xs text-white/35">
              Ten wizard jest tylko przy pierwszym przejściu. Później edycja odpowiedzi jest dostępna z menu “Wywiad”.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
