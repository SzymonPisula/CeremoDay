// CeremoDay/web/src/lib/reportsPdf.ts
// PDF export: budujemy raport "od zera" na podstawie danych (bez screenshotów).
// Styl: maksymalnie blisko UI CeremoDay (kafelki, zaokrąglenia, akcenty green/gold, białe tło).

import { jsPDF } from "jspdf";
import Chart from "chart.js/auto";
import type {
  ChartDataset,
  ChartType,
  Plugin,
  ArcElement,
  BarElement,
} from "chart.js";

import type { ReportsSummary, ReportSectionKey } from "../types/reports";
import dejavuUrl from "../assets/fonts/DejaVuSans.ttf?url";

type PdfOptions = {
  sections: ReportSectionKey[];
  includeCharts: boolean;
  includeAlerts: boolean;
  includeLongLists: boolean;
  listLimit: number;
};

// =========================
// jsPDF typings helpers (no `any`)
// =========================

type ExtendedJsPDF = jsPDF & {
  // jsPDF ma tę metodę runtime, ale w TS bywa nieopisana
  roundedRect?: (
    x: number,
    y: number,
    w: number,
    h: number,
    rx: number,
    ry: number,
    style?: "S" | "F" | "DF"
  ) => void;

  // jsPDF ma setDrawColor/setLineWidth runtime, ale typy czasem są niepełne
  setDrawColor?: (r: number, g: number, b: number) => void;
  setLineWidth?: (width: number) => void;
};

function asExtendedDoc(doc: jsPDF): ExtendedJsPDF {
  return doc as ExtendedJsPDF;
}

// =========================
// Assets (font + logo)
// =========================

async function blobToBase64(blob: Blob): Promise<string> {
  // Zwraca czyste base64 bez prefixu "data:*/*;base64,"
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = String(reader.result || "");
      const idx = res.indexOf(",");
      resolve(idx >= 0 ? res.slice(idx + 1) : res);
    };
    reader.onerror = () =>
      reject(new Error("Nie udało się odczytać danych base64."));
    reader.readAsDataURL(blob);
  });
}

async function fetchAsBase64(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Nie udało się pobrać zasobu: ${res.status}`);
  const blob = await res.blob();
  return await blobToBase64(blob);
}

async function fetchImageAsDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Nie udało się pobrać obrazka: ${res.status}`);
  const blob = await res.blob();

  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Nie udało się odczytać obrazka."));
    reader.readAsDataURL(blob);
  });
}

/**
 * WAŻNE:
 * Nie cache'ujemy "doc.addFont(...)" bo jsPDF jest tworzony od zera na każdą generację.
 * Cache'ujemy tylko base64 fontu, a do każdego doc dodajemy font do VFS.
 */
let _fontB64: string | null = null;

async function ensurePdfFont(doc: jsPDF): Promise<void> {
  if (!_fontB64) _fontB64 = await fetchAsBase64(dejavuUrl);

  doc.addFileToVFS("DejaVuSans.ttf", _fontB64);
  // Rejestrujemy oba style (nawet jeśli ten sam TTF) — zgodnie z użyciem doc.setFont("DejaVu","bold")
  doc.addFont("DejaVuSans.ttf", "DejaVu", "normal");
  doc.addFont("DejaVuSans.ttf", "DejaVu", "bold");
}

let _logoReady: Promise<string | null> | null = null;
async function ensureLogoDataUrl(): Promise<string | null> {
  if (_logoReady) return _logoReady;
  // Plik w web/public => dostępny jako /logo_bez_tla.png
  _logoReady = (async () => {
    try {
      return await fetchImageAsDataUrl("/logo_bez_tla.png");
    } catch {
      return null;
    }
  })();
  return _logoReady;
}

// =========================
// Theme
// =========================

const BRAND = {
  green: [18, 120, 84] as const, // #127854
  gold: [212, 175, 55] as const, // #d4af37
  ink: [18, 24, 32] as const,
  muted: [94, 107, 124] as const,
  card: [246, 250, 248] as const,
  line: [223, 232, 228] as const,
  shadow: [232, 240, 236] as const,
};

function setText(doc: jsPDF, rgb: readonly number[]) {
  doc.setTextColor(rgb[0], rgb[1], rgb[2]);
}

function setFill(doc: jsPDF, rgb: readonly number[]) {
  doc.setFillColor(rgb[0], rgb[1], rgb[2]);
}

function setStroke(doc: jsPDF, rgb: readonly number[]) {
  const d = asExtendedDoc(doc);
  d.setDrawColor?.(rgb[0], rgb[1], rgb[2]);
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function fmt2(n: unknown): string {
  const x = typeof n === "number" ? n : Number(n);
  return Number.isFinite(x) ? x.toFixed(2) : "0.00";
}

function prettyDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString("pl-PL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// =========================
// Layout helpers
// =========================

type CardOptions = {
  title?: string;
  accent?: "green" | "gold" | "none";
};

function roundedRect(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  r = 14,
  style: "S" | "F" | "DF" = "DF"
) {
  const d = asExtendedDoc(doc);
  if (typeof d.roundedRect === "function")
    d.roundedRect(x, y, w, h, r, r, style);
  else doc.rect(x, y, w, h, style);
}

function drawCard(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  opts?: CardOptions
) {
  // pseudo-cień
  setFill(doc, BRAND.shadow);
  setStroke(doc, BRAND.shadow);
  roundedRect(doc, x + 2, y + 3, w, h, 14, "F");

  // karta
  setFill(doc, BRAND.card);
  setStroke(doc, BRAND.line);
  asExtendedDoc(doc).setLineWidth?.(1);
  roundedRect(doc, x, y, w, h, 14, "DF");

  // akcent (belka)
  if (opts?.accent && opts.accent !== "none") {
    const rgb = opts.accent === "gold" ? BRAND.gold : BRAND.green;
    setFill(doc, rgb);
    roundedRect(doc, x, y, w, 6, 14, "F");
  }

  if (opts?.title) {
    doc.setFont("DejaVu", "bold");
    doc.setFontSize(11);
    setText(doc, BRAND.green);
    doc.text(opts.title, x + 14, y + 22);
  }
}

function drawTopBar(
  doc: jsPDF,
  title: string,
  subtitle: string,
  logoDataUrl: string | null
) {
  const pageW = doc.internal.pageSize.getWidth();
  setFill(doc, BRAND.green);
  doc.rect(0, 0, pageW, 64, "F");

  // gold underline
  setFill(doc, BRAND.gold);
  doc.rect(0, 64, pageW, 2, "F");

  const left = 44;

  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, "JPEG", left, 16, 32, 32);
    } catch {
      // ignore
    }
  }

  const textX = logoDataUrl ? left + 44 : left;

  doc.setFont("DejaVu", "bold");
  doc.setFontSize(18);
  setText(doc, [255, 255, 255]);
  doc.text(title, textX, 30);

  doc.setFont("DejaVu", "normal");
  doc.setFontSize(10);
  setText(doc, [230, 245, 240]);
  doc.text(subtitle, textX, 48);
}

