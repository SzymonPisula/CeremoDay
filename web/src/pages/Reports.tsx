// CeremoDay/web/src/pages/Reports.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";
import type { ReportsSummary } from "../types/reports";

const fmt = (n: number) => n.toFixed(2);

const Reports: React.FC = () => {
  const { id: eventId } = useParams<{ id: string }>();

  const [data, setData] = useState<ReportsSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      if (!eventId) return;
      setLoading(true);
      setError(null);
      try {
        const res = await api.getReportsSummary(eventId);
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

  const relationsSorted = useMemo(() => {
    const obj = data?.guests?.relationCounts ?? {};
    return Object.entries(obj).sort((a, b) => b[1] - a[1]);
  }, [data]);

  const sideSorted = useMemo(() => {
    const obj = data?.guests?.sideCounts ?? {};
    return Object.entries(obj).sort((a, b) => b[1] - a[1]);
  }, [data]);

  const categoriesSorted = useMemo(() => {
    const obj = data?.finance?.byCategory ?? {};
    return Object.entries(obj).sort((a, b) => (b[1].actual + b[1].planned) - (a[1].actual + a[1].planned));
  }, [data]);

  if (!eventId) {
    return <div className="p-4 text-red-600">Brak identyfikatora wydarzenia w adresie URL.</div>;
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Raporty</h1>

      {error && (
        <div className="rounded border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading && <div className="text-sm text-gray-500">Ładowanie...</div>}

      {!loading && data && (
        <>
          {/* GOŚCIE */}
          <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm space-y-3">
            <h2 className="text-lg font-semibold">Goście</h2>

            <div className="grid gap-3 md:grid-cols-4 text-sm">
              <div className="rounded border bg-gray-50 p-2">
                <div className="text-gray-500">Łącznie</div>
                <div className="font-semibold">{data.guests.total}</div>
              </div>
              <div className="rounded border bg-gray-50 p-2">
                <div className="text-gray-500">Potwierdzone</div>
                <div className="font-semibold">
                  {data.guests.rsvpCounts.Potwierdzone} ({data.guests.rsvpPercent.Potwierdzone.toFixed(1)}%)
                </div>
              </div>
              <div className="rounded border bg-gray-50 p-2">
                <div className="text-gray-500">Odmowa</div>
                <div className="font-semibold">
                  {data.guests.rsvpCounts.Odmowa} ({data.guests.rsvpPercent.Odmowa.toFixed(1)}%)
                </div>
              </div>
              <div className="rounded border bg-gray-50 p-2">
                <div className="text-gray-500">Nieznane</div>
                <div className="font-semibold">
                  {data.guests.rsvpCounts.Nieznane} ({data.guests.rsvpPercent.Nieznane.toFixed(1)}%)
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded border p-3">
                <div className="font-medium mb-2">Strony (side)</div>
                {sideSorted.length === 0 ? (
                  <div className="text-sm text-gray-500">Brak danych.</div>
                ) : (
                  <ul className="text-sm space-y-1">
                    {sideSorted.map(([k, v]) => (
                      <li key={k} className="flex justify-between">
                        <span>{k}</span>
                        <span className="font-medium">{v}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded border p-3">
                <div className="font-medium mb-2">Relacje (relation)</div>
                {relationsSorted.length === 0 ? (
                  <div className="text-sm text-gray-500">Brak danych.</div>
                ) : (
                  <ul className="text-sm space-y-1">
                    {relationsSorted.slice(0, 12).map(([k, v]) => (
                      <li key={k} className="flex justify-between">
                        <span>{k}</span>
                        <span className="font-medium">{v}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="rounded border p-3">
              <div className="font-medium mb-2">Alergeny</div>
              <div className="text-sm text-gray-700">
                Osób z alergiami: <span className="font-semibold">{data.guests.allergens.guestsWithAllergensCount}</span>
              </div>
              {data.guests.allergens.top.length > 0 && (
                <div className="mt-2 text-sm">
                  <div className="text-gray-500 mb-1">Top alergeny</div>
                  <ul className="space-y-1">
                    {data.guests.allergens.top.map((a) => (
                      <li key={a.name} className="flex justify-between">
                        <span>{a.name}</span>
                        <span className="font-medium">{a.count}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="rounded border p-3">
              <div className="font-medium mb-2">Do dopytania (RSVP = Nieznane)</div>
              {data.guests.toAsk.length === 0 ? (
                <div className="text-sm text-gray-500">Brak.</div>
              ) : (
                <ul className="text-sm space-y-1">
                  {data.guests.toAsk.slice(0, 15).map((g) => (
                    <li key={g.id} className="flex justify-between">
                      <span>{g.first_name} {g.last_name}</span>
                      <span className="text-gray-500">{g.phone || g.email || "—"}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* FINANSE */}
          <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm space-y-3">
            <h2 className="text-lg font-semibold">Finanse</h2>

            <div className="grid gap-3 md:grid-cols-4 text-sm">
              <div className="rounded border bg-gray-50 p-2">
                <div className="text-gray-500">Suma planowana</div>
                <div className="font-semibold">{fmt(data.finance.totals.planned)}</div>
              </div>
              <div className="rounded border bg-gray-50 p-2">
                <div className="text-gray-500">Suma faktyczna</div>
                <div className="font-semibold">{fmt(data.finance.totals.actual)}</div>
              </div>
              <div className="rounded border bg-gray-50 p-2">
                <div className="text-gray-500">Do zapłaty (nieopłacone)</div>
                <div className="font-semibold">{fmt(data.finance.unpaid.toPaySum)}</div>
              </div>
              <div className="rounded border bg-gray-50 p-2">
                <div className="text-gray-500">Budżet początkowy</div>
                <div className="font-semibold">
                  {data.finance.budget?.initial_budget ?? "—"} {data.finance.budget?.currency ?? ""}
                </div>
              </div>
            </div>

            {data.finance.alerts.length > 0 && (
              <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm">
                <div className="font-medium mb-1">Alerty</div>
                <ul className="list-disc pl-5 space-y-1">
                  {data.finance.alerts.map((a, idx) => <li key={idx}>{a}</li>)}
                </ul>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded border p-3">
                <div className="font-medium mb-2">Wydatki per kategoria (plan vs fakt)</div>
                {categoriesSorted.length === 0 ? (
                  <div className="text-sm text-gray-500">Brak danych.</div>
                ) : (
                  <div className="space-y-1 text-sm">
                    {categoriesSorted.slice(0, 12).map(([cat, v]) => (
                      <div key={cat} className="flex justify-between">
                        <span>{cat}</span>
                        <span className="font-medium">{fmt(v.planned)} / {fmt(v.actual)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded border p-3">
                <div className="font-medium mb-2">TOP 10 kosztów</div>
                {data.finance.top10Costs.length === 0 ? (
                  <div className="text-sm text-gray-500">Brak.</div>
                ) : (
                  <ol className="text-sm space-y-1 list-decimal pl-5">
                    {data.finance.top10Costs.map((e) => (
                      <li key={e.id} className="flex justify-between gap-3">
                        <span className="truncate">{e.name}</span>
                        <span className="font-medium whitespace-nowrap">
                          {fmt(e.actual || e.planned)}
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>

            <div className="rounded border p-3">
              <div className="font-medium mb-2">Nieopłacone — najbliższe 14 dni</div>
              {data.finance.unpaid.dueSoon14.length === 0 ? (
                <div className="text-sm text-gray-500">Brak.</div>
              ) : (
                <ul className="text-sm space-y-1">
                  {data.finance.unpaid.dueSoon14.slice(0, 15).map((e) => (
                    <li key={e.id} className="flex justify-between">
                      <span className="truncate">{e.name} <span className="text-gray-500">({e.category})</span></span>
                      <span className="font-medium whitespace-nowrap">{e.due_date} ({e.days}d)</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* ZADANIA */}
          <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm space-y-3">
            <h2 className="text-lg font-semibold">Zadania</h2>

            <div className="grid gap-3 md:grid-cols-3 text-sm">
              <div className="rounded border bg-gray-50 p-2">
                <div className="text-gray-500">Łącznie</div>
                <div className="font-semibold">{data.tasks.total}</div>
              </div>
              <div className="rounded border bg-gray-50 p-2">
                <div className="text-gray-500">Zrobione</div>
                <div className="font-semibold">{data.tasks.done}</div>
              </div>
              <div className="rounded border bg-gray-50 p-2">
                <div className="text-gray-500">Otwarte</div>
                <div className="font-semibold">{data.tasks.open}</div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded border p-3">
                <div className="font-medium mb-2">Przeterminowane</div>
                {data.tasks.overdue.length === 0 ? (
                  <div className="text-sm text-gray-500">Brak.</div>
                ) : (
                  <ul className="text-sm space-y-1">
                    {data.tasks.overdue.slice(0, 15).map((t) => (
                      <li key={t.id} className="flex justify-between">
                        <span className="truncate">{t.title}</span>
                        <span className="text-gray-500">{t.due_date ?? "—"}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded border p-3">
                <div className="font-medium mb-2">Najbliższe 7 dni</div>
                {data.tasks.next7.length === 0 ? (
                  <div className="text-sm text-gray-500">Brak.</div>
                ) : (
                  <ul className="text-sm space-y-1">
                    {data.tasks.next7.slice(0, 15).map((t) => (
                      <li key={t.id} className="flex justify-between">
                        <span className="truncate">{t.title}</span>
                        <span className="font-medium">{t.due_date ?? "—"} ({t.days}d)</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>

          {/* DOKUMENTY + VENDORS */}
          <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm space-y-3">
            <h2 className="text-lg font-semibold">Dokumenty i usługodawcy</h2>

            <div className="grid gap-3 md:grid-cols-4 text-sm">
              <div className="rounded border bg-gray-50 p-2">
                <div className="text-gray-500">Dokumenty done/pending</div>
                <div className="font-semibold">{data.documents.done} / {data.documents.pending}</div>
              </div>
              <div className="rounded border bg-gray-50 p-2">
                <div className="text-gray-500">Usługodawcy selected</div>
                <div className="font-semibold">{data.vendors.selected} / {data.vendors.total}</div>
              </div>
              <div className="rounded border bg-gray-50 p-2">
                <div className="text-gray-500">Wybrani z brakami danych</div>
                <div className="font-semibold">{data.vendors.missingData.length}</div>
              </div>
            </div>

            {data.vendors.missingData.length > 0 && (
              <div className="rounded border p-3">
                <div className="font-medium mb-2">Kompletność danych (wybrani)</div>
                <ul className="text-sm space-y-1">
                  {data.vendors.missingData.slice(0, 15).map((v) => (
                    <li key={v.id} className="flex justify-between">
                      <span className="truncate">{v.name}</span>
                      <span className="text-gray-500">{v.missing.join(", ")}</span>
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
};

export default Reports;
