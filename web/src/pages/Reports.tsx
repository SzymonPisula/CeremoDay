// CeremoDay/web/src/pages/Reports.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams, useLocation } from "react-router-dom";
import {
  AlertTriangle,
  BarChart3,
  Building2,
  Download,
  FileText,
  ListChecks,
  Loader2,
  RefreshCw,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";

import Chart from "chart.js/auto";

import { generateReportsPdf } from "../lib/reportsPdf";

import Select, { type SelectOption } from "../ui/Select";
import { api } from "../lib/api";
import type { ReportsSummary, Rsvp, ReportSectionKey } from "../types/reports";

type Params = { id: string };

// -------------------------
// Helpers
// -------------------------
function toNumber(value: unknown, fallback = 0): number {
  const x = typeof value === "number" ? value : Number(value);
  return Number.isFinite(x) ? x : fallback;
}

function fmt2(n: unknown): string {
  return toNumber(n, 0).toFixed(2);
}

function clamp(n: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, n));
}


function nextFrame(): Promise<void> {
  return new Promise((r) => requestAnimationFrame(() => r()));
}

function topNWithOther(entries: Array<[string, number]>, n: number) {
  const sorted = [...entries].sort((a, b) => b[1] - a[1]);
  const head = sorted.slice(0, n);
  const tail = sorted.slice(n);
  const otherSum = tail.reduce((acc, [, v]) => acc + toNumber(v, 0), 0);
  if (otherSum > 0) head.push(["Inne", otherSum]);
  return head;
}