function split(doc: jsPDF, text: string, maxWidth: number) {
  return doc.splitTextToSize(text, maxWidth);
}

function writeMuted(
  doc: jsPDF,
  text: string,
  x: number,
  yy: number,
  maxW: number
) {
  doc.setFont("DejaVu", "normal");
  doc.setFontSize(9);
  setText(doc, BRAND.muted);
  const lines = split(doc, text, maxW);
  let cy = yy;
  for (const line of lines) {
    doc.text(line, x, cy);
    cy += 12;
  }
  return cy;
}

function listBullets(
  doc: jsPDF,
  items: string[],
  x: number,
  yy: number,
  maxW: number,
  maxItems: number
) {
  doc.setFont("DejaVu", "normal");
  doc.setFontSize(10);
  setText(doc, BRAND.ink);
  let cy = yy;
  const slice = items.slice(0, maxItems);
  for (const it of slice) {
    const lines = split(doc, it, maxW - 16);
    doc.text("•", x, cy);
    doc.text(lines[0], x + 14, cy);
    cy += 14;
    for (const extra of lines.slice(1)) {
      doc.text(extra, x + 14, cy);
      cy += 14;
    }
  }
  return cy;
}

function fitFontSize(
  doc: jsPDF,
  text: string,
  maxW: number,
  base: number,
  min: number
) {
  doc.setFontSize(base);
  let size = base;
  while (size > min) {
    const w = doc.getTextWidth(text);
    if (w <= maxW) break;
    size -= 1;
    doc.setFontSize(size);
  }
  return size;
}

