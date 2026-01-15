import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Loader2, Upload, Download, AlertTriangle, CheckCircle2, X, Trash2 } from "lucide-react";


type ImportRow = {
  Typ?: string;
  "Imię"?: string;
  "Nazwisko"?: string;
  "Telefon"?: string;
  Email?: string;
  Relacja?: string;
  Strona?: string;
  RSVP?: string;
  Alergeny?: string;
  Notatki?: string;
  Rodzic?: string;
};

export type GuestsImportPayloadItem = {
  type: "guest" | "subguest";
  parent_key?: string | null;
  first_name: string;
  last_name: string;
  phone?: string | null;
  email?: string | null;
  relation?: string | null;
  side?: string | null;
  rsvp?: string | null;
  allergens?: string | null;
  notes?: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onImport: (items: GuestsImportPayloadItem[]) => Promise<void>;
};

const normalizeText = (v: unknown) => {
  if (v === null || v === undefined) return "";
  return String(v).trim();
};

const normalizeOptional = (v: unknown) => {
  const t = normalizeText(v);
  if (!t) return null;
  const low = t.toLowerCase();
  if (low === "b.d." || low === "bd" || low === "brak" || low === "brak danych") return "Brak danych";
  return t;
};

// --- słowniki (muszą być spójne z Selectami w appce) ---
const RELATION_VALUES = ["dziadkowie", "wujostwo", "kuzynostwo", "przyjaciele", "znajomi", "praca"] as const;
const SIDE_VALUES = ["pani_mlodej", "pana_mlodego"] as const;
const RSVP_VALUES = ["confirmed", "declined", "unknown"] as const;

// akceptujemy też "ładne" stare labelki i normalizujemy na value
const RELATION_ALIASES: Record<string, (typeof RELATION_VALUES)[number]> = {
  dziadkowie: "dziadkowie",
  wujostwo: "wujostwo",
  kuzynostwo: "kuzynostwo",
  przyjaciele: "przyjaciele",
  znajomi: "znajomi",
  praca: "praca",
};

const SIDE_ALIASES: Record<string, (typeof SIDE_VALUES)[number]> = {
  pani_mlodej: "pani_mlodej",
  "pani młodej": "pani_mlodej",
  pani: "pani_mlodej",
  pana_mlodego: "pana_mlodego",
  "pana młodego": "pana_mlodego",
  pan: "pana_mlodego",
};

const RSVP_ALIASES: Record<string, (typeof RSVP_VALUES)[number]> = {
  confirmed: "confirmed",
  potwierdzone: "confirmed",
  "potwierdzony": "confirmed",
  declined: "declined",
  odmowa: "declined",
  "odmówione": "declined",
  unknown: "unknown",
  nieznane: "unknown",
};

const isEmail = (v: string) => {
  // prosto i bezpiecznie (nie RFC-perfect)
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
};



const normalizePhone = (v: unknown) => {
  const t = normalizeText(v);
  if (!t) return null;
  const low = t.toLowerCase();
  if (low === "b.d." || low === "bd" || low === "brak" || low === "brak danych") return null;

  // zostawiamy tylko cyfry i +
  const cleaned = t.replace(/[^\d+]/g, "");
  if (!cleaned) return null;

  // bardzo miękka walidacja: 7-15 cyfr (z opcjonalnym +)
  const digits = cleaned.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) return null;

  return cleaned;
};


const isPhoneOk = (v: string) => {
  const p = normalizePhone(v);
  if (!p) return true; // telefon opcjonalny
  const digits = p.startsWith("+") ? p.slice(1) : p;
  return digits.length >= 7 && digits.length <= 15;
};

const downloadTemplate = () => {
  const a = document.createElement("a");
  a.href = "/templates/ceremoday_import_goscie_wzornik.xlsx";
  a.download = "ceremoday_import_goscie_wzornik.xlsx";
  document.body.appendChild(a);
  a.click();
  a.remove();
};