function prettyTs(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("pl-PL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// -------------------------
// Chart hook (Chart.js)
// -------------------------
type ArcLike = { x: number; y: number; tooltipPosition?: () => { x: number; y: number } };

type ChartSpec = {
  doughnutColors?: string[];
  showDoughnutLabels?: boolean;

  type: "doughnut" | "bar" | "line";
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
  }>;
  stacked?: boolean;
  yMax?: number;
};

function useChart(canvasId: string, spec: ChartSpec | null, deps: unknown[]): void {
  const instancesRef = useRef<Record<string, Chart>>({});

  useEffect(() => {
    let raf = 0;

    const mapAtCreation = instancesRef.current;

    if (!spec) {
      const prev = mapAtCreation[canvasId];
      if (prev) {
        prev.destroy();
        delete mapAtCreation[canvasId];
      }
      return;
    }

    const el = document.getElementById(canvasId) as HTMLCanvasElement | null;
    if (!el) return;

    const tryInit = () => {
      const parent = el.parentElement as HTMLElement | null;
      const w = parent?.clientWidth ?? 0;
      const h = parent?.clientHeight ?? 0;

      if (w < 50 || h < 50) {
        raf = requestAnimationFrame(tryInit);
        return;
      }

      const prev = mapAtCreation[canvasId];
      if (prev) {
        prev.destroy();
        delete mapAtCreation[canvasId];
      }

      const gold = "rgba(215,180,90,0.95)";
      const goldSoft = "rgba(215,180,90,0.55)";
      const whiteSoft = "rgba(255,255,255,0.65)";
      const greenSoft = "rgba(60,180,120,0.65)";
      const redSoft = "rgba(255,100,100,0.65)";

      const ds = spec.datasets.map((d, idx) => {
        const bg =
          spec.type === "doughnut"
            ? (spec.doughnutColors ?? [gold, greenSoft, redSoft, goldSoft, whiteSoft])
            : idx === 0
            ? goldSoft
            : idx === 1
            ? whiteSoft
            : greenSoft;

        const border =
          spec.type === "doughnut" ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.12)";

        return {
          ...d,
          backgroundColor: bg,
          borderColor: border,
          borderWidth: 1,
          borderRadius: spec.type === "bar" ? 10 : 0,
          tension: spec.type === "line" ? 0.35 : undefined,
          pointRadius: spec.type === "line" ? 2 : undefined,
        };
      });

      const doughnutLabelPlugin =
        spec.type === "doughnut" && spec.showDoughnutLabels !== false
          ? {
              id: "ceremoday-doughnut-labels",
              afterDatasetsDraw(chart: Chart) {
                const ctx2 = chart.ctx;
                const ds0 = chart.data.datasets?.[0];
                const values = (ds0?.data ?? []) as Array<number | null | undefined>;
                const total = values.reduce((acc: number, v) => acc + (Number(v) || 0), 0);
                if (!total) return;

                const meta = chart.getDatasetMeta(0);
                ctx2.save();
                ctx2.font = "600 12px system-ui, -apple-system, Segoe UI, Roboto, Arial";
                ctx2.fillStyle = "rgba(255,255,255,0.92)";
                ctx2.textAlign = "center";
                ctx2.textBaseline = "middle";

                meta.data.forEach((arc: unknown, i: number) => {
                  const aArc = arc as ArcLike;
                  const v = Number(values[i] ?? 0);
                  if (!v) return;
                  const p = Math.round((v / total) * 100);
                  const pos = aArc.tooltipPosition ? aArc.tooltipPosition() : { x: aArc.x, y: aArc.y };
                  const label = `${v} (${p}%)`;
                  ctx2.fillText(label, pos.x, pos.y);
                });

                ctx2.restore();
              },
            }
          : undefined;

      const chart = new Chart(el, {
        type: spec.type,
        data: { labels: spec.labels, datasets: ds },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          plugins: {
            legend: {
              labels: {
                color: "rgba(255,255,255,0.75)",
                boxWidth: 10,
                boxHeight: 10,
                padding: 14,
              },
            },
            tooltip: { enabled: true },
              ...(doughnutLabelPlugin ? { "ceremoday-doughnut-labels": doughnutLabelPlugin } : {}),
          },
          scales:
            spec.type === "doughnut"
              ? undefined
              : {
                  x: {
                    stacked: !!spec.stacked,
                    ticks: { color: "rgba(255,255,255,0.65)" },
                    grid: { color: "rgba(255,255,255,0.08)" },
                  },
                  y: {
                    stacked: !!spec.stacked,
                    beginAtZero: true,
                    suggestedMax: spec.yMax,
                    ticks: { color: "rgba(255,255,255,0.65)" },
                    grid: { color: "rgba(255,255,255,0.08)" },
                  },
                },
        },
      });

      mapAtCreation[canvasId] = chart;
    };

    tryInit();

    return () => {
      cancelAnimationFrame(raf);
      const prev = mapAtCreation[canvasId];
      if (prev) {
        prev.destroy();
        delete mapAtCreation[canvasId];
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

// -------------------------
// PDF export helpers
// -------------------------


export default function Reports() {
  const { id: eventId } = useParams<Params>();

  const [data, setData] = useState<ReportsSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Autopdf flags
  const autoDoneRef = useRef(false);
  const didAutoExportRef = useRef(false);

  // Filtry
  const [secSummary, setSecSummary] = useState(true);
  const [secGuests, setSecGuests] = useState(true);
  const [secFinance, setSecFinance] = useState(true);
  const [secTasks, setSecTasks] = useState(true);
  const [secDocsVendors, setSecDocsVendors] = useState(true);

  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeAlerts, setIncludeAlerts] = useState(true);
  const [includeLongLists, setIncludeLongLists] = useState(true);
  const [listLimit, setListLimit] = useState<10 | 20 | 50>(20);

  

  const selectedSections: ReportSectionKey[] = useMemo(() => {
    const out: ReportSectionKey[] = [];
    if (secSummary) out.push("summary");
    if (secGuests) out.push("guests");
    if (secFinance) out.push("finance");
    if (secTasks) out.push("tasks");
    if (secDocsVendors) out.push("docsVendors");
    return out.length ? out : ["summary"];
  }, [secSummary, secGuests, secFinance, secTasks, secDocsVendors]);
const printRef = useRef<HTMLDivElement | null>(null);

  const limitOptions: SelectOption<string>[] = [
    { value: "10", label: "10" },
    { value: "20", label: "20" },
    { value: "50", label: "50" },
  ];

  const LIST_LIMIT_MAP: Record<string, 10 | 20 | 50> = {
    "10": 10,
    "20": 20,
    "50": 50,
  };

  // UI helpers
  const cardBase =
    "rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md " +
    "shadow-[0_24px_80px_rgba(0,0,0,0.45)]";
  const chip =
    "inline-flex items-center gap-2 px-3 py-1 rounded-full " +
    "border border-white/10 bg-white/5 text-white/80 text-xs";
  const muted = "text-white/55";
  const divider = "border-white/10";

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

  const checkboxRow =
    "flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/4 px-3 py-2";

  const sectionTitle = "text-white font-semibold text-lg inline-flex items-center gap-2";

  // Load
  const load = async () => {
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

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  // --- SAFE derived data ---
  const currency = data?.finance?.budget?.currency || "PLN";

  const plannedTotal = toNumber(data?.finance?.totals?.planned, 0);
  const actualTotal = toNumber(data?.finance?.totals?.actual, 0);
  const diffTotal = plannedTotal - actualTotal;

  const budgetInitialRaw = data?.finance?.budget?.initial_budget;
  const budgetInitialNum =
    budgetInitialRaw === null || budgetInitialRaw === undefined ? null : toNumber(budgetInitialRaw, 0);

  const remainingTotal = budgetInitialNum === null ? null : budgetInitialNum - actualTotal;

  // Guests RSVP (bezpiecznie, żeby nie było undefined/toFixed crash)
  const totalGuests = toNumber(data?.guests?.total, 0);

  const rsvpCounts: Record<Rsvp, number> = useMemo(() => {
    const base: Record<Rsvp, number> = { Potwierdzone: 0, Odmowa: 0, Nieznane: 0 };
    const incoming = data?.guests?.rsvpCounts;
    if (!incoming) return base;
    return {
      Potwierdzone: toNumber(incoming.Potwierdzone, 0),
      Odmowa: toNumber(incoming.Odmowa, 0),
      Nieznane: toNumber(incoming.Nieznane, 0),
    };
  }, [data]);

  const rsvpPercent = useMemo(() => {
    const denom = totalGuests > 0 ? totalGuests : 1;
    return {
      Potwierdzone: (rsvpCounts.Potwierdzone / denom) * 100,
      Odmowa: (rsvpCounts.Odmowa / denom) * 100,
      Nieznane: (rsvpCounts.Nieznane / denom) * 100,
    };
  }, [rsvpCounts, totalGuests]);

  const unknownShare = totalGuests > 0 ? rsvpCounts.Nieznane / totalGuests : 0;
  const rsvpCoverage = totalGuests > 0 ? rsvpCounts.Potwierdzone / totalGuests : 0;

  // Tasks
  const overdueCount = toNumber(data?.tasks?.overdue?.length, 0);
  const next7Count = toNumber(data?.tasks?.next7?.length, 0);

  // Documents
  const docsTotal = toNumber(data?.documents?.total, 0);
  const docsDone = toNumber(data?.documents?.done, 0);
  const docsPending = toNumber(data?.documents?.pending, 0);
  const docsCompletion = docsTotal > 0 ? docsDone / docsTotal : 0;

  // Vendors
  const vendorsTotal = toNumber(data?.vendors?.total, 0);
const vendorsMissing = toNumber(data?.vendors?.missingContact?.length, 0);
  const vendorsComplete = Math.max(0, vendorsTotal - vendorsMissing);

  // -------- Auto export flags --------
  const autoExport = searchParams.get("autoExport") === "1";
  const autoSections = (searchParams.get("sections") ?? "").split(",").filter(Boolean);

  useEffect(() => {
    if (!autoExport) return;
    if (!data) return;
    if (loading) return;
    if (didAutoExportRef.current) return;

    const onlyFinance = autoSections.includes("finance");

    if (onlyFinance) {
      setSecSummary(false);
      setSecGuests(false);
      setSecTasks(false);
      setSecDocsVendors(false);
      setSecFinance(true);
    }

    setIncludeCharts(true);

    didAutoExportRef.current = true;

    setTimeout(() => {
      void exportPdfFromPreview();
    }, 250);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoExport, data, loading]);

  useEffect(() => {
    if (!data) return;

    const sp = new URLSearchParams(location.search);
    const autopdf = sp.get("autopdf") === "1";
    const scope = sp.get("scope"); // "finance" | null

    if (!autopdf) return;
    if (autoDoneRef.current) return;

    autoDoneRef.current = true;

    if (scope === "finance") {
      setSecSummary(false);
      setSecGuests(false);
      setSecFinance(true);
      setSecTasks(false);
      setSecDocsVendors(false);

      setIncludeCharts(true);
      setIncludeAlerts(true);
      setIncludeLongLists(true);
    }

    (async () => {
      await nextFrame();
      await nextFrame();
      await exportPdfFromPreview();

      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: "ceremoday:pdf-done" }, "*");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, location.search]);

  // -------------------------
  // Sorted lists
  // -------------------------
  const relationsSorted = useMemo(() => {
    const obj = data?.guests?.relationCounts ?? {};
    return Object.entries(obj).map(([k, v]) => [k, toNumber(v, 0)] as [string, number]).sort((a, b) => b[1] - a[1]);
  }, [data]);

  const sideSorted = useMemo(() => {
    const obj = data?.guests?.sideCounts ?? {};
    return Object.entries(obj).map(([k, v]) => [k, toNumber(v, 0)] as [string, number]).sort((a, b) => b[1] - a[1]);
  }, [data]);

  const categoriesSorted = useMemo(() => {
    const obj = data?.finance?.byCategory ?? {};
    return Object.entries(obj)
      .map(([k, v]) => {
        const vv = v as unknown as { planned?: unknown; actual?: unknown };
        return [
          k,
          {
            planned: toNumber(vv?.planned, 0),
            actual: toNumber(vv?.actual, 0),
          },
        ] as [string, { planned: number; actual: number }];
      })
      .sort((a, b) => (b[1].actual + b[1].planned) - (a[1].actual + a[1].planned));
  }, [data]);

  // -------------------------
  // Score + recommendations
  // -------------------------
  const score = useMemo(() => {
    if (!data) return 0;

    let s = 100;
    s -= clamp(unknownShare * 60, 0, 60);
    s -= clamp(overdueCount * 4, 0, 24);

    if (docsTotal > 0) {
      const pendingShare = docsPending / docsTotal;
      s -= clamp(pendingShare * 18, 0, 18);
    } else {
      s -= 6;
    }

    s -= clamp(vendorsMissing * 2.5, 0, 15);

    if (budgetInitialNum !== null && budgetInitialNum > 0) {
      const usage = actualTotal / budgetInitialNum;
      if (usage > 1) s -= clamp((usage - 1) * 40, 0, 20);
      else if (usage > 0.9) s -= 6;
    }

    if (actualTotal > plannedTotal && plannedTotal > 0) {
      s -= clamp(((actualTotal - plannedTotal) / plannedTotal) * 20, 0, 10);
    }

    return Math.round(clamp(s, 0, 100));
  }, [data, unknownShare, overdueCount, docsTotal, docsPending, vendorsMissing, budgetInitialNum, actualTotal, plannedTotal]);

  const recommendations = useMemo(() => {
    if (!data) return [];

    const rec: Array<{ title: string; detail: string; kind: "warn" | "info" | "ok" }> = [];

    if (unknownShare >= 0.35) {
      rec.push({
        title: "RSVP: dużo osób do dopytania",
        detail: `Nieznane: ${(unknownShare * 100).toFixed(0)}% (cel: < 10%). Sprint kontaktowy: ${Math.min(
          data.guests.toAsk.length,
          listLimit
        )} osób.`,
        kind: "warn",
      });
    } else if (unknownShare > 0.1) {
      rec.push({
        title: "RSVP: do dopięcia",
        detail: `Nieznane: ${(unknownShare * 100).toFixed(0)}%. Warto domknąć w najbliższym tygodniu.`,
        kind: "info",
      });
    } else {
      rec.push({
        title: "RSVP wygląda dobrze",
        detail: `Nieznane: ${(unknownShare * 100).toFixed(0)}%.`,
        kind: "ok",
      });
    }

    if (overdueCount > 0) {
      rec.push({
        title: "Zadania przeterminowane",
        detail: `Masz ${overdueCount} przeterminowanych zadań. 60 min na plan: deleguj / ustaw nowe terminy.`,
        kind: "warn",
      });
    } else {
      rec.push({
        title: "Zadania pod kontrolą",
        detail: `Brak przeterminowanych. Najbliższe 7 dni: ${next7Count}.`,
        kind: "ok",
      });
    }

    if (budgetInitialNum !== null) {
      const usage = budgetInitialNum > 0 ? actualTotal / budgetInitialNum : 0;
      if (usage >= 1) {
        rec.push({
          title: "Budżet przekroczony",
          detail: `Fakt: ${fmt2(actualTotal)} ${currency} przy budżecie ${fmt2(budgetInitialNum)} ${currency}.`,
          kind: "warn",
        });
      } else if (usage >= 0.9) {
        rec.push({
          title: "Budżet blisko limitu",
          detail: `Wykorzystanie: ${(usage * 100).toFixed(0)}%. Uważaj na kolejne zobowiązania.`,
          kind: "info",
        });
      } else {
        rec.push({
          title: "Budżet OK",
          detail: `Wykorzystanie: ${(usage * 100).toFixed(0)}%.`,
          kind: "ok",
        });
      }
    } else {
      rec.push({
        title: "Brak budżetu początkowego",
        detail: "Dodaj budżet startowy, żeby raport liczył „Pozostało” i % wykorzystania.",
        kind: "info",
      });
    }

    if (data.finance.unpaid.dueSoon14.length > 0) {
      rec.push({
        title: "Płatności w 14 dni",
        detail: `Pozycji: ${data.finance.unpaid.dueSoon14.length}. Suma do zapłaty: ${fmt2(
          data.finance.unpaid.toPaySum
        )} ${currency}.`,
        kind: "warn",
      });
    }

    if (docsTotal > 0 && docsCompletion < 0.5) {
      rec.push({
        title: "Dokumenty: niska kompletność",
        detail: `Ukończone: ${docsDone}/${docsTotal}. Dopięcie umów/ofert zmniejsza ryzyko.`,
        kind: "info",
      });
    }

    if (vendorsComplete === 0 && vendorsTotal > 0) {
      rec.push({
        title: "Brak usługodawców z kompletnymi danymi",
        detail: "Uzupełnij przynajmniej telefon/e-mail/stronę/adres dla kluczowych usługodawców – potem łatwo je znaleźć w dniu ślubu.",
        kind: "info",
      });
    }

    return rec.slice(0, 8);
  }, [
    data,
    unknownShare,
    overdueCount,
    next7Count,
    budgetInitialNum,
    actualTotal,
    currency,
    docsTotal,
    docsDone,
    docsCompletion,
    vendorsComplete,
    vendorsTotal,
    listLimit,
  ]);

  // -------------------------
  // Charts specs
  // -------------------------
  const rsvpChartSpec: ChartSpec | null = useMemo(() => {
    if (!data || !includeCharts) return null;
    return {
      type: "doughnut",
      labels: ["Potwierdzone", "Odmowa", "Nieznane"],
      datasets: [{ label: "RSVP", data: [rsvpCounts.Potwierdzone, rsvpCounts.Odmowa, rsvpCounts.Nieznane] }],
      doughnutColors: ["rgba(60,180,120,0.85)","rgba(255,100,100,0.85)","rgba(215,180,90,0.85)"],
      showDoughnutLabels: true,
    };
  }, [data, includeCharts, rsvpCounts]);

  const sideChartSpec: ChartSpec | null = useMemo(() => {
    if (!data || !includeCharts) return null;
    const top = topNWithOther(sideSorted, 6);
    return { type: "bar", labels: top.map(([k]) => k), datasets: [{ label: "Strony", data: top.map(([, v]) => v) }] };
  }, [data, includeCharts, sideSorted]);

  const relationChartSpec: ChartSpec | null = useMemo(() => {
    if (!data || !includeCharts) return null;
    const top = topNWithOther(relationsSorted, 8);
    return {
      type: "bar",
      labels: top.map(([k]) => k),
      datasets: [{ label: "Relacje", data: top.map(([, v]) => v) }],
    };
  }, [data, includeCharts, relationsSorted]);

  const financeCategorySpec: ChartSpec | null = useMemo(() => {
    if (!data || !includeCharts) return null;
    const top = categoriesSorted.slice(0, 8);
    return {
      type: "bar",
      labels: top.map(([k]) => k),
      datasets: [
        { label: "Plan", data: top.map(([, v]) => v.planned) },
        { label: "Fakt", data: top.map(([, v]) => v.actual) },
      ],
      stacked: false,
    };
  }, [data, includeCharts, categoriesSorted]);

  const cashflowSpec: ChartSpec | null = useMemo(() => {
    if (!data || !includeCharts) return null;
    const arr = data.finance.cashflow ?? [];
    if (arr.length === 0) return null;

    return {
      type: "line",
      labels: arr.map((x) => x.date),
      datasets: [{ label: "Plan (suma)", data: arr.map((x) => toNumber(x.plannedSum, 0)) }],
    };
  }, [data, includeCharts]);

  const tasksSpec: ChartSpec | null = useMemo(() => {
    if (!data || !includeCharts) return null;

    const done = toNumber(data.tasks.done, 0);
    const open = toNumber(data.tasks.open, 0);
    const overdue = toNumber(data.tasks.overdue.length, 0);

    return {
      type: "doughnut",
      labels: ["Zrobione", "Otwarte", "Przeterminowane"],
      datasets: [{ label: "Zadania", data: [done, open, overdue] }],
      doughnutColors: ["rgba(60,180,120,0.85)","rgba(215,180,90,0.85)","rgba(255,100,100,0.85)"],
      showDoughnutLabels: true,
    };
  }, [data, includeCharts]);

  // Bind charts (hooki bez warunków)
  useChart("chart-rsvp", rsvpChartSpec, [rsvpChartSpec]);
  useChart("chart-sides", sideChartSpec, [sideChartSpec]);
  useChart("chart-relations", relationChartSpec, [relationChartSpec]);
  useChart("chart-fin-cat", financeCategorySpec, [financeCategorySpec]);
  useChart("chart-cashflow", cashflowSpec, [cashflowSpec]);
  useChart("chart-tasks", tasksSpec, [tasksSpec]);

  // -------------------------
  // Export PDF (sekcja po sekcji)
  // -------------------------
  const exportPdfFromPreview = async () => {
    if (!data) return;
    if (isExporting) return;

    setIsExporting(true);
    setError(null);

    try {
      await generateReportsPdf(data, {
        sections: selectedSections,
        includeCharts,
        includeAlerts,
        includeLongLists,
        listLimit,
      });
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Błąd eksportu PDF.");
    } finally {
      setIsExporting(false);
    }
  };

  // -------------------------
  // Small UI components
  // -------------------------
  const ChartCard = (props: { title: string; subtitle?: string; canvasId: string; height?: number }) => {
    const h = props.height ?? 220;
    return (
      <div className="rounded-2xl border border-white/10 bg-white/4 p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="text-white/85 font-semibold">{props.title}</div>
            {props.subtitle && <div className="text-xs text-white/45 mt-0.5">{props.subtitle}</div>}
          </div>
        </div>

        <div className="relative" style={{ height: `${h}px` }}>
          <canvas id={props.canvasId} className="w-full h-full block" />
        </div>
      </div>
    );
  };

  const Pill = (props: { kind: "warn" | "info" | "ok"; title: string; detail: string }) => {
    const base = "rounded-2xl border p-4";
    const cls =
      props.kind === "warn"
        ? "border-amber-500/25 bg-amber-500/10"
        : props.kind === "info"
        ? "border-white/10 bg-white/5"
        : "border-emerald-500/25 bg-emerald-500/10";

    const dot = props.kind === "warn" ? "bg-amber-400" : props.kind === "info" ? "bg-white/50" : "bg-emerald-400";

    return (
      <div className={`${base} ${cls}`}>
        <div className="flex items-start gap-3">
          <div className={`mt-1.5 h-2.5 w-2.5 rounded-full ${dot}`} />
          <div className="min-w-0">
            <div className="text-white font-semibold">{props.title}</div>
            <div className="text-sm text-white/75 mt-1">{props.detail}</div>
          </div>
        </div>
      </div>
    );
  };

  // -------------------------
  // Render
  // -------------------------
  const hasEventId = !!eventId;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {!hasEventId && <div className="p-4 text-red-200">Brak identyfikatora wydarzenia w adresie URL.</div>}

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl border border-white/10 bg-white/5 grid place-items-center">
            <BarChart3 className="w-5 h-5 text-[#d7b45a]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Raporty</h1>
            <p className={`text-sm ${muted}`}>Filtry po lewej, podgląd po prawej + eksport PDF (sekcja po sekcji).</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" className={btnSecondary} onClick={load} disabled={loading || !hasEventId}>
            <RefreshCw className={loading ? "w-4 h-4 animate-spin" : "w-4 h-4"} />
            Odśwież
          </button>

          <button
            type="button"
            className={btnGold}
            onClick={() => void exportPdfFromPreview()}
            disabled={!data || loading || isExporting || !hasEventId}
          >
            <Download className={isExporting ? "w-4 h-4 animate-pulse" : "w-4 h-4"} />
            {isExporting ? "Generuję PDF…" : "Eksportuj PDF"}
          </button>

          <span className={chip}>
            <Sparkles className="w-4 h-4 text-[#d7b45a]" />
            Full pakiet
          </span>
        </div>
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
        <div className="grid gap-6 lg:grid-cols-12">
          {/* LEFT FILTERS */}
          <aside className="lg:col-span-4 space-y-4">
            <section className={`${cardBase} p-5`}>
              <div className="text-white font-semibold mb-3">Zakres raportu</div>

              <div className="space-y-2">
                <div className={checkboxRow}>
                  <label className="text-sm text-white/85 inline-flex items-center gap-2 cursor-pointer select-none">
                    <Sparkles className="w-4 h-4 text-[#d7b45a]" />
                    Podsumowanie / rekomendacje
                  </label>
                  <input
                    type="checkbox"
                    checked={secSummary}
                    onChange={(e) => setSecSummary(e.target.checked)}
                    className="h-4 w-4 accent-[#d7b45a]"
                  />
                </div>

                <div className={checkboxRow}>
                  <label className="text-sm text-white/85 inline-flex items-center gap-2 cursor-pointer select-none">
                    <Users className="w-4 h-4 text-[#d7b45a]" />
                    Goście
                  </label>
                  <input
                    type="checkbox"
                    checked={secGuests}
                    onChange={(e) => setSecGuests(e.target.checked)}
                    className="h-4 w-4 accent-[#d7b45a]"
                  />
                </div>

                <div className={checkboxRow}>
                  <label className="text-sm text-white/85 inline-flex items-center gap-2 cursor-pointer select-none">
                    <Wallet className="w-4 h-4 text-[#d7b45a]" />
                    Finanse
                  </label>
                  <input
                    type="checkbox"
                    checked={secFinance}
                    onChange={(e) => setSecFinance(e.target.checked)}
                    className="h-4 w-4 accent-[#d7b45a]"
                  />
                </div>

                <div className={checkboxRow}>
                  <label className="text-sm text-white/85 inline-flex items-center gap-2 cursor-pointer select-none">
                    <ListChecks className="w-4 h-4 text-[#d7b45a]" />
                    Zadania
                  </label>
                  <input
                    type="checkbox"
                    checked={secTasks}
                    onChange={(e) => setSecTasks(e.target.checked)}
                    className="h-4 w-4 accent-[#d7b45a]"
                  />
                </div>

                <div className={checkboxRow}>
                  <label className="text-sm text-white/85 inline-flex items-center gap-2 cursor-pointer select-none">
                    <FileText className="w-4 h-4 text-[#d7b45a]" />
                    Dokumenty / usługodawcy
                  </label>
                  <input
                    type="checkbox"
                    checked={secDocsVendors}
                    onChange={(e) => setSecDocsVendors(e.target.checked)}
                    className="h-4 w-4 accent-[#d7b45a]"
                  />
                </div>
              </div>

              <div className={`mt-4 pt-4 border-t ${divider}`}>
                <div className="text-white font-semibold mb-3">Szczegółowość</div>

                <div className="space-y-2">
                  <div className={checkboxRow}>
                    <label className="text-sm text-white/85 cursor-pointer select-none">Wykresy</label>
                    <input
                      type="checkbox"
                      checked={includeCharts}
                      onChange={(e) => setIncludeCharts(e.target.checked)}
                      className="h-4 w-4 accent-[#d7b45a]"
                    />
                  </div>

                  <div className={checkboxRow}>
                    <label className="text-sm text-white/85 inline-flex items-center gap-2 cursor-pointer select-none">
                      <AlertTriangle className="w-4 h-4 text-[#d7b45a]" />
                      Alerty finansowe
                    </label>
                    <input
                      type="checkbox"
                      checked={includeAlerts}
                      onChange={(e) => setIncludeAlerts(e.target.checked)}
                      className="h-4 w-4 accent-[#d7b45a]"
                    />
                  </div>

                  <div className={checkboxRow}>
                    <label className="text-sm text-white/85 cursor-pointer select-none">Długie listy</label>
                    <input
                      type="checkbox"
                      checked={includeLongLists}
                      onChange={(e) => setIncludeLongLists(e.target.checked)}
                      className="h-4 w-4 accent-[#d7b45a]"
                    />
                  </div>

                  <div className={checkboxRow}>
                    <label className="text-sm text-white/85 cursor-pointer select-none">Limit list</label>
                    <Select
                      value={String(listLimit)}
                      onChange={(v) => setListLimit(LIST_LIMIT_MAP[v] ?? 20)}
                      options={limitOptions}
                    />
                  </div>
                </div>

                <div className="mt-3 text-xs text-white/45">
                  Eksport PDF składa dokument sekcja-po-sekcji i sam przerzuca blok na następną stronę, jeśli się nie
                  mieści.
                </div>
              </div>
            </section>
          </aside>

          {/* RIGHT PREVIEW */}
          <main className="lg:col-span-8 space-y-4">
            <div ref={printRef} className="space-y-4">
              {/* SUMMARY */}
              {secSummary && (
                <section data-pdf-section="summary" className={`${cardBase} p-6 md:p-7 space-y-4`}>
                  <div className="flex items-center justify-between gap-3">
                    <h2 className={sectionTitle}>
                      <Sparkles className="w-5 h-5 text-[#d7b45a]" />
                      Podsumowanie
                    </h2>
                    <span className={chip}>Wygenerowano: {prettyTs(data.generatedAt)}</span>
                  </div>

                  <div className="grid gap-3 md:grid-cols-4">
                    <div className="rounded-2xl border border-white/10 bg-white/4 p-4">
                      <div className={`text-xs ${muted} mb-1`}>Score (0–100)</div>
                      <div className="text-white text-2xl font-bold">{score}</div>
                      <div className="text-xs text-white/45 mt-1">RSVP + zadania + dokumenty + vendor + budżet</div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/4 p-4">
                      <div className={`text-xs ${muted} mb-1`}>RSVP coverage</div>
                      <div className="text-white text-lg font-semibold">{(rsvpCoverage * 100).toFixed(0)}%</div>
                      <div className="text-xs text-white/45 mt-1">potwierdzeni / wszyscy</div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/4 p-4">
                      <div className={`text-xs ${muted} mb-1`}>Przeterminowane</div>
                      <div className="text-white text-lg font-semibold">{overdueCount}</div>
                      <div className="text-xs text-white/45 mt-1">zadania</div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/4 p-4">
                      <div className={`text-xs ${muted} mb-1`}>Płatności (14 dni)</div>
                      <div className="text-white text-lg font-semibold">{data.finance.unpaid.dueSoon14.length}</div>
                      <div className="text-xs text-white/45 mt-1">pozycji</div>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    {recommendations.map((r, idx) => (
                      <Pill key={idx} kind={r.kind} title={r.title} detail={r.detail} />
                    ))}
                  </div>
                </section>
              )}

              {/* GOŚCIE */}
              {secGuests && (
                <section data-pdf-section="guests" className={`${cardBase} p-6 md:p-7 space-y-4`}>
                  <div className="flex items-center justify-between gap-3">
                    <h2 className={sectionTitle}>
                      <Users className="w-5 h-5 text-[#d7b45a]" />
                      Goście
                    </h2>
                    <span className={chip}>Łącznie: {totalGuests}</span>
                  </div>

                  <div className="grid gap-3 md:grid-cols-4">
                    <div className="rounded-2xl border border-white/10 bg-white/4 p-4">
                      <div className={`text-xs ${muted} mb-1`}>Potwierdzone</div>
                      <div className="text-white text-lg font-semibold">
                        {rsvpCounts.Potwierdzone}{" "}
                        <span className="text-sm text-white/55">({rsvpPercent.Potwierdzone.toFixed(1)}%)</span>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/4 p-4">
                      <div className={`text-xs ${muted} mb-1`}>Odmowa</div>
                      <div className="text-white text-lg font-semibold">
                        {rsvpCounts.Odmowa} <span className="text-sm text-white/55">({rsvpPercent.Odmowa.toFixed(1)}%)</span>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/4 p-4">
                      <div className={`text-xs ${muted} mb-1`}>Nieznane</div>
                      <div className="text-white text-lg font-semibold">
                        {rsvpCounts.Nieznane}{" "}
                        <span className="text-sm text-white/55">({rsvpPercent.Nieznane.toFixed(1)}%)</span>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/4 p-4">
                      <div className={`text-xs ${muted} mb-1`}>Alergeny</div>
                      <div className="text-white text-lg font-semibold">
                        {toNumber(data.guests.allergens.guestsWithAllergensCount, 0)}
                      </div>
                      <div className="text-xs text-white/45 mt-1">osób z alergiami</div>
                    </div>
                  </div>

                  {includeCharts && (
                    <div className="grid gap-4 md:grid-cols-3">
                      <ChartCard title="RSVP" subtitle="Potwierdzone / Odmowa / Nieznane" canvasId="chart-rsvp" height={240} />
                      <ChartCard title="Strony" subtitle="Pani Młodej / Pana Młodego (top)" canvasId="chart-sides" height={240} />
                      <ChartCard title="Relacje" subtitle="Top relacje + inne" canvasId="chart-relations" height={240} />
                    </div>
                  )}

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-white/4 p-4">
                      <div className="text-white/80 font-semibold mb-3">Strony</div>
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
                      <div className="text-white/80 font-semibold mb-3">Relacje</div>
                      {relationsSorted.length === 0 ? (
                        <div className={`text-sm ${muted}`}>Brak danych.</div>
                      ) : (
                        <ul className="text-sm space-y-2">
                          {relationsSorted.slice(0, includeLongLists ? listLimit : 6).map(([k, v]) => (
                            <li key={k} className={`flex justify-between gap-3 border-b ${divider} pb-2 last:border-0 last:pb-0`}>
                              <span className="text-white/80">{k}</span>
                              <span className="text-white font-semibold">{v}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  {includeLongLists && (
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-2xl border border-white/10 bg-white/4 p-4">
                        <div className="text-white/80 font-semibold mb-3">Top alergeny</div>
                        {data.guests.allergens.top.length > 0 ? (
                          <ul className="text-sm space-y-2">
                            {data.guests.allergens.top.slice(0, 10).map((a) => (
                              <li key={a.name} className={`flex justify-between gap-3 border-b ${divider} pb-2 last:border-0 last:pb-0`}>
                                <span className="text-white/80">{a.name}</span>
                                <span className="text-white font-semibold">{toNumber(a.count, 0)}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div className={`text-sm ${muted}`}>Brak danych o alergenach.</div>
                        )}
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-white/4 p-4">
                        <div className="text-white/80 font-semibold mb-3">Do dopytania (Nieznane)</div>
                        {data.guests.toAsk.length === 0 ? (
                          <div className={`text-sm ${muted}`}>Brak.</div>
                        ) : (
                          <ul className="text-sm space-y-2">
                            {data.guests.toAsk.slice(0, listLimit).map((g) => (
                              <li key={g.id} className={`flex justify-between gap-3 border-b ${divider} pb-2 last:border-0 last:pb-0`}>
                                <span className="truncate text-white/85">
                                  {g.first_name} {g.last_name}
                                </span>
                                <span className="text-white/55 whitespace-nowrap">{g.phone ?? g.email ?? "—"}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  )}
                </section>
              )}

              {/* FINANSE */}
              {secFinance && (
                <section data-pdf-section="finance" className={`${cardBase} p-6 md:p-7 space-y-4`}>
                  <div className="flex items-center justify-between gap-3">
                    <h2 className={sectionTitle}>
                      <Wallet className="w-5 h-5 text-[#d7b45a]" />
                      Finanse
                    </h2>
                    <span className={chip}>{currency}</span>
                  </div>

                  <div className="grid gap-3 md:grid-cols-4">
                    <div className="rounded-2xl border border-white/10 bg-white/4 p-4">
                      <div className={`text-xs ${muted} mb-1`}>Plan</div>
                      <div className="text-white text-lg font-semibold">
                        {fmt2(plannedTotal)} {currency}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/4 p-4">
                      <div className={`text-xs ${muted} mb-1`}>Faktycznie</div>
                      <div className="text-white text-lg font-semibold">
                        {fmt2(actualTotal)} {currency}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/4 p-4">
                      <div className={`text-xs ${muted} mb-1`}>Różnica</div>
                      <div className="text-white text-lg font-semibold">
                        {fmt2(diffTotal)} {currency}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/4 p-4">
                      <div className={`text-xs ${muted} mb-1`}>Pozostało</div>
                      <div className="text-white text-lg font-semibold">
                        {remainingTotal === null ? "—" : `${fmt2(remainingTotal)} ${currency}`}
                      </div>
                      {budgetInitialNum !== null && budgetInitialNum > 0 && (
                        <div className="mt-2">
                          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                            <div
                              className="h-2 bg-[#d7b45a]"
                              style={{ width: `${clamp((actualTotal / budgetInitialNum) * 100, 0, 100)}%` }}
                            />
                          </div>
                          <div className="text-xs text-white/45 mt-1">
                            Wykorzystanie: {((actualTotal / budgetInitialNum) * 100).toFixed(0)}%
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {includeAlerts && data.finance.alerts.length > 0 && (
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

                  {includeCharts && (
                    <div className="grid gap-4 md:grid-cols-2">
                      <ChartCard title="Plan vs Fakt (kategorie)" subtitle="Top 8 kategorii" canvasId="chart-fin-cat" height={260} />
                      <ChartCard title="Cashflow (plan)" subtitle="Suma planowana w czasie" canvasId="chart-cashflow" height={260} />
                    </div>
                  )}

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-white/4 p-4">
                      <div className="text-white/80 font-semibold mb-3">Wydatki per kategoria (plan / fakt)</div>
                      {categoriesSorted.length === 0 ? (
                        <div className={`text-sm ${muted}`}>Brak danych.</div>
                      ) : (
                        <div className="space-y-2 text-sm">
                          {categoriesSorted.slice(0, includeLongLists ? listLimit : 6).map(([cat, v]) => (
                            <div key={cat} className={`flex justify-between gap-3 border-b ${divider} pb-2 last:border-0 last:pb-0`}>
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
                      <div className="text-white/80 font-semibold mb-3">TOP koszty</div>
                      {data.finance.top10Costs.length === 0 ? (
                        <div className={`text-sm ${muted}`}>Brak.</div>
                      ) : (
                        <ol className="text-sm space-y-2 list-decimal pl-5">
                          {data.finance.top10Costs.slice(0, includeLongLists ? 10 : 6).map((e) => (
                            <li key={e.id} className={`flex justify-between gap-3 border-b ${divider} pb-2 last:border-0 last:pb-0`}>
                              <span className="truncate text-white/85">
                                {e.name} <span className="text-white/45">({e.category})</span>
                              </span>
                              <span className="text-white font-semibold whitespace-nowrap">
                                {fmt2((e.actual ?? e.planned) as unknown)} {currency}
                              </span>
                            </li>
                          ))}
                        </ol>
                      )}
                    </div>
                  </div>

                  {includeLongLists && (
                    <div className="rounded-2xl border border-white/10 bg-white/4 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-white/80 font-semibold">Nieopłacone — najbliższe 14 dni</div>
                          <div className="text-xs text-white/45 mt-1">
                            Suma do zapłaty: {fmt2(data.finance.unpaid.toPaySum)} {currency}
                          </div>
                        </div>
                        <span className={chip}>pozycji: {data.finance.unpaid.dueSoon14.length}</span>
                      </div>

                      {data.finance.unpaid.dueSoon14.length === 0 ? (
                        <div className={`text-sm ${muted} mt-2`}>Brak.</div>
                      ) : (
                        <ul className="text-sm space-y-2 mt-3">
                          {data.finance.unpaid.dueSoon14.slice(0, listLimit).map((e) => (
                            <li key={e.id} className={`flex justify-between gap-3 border-b ${divider} pb-2 last:border-0 last:pb-0`}>
                              <span className="truncate text-white/85">
                                {e.name} <span className="text-white/45">({e.category})</span>{" "}
                                {e.vendor_name ? <span className="text-white/45">• {e.vendor_name}</span> : null}
                              </span>
                              <span className="text-white font-semibold whitespace-nowrap">
                                {e.due_date ?? "—"} <span className="text-white/45">({toNumber(e.days, 0)}d)</span>
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </section>
              )}

              {/* ZADANIA */}
              {secTasks && (
                <section data-pdf-section="tasks" className={`${cardBase} p-6 md:p-7 space-y-4`}>
                  <div className="flex items-center justify-between gap-3">
                    <h2 className={sectionTitle}>
                      <ListChecks className="w-5 h-5 text-[#d7b45a]" />
                      Zadania
                    </h2>
                    <span className={chip}>Łącznie: {toNumber(data.tasks.total, 0)}</span>
                  </div>

                  <div className="grid gap-3 md:grid-cols-4">
                    <div className="rounded-2xl border border-white/10 bg-white/4 p-4">
                      <div className={`text-xs ${muted} mb-1`}>Zrobione</div>
                      <div className="text-white text-lg font-semibold">{toNumber(data.tasks.done, 0)}</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/4 p-4">
                      <div className={`text-xs ${muted} mb-1`}>Otwarte</div>
                      <div className="text-white text-lg font-semibold">{toNumber(data.tasks.open, 0)}</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/4 p-4">
                      <div className={`text-xs ${muted} mb-1`}>Przeterminowane</div>
                      <div className="text-white text-lg font-semibold">{toNumber(data.tasks.overdue.length, 0)}</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/4 p-4">
                      <div className={`text-xs ${muted} mb-1`}>Najbliższe 7 dni</div>
                      <div className="text-white text-lg font-semibold">{toNumber(data.tasks.next7.length, 0)}</div>
                    </div>
                  </div>

                  {includeCharts && (
                    <div className="grid gap-4 md:grid-cols-2">
                      <ChartCard title="Status zadań" subtitle="Done / Open / Overdue" canvasId="chart-tasks" height={260} />
                      <div className="rounded-2xl border border-white/10 bg-white/4 p-4">
                        <div className="text-white/85 font-semibold">Szybkie wnioski</div>
                        <ul className="text-sm text-white/75 mt-2 space-y-2 list-disc pl-5">
                          <li>Priorytet: przeterminowane → zamknąć / przeplanować.</li>
                          <li>Następne 7 dni → delegowanie lub blok na 60–90 min.</li>
                          <li>Jeśli „Otwarte” rośnie — ustaw tygodniowy przegląd.</li>
                        </ul>
                      </div>
                    </div>
                  )}

                  {includeLongLists && (
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-2xl border border-white/10 bg-white/4 p-4">
                        <div className="text-white/80 font-semibold mb-3">Przeterminowane</div>
                        {data.tasks.overdue.length === 0 ? (
                          <div className={`text-sm ${muted}`}>Brak.</div>
                        ) : (
                          <ul className="text-sm space-y-2">
                            {data.tasks.overdue.slice(0, listLimit).map((t) => (
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
                            {data.tasks.next7.slice(0, listLimit).map((t) => (
                              <li key={t.id} className={`flex justify-between gap-3 border-b ${divider} pb-2 last:border-0 last:pb-0`}>
                                <span className="truncate text-white/85">{t.title}</span>
                                <span className="text-white font-semibold whitespace-nowrap">
                                  {t.due_date ?? "—"} <span className="text-white/45">({toNumber(t.days, 0)}d)</span>
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  )}
                </section>
              )}

              {/* DOKUMENTY + VENDORS */}
              {secDocsVendors && (
                <section data-pdf-section="docsVendors" className={`${cardBase} p-6 md:p-7 space-y-4`}>
                  <div className="flex items-center justify-between gap-3">
                    <h2 className={sectionTitle}>
                      <FileText className="w-5 h-5 text-[#d7b45a]" />
                      Dokumenty i usługodawcy
                    </h2>
                    <span className={chip}>
                      <Building2 className="w-4 h-4 text-[#d7b45a]" />
                      kompletność
                    </span>
                  </div>

                  <div className="grid gap-3 md:grid-cols-4">
                    <div className="rounded-2xl border border-white/10 bg-white/4 p-4">
                      <div className={`text-xs ${muted} mb-1`}>Dokumenty</div>
                      <div className="text-white text-lg font-semibold">
                        {docsDone} / {docsPending}
                      </div>
                      <div className="text-xs text-white/45 mt-1">done / pending</div>
                      <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-2 bg-[#d7b45a]"
                          style={{
                            width: `${docsTotal > 0 ? clamp((docsDone / docsTotal) * 100, 0, 100) : 0}%`,
                          }}
                        />
                      </div>
                      <div className="text-xs text-white/45 mt-1">
                        Kompletność: {docsTotal > 0 ? `${Math.round(docsCompletion * 100)}%` : "—"}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/4 p-4">
                      <div className={`text-xs ${muted} mb-1`}>Usługodawcy</div>
                      <div className="text-white text-lg font-semibold">
                        {vendorsComplete} / {vendorsTotal}
                      </div>
                      <div className="text-xs text-white/45 mt-1">komplet danych / wszyscy</div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/4 p-4 md:col-span-2">
                      <div className={`text-xs ${muted} mb-1`}>Wybrani z brakami danych</div>
                      <div className="text-white text-lg font-semibold">{vendorsMissing}</div>
                      <div className="text-xs text-white/45 mt-1">umowa/oferta — ryzyko braków</div>
                    </div>
                  </div>

                  {includeCharts && (
                    <div className="grid gap-4 md:grid-cols-2">
                                            <div className="rounded-2xl border border-white/10 bg-white/4 p-4">
                        <div className="text-white/85 font-semibold">Co warto uzupełnić</div>
                        <ul className="text-sm text-white/75 mt-2 space-y-2 list-disc pl-5">
                          <li>Umowa/oferta dla kluczowych usług: sala, foto, muzyka, catering.</li>
                          <li>Kontakt (telefon/email) — szczególnie gdy zbliża się termin.</li>
                          <li>Powiąż wydatki z usługodawcą (łatwiej wykrywać braki/ryzyko).</li>
                        </ul>
                      </div>
                    </div>
                  )}

                  {includeLongLists && data.vendors.missingContact.length > 0 && (
                    <div className="rounded-2xl border border-white/10 bg-white/4 p-4">
                      <div className="text-white/80 font-semibold mb-3">Braki danych kontaktowych</div>
                      <ul className="text-sm space-y-2">
                        {data.vendors.missingContact.slice(0, listLimit).map((v) => (
                          <li key={v.id} className={`flex justify-between gap-3 border-b ${divider} pb-2 last:border-0 last:pb-0`}>
                            <span className="truncate text-white/85">{v.name}</span>
                            <span className="text-white/55">{v.missing.join(", ")}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </section>
              )}

              {!secSummary && !secGuests && !secFinance && !secTasks && !secDocsVendors && (
                <section data-pdf-section="empty" className={`${cardBase} p-6`}>
                  <div className="text-white font-semibold mb-1">Podgląd pusty</div>
                  <div className="text-sm text-white/60">Włącz przynajmniej jedną sekcję w filtrach po lewej.</div>
                </section>
              )}
            </div>
          </main>
        </div>
      )}
    </div>
  );
}