function wrapText(
  doc: jsPDF,
  text: string,
  maxW: number,
  fontSize: number,
  maxLines = 2
): string[] {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  doc.setFontSize(fontSize);

  for (const w of words) {
    const next = line ? line + " " + w : w;
    if (doc.getTextWidth(next) <= maxW) {
      line = next;
    } else {
      if (line) lines.push(line);
      line = w;
      if (lines.length >= maxLines - 1) break;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  return lines;
}

function drawBigValue(
  doc: jsPDF,
  value: string,
  x: number,
  y: number,
  maxW: number,
  baseSize = 20,
  minSize = 13
) {
  doc.setFont("DejaVu", "bold");
  setText(doc, BRAND.ink);

  const parts = value
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
    if (parts.length === 1) {
    fitFontSize(doc, parts[0], maxW, baseSize, minSize);
    doc.text(parts[0], x, y);
    return;
  }

  // SPECJALNIE: format "KWOTA\nPLN" -> PLN po prawej w tej samej linii
  if (parts.length === 2 && /^[A-Z]{3}$/.test(parts[1])) {
    const amount = parts[0];
    const cur = parts[1];

    // Kwota (duża) po lewej
    doc.setFont("DejaVu", "bold");
    fitFontSize(doc, amount, maxW - 42, baseSize, minSize); // zostaw miejsce na PLN
    doc.text(amount, x, y);

    // PLN (mniejsze) po prawej
    doc.setFont("DejaVu", "bold");
    doc.setFontSize(12);
    setText(doc, [60, 80, 96]); // lekko muted jak hint
    doc.text(cur, x + maxW, y, { align: "right" });

    return;
  }

  // Fallback: jeśli value ma wiele linii (opis itp.) – zostaje jak było
  fitFontSize(doc, parts[0], maxW, baseSize, minSize);
  doc.text(parts[0], x, y);

  const rest = parts.slice(1).join(" ").trim();
  if (rest) {
    doc.setFont("DejaVu", "normal");
    const fs = 11;
    doc.setFontSize(fs);
    setText(doc, [60, 80, 96]);
    const lines = wrapText(doc, rest, maxW, fs, 2);
    lines.forEach((ln, i) => doc.text(ln, x, y + 14 + i * 12));
  }


}

// =========================
// Charts (offscreen) — PDF tuned (readable)
// =========================
const chartBgPlugin: Plugin<ChartType> = {
  id: "ceremoday-chart-bg",
  beforeDraw(chart) {
    const ctx = chart.ctx;
    ctx.save();

    // tło pod wykresem (kolor kafla)
    ctx.fillStyle = "rgb(246, 250, 248)"; // BRAND.card
    ctx.fillRect(0, 0, chart.width, chart.height);

    ctx.restore();
  },
};


const percentOnArcPlugin: Plugin<ChartType> = {
  id: "ceremoday-percent-on-arc",
  afterDatasetsDraw(chart) {
    const type = (chart.config as unknown as { type?: string }).type;
    if (type !== "pie" && type !== "doughnut") return;

    const ds = chart.data.datasets?.[0];
    const raw = (ds?.data ?? []) as unknown as Array<number | null | undefined>;

    const total = raw.reduce<number>(
      (acc, v) => acc + (typeof v === "number" ? v : 0),
      0
    );
    if (!total) return;

    const meta = chart.getDatasetMeta(0);
    const ctx = chart.ctx;

    ctx.save();
    ctx.fillStyle = "#111827";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // x2–x3 większe niż było
    ctx.font = "800 54px Arial, sans-serif";

    (meta.data as unknown as ArcElement[]).forEach((arc, i) => {
      const v = raw[i];
      if (typeof v !== "number" || v <= 0) return;

      const p = arc.getProps(
        ["x", "y", "startAngle", "endAngle", "innerRadius", "outerRadius"],
        true
      ) as {
        x: number;
        y: number;
        startAngle: number;
        endAngle: number;
        innerRadius: number;
        outerRadius: number;
      };

      const angle = (p.startAngle + p.endAngle) / 2;
      const r = (p.innerRadius + p.outerRadius) / 2;

      const x = p.x + Math.cos(angle) * r;
      const y = p.y + Math.sin(angle) * r;

      const pct = Math.round((v / total) * 100);
      if (pct < 3) return;

      ctx.fillText(`${pct}%`, x, y);
    });

    ctx.restore();
  },
};

const barValuePlugin: Plugin<ChartType> = {
  id: "ceremoday-bar-values",
  afterDatasetsDraw(chart) {
    const type = (chart.config as unknown as { type?: string }).type;
    if (type !== "bar") return;

    const ctx = chart.ctx;
const opts = chart.options as unknown as { indexAxis?: "x" | "y" };
const indexAxis = opts.indexAxis ?? "x"; // "x" = pionowe kolumny

    ctx.save();
    ctx.fillStyle = "#111827";

    // x2–x3 większe
    ctx.font = "800 40px Arial, sans-serif";

    // obsługa wielu datasetów (np. Plan+Fakt)
    const dsCount = chart.data.datasets?.length ?? 0;

    for (let di = 0; di < dsCount; di++) {
      const meta = chart.getDatasetMeta(di);

      (meta.data as unknown as BarElement[]).forEach((bar, i) => {
        const value = chart.data.datasets?.[di]?.data?.[i] as unknown;
        const num = typeof value === "number" ? value : Number(value);
        if (!Number.isFinite(num)) return;

        const p = bar.getProps(["x", "y", "base"], true) as {
          x: number;
          y: number;
          base: number;
        };

        const txt = String(Math.round(num));

        if (indexAxis === "x") {
          // pionowe: NAD słupkiem
          ctx.textAlign = "center";
          ctx.textBaseline = "bottom";
          const pad = 10;
          ctx.fillText(txt, p.x, Math.min(p.y, p.base) - pad);
        } else {
          // poziome (fallback): po prawej
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";
          const pad = 12;
          ctx.fillText(txt, Math.max(p.x, p.base) + pad, p.y);
        }
      });
    }

    ctx.restore();
  },
};

type ChartSpec = {
  type: "pie" | "doughnut" | "bar" | "line";
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string[] | string;
    borderColor?: string;
    borderWidth?: number;
    barThickness?: number;
  }>;
  legend?: boolean;
  legendPosition?: "top" | "bottom" | "left";
  maxXTicks?: number;
  maxYTicks?: number;
  indexAxis?: "x" | "y";
};

type ChartCtorConfig = ConstructorParameters<typeof Chart>[1];

async function chartToDataUrl(
  spec: ChartSpec,
  width = 1400,
  height = 900
): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Nie udało się utworzyć kontekstu canvas.");

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = true;

  // ważne: przezroczyste tło (kafelka PDF jest tłem)
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "rgb(246, 250, 248)"; // BRAND.card
ctx.fillRect(0, 0, width, height);

  const isPie = spec.type === "pie" || spec.type === "doughnut";
  const legendPos = spec.legendPosition ?? "bottom";

  const datasets = spec.datasets.map((d) => {
    if (spec.type !== "bar") return { ...d };

    // Bar thickness: w PDF ma być "grubo". Jeśli ktoś podał małą wartość,
    // automatycznie ją podbijamy (np. 44 -> 88).
    const base = d.barThickness ?? 70;
    const thick = base < 70 ? base * 2 : base;

    return {
      ...d,
      barThickness: thick,
    };
  }) as unknown as ChartDataset[];

  const config = {
    type: spec.type,
    data: {
      labels: spec.labels,
      datasets,
    },
    plugins: [
      chartBgPlugin as Plugin<ChartType>,
      percentOnArcPlugin as Plugin<ChartType>,
      barValuePlugin as Plugin<ChartType>,
    ],
    options: {
      responsive: false,
      animation: false,

      // ostrzej w PDF
      devicePixelRatio: 3,
      maintainAspectRatio: false,

      // Więcej oddechu + miejsce na legendę POD wykresem
      layout: {
        padding: isPie
          ? {
              top: 52,
              right: 42,
              bottom: legendPos === "bottom" ? 120 : 44,
              left: 42,
            }
          : {
              top: 48,
              right: 34,
              bottom: legendPos === "bottom" ? 110 : 34,
              left: 34,
            },
      },

      plugins: {
        legend: {
          display: spec.legend ?? true,
          position: legendPos,
          align: "center",
          fullSize: true,
          labels: {
            // legenda WYRAŹNIE większa
            boxWidth: 34,
            boxHeight: 34,
            padding: 30,
            color: "#111827",
            font: {
              size: 34,
              weight: 800,
            },
          },
        },
        tooltip: { enabled: false },
      },

      elements: {
        // grubsze linie/punkty
        line: { borderWidth: 10, tension: 0.25 },
        point: { radius: 9, hoverRadius: 9 },

        // bar: grubsze, zaokrąglone
        bar: { borderRadius: 14, borderWidth: 0, borderSkipped: false },
      },

      ...(isPie
        ? {
            // grubszy ring
            cutout: spec.type === "doughnut" ? "40%" : undefined,
          }
        : {}),

      ...(spec.type === "bar"
        ? {
            indexAxis: spec.indexAxis ?? "x",
            scales: {
              x: {
                ticks: {
                  maxTicksLimit: spec.maxXTicks ?? 6,
                  // osie x3 większe
                  font: { size: 40, weight: 800 },
                  color: "#111827",
                  autoSkip: true,
                  maxRotation: 30,
                  minRotation: 0,
                  padding: 18,
                },
                grid: { color: "rgba(17,24,39,0.10)" },
              },
              y: {
                ticks: {
                  maxTicksLimit: spec.maxYTicks ?? 6,
                  font: { size: 40, weight: 800 },
                  color: "#111827",
                  precision: 0,
                  padding: 18,
                },
                grid: { color: "rgba(17,24,39,0.10)" },
              },
            },
          }
        : {}),

      ...(spec.type === "line"
        ? {
            scales: {
              x: {
                ticks: {
                  maxTicksLimit: spec.maxXTicks ?? 6,
                  font: { size: 40, weight: 800 },
                  color: "#111827",
                  autoSkip: true,
                  maxRotation: 0,
                  minRotation: 0,
                  padding: 18,
                },
                grid: { display: false },
              },
              y: {
                ticks: {
                  font: { size: 40, weight: 800 },
                  color: "#111827",
                  precision: 0,
                  padding: 18,
                },
                grid: { color: "rgba(17,24,39,0.10)" },
              },
            },
          }
        : {}),
    },
  } satisfies ChartCtorConfig;

  const chart = new Chart(ctx, config);
  chart.update();

const url = chart.toBase64Image("image/jpeg", 0.90);

  chart.destroy();
  canvas.remove();

  return url;
}

// =========================
// Score + rekomendacje
// =========================