export default function GuestsImportModal({ open, onClose, onImport }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const hasFile = !!file;

  const parsed = useMemo(() => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const items: GuestsImportPayloadItem[] = [];

    if (!hasFile) {
      return { items, errors, warnings, guestsCount: 0, subsCount: 0 };
    }

    // wymagane kolumny
    const REQUIRED = ["Typ", "Imię", "Nazwisko"] as const;

    // sprawdź brak kolumn — bazujemy na kluczach z pierwszego niepustego wiersza
    const firstNonEmpty = rows.find((r) => Object.values(r).some((v) => normalizeText(v)));
    const keys = new Set<string>(firstNonEmpty ? Object.keys(firstNonEmpty) : []);
    REQUIRED.forEach((k) => {
      if (!keys.has(k)) errors.push(`Brak wymaganej kolumny "${k}" w pliku.`);
    });
    // jeśli brak required – nie jedziemy dalej (zrobi się śmietnik)
    if (errors.length) {
      return { items, errors, warnings, guestsCount: 0, subsCount: 0 };
    }

    // duplikaty w pliku (key: typ+imie+nazw+tel/email+rodzic)
    const seenKeys = new Map<string, number>();

    rows.forEach((r, idx) => {
      const typRaw = normalizeText(r.Typ);
      const typ = typRaw.toLowerCase();

      const first = normalizeText(r["Imię"]);
      const last = normalizeText(r["Nazwisko"]);
      const rowNo = idx + 2;

      // pusty wiersz – ignorujemy
      if (!typRaw && !first && !last) return;

      // typ
      const isGuest = typ === "gość" || typ === "gosc" || typ === "guest";
      const isSub =
        typ === "współgość" ||
        typ === "wspolgos" ||
        typ === "współgosc" ||
        typ === "subguest" ||
        typ === "wspolgosć" ||
        typ === "współgość";

      if (!isGuest && !isSub) {
        errors.push(`Wiersz ${rowNo}: nieznany Typ "${typRaw}". Użyj "Gość" albo "Współgość".`);
        return;
      }

      // imię/nazwisko
      if (!first || !last) {
        errors.push(`Wiersz ${rowNo}: brak Imię/Nazwisko.`);
        return;
      }

      // email/telefon:
// - Gość: opcjonalne, ale jeśli wpisane -> walidujemy
// - Współgość: ignorujemy całkowicie (nie walidujemy i ustawiamy null)
let email: string | null = null;
let phone: string | null = null;

if (isGuest) {
  const emailRaw = normalizeOptional(r.Email);
  if (emailRaw && !isEmail(emailRaw)) {
    errors.push(`Wiersz ${rowNo}: Email "${emailRaw}" wygląda niepoprawnie.`);
    return;
  }

  const phoneRaw = normalizeOptional(r.Telefon);
  if (phoneRaw && !isPhoneOk(phoneRaw)) {
    errors.push(`Wiersz ${rowNo}: Telefon "${phoneRaw}" wygląda niepoprawnie (wpisz 7–15 cyfr).`);
    return;
  }

  email = emailRaw ?? null;
  phone = phoneRaw ? normalizePhone(phoneRaw) : null;
} else {
  // subguest: nawet jeśli ktoś coś wpisał -> nie walidujemy i nie bierzemy
  email = null;
  phone = null;
}


      // normalizacja słowników
      const relRaw = normalizeOptional(r.Relacja);
      const sideRaw = normalizeOptional(r.Strona);
      const rsvpRaw = normalizeOptional(r.RSVP);

      const relNorm = relRaw ? RELATION_ALIASES[relRaw.toLowerCase()] : undefined;
      const sideNorm = sideRaw ? SIDE_ALIASES[sideRaw.toLowerCase()] : undefined;
      const rsvpNorm = rsvpRaw ? RSVP_ALIASES[rsvpRaw.toLowerCase()] : undefined;

      // jeśli ktoś wpisał, ale nie w słowniku → błąd
      if (relRaw && !relNorm) {
        errors.push(
          `Wiersz ${rowNo}: Relacja "${relRaw}" jest spoza listy. Dozwolone: ${RELATION_VALUES.join(", ")}.`
        );
        return;
      }
      if (sideRaw && !sideNorm) {
        errors.push(
          `Wiersz ${rowNo}: Strona "${sideRaw}" jest spoza listy. Dozwolone: ${SIDE_VALUES.join(", ")}.`
        );
        return;
      }
      if (rsvpRaw && !rsvpNorm) {
        errors.push(
          `Wiersz ${rowNo}: RSVP "${rsvpRaw}" jest spoza listy. Dozwolone: ${RSVP_VALUES.join(", ")} (lub: Potwierdzone/Odmowa/Nieznane).`
        );
        return;
      }

      const item: GuestsImportPayloadItem = {
        type: isGuest ? "guest" : "subguest",
        first_name: first,
        last_name: last,
        phone,
        email,
        relation: relNorm ?? null,
        side: sideNorm ?? null,
        rsvp: rsvpNorm ?? null,
        allergens: normalizeOptional(r.Alergeny),
        notes: normalizeOptional(r.Notatki),
      };

      if (item.type === "subguest") {
        const parentKey = normalizeText(r.Rodzic);
        if (!parentKey) {
          errors.push(`Wiersz ${rowNo}: Współgość musi mieć "Rodzic" (np. "Jan Kowalski").`);
          return;
        }
        item.parent_key = parentKey;
      }

      // wykrywanie duplikatów w samym pliku
      const dupKey = [
        item.type,
        item.first_name.toLowerCase(),
        item.last_name.toLowerCase(),
        (item.phone ?? "").toLowerCase(),
        (item.email ?? "").toLowerCase(),
        (item.parent_key ?? "").toLowerCase(),
      ].join("|");

      const c = (seenKeys.get(dupKey) ?? 0) + 1;
      seenKeys.set(dupKey, c);
      if (c > 1) {
        errors.push(`Wiersz ${rowNo}: duplikat rekordu w pliku (ten sam Typ+Imię+Nazwisko+Kontakt+Rodzic).`);
        return;
      }

      items.push(item);
    });

    // walidacja rodziców (subguest -> musi istnieć guest w pliku)
    const guestNameSet = new Set<string>();
    items
      .filter((i) => i.type === "guest")
      .forEach((i) => guestNameSet.add(`${i.first_name} ${i.last_name}`.trim()));

    items
      .filter((i) => i.type === "subguest")
      .forEach((i) => {
        if (i.parent_key && !guestNameSet.has(i.parent_key)) {
          errors.push(
            `Współgość ma Rodzic="${i.parent_key}", ale taki gość nie występuje w pliku jako Typ="Gość".`
          );
        }
      });

    // warning: brak kontaktu — tylko dla Gościa (nie dla Współgościa)
items.forEach((i, idx) => {
  if (i.type !== "guest") return;

  const rowNo = idx + 2;

  if (!i.phone && !i.email) {
    warnings.push(
      `Wiersz ${rowNo}: brak telefonu i emaila (to OK, ale warto dodać przynajmniej jedno).`
    );
  }
});


    return {
      items,
      errors,
      warnings,
      guestsCount: items.filter((i) => i.type === "guest").length,
      subsCount: items.filter((i) => i.type === "subguest").length,
    };
  }, [rows, hasFile]);

  const readXlsx = async (f: File) => {
    setParseError(null);
    setRows([]);
    try {
      const buf = await f.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheetName = wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];

      const json = XLSX.utils.sheet_to_json<ImportRow>(ws, { defval: "" });
      setRows(json);
    } catch (e) {
      console.error(e);
      setParseError("Nie udało się odczytać pliku XLSX. Upewnij się, że to .xlsx i ma poprawne kolumny.");
    }
  };

  const clearFile = () => {
    setFile(null);
    setRows([]);
    setParseError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleClose = () => {
    clearFile();
    onClose();
  };

  const handleImport = async () => {
    if (parsed.errors.length) return;
    if (!parsed.items.length) return;
    setBusy(true);
    try {
      await onImport(parsed.items);
      handleClose();
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  const canImport = hasFile && !busy && parsed.items.length > 0 && parsed.errors.length === 0;

  return (
    <div
      className="fixed inset-0 z-[9999999] flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(3px)" }}
    >
      <div className="absolute inset-0" onClick={handleClose} />

      <div className="relative w-full max-w-3xl p-6 overflow-y-auto max-h-[90vh] rounded-2xl shadow-2xl border border-white/10 bg-emerald-950/70 text-white backdrop-blur-xl">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="text-xl font-semibold text-white">Import gości</h3>
            <p className="text-sm text-white/60 mt-1">
              Pobierz wzornik, uzupełnij dane, a potem zaimportuj do bazy. Import obsługuje Gości + Współgości.
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="rounded-xl border border-white/10 bg-white/5 p-2 hover:bg-white/10 transition"
            title="Zamknij"
          >
            <X className="w-4 h-4 text-white/80" />
          </button>
        </div>

        {/* Instrukcja */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-sm font-semibold text-white/90 mb-2">Instrukcja (ważne)</div>
          <ul className="text-sm text-white/70 space-y-2 list-disc pl-5">
            <li>
              Kliknij <b>Pobierz wzornik</b>. Wzornik ma przygotowane kolumny identyczne jak eksport.
            </li>
            <li>
              Wypełniaj wiersze — <b>nie zmieniaj nazw kolumn</b> i nie usuwaj nagłówków.
            </li>
            <li>
              Pole <b>Typ</b>: wybierz z listy: <b>Gość</b> albo <b>Współgość</b>.
            </li>
            <li>
              Jeśli <b>Typ=Współgość</b>, to pole <b>Rodzic</b> jest obowiązkowe i musi mieć format{" "}
              <b>„Imię Nazwisko”</b> dokładnie jak w wierszu Gościa (np. <i>Jan Kowalski</i>).
            </li>
            <li>
              Pola <b>Relacja</b>, <b>Strona</b>, <b>RSVP</b> mają listy wartości. Jeśli wpiszesz coś spoza listy —
              import zostanie zablokowany.
            </li>
            <li>
              Import <b>nie doda duplikatów</b> 
            </li>
          </ul>

          <div className="mt-3 flex flex-wrap gap-2 items-center">
            <button
              type="button"
              onClick={downloadTemplate}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold bg-white/5 text-white border border-white/10 hover:bg-white/10 transition"
            >
              <Download className="w-4 h-4 text-[#d7b45a]" />
              Pobierz wzornik
            </button>

            <label className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold bg-gradient-to-r from-[#d7b45a] to-[#b98b2f] text-[#0b1b14] cursor-pointer hover:brightness-105 transition">
              <Upload className="w-4 h-4" />
              Wybierz plik XLSX
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setFile(f);
                  setParseError(null);
                  setRows([]);
                  if (f) void readXlsx(f);
                }}
              />
            </label>

            {file ? (
              <button
                type="button"
                onClick={clearFile}
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold bg-red-500/15 text-red-100 border border-red-400/25 hover:bg-red-500/20 transition"
                title="Usuń wybrany plik"
              >
                <Trash2 className="w-4 h-4" />
                Usuń plik
              </button>
            ) : null}

            <div className="text-sm text-white/70 truncate flex-1 min-w-[180px]">
              {file ? file.name : <span className="text-white/45">Nie wybrano pliku</span>}
            </div>
          </div>

          {parseError ? (
            <div className="mt-3 rounded-xl border border-red-400/25 bg-red-500/10 p-3 text-sm text-red-100">
              {parseError}
            </div>
          ) : null}
        </div>

        {/* Podsumowanie */}
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-white/90">Podsumowanie</div>
            <div className="text-xs text-white/55">
              Goście: <b className="text-white/85">{parsed.guestsCount}</b> • Współgoście:{" "}
              <b className="text-white/85">{parsed.subsCount}</b>
            </div>
          </div>

          {!hasFile ? (
            <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="flex items-center gap-2 text-white/75 font-semibold text-sm">
                <AlertTriangle className="w-4 h-4 text-white/50" />
                Dodaj plik XLSX, aby rozpocząć sprawdzanie.
              </div>
            </div>
          ) : parsed.errors.length ? (
            <div className="mt-3 rounded-xl border border-amber-300/25 bg-amber-500/10 p-3">
              <div className="flex items-center gap-2 text-amber-100 font-semibold text-sm">
                <AlertTriangle className="w-4 h-4" />
                Wykryto problemy — popraw plik i spróbuj ponownie
              </div>
              <ul className="mt-2 text-sm text-amber-100/90 list-disc pl-5 space-y-1">
                {parsed.errors.slice(0, 10).map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
                {parsed.errors.length > 10 ? <li>… i {parsed.errors.length - 10} więcej</li> : null}
              </ul>
            </div>
          ) : (
            <div className="mt-3 rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3">
              <div className="flex items-center gap-2 text-emerald-100 font-semibold text-sm">
                <CheckCircle2 className="w-4 h-4" />
                Plik wygląda poprawnie — możesz importować
              </div>

              {parsed.warnings.length ? (
                <div className="mt-2 text-xs text-emerald-100/80">
                  Uwagi (nie blokują importu):
                  <ul className="list-disc pl-5 mt-1 space-y-1">
                    {parsed.warnings.slice(0, 5).map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                    {parsed.warnings.length > 5 ? <li>… i {parsed.warnings.length - 5} więcej</li> : null}
                  </ul>
                </div>
              ) : null}
            </div>
          )}

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium bg-white/5 text-white border border-white/10 hover:bg-white/10 transition"
            >
              Anuluj
            </button>

            <button
              type="button"
              onClick={handleImport}
              disabled={!canImport}
              className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold bg-gradient-to-r from-[#d7b45a] to-[#b98b2f] text-[#0b1b14] hover:brightness-105 transition disabled:opacity-60"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Importuj do bazy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
