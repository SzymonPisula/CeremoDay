// CeremoDay/web/src/pages/Reports.tsx
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  BarChart3,
  Users,
  Wallet,
  ListChecks,
  FileText,
  Building2,
  AlertTriangle,
  Loader2,
  Sparkles,
} from "lucide-react";
import { api } from "../lib/api";
import type { ReportsSummary } from "../types/reports";

type Params = { id: string };

function fmt2(n: number): string {
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
}

function safeInt(n: unknown): number {
  const x = typeof n === "number" ? n : Number(n);
  return Number.isFinite(x) ? x : 0;
}

export default function Reports() {
  const { id: eventId } = useParams<Params>();

  const [data, setData] = useState<ReportsSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // -------------------------
  // UI helpers (CeremoDay vibe)
  // -------------------------
  const cardBase =
    "rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md " +
    "shadow-[0_24px_80px_rgba(0,0,0,0.45)]";

  const chip =
    "inline-flex items-center gap-2 px-3 py-1 rounded-full " +
    "border border-white/10 bg-white/5 text-white/80 text-xs";

  const sectionTitle =
    "text-white font-semibold text-lg inline-flex items-center gap-2";

  const muted = "text-white/55";
  const divider = "border-white/10";

  // -------------------------
  // Load
  // -------------------------
  useEffect(() => {
    const run = async () => {
      if (!eventId) return;
      setLoading(true);
      setError(null);
      try {
        const res = (await api.getReportsSummary(eventId)) as ReportsSummary;
        setData(res);
      } catch (e) {
        console.error(e);
        setError(e instanceof Error ? e.message : "Błąd pobierania raportów.");
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [eventId]);

  // -------------------------
  // Derived
  // -------------------------
  const relationsSorted = useMemo(() => {
    const obj = data?.guests?.relationCounts ?? {};
    return Object.entries(obj).sort((a, b) => safeInt(b[1]) - safeInt(a[1]));
  }, [data]);

  const sideSorted = useMemo(() => {
    const obj = data?.guests?.sideCounts ?? {};
    return Object.entries(obj).sort((a, b) => safeInt(b[1]) - safeInt(a[1]));
  }, [data]);

  const categoriesSorted = useMemo(() => {
    const obj = data?.finance?.byCategory ?? {};
    return Object.entries(obj).sort((a, b) => {
      const aSum = safeInt(a[1]?.actual) + safeInt(a[1]?.planned);
      const bSum = safeInt(b[1]?.actual) + safeInt(b[1]?.planned);
      return bSum - aSum;
    });
  }, [data]);

  if (!eventId) {
    return <div className="p-4 text-red-200">Brak identyfikatora wydarzenia w adresie URL.</div>;
  }

  const currency = data?.finance?.budget?.currency || "PLN";


  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl border border-white/10 bg-white/5 grid place-items-center">
            <BarChart3 className="w-5 h-5 text-[#d7b45a]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Raporty</h1>
            <p className={`text-sm ${muted}`}>
              Szybki przegląd: goście, finanse, zadania, dokumenty i usługodawcy.
            </p>
          </div>
        </div>

        <span className={chip}>
          <Sparkles className="w-4 h-4 text-[#d7b45a]" />
          Podsumowanie eventu
        </span>
      </div>

      {error && (
        <div className={`${cardBase} p-4 border-red-500/20 bg-red-500/10`}>
          <div className="text-sm text-red-200">{error}</div>
        </div>
      )}

      {loading && (
        <div className={`${cardBase} p-4`}>
          <div className="text-sm text-white/65 inline-flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Ładowanie raportów…
          </div>
        </div>
      )}

      {!loading && data && (
        <>
          {/* GOŚCIE */}
          <section className={`${cardBase} p-6 md:p-7 space-y-4`}>
            <div className="flex items-center justify-between gap-3">
              <h2 className={sectionTitle}>
                <Users className="w-5 h-5 text-[#d7b45a]" />
                Goście
              </h2>
              <span className={chip}>Łącznie: {data.guests.total}</span>
            </div>

            <div className={`grid gap-3 md:grid-cols-4`}>
              <div className="rounded-2xl border border-white/10 bg-white/4 p-4">
                <div className={`text-xs ${muted} mb-1`}>Łącznie</div>
                <div className="text-white text-lg font-semibold">{data.guests.total}</div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/4 p-4">
                <div className={`text-xs ${muted} mb-1`}>Potwierdzone</div>
                <div className="text-white text-lg font-semibold">
                  {data.guests.rsvpCounts.Potwierdzone}{" "}
                  <span className="text-sm text-white/55">
                    ({data.guests.rsvpPercent.Potwierdzone.toFixed(1)}%)
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/4 p-4">
                <div className={`text-xs ${muted} mb-1`}>Odmowa</div>
                <div className="text-white text-lg font-semibold">
                  {data.guests.rsvpCounts.Odmowa}{" "}
                  <span className="text-sm text-white/55">
                    ({data.guests.rsvpPercent.Odmowa.toFixed(1)}%)
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/4 p-4">
                <div className={`text-xs ${muted} mb-1`}>Nieznane</div>
                <div className="text-white text-lg font-semibold">
                  {data.guests.rsvpCounts.Nieznane}{" "}
                  <span className="text-sm text-white/55">
                    ({data.guests.rsvpPercent.Nieznane.toFixed(1)}%)
                  </span>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/4 p-4">
                <div className="text-white/80 font-semibold mb-3">Strony (side)</div>
                {sideSorted.length === 0 ? (
                  <div className={`text-sm ${muted}`}>Brak danych.</div>
                ) : (
                  <ul className="text-sm space-y-2">
                    {sideSorted.map(([k, v]) => (
                      <li key={k} className={`flex justify-between gap-3 border-b ${divider} pb-2 last:border-0 last:pb-0`}>
                        <span className="text-white/80">{k}</span>
                        <span className="text-white font-semibold">{v}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/4 p-4">
                <div className="text-white/80 font-semibold mb-3">Relacje (relation)</div>
                {relationsSorted.length === 0 ? (
                  <div className={`text-sm ${muted}`}>Brak danych.</div>
                ) : (
                  <ul className="text-sm space-y-2">
                    {relationsSorted.slice(0, 12).map(([k, v]) => (
                      <li key={k} className={`flex justify-between gap-3 border-b ${divider} pb-2 last:border-0 last:pb-0`}>
                        <span className="text-white/80">{k}</span>
                        <span className="text-white font-semibold">{v}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/4 p-4">
                <div className="text-white/80 font-semibold mb-3">Alergeny</div>
                <div className="text-sm text-white/80">
                  Osób z alergiami:{" "}
                  <span className="text-white font-semibold">
                    {data.guests.allergens.guestsWithAllergensCount}
                  </span>
                </div>

                {data.guests.allergens.top.length > 0 ? (
                  <div className="mt-3">
                    <div className={`text-xs ${muted} mb-2`}>Top alergeny</div>
                    <ul className="text-sm space-y-2">
                      {data.guests.allergens.top.map((a) => (
                        <li key={a.name} className={`flex justify-between gap-3 border-b ${divider} pb-2 last:border-0 last:pb-0`}>
                          <span className="text-white/80">{a.name}</span>
                          <span className="text-white font-semibold">{a.count}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className={`text-sm ${muted} mt-2`}>Brak danych o alergenach.</div>
                )}
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/4 p-4">
                <div className="text-white/80 font-semibold mb-3">
                  Do dopytania (RSVP = Nieznane)
                </div>
                {data.guests.toAsk.length === 0 ? (
                  <div className={`text-sm ${muted}`}>Brak.</div>
                ) : (
                  <ul className="text-sm space-y-2">
                    {data.guests.toAsk.slice(0, 15).map((g) => (
                      <li key={g.id} className={`flex justify-between gap-3 border-b ${divider} pb-2 last:border-0 last:pb-0`}>
                        <span className="text-white/85">
                          {g.first_name} {g.last_name}
                        </span>
                        <span className="text-white/55">
                          {g.phone || g.email || "—"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>

          {/* FINANSE */}
          <section className={`${cardBase} p-6 md:p-7 space-y-4`}>
            <div className="flex items-center justify-between gap-3">
              <h2 className={sectionTitle}>
                <Wallet className="w-5 h-5 text-[#d7b45a]" />
                Finanse
              </h2>
              <span className={chip}>
                <Sparkles className="w-4 h-4 text-[#d7b45a]" />
                {currency}
              </span>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-white/4 p-4">
                <div className={`text-xs ${muted} mb-1`}>Suma planowana</div>
                <div className="text-white text-lg font-semibold">
                  {fmt2(data.finance.totals.planned)} {currency}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/4 p-4">
                <div className={`text-xs ${muted} mb-1`}>Suma faktyczna</div>
                <div className="text-white text-lg font-semibold">
                  {fmt2(data.finance.totals.actual)} {currency}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/4 p-4">
                <div className={`text-xs ${muted} mb-1`}>Do zapłaty (nieopłacone)</div>
                <div className="text-white text-lg font-semibold">
                  {fmt2(data.finance.unpaid.toPaySum)} {currency}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/4 p-4">
                <div className={`text-xs ${muted} mb-1`}>Budżet początkowy</div>
                <div className="text-white text-lg font-semibold">
                  {data.finance.budget?.initial_budget ?? "—"}{" "}
                  <span className="text-white/55">{data.finance.budget?.currency ?? ""}</span>
                </div>
              </div>
            </div>

            {data.finance.alerts.length > 0 && (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
                <div className="text-white font-semibold inline-flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-[#d7b45a]" />
                  Alerty
                </div>
                <ul className="text-sm text-white/80 space-y-1 list-disc pl-5">
                  {data.finance.alerts.map((a, idx) => (
                    <li key={idx}>{a}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/4 p-4">
                <div className="text-white/80 font-semibold mb-3">
                  Wydatki per kategoria (plan vs fakt)
                </div>
                {categoriesSorted.length === 0 ? (
                  <div className={`text-sm ${muted}`}>Brak danych.</div>
                ) : (
                  <div className="space-y-2 text-sm">
                    {categoriesSorted.slice(0, 12).map(([cat, v]) => (
                      <div
                        key={cat}
                        className={`flex justify-between gap-3 border-b ${divider} pb-2 last:border-0 last:pb-0`}
                      >
                        <span className="text-white/80">{cat}</span>
                        <span className="text-white font-semibold whitespace-nowrap">
                          {fmt2(v.planned)} / {fmt2(v.actual)} {currency}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/4 p-4">
                <div className="text-white/80 font-semibold mb-3">TOP 10 kosztów</div>
                {data.finance.top10Costs.length === 0 ? (
                  <div className={`text-sm ${muted}`}>Brak.</div>
                ) : (
                  <ol className="text-sm space-y-2 list-decimal pl-5">
                    {data.finance.top10Costs.map((e) => (
                      <li key={e.id} className={`flex justify-between gap-3 border-b ${divider} pb-2 last:border-0 last:pb-0`}>
                        <span className="truncate text-white/85">{e.name}</span>
                        <span className="text-white font-semibold whitespace-nowrap">
                          {fmt2((e.actual ?? e.planned) as number)} {currency}
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/4 p-4">
              <div className="text-white/80 font-semibold mb-3">Nieopłacone — najbliższe 14 dni</div>
              {data.finance.unpaid.dueSoon14.length === 0 ? (
                <div className={`text-sm ${muted}`}>Brak.</div>
              ) : (
                <ul className="text-sm space-y-2">
                  {data.finance.unpaid.dueSoon14.slice(0, 15).map((e) => (
                    <li key={e.id} className={`flex justify-between gap-3 border-b ${divider} pb-2 last:border-0 last:pb-0`}>
                      <span className="truncate text-white/85">
                        {e.name}{" "}
                        <span className="text-white/45">({e.category})</span>
                      </span>
                      <span className="text-white font-semibold whitespace-nowrap">
                        {e.due_date} <span className="text-white/45">({e.days}d)</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* ZADANIA */}
          <section className={`${cardBase} p-6 md:p-7 space-y-4`}>
            <div className="flex items-center justify-between gap-3">
              <h2 className={sectionTitle}>
                <ListChecks className="w-5 h-5 text-[#d7b45a]" />
                Zadania
              </h2>
              <span className={chip}>Łącznie: {data.tasks.total}</span>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/4 p-4">
                <div className={`text-xs ${muted} mb-1`}>Łącznie</div>
                <div className="text-white text-lg font-semibold">{data.tasks.total}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/4 p-4">
                <div className={`text-xs ${muted} mb-1`}>Zrobione</div>
                <div className="text-white text-lg font-semibold">{data.tasks.done}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/4 p-4">
                <div className={`text-xs ${muted} mb-1`}>Otwarte</div>
                <div className="text-white text-lg font-semibold">{data.tasks.open}</div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/4 p-4">
                <div className="text-white/80 font-semibold mb-3">Przeterminowane</div>
                {data.tasks.overdue.length === 0 ? (
                  <div className={`text-sm ${muted}`}>Brak.</div>
                ) : (
                  <ul className="text-sm space-y-2">
                    {data.tasks.overdue.slice(0, 15).map((t) => (
                      <li key={t.id} className={`flex justify-between gap-3 border-b ${divider} pb-2 last:border-0 last:pb-0`}>
                        <span className="truncate text-white/85">{t.title}</span>
                        <span className="text-white/55 whitespace-nowrap">{t.due_date ?? "—"}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/4 p-4">
                <div className="text-white/80 font-semibold mb-3">Najbliższe 7 dni</div>
                {data.tasks.next7.length === 0 ? (
                  <div className={`text-sm ${muted}`}>Brak.</div>
                ) : (
                  <ul className="text-sm space-y-2">
                    {data.tasks.next7.slice(0, 15).map((t) => (
                      <li key={t.id} className={`flex justify-between gap-3 border-b ${divider} pb-2 last:border-0 last:pb-0`}>
                        <span className="truncate text-white/85">{t.title}</span>
                        <span className="text-white font-semibold whitespace-nowrap">
                          {t.due_date ?? "—"} <span className="text-white/45">({t.days}d)</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>

          {/* DOKUMENTY + VENDORS */}
          <section className={`${cardBase} p-6 md:p-7 space-y-4`}>
            <div className="flex items-center justify-between gap-3">
              <h2 className={sectionTitle}>
                <FileText className="w-5 h-5 text-[#d7b45a]" />
                Dokumenty i usługodawcy
              </h2>
              <span className={chip}>
                <Building2 className="w-4 h-4 text-[#d7b45a]" />
                Kontrola kompletności
              </span>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-white/4 p-4">
                <div className={`text-xs ${muted} mb-1`}>Dokumenty done/pending</div>
                <div className="text-white text-lg font-semibold">
                  {data.documents.done} / {data.documents.pending}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/4 p-4">
                <div className={`text-xs ${muted} mb-1`}>Usługodawcy selected</div>
                <div className="text-white text-lg font-semibold">
                  {data.vendors.selected} / {data.vendors.total}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/4 p-4 md:col-span-2">
                <div className={`text-xs ${muted} mb-1`}>Wybrani z brakami danych</div>
                <div className="text-white text-lg font-semibold">
                  {data.vendors.missingData.length}
                </div>
                <div className="text-xs text-white/45 mt-1">
                  Im więcej, tym większe ryzyko braków w ofercie/umowie.
                </div>
              </div>
            </div>

            {data.vendors.missingData.length > 0 && (
              <div className="rounded-2xl border border-white/10 bg-white/4 p-4">
                <div className="text-white/80 font-semibold mb-3">
                  Kompletność danych (wybrani)
                </div>
                <ul className="text-sm space-y-2">
                  {data.vendors.missingData.slice(0, 15).map((v) => (
                    <li key={v.id} className={`flex justify-between gap-3 border-b ${divider} pb-2 last:border-0 last:pb-0`}>
                      <span className="truncate text-white/85">{v.name}</span>
                      <span className="text-white/55">
                        {v.missing.join(", ")}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