function computeScore(summary: ReportsSummary, listLimit: number) {
  const total = summary.guests?.total || 0;
  const unknown = summary.guests?.rsvpCounts?.Nieznane || 0;
  const unknownShare = total > 0 ? unknown / total : 1;

  const overdueCount = summary.tasks?.overdue?.length || 0;
  const docsTotal = summary.documents?.total || 0;
  const docsPending = summary.documents?.pending || 0;
  const vendorsMissing = summary.vendors?.missingContact?.length || 0;

  const plannedTotal = Number(summary.finance?.totals?.planned || 0);
  const actualTotal = Number(summary.finance?.totals?.actual || 0);

  const budgetInitialRaw = summary.finance?.budget?.initial_budget;
  const budgetInitialNum =
    budgetInitialRaw === null || budgetInitialRaw === undefined
      ? null
      : Number(budgetInitialRaw);

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

  if (
    budgetInitialNum !== null &&
    Number.isFinite(budgetInitialNum) &&
    budgetInitialNum > 0
  ) {
    const usage = actualTotal / budgetInitialNum;
    if (usage > 1) s -= clamp((usage - 1) * 40, 0, 20);
    else if (usage > 0.9) s -= 6;
  }

  if (actualTotal > plannedTotal && plannedTotal > 0) {
    s -= clamp(((actualTotal - plannedTotal) / plannedTotal) * 20, 0, 10);
  }

  const score = Math.round(clamp(s, 0, 100));

  const rec: Array<{
    title: string;
    detail: string;
    kind: "warn" | "info" | "ok";
  }> = [];

  const toAskCount = Math.min(summary.guests?.toAsk?.length ?? 0, listLimit);

  if (unknownShare >= 0.35) {
    rec.push({
      title: "RSVP: dużo osób do dopytania",
      detail: `Nieznane: ${(unknownShare * 100).toFixed(
        0
      )}% (cel: < 10%). Sprint kontaktowy: ${toAskCount} osób.`,
      kind: "warn",
    });
  } else if (unknownShare > 0.1) {
    rec.push({
      title: "RSVP: do dopięcia",
      detail: `Nieznane: ${(unknownShare * 100).toFixed(
        0
      )}%. Warto domknąć w najbliższym tygodniu.`,
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
      title: "Zadania: przeterminowane",
      detail: `Przeterminowane: ${overdueCount}. Priorytet: zamknąć / przeplanować.`,
      kind: "warn",
    });
  } else {
    const next7 = summary.tasks?.next7?.length || 0;
    rec.push({
      title: "Zadania pod kontrolą",
      detail: `Brak przeterminowanych. Najbliższe 7 dni: ${next7}.`,
      kind: "ok",
    });
  }

  const cur = summary.finance?.budget?.currency ?? "PLN";
  const dueSoon = summary.finance?.unpaid?.dueSoon14 ?? [];
  if (dueSoon.length > 0) {
    rec.push({
      title: "Płatności w 14 dni",
      detail: `Pozycje: ${dueSoon.length}. Suma do zapłaty: ${fmt2(
        summary.finance?.unpaid?.toPaySum ?? 0
      )} ${cur}.`,
      kind: "info",
    });
  } else {
    rec.push({
      title: "Płatności pod kontrolą",
      detail: "Brak płatności w najbliższych 14 dniach.",
      kind: "ok",
    });
  }

  const docsDone = summary.documents?.done || 0;
  const docsTotal2 = summary.documents?.total || 0;
  const docsPct = docsTotal2 > 0 ? Math.round((docsDone / docsTotal2) * 100) : 0;
  if (docsTotal2 > 0 && docsPct < 40) {
    rec.push({
      title: "Dokumenty: niska kompletność",
      detail: `Ukończone: ${docsDone}/${docsTotal2}. Dopięcie umów/ofert zmniejsza ryzyko.`,
      kind: "info",
    });
  } else {
    rec.push({
      title: "Dokumenty OK",
      detail: `Ukończone: ${docsDone}/${docsTotal2}.`,
      kind: "ok",
    });
  }

  if (vendorsMissing > 0) {
    rec.push({
      title: "Braki w danych usługodawców",
      detail: `Uzupełnij kontakty (telefon/e-mail/strona/adres) — łatwiej w dniu ślubu. Braki: ${vendorsMissing}.`,
      kind: "info",
    });
  } else {
    rec.push({
      title: "Usługodawcy: komplet danych",
      detail: "Wybrani usługodawcy mają podstawowe dane kontaktowe.",
      kind: "ok",
    });
  }

  return { score, unknownShare, rec };
}

// =========================
// Export
// =========================

export async function generateReportsPdf(
  summary: ReportsSummary,
  opts: PdfOptions
): Promise<void> {
  const doc = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });
  await ensurePdfFont(doc);
  const logoDataUrl = await ensureLogoDataUrl();

  doc.setFont("DejaVu", "normal");
  doc.setCharSpace(0);

  drawTopBar(
    doc,
    "CeremoDay — Raport",
    `Wygenerowano: ${prettyDate(new Date().toISOString())}`,
    logoDataUrl
  );

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  const margin = 44;
  const gap = 14;
  const colW = pageW - margin * 2;

  let y = 84; // pod belką

  const startNewPage = () => {
    doc.addPage();
    drawTopBar(
      doc,
      "CeremoDay — Raport",
      `Wygenerowano: ${prettyDate(summary.generatedAt)}`,
      logoDataUrl
    );
    y = 84;
  };

  const ensureSpace = (needH: number) => {
    if (y + needH > pageH - margin) startNewPage();
  };

  const sectionTitle = (t: string, minContentH = 0) => {
    const remaining = pageH - margin - y;
    if (y > 110 || remaining < 40 + minContentH) startNewPage();
    ensureSpace(40 + minContentH);
    doc.setFont("DejaVu", "bold");
    doc.setFontSize(14);
    setText(doc, BRAND.ink);
    doc.text(t, margin, y + 18);

    setFill(doc, BRAND.green);
    doc.rect(margin, y + 24, 90, 3, "F");
    setFill(doc, BRAND.gold);
    doc.circle(margin + 98, y + 25.5, 2.5, "F");

    y += 40;
  };

  const statCard = (
    x: number,
    yy: number,
    w: number,
    label: string,
    value: string,
    hint?: string,
    accent: CardOptions["accent"] = "green",
    variant: "default" | "metric" = "default"
  ) => {
    const h = variant === "metric" ? 90 : hint ? 90 : 64;
    ensureSpace(h + 6);
    drawCard(doc, x, yy, w, h, { accent });

    if (variant === "metric") {
      const badge = hint && /%/.test(hint) ? hint.trim() : null;
      if (badge) {
        const bx = x + w - 14;
        const by = yy + 24;
        const padX = 8;
        const padY = 6;
        doc.setFont("DejaVu", "bold");
        doc.setFontSize(9);
        const bw = doc.getTextWidth(badge) + padX * 2;
        const bh = 16;
        setFill(doc, BRAND.shadow);
        roundedRect(doc, bx - bw + 1, by - bh + 2, bw, bh, 8, "F");
        setFill(doc, [255, 255, 255]);
        setStroke(doc, BRAND.line);
        roundedRect(doc, bx - bw, by - bh, bw, bh, 8, "DF");
        setText(doc, BRAND.green);
        doc.text(badge, bx - bw / 2, by - bh / 2 + padY, {
          align: "center",
        });
      }

      drawBigValue(doc, value, x + 14, yy + 46, w - 28, 22, 14);

      doc.setFont("DejaVu", "bold");
      doc.setFontSize(10);
      setText(doc, BRAND.muted);
      const lines = wrapText(doc, label, w - 28, 10, 2);
      lines.forEach((ln, i) => doc.text(ln, x + 14, yy + 64 + i * 12));
    } else {
      doc.setFont("DejaVu", "bold");
      doc.setFontSize(10);
      setText(doc, BRAND.muted);
      doc.text(label, x + 14, yy + 28);

      drawBigValue(doc, value, x + 14, yy + 54, w - 28, 18, 12);

      if (hint && !value.includes("\n")) {
        doc.setFont("DejaVu", "normal");
        doc.setFontSize(9);
        setText(doc, BRAND.muted);
        const lines = split(doc, hint, w - 28);
        let cy = yy + 70;
        for (const l of lines.slice(0, 2)) {
          doc.text(l, x + 14, cy);
          cy += 12;
        }
      }
    }

    return h;
  };

  const sections =
    opts.sections ?? ["summary", "guests", "finance", "tasks", "docsVendors"];
  const { score, unknownShare, rec } = computeScore(summary, opts.listLimit);

  // -------- Summary
  if (sections.includes("summary")) {
    const cardH = 344;
    sectionTitle("Podsumowanie", cardH + 18);

    ensureSpace(cardH + 10);
    drawCard(doc, margin, y, colW, cardH, {
      title: "Najważniejsze",
      accent: "green",
    });

    const tileW = (colW - gap * 3) / 4;
    const tileY = y + 36;

    const totalGuests = summary.guests?.total || 0;
    const confirmed = summary.guests?.rsvpCounts?.Potwierdzone || 0;
    const coverage =
      totalGuests > 0 ? Math.round((confirmed / totalGuests) * 100) : 0;

    const overdueCount = summary.tasks?.overdue?.length || 0;
    const dueSoon14 = summary.finance?.unpaid?.dueSoon14?.length || 0;

    statCard(
      margin,
      tileY,
      tileW,
      "Score (0–100)",
      String(score),
      "RSVP + zadania + dokumenty + vendor + budżet",
      "gold"
    );
    statCard(
      margin + (tileW + gap) * 1,
      tileY,
      tileW,
      "Pokrycie RSVP",
      `${coverage}%`,
      "potwierdzeni / wszyscy",
      "green"
    );
    statCard(
      margin + (tileW + gap) * 2,
      tileY,
      tileW,
      "Przeterminowane",
      String(overdueCount),
      "zadania",
      overdueCount > 0 ? "gold" : "green"
    );
    statCard(
      margin + (tileW + gap) * 3,
      tileY,
      tileW,
      "Płatności (14 dni)",
      String(dueSoon14),
      "pozycji",
      dueSoon14 > 0 ? "gold" : "green"
    );

    const recY = tileY + 92;
    const recW = (colW - gap) / 2;
    const recH = 74;

    const recCard = (idx: number, x: number, yy: number) => {
      const item = rec[idx];
      if (!item) return;

      const accent: CardOptions["accent"] =
        item.kind === "warn"
          ? "gold"
          : item.kind === "ok"
          ? "green"
          : "none";
      drawCard(doc, x, yy, recW, recH, { accent });

      doc.setFont("DejaVu", "bold");
      doc.setFontSize(11);
      setText(doc, BRAND.ink);
      doc.text(item.title, x + 14, yy + 30);

      doc.setFont("DejaVu", "normal");
      doc.setFontSize(9);
      setText(doc, BRAND.muted);
      const lines = split(doc, item.detail, recW - 28);
      let cy = yy + 46;
      for (const l of lines.slice(0, 2)) {
        doc.text(l, x + 14, cy);
        cy += 12;
      }
    };

    recCard(0, margin, recY);
    recCard(1, margin + recW + gap, recY);
    recCard(2, margin, recY + recH + gap);
    recCard(3, margin + recW + gap, recY + recH + gap);

    doc.setFont("DejaVu", "normal");
    doc.setFontSize(9);
    setText(doc, BRAND.muted);
    doc.text(
      `Wygenerowano: ${prettyDate(summary.generatedAt)}`,
      margin + colW - 220,
      y + cardH - 18
    );

    y += cardH + 18;
  }

  // -------- Guests
  if (sections.includes("guests")) {
    const boxH = 620;
    sectionTitle("Goście", boxH + 18);

    ensureSpace(boxH + 10);
    drawCard(doc, margin, y, colW, boxH, {
      title: "Statystyki gości",
      accent: "green",
    });

    const tileW = (colW - gap * 3) / 4;
    const tileY = y + 36;

    const rsvpConfirmed = summary.guests?.rsvpCounts?.Potwierdzone || 0;
    const rsvpDeclined = summary.guests?.rsvpCounts?.Odmowa || 0;
    const rsvpUnknown = summary.guests?.rsvpCounts?.Nieznane || 0;
    const guestsWithAllergens =
      summary.guests?.allergens?.guestsWithAllergensCount || 0;

    const pctConfirmed = summary.guests?.rsvpPercent?.Potwierdzone ?? 0;
    const pctDeclined = summary.guests?.rsvpPercent?.Odmowa ?? 0;
    const pctUnknown = summary.guests?.rsvpPercent?.Nieznane ?? 0;

    statCard(
      margin,
      tileY,
      tileW,
      "Potwierdzone",
      `${rsvpConfirmed}`,
      `${pctConfirmed}%`,
      "green",
      "metric"
    );
    statCard(
      margin + (tileW + gap) * 1,
      tileY,
      tileW,
      "Odmowa",
      `${rsvpDeclined}`,
      `${pctDeclined}%`,
      "gold",
      "metric"
    );
    statCard(
      margin + (tileW + gap) * 2,
      tileY,
      tileW,
      "Nieznane",
      `${rsvpUnknown}`,
      `${pctUnknown}%`,
      rsvpUnknown > 0 ? "gold" : "green",
      "metric"
    );
    statCard(
      margin + (tileW + gap) * 3,
      tileY,
      tileW,
      "Alergeny",
      `${guestsWithAllergens}`,
      "osób z alergiami",
      guestsWithAllergens > 0 ? "gold" : "green"
    );

    const chartsY = tileY + 98;
    const halfW = (colW - gap) / 2;
    const chartH = 260;

    if (opts.includeCharts) {
      const donut = await chartToDataUrl(
        {
          type: "doughnut",
          labels: ["Potwierdzone", "Odmowa", "Nieznane"],
          datasets: [
            {
              label: "RSVP",
              data: [rsvpConfirmed, rsvpDeclined, rsvpUnknown],
              backgroundColor: ["#2fb36b", "#ef5b5b", "#d6b04d"],
            },
          ],
          legend: true,
          legendPosition: "bottom",
        },
        1200,
        1200
      );

      drawCard(doc, margin, chartsY, halfW, chartH, {
        title: "RSVP",
        accent: "none",
      });
      writeMuted(
        doc,
        "Potwierdzone / Odmowa / Nieznane",
        margin + 14,
        chartsY + 40,
        halfW - 28
      );

      const boxW = halfW - 32;
      const boxTop = chartsY + 58;
      const boxH2 = chartH - 72;
      const s = Math.min(boxW, boxH2);

      doc.addImage(
        donut,
        "JPEG",
        margin + 16 + (boxW - s) / 2,
        boxTop + (boxH2 - s) / 2,
        s,
        s
      );
    }

    if (opts.includeCharts) {
      const sides = Object.entries(summary.guests?.sideCounts || {});
      const sidesSorted = sides
        .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
        .slice(0, 6);
      const labels = sidesSorted.map((s) => s[0]);
      const data = sidesSorted.map((s) => Number(s[1] || 0));

      const bars = await chartToDataUrl(
        {
          type: "bar",
          labels,
          datasets: [
            {
              label: "Strony",
              data,
              backgroundColor: "#d6b04d",
              barThickness: 72,
            },
          ],
          legend: true,
          legendPosition: "bottom",
          indexAxis: "x",
          maxXTicks: 5,
          maxYTicks: 6,
        },
        1600,
        900
      );

      drawCard(doc, margin + halfW + gap, chartsY, halfW, chartH, {
        title: "Strony",
        accent: "none",
      });
      writeMuted(
        doc,
        "Pani Młodej / Pana Młodego (top)",
        margin + halfW + gap + 14,
        chartsY + 40,
        halfW - 28
      );

      doc.addImage(
        bars,
        "JPEG",
        margin + halfW + gap + 16,
        chartsY + 58,
        halfW - 32,
        chartH - 76
      );
    }

    const relY = chartsY + chartH + gap;
    const relH = 190;

    if (opts.includeCharts) {
      const rel = Object.entries(summary.guests?.relationCounts || {});
      const relSorted = rel
        .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
        .slice(0, 8);
      const labels = relSorted.map((s) => s[0]);
      const data = relSorted.map((s) => Number(s[1] || 0));

      const bars = await chartToDataUrl(
        {
          type: "bar",
          labels,
          datasets: [
            {
              label: "Relacje",
              data,
              backgroundColor: "#d6b04d",
              barThickness: 72,
            },
          ],
          legend: true,
          legendPosition: "bottom",
          indexAxis: "x",
          maxXTicks: 6,
          maxYTicks: 8,
        },
        1800,
        900
      );

      drawCard(doc, margin, relY, colW, relH, {
        title: "Relacje",
        accent: "none",
      });
      writeMuted(doc, "Top relacje + inne", margin + 14, relY + 40, colW - 28);

const targetW = colW - 32;
const targetH = relH - 58;

// proporcja źródła (taka jak generujesz w chartToDataUrl dla relacji)
const srcW = 1800;
const srcH = 900;
const srcRatio = srcW / srcH;

let drawW = targetW;
let drawH = targetW / srcRatio;

if (drawH > targetH) {
  drawH = targetH;
  drawW = targetH * srcRatio;
}

const dx = margin + 16 + (targetW - drawW) / 2;
const dy = relY + 52 + (targetH - drawH) / 2;

doc.addImage(bars, "JPEG", dx, dy, drawW, drawH, undefined, "FAST");
    }

    const listY = relY + relH + gap;
    const listH = 110;
    const listW = (colW - gap) / 2;

    drawCard(doc, margin, listY, listW, listH, {
      title: "Top alergeny",
      accent: "none",
    });
    const topAll = summary.guests?.allergens?.top || [];
    if (topAll.length === 0) {
      writeMuted(doc, "Brak danych", margin + 14, listY + 42, listW - 28);
    } else {
      doc.setFont("DejaVu", "normal");
      doc.setFontSize(10);
      setText(doc, BRAND.ink);
      let cy = listY + 46;
      for (const it of topAll.slice(0, 6)) {
        doc.text(`${it.name}`, margin + 14, cy);
        doc.setFont("DejaVu", "bold");
        doc.text(String(it.count), margin + listW - 24, cy, {
          align: "right",
        });
        doc.setFont("DejaVu", "normal");
        cy += 16;
      }
    }

    drawCard(doc, margin + listW + gap, listY, listW, listH, {
      title: "Do dopytania (Nieznane)",
      accent: "none",
    });
    const toAsk = summary.guests?.toAsk || [];
    if (toAsk.length === 0) {
      writeMuted(
        doc,
        "Brak",
        margin + listW + gap + 14,
        listY + 42,
        listW - 28
      );
    } else {
      let cy = listY + 46;
      doc.setFont("DejaVu", "normal");
      doc.setFontSize(10);
      setText(doc, BRAND.ink);
      for (const g of toAsk.slice(0, 3)) {
        const name = `${g.first_name} ${g.last_name}`;
        const phone = g.phone ? String(g.phone) : g.email ? String(g.email) : "—";
        doc.text(name, margin + listW + gap + 14, cy);
        doc.setFont("DejaVu", "bold");
        doc.text(phone, margin + colW - 18, cy, { align: "right" });
        doc.setFont("DejaVu", "normal");
        cy += 16;
      }
      if (toAsk.length > 3) {
        writeMuted(
          doc,
          `…oraz ${toAsk.length - 3} kolejnych`,
          margin + listW + gap + 14,
          listY + listH - 18,
          listW - 28
        );
      }
    }

    y += boxH + 18;
  }

  // -------- Finance
  if (sections.includes("finance")) {
    const boxH = 584;
    sectionTitle("Finanse", boxH + 18);

    ensureSpace(boxH + 10);
    drawCard(doc, margin, y, colW, boxH, {
      title: "Budżet i wydatki",
      accent: "green",
    });

    const tileW = (colW - gap * 3) / 4;
    const tileY = y + 36;

    const cur = summary.finance?.budget?.currency ?? "PLN";
    const planned = summary.finance?.totals?.planned || 0;
    const actual = summary.finance?.totals?.actual || 0;
    const diff = actual - planned;

    const budgetInitial = summary.finance?.budget?.initial_budget
      ? Number(summary.finance.budget.initial_budget)
      : 0;
    const left = budgetInitial > 0 ? Math.max(0, budgetInitial - actual) : 0;
    const usage = budgetInitial > 0 ? Math.round((actual / budgetInitial) * 100) : 0;

    statCard(margin, tileY, tileW, "Plan", `${fmt2(planned)}\n${cur}`, " ", "green");
    statCard(
  margin + (tileW + gap) * 1,
  tileY,
  tileW,
  "Faktycznie",
  `${fmt2(actual)}\n${cur}`,
  " ",
  "green"
);
    statCard(
  margin + (tileW + gap) * 2,
  tileY,
  tileW,
  "Różnica",
  `${fmt2(diff)}\n${cur}`,
  " ",
  diff > 0 ? "gold" : "green"
);
    statCard(
      margin + (tileW + gap) * 3,
      tileY,
      tileW,
      "Pozostało",
      `${fmt2(left)}\n${cur}`,
      budgetInitial > 0 ? `Wykorzystanie: ${usage}%` : "Brak budżetu",
      budgetInitial > 0 && usage >= 90 ? "gold" : "green"
    );

    const alertsY = tileY + 92;
    const alertsH = 82;
    drawCard(doc, margin, alertsY, colW, alertsH, {
      title: "Alerty",
      accent: "gold",
    });
    if (opts.includeAlerts && summary.finance?.alerts?.length) {
      listBullets(
        doc,
        summary.finance.alerts,
        margin + 18,
        alertsY + 44,
        colW - 36,
        3
      );
    } else {
      writeMuted(doc, "Brak alertów", margin + 18, alertsY + 46, colW - 36);
    }

    const chartsY = alertsY + alertsH + gap;
    const chartW = (colW - gap) / 2;
    const chartH = 250;

    if (opts.includeCharts) {
      const byCat = Object.entries(summary.finance?.byCategory || {});
      byCat.sort(
        (a, b) =>
          Number(b[1]?.actual || 0) +
          Number(b[1]?.planned || 0) -
          (Number(a[1]?.actual || 0) + Number(a[1]?.planned || 0))
      );
      const top = byCat.slice(0, 8);
      const labels = top.map((x) => x[0]);
      const plannedData = top.map((x) => Number(x[1]?.planned || 0));
      const actualData = top.map((x) => Number(x[1]?.actual || 0));

      const bar = await chartToDataUrl(
        {
          type: "bar",
          labels,
          datasets: [
            {
              label: "Plan",
              data: plannedData,
              backgroundColor: "#d6b04d",
              barThickness: 44,
            },
            {
              label: "Fakt",
              data: actualData,
              backgroundColor: "#cfd8dc",
              barThickness: 44,
            },
          ],
          legend: true,
          legendPosition: "bottom",
          indexAxis: "y",
          maxXTicks: 5,
          maxYTicks: 8,
        },
        1800,
        900
      );

      drawCard(doc, margin, chartsY, chartW, chartH, {
        title: "Plan vs Fakt (kategorie)",
        accent: "none",
      });
      writeMuted(doc, "Top 8 kategorii", margin + 14, chartsY + 40, chartW - 28);
      doc.addImage(bar, "JPEG", margin + 16, chartsY + 56, chartW - 32, chartH - 74);
    }

    if (opts.includeCharts) {
      const cash = summary.finance?.cashflow || [];
      const labels = cash.map((c) => c.date);
      const data = cash.map((c) => Number(c.plannedSum || 0));

      const line = await chartToDataUrl(
        {
          type: "line",
          labels,
          datasets: [
            { label: "Plan (suma)", data, borderColor: "#d6b04d", borderWidth: 6 },
          ],
          legend: true,
          legendPosition: "bottom",
          maxXTicks: 6,
        },
        1800,
        900
      );

      drawCard(doc, margin + chartW + gap, chartsY, chartW, chartH, {
        title: "Przepływ (plan)",
        accent: "none",
      });
      writeMuted(
        doc,
        "Suma planowana w czasie",
        margin + chartW + gap + 14,
        chartsY + 40,
        chartW - 28
      );
      doc.addImage(
        line,
        "JPEG",
        margin + chartW + gap + 16,
        chartsY + 56,
        chartW - 32,
        chartH - 74
      );
    }

    const listY = chartsY + chartH + gap;
    const listH = 110;

    drawCard(doc, margin, listY, chartW, listH, { title: "TOP koszty", accent: "none" });
    const top10 = summary.finance?.top10Costs || [];
    if (!top10.length) writeMuted(doc, "Brak danych", margin + 14, listY + 44, chartW - 28);
    else {
      let cy = listY + 46;
      doc.setFont("DejaVu", "normal");
      doc.setFontSize(10);
      setText(doc, BRAND.ink);
      for (const it of top10.slice(0, 3)) {
        const name = `${it.name} (${it.category})`;
        const value = `${fmt2(it.actual ?? it.planned)} ${cur}`;
        doc.text(split(doc, name, chartW - 140)[0], margin + 14, cy);
        doc.setFont("DejaVu", "bold");
        doc.text(value, margin + chartW - 16, cy, { align: "right" });
        doc.setFont("DejaVu", "normal");
        cy += 16;
      }
    }

    drawCard(doc, margin + chartW + gap, listY, chartW, listH, {
      title: "Nieopłacone — najbliższe 14 dni",
      accent: "none",
    });
    const dueSoon = summary.finance?.unpaid?.dueSoon14 ?? [];
    if (!dueSoon.length)
      writeMuted(doc, "Brak", margin + chartW + gap + 14, listY + 44, chartW - 28);
    else {
      const sum = summary.finance?.unpaid?.toPaySum ?? 0;
      writeMuted(
        doc,
        `Suma do zapłaty: ${fmt2(sum)} ${cur}`,
        margin + chartW + gap + 14,
        listY + 44,
        chartW - 28
      );

      const first = dueSoon[0];
      const leftX = margin + chartW + gap + 14;
      const rightX = margin + colW - 18;
      const titleMax = chartW - 140;

      const title = `${first.name} (${first.category}) • ${first.vendor_name ?? "—"}`;
      const due = first.due_date ? `${first.due_date} (${first.days} dni)` : "—";

      doc.setFont("DejaVu", "bold");
      doc.setFontSize(10);
      setText(doc, BRAND.ink);
      const titleLines = split(doc, title, titleMax);
      doc.text(titleLines[0], leftX, listY + 72);
      if (titleLines.length > 1) {
        doc.setFont("DejaVu", "normal");
        doc.setFontSize(9);
        setText(doc, BRAND.muted);
        doc.text(titleLines[1], leftX, listY + 86);
      }

      doc.setFont("DejaVu", "bold");
      doc.setFontSize(10);
      setText(doc, BRAND.ink);
      doc.text(due, rightX, listY + 72, { align: "right" });
    }

    y += boxH + 18;
  }

  // -------- Tasks
  if (sections.includes("tasks")) {
    const boxH = 434;
    sectionTitle("Zadania", boxH + 18);

    ensureSpace(boxH + 10);
    drawCard(doc, margin, y, colW, boxH, { title: "Status i wnioski", accent: "green" });

    const tileW = (colW - gap * 3) / 4;
    const tileY = y + 36;

    const total = summary.tasks?.total || 0;
    const done = summary.tasks?.done || 0;
    const open = summary.tasks?.open || 0;
    const overdue = summary.tasks?.overdue?.length || 0;
    const next7 = summary.tasks?.next7?.length || 0;

    statCard(margin, tileY, tileW, "Zrobione", String(done), "", "green");
    statCard(margin + (tileW + gap) * 1, tileY, tileW, "Otwarte", String(open), "", "gold");
    statCard(
      margin + (tileW + gap) * 2,
      tileY,
      tileW,
      "Przeterminowane",
      String(overdue),
      "",
      overdue > 0 ? "gold" : "green"
    );
    statCard(
      margin + (tileW + gap) * 3,
      tileY,
      tileW,
      "Najbliższe 7 dni",
      String(next7),
      "",
      next7 > 0 ? "gold" : "green"
    );

    const chartsY = tileY + 92;
    const leftW = (colW - gap) / 2;
    const chartH = 250;

    if (opts.includeCharts) {
      const donut = await chartToDataUrl(
        {
          type: "doughnut",
          labels: ["Zrobione", "Otwarte", "Przeterminowane"],
          datasets: [
            {
              label: "Status",
              data: [done, open, overdue],
              backgroundColor: ["#2fb36b", "#d6b04d", "#ef5b5b"],
            },
          ],
          legend: true,
          legendPosition: "bottom",
        },
        1200,
        1200
      );

      drawCard(doc, margin, chartsY, leftW, chartH, { title: "Status zadań", accent: "none" });
      writeMuted(doc, "Zrobione / Otwarte / Przeterminowane", margin + 14, chartsY + 40, leftW - 28);

      const boxW2 = leftW - 32;
      const boxTop2 = chartsY + 60;
      const boxH2 = chartH - 78;
      const s2 = Math.min(boxW2, boxH2);
      doc.addImage(
        donut,
        "JPEG",
        margin + 16 + (boxW2 - s2) / 2,
        boxTop2 + (boxH2 - s2) / 2,
        s2,
        s2
      );
    }

    drawCard(doc, margin + leftW + gap, chartsY, leftW, chartH, { title: "Szybkie wnioski", accent: "none" });
    const insights: string[] = [];
    if (overdue > 0) insights.push("Priorytet: przeterminowane → zamknąć / przeplanować.");
    else insights.push("Brak przeterminowanych.");
    if (next7 > 0) insights.push("Następne 7 dni → delegowanie lub blok na 60–90 min.");
    if (open > Math.max(10, total * 0.6)) insights.push("Jeśli „Otwarte” rośnie — ustaw tygodniowy przegląd.");
    if (unknownShare > 0.2) insights.push("RSVP: domknij osoby z „Nieznane” w tym tygodniu.");

    listBullets(doc, insights, margin + leftW + gap + 18, chartsY + 52, leftW - 36, 6);

    const listY = chartsY + chartH + gap;
    const listH = 72;
    const listW = (colW - gap) / 2;

    drawCard(doc, margin, listY, listW, listH, { title: "Przeterminowane", accent: "none" });
    if (!summary.tasks?.overdue?.length) writeMuted(doc, "Brak.", margin + 14, listY + 46, listW - 28);
    else {
      const items = summary.tasks.overdue
        .slice(0, opts.listLimit)
        .map((t) => `${t.title} — ${prettyDate(t.due_date)}`);
      listBullets(doc, items, margin + 18, listY + 46, listW - 36, 3);
    }

    drawCard(doc, margin + listW + gap, listY, listW, listH, { title: "Najbliższe 7 dni", accent: "none" });
    if (!summary.tasks?.next7?.length) writeMuted(doc, "Brak.", margin + listW + gap + 14, listY + 46, listW - 28);
    else {
      const items = summary.tasks.next7
        .slice(0, opts.listLimit)
        .map((t) => `${t.title} — ${prettyDate(t.due_date)} (${t.days} dni)`);
      listBullets(doc, items, margin + listW + gap + 18, listY + 46, listW - 36, 3);
    }

    y += boxH + 18;
  }

  // -------- Docs + Vendors
  if (sections.includes("docsVendors")) {
    const boxH = 402;
    sectionTitle("Dokumenty i usługodawcy", boxH + 18);

    ensureSpace(boxH + 10);
    drawCard(doc, margin, y, colW, boxH, { title: "Kompletność", accent: "green" });

    const tileW = (colW - gap * 2) / 3;
    const tileY = y + 36;

    const docsTotal = summary.documents?.total || 0;
    const docsDone = summary.documents?.done || 0;

    const vendorsTotal = summary.vendors?.total || 0;
    const missing = summary.vendors?.missingContact || [];
    const selectedWithMissing = missing.length;

    statCard(
      margin,
      tileY,
      tileW,
      "Dokumenty",
      `${docsDone} / ${docsTotal}`,
      `Kompletność: ${docsTotal ? Math.round((docsDone / docsTotal) * 100) : 0}%`,
      "green"
    );
    statCard(
      margin + tileW + gap,
      tileY,
      tileW,
      "Usługodawcy",
      `${Math.max(0, vendorsTotal - selectedWithMissing)} / ${vendorsTotal}`,
      "komplet danych / wszyscy",
      "green"
    );
    statCard(
      margin + (tileW + gap) * 2,
      tileY,
      tileW,
      "Wybrani z brakami danych",
      String(selectedWithMissing),
      "umowa/oferta — ryzyko braków",
      selectedWithMissing > 0 ? "gold" : "green"
    );

    const tipsY = tileY + 98;
    const tipsH = 96;

    drawCard(doc, margin, tipsY, colW, tipsH, { title: "Co warto uzupełnić", accent: "none" });
    const tips = [
      "Umowa/oferta dla kluczowych usług: sala, foto, muzyka, catering.",
      "Kontakt (telefon/email) — szczególnie gdy zbliża się termin.",
      "Powiąż wydatki z usługodawcą (łatwiej wykrywać braki/ryzyko).",
    ];
    listBullets(doc, tips, margin + 18, tipsY + 52, colW - 36, 6);

    const listY = tipsY + tipsH + gap;
    const listH = 108;
    drawCard(doc, margin, listY, colW, listH, { title: "Braki danych kontaktowych", accent: "none" });

    if (!missing.length) {
      writeMuted(doc, "Brak braków — super!", margin + 14, listY + 46, colW - 28);
    } else {
      const items = missing
        .slice(0, opts.listLimit)
        .map((v) => `${v.name} — brak: ${v.missing.join(", ")}`);
      listBullets(doc, items, margin + 18, listY + 50, colW - 36, 4);
      if (missing.length > 4) {
        writeMuted(
          doc,
          `…oraz ${missing.length - 4} kolejnych`,
          margin + 18,
          listY + listH - 18,
          colW - 36
        );
      }
    }

    y += boxH + 18;
  }

  // Save
  const fname = `CeremoDay-Raport-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fname);
}
