import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  Loader2,
  Upload,
  Download,
  AlertTriangle,
  CheckCircle2,
  X,
  Trash2,
} from "lucide-react";

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
  "Osoba kontaktowa"?: string;
};

type ImportRowWithMeta = ImportRow & {
  __rowNo: number; // numer wiersza w Excelu (1-indexed)
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

// ----------------------------------------------------
// Nagłówki (twarde) — identyczne jak we wzorniku
// ----------------------------------------------------
const KNOWN_HEADERS = [
  "Typ",
  "Imię",
  "Nazwisko",
  "Telefon",
  "Email",
  "Relacja",
  "Strona",
  "RSVP",
  "Alergeny",
  "Notatki",
  "Osoba kontaktowa",
] as const;

const REQUIRED_HEADERS = ["Typ", "Imię", "Nazwisko"] as const;

function normalizeHeader(h: unknown) {
  // celowo tylko trim — jeśli ktoś zmieni nazwę, ma być błąd
  return normalizeText(h);
}

// ----------------------------------------------------
// Słowniki (spójne z Selectami)
// ----------------------------------------------------
const RELATION_VALUES = ["rodzina", "przyjaciele", "znajomi", "praca", "uslugodawcy", "inna"] as const;
const SIDE_VALUES = ["pani_mlodej", "pana_mlodego", "wspolna"] as const;
const RSVP_VALUES = ["confirmed", "declined", "unknown"] as const;

const RELATION_ALIASES: Record<string, (typeof RELATION_VALUES)[number]> = {
  rodzina: "rodzina",
  przyjaciele: "przyjaciele",
  znajomi: "znajomi",
  praca: "praca",
  uslugodawcy: "uslugodawcy",
  inna: "inna",
};

const SIDE_ALIASES: Record<string, (typeof SIDE_VALUES)[number]> = {
  pani_mlodej: "pani_mlodej",
  "pani młodej": "pani_mlodej",
  pani: "pani_mlodej",
  pana_mlodego: "pana_mlodego",
  "pana młodego": "pana_mlodego",
  pan: "pana_mlodego",
  wspolna: "wspolna",
  "wspólna": "wspolna",
};

const RSVP_ALIASES: Record<string, (typeof RSVP_VALUES)[number]> = {
  confirmed: "confirmed",
  potwierdzone: "confirmed",
  potwierdzony: "confirmed",
  declined: "declined",
  odmowa: "declined",
  odmówione: "declined",
  unknown: "unknown",
  nieznane: "unknown",
};

const TYPE_ALIASES: Record<string, "guest" | "subguest"> = {
  // gość
  "gość": "guest",
  gosc: "guest",
  guest: "guest",

  // współgość (różne literówki)
  "współgość": "subguest",
  wspolgosc: "subguest",
  "współgosc": "subguest",
  "wspolgosć": "subguest",
  subguest: "subguest",
};

// ----------------------------------------------------
// Walidacje: email + telefon (spójniej z modułem Gości)
// ----------------------------------------------------
const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

function normalizePhonePL(v: unknown) {
  const t = normalizeText(v);
  if (!t) return null;
  const low = t.toLowerCase();
  if (low === "b.d." || low === "bd" || low === "brak" || low === "brak danych") return null;

  const digits = t.replace(/\D/g, "");
  if (!digits) return null;

  // w appce trzymasz 9 cyfr
  if (digits.length !== 9) return null;
  return digits;
}

function isPhoneOkPL(v: unknown) {
  const t = normalizeText(v);
  if (!t) return true;
  const low = t.toLowerCase();
  if (low === "b.d." || low === "bd" || low === "brak" || low === "brak danych") return true;
  return normalizePhonePL(t) !== null;
}

// ----------------------------------------------------
// Normalizacja "Osoby kontaktowej"
// ----------------------------------------------------
function normalizePersonKey(v: unknown) {
  const t = normalizeText(v);
  if (!t) return "";
  return t.replace(/\s+/g, " ").trim().toLowerCase();
}

function displayPersonKey(v: unknown) {
  return normalizeText(v);
}

// ----------------------------------------------------
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
  const [rows, setRows] = useState<ImportRowWithMeta[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [showAllErrors, setShowAllErrors] = useState(false);
  const [showAllWarnings, setShowAllWarnings] = useState(false);

  const hasFile = !!file;

  const parsed = useMemo(() => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const items: Array<GuestsImportPayloadItem & { __rowNo: number }> = [];

    if (!hasFile) {
      return { items: [] as GuestsImportPayloadItem[], errors, warnings, guestsCount: 0, subsCount: 0 };
    }

    // ------------------------------------------------
    // 1) Nagłówki (twardo)
    // ------------------------------------------------
    const normalizedHeaders = headers.map(normalizeHeader).filter(Boolean);

    if (!normalizedHeaders.length) {
      errors.push("Brak nagłówków w pierwszym wierszu arkusza. Pobierz wzornik i uzupełnij dane.");
      return { items: [] as GuestsImportPayloadItem[], errors, warnings, guestsCount: 0, subsCount: 0 };
    }

    // duplikaty nagłówków
    const headerCounts = new Map<string, number>();
    normalizedHeaders.forEach((h) => headerCounts.set(h, (headerCounts.get(h) ?? 0) + 1));
    const dupHeaders = Array.from(headerCounts.entries()).filter(([, c]) => c > 1).map(([h]) => h);
    if (dupHeaders.length) {
      errors.push(`Zduplikowane nazwy kolumn w nagłówkach: ${dupHeaders.join(", ")}.`);
      return { items: [] as GuestsImportPayloadItem[], errors, warnings, guestsCount: 0, subsCount: 0 };
    }

    // required
    REQUIRED_HEADERS.forEach((k) => {
      if (!headerCounts.has(k)) {
        errors.push(`Brak wymaganej kolumny "${k}" w pliku (zmieniono lub usunięto nagłówek).`);
      }
    });

    // unknown — warning (nie blokuje)
    const knownSet = new Set<string>(Array.from(KNOWN_HEADERS));
    const unknownHeaders = normalizedHeaders.filter((h) => !knownSet.has(h));
    if (unknownHeaders.length) {
      warnings.push(`W pliku są dodatkowe/nieznane kolumny: ${unknownHeaders.join(", ")}. Zostaną zignorowane.`);
    }

    if (errors.length) {
      return { items: [] as GuestsImportPayloadItem[], errors, warnings, guestsCount: 0, subsCount: 0 };
    }

    // ------------------------------------------------
    // 2) Wiersze: zbieramy WSZYSTKIE błędy naraz
    // ------------------------------------------------
    const seenKeys = new Map<string, number>();

    rows.forEach((r) => {
      const rowNo = r.__rowNo;

      const typRaw = normalizeText(r.Typ);
      const typKey = typRaw.toLowerCase();
      const resolvedType = TYPE_ALIASES[typKey];

      const first = normalizeText(r["Imię"]);
      const last = normalizeText(r["Nazwisko"]);

      // pusty wiersz — ignorujemy
      if (!typRaw && !first && !last) return;

      // typ
      if (!resolvedType) {
        errors.push(`Wiersz ${rowNo}: nieznany Typ "${typRaw}". Użyj "Gość" albo "Współgość".`);
        return;
      }

      // imię/nazwisko
      if (!first || !last) {
        errors.push(`Wiersz ${rowNo}: brak Imię/Nazwisko.`);
        return;
      }

      // kontakt (tylko gość)
      let email: string | null = null;
      let phone: string | null = null;

      if (resolvedType === "guest") {
        const emailRaw = normalizeOptional(r.Email);
        if (emailRaw && !isEmail(emailRaw)) {
          errors.push(`Wiersz ${rowNo}: Email "${emailRaw}" wygląda niepoprawnie.`);
          return;
        }

        const phoneRaw = normalizeOptional(r.Telefon);
        if (phoneRaw && !isPhoneOkPL(phoneRaw)) {
          errors.push(`Wiersz ${rowNo}: Telefon "${phoneRaw}" wygląda niepoprawnie (wpisz 9 cyfr).`);
          return;
        }

        email = emailRaw ?? null;
        phone = phoneRaw ? normalizePhonePL(phoneRaw) : null;
      }

      // słowniki
      const relRaw = normalizeOptional(r.Relacja);
      const sideRaw = normalizeOptional(r.Strona);
      const rsvpRaw = normalizeOptional(r.RSVP);

      const relKey = relRaw ? relRaw.toLowerCase() : "";
      const relNorm = relKey ? RELATION_ALIASES[relKey] : undefined;

      const sideKey = sideRaw ? sideRaw.toLowerCase() : "";
      const sideNorm = sideKey ? SIDE_ALIASES[sideKey] : undefined;

      const rsvpKey = rsvpRaw ? rsvpRaw.toLowerCase() : "";
      const rsvpNorm = rsvpKey ? RSVP_ALIASES[rsvpKey] : undefined;

      if (relRaw && !relNorm) {
        errors.push(`Wiersz ${rowNo}: Relacja "${relRaw}" jest spoza listy. Dozwolone: ${RELATION_VALUES.join(", ")}.`);
        return;
      }
      if (sideRaw && !sideNorm) {
        errors.push(`Wiersz ${rowNo}: Strona "${sideRaw}" jest spoza listy. Dozwolone: ${SIDE_VALUES.join(", ")}.`);
        return;
      }
      if (rsvpRaw && !rsvpNorm) {
        errors.push(
          `Wiersz ${rowNo}: RSVP "${rsvpRaw}" jest spoza listy. Dozwolone: ${RSVP_VALUES.join(", ")} (lub: Potwierdzone/Odmowa/Nieznane).`
        );
        return;
      }

      const item: GuestsImportPayloadItem & { __rowNo: number } = {
        __rowNo: rowNo,
        type: resolvedType,
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
        const parentDisplay = displayPersonKey(r["Osoba kontaktowa"]);
        const parentKey = normalizePersonKey(r["Osoba kontaktowa"]);

        if (!parentDisplay || !parentKey) {
          errors.push(`Wiersz ${rowNo}: Współgość musi mieć "Osobę kontaktową" (np. "Jan Kowalski").`);
          return;
        }

        item.parent_key = parentDisplay;
      }

      // duplikaty w pliku
      const dupKey = [
        item.type,
        item.first_name.toLowerCase(),
        item.last_name.toLowerCase(),
        (item.phone ?? "").toLowerCase(),
        (item.email ?? "").toLowerCase(),
        item.type === "subguest" ? normalizePersonKey(item.parent_key ?? "") : "",
      ].join("|");

      const c = (seenKeys.get(dupKey) ?? 0) + 1;
      seenKeys.set(dupKey, c);
      if (c > 1) {
        errors.push(`Wiersz ${rowNo}: duplikat rekordu w pliku (ten sam Typ+Imię+Nazwisko+Kontakt+Osoba kontaktowa).`);
        return;
      }

      items.push(item);
    });

    // jeśli są błędy z wierszy — nie robimy kolejnych walidacji
    if (errors.length) {
      return { items: [] as GuestsImportPayloadItem[], errors, warnings, guestsCount: 0, subsCount: 0 };
    }

    // ------------------------------------------------
    // 3) Walidacja osób kontaktowych (globalnie)
    // ------------------------------------------------
    const guestKeyCount = new Map<string, number>();
    const guestKeyToDisplay = new Map<string, string>();

    items
      .filter((i) => i.type === "guest")
      .forEach((i) => {
        const key = normalizePersonKey(`${i.first_name} ${i.last_name}`);
        guestKeyCount.set(key, (guestKeyCount.get(key) ?? 0) + 1);
        if (!guestKeyToDisplay.has(key)) guestKeyToDisplay.set(key, `${i.first_name} ${i.last_name}`.trim());
      });

    Array.from(guestKeyCount.entries()).forEach(([k, c]) => {
      if (c > 1) {
        errors.push(
          `W pliku jest ${c}x gość o nazwie "${guestKeyToDisplay.get(k) ?? k}". To jest niejednoznaczne dla "Osoby kontaktowej". Zmień dane tak, aby osoby kontaktowe były unikalne (np. dopisz drugie imię).`
        );
      }
    });

    if (errors.length) {
      return { items: [] as GuestsImportPayloadItem[], errors, warnings, guestsCount: 0, subsCount: 0 };
    }

    const guestKeySet = new Set<string>(Array.from(guestKeyCount.keys()));

    items
      .filter((i) => i.type === "subguest")
      .forEach((i) => {
        const pk = normalizePersonKey(i.parent_key ?? "");
        if (!pk) {
          errors.push(`Wiersz ${i.__rowNo}: brak poprawnej "Osoby kontaktowej".`);
          return;
        }
        if (!guestKeySet.has(pk)) {
          errors.push(
            `Wiersz ${i.__rowNo}: Współgość ma Osobę kontaktową="${i.parent_key}", ale taki gość nie występuje w pliku jako Typ="Gość".`
          );
        }
      });

    if (errors.length) {
      return { items: [] as GuestsImportPayloadItem[], errors, warnings, guestsCount: 0, subsCount: 0 };
    }

    // ------------------------------------------------
    // 4) Warningi
    // ------------------------------------------------
    items.forEach((i) => {
      if (i.type !== "guest") return;
      if (!i.phone && !i.email) {
        warnings.push(`Wiersz ${i.__rowNo}: brak telefonu i emaila (to OK, ale warto dodać przynajmniej jedno).`);
      }
    });

    // usuń meta __rowNo bez eslintowych “unused”
    const finalItems: GuestsImportPayloadItem[] = items.map((it) => {
      const rest: GuestsImportPayloadItem = {
        type: it.type,
        parent_key: it.parent_key ?? null,
        first_name: it.first_name,
        last_name: it.last_name,
        phone: it.phone ?? null,
        email: it.email ?? null,
        relation: it.relation ?? null,
        side: it.side ?? null,
        rsvp: it.rsvp ?? null,
        allergens: it.allergens ?? null,
        notes: it.notes ?? null,
      };

      // dla guest nie wysyłamy parent_key w ogóle (czyściej)
      if (rest.type === "guest") {
        delete rest.parent_key;
      }

      return rest;
    });

    return {
      items: finalItems,
      errors,
      warnings,
      guestsCount: finalItems.filter((i) => i.type === "guest").length,
      subsCount: finalItems.filter((i) => i.type === "subguest").length,
    };
  }, [rows, headers, hasFile]);

  const readXlsx = async (f: File) => {
    setParseError(null);
    setRows([]);
    setHeaders([]);

    try {
      const buf = await f.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheetName = wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];

      // header:1 => matrix, 1 wiersz = nagłówki
      const matrix = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as unknown[][];

      const headerRow = (matrix?.[0] ?? []).map((h) => String(h ?? ""));
      setHeaders(headerRow);

      const normalizedHeaders = headerRow.map(normalizeHeader).filter(Boolean);
      if (!normalizedHeaders.length) {
        setParseError("Brak nagłówków w pierwszym wierszu arkusza. Pobierz wzornik i uzupełnij dane.");
        return;
      }

      // mapowanie po TRIM (twarde)
      const indexByHeader = new Map<string, number>();
      normalizedHeaders.forEach((h, idx) => {
        if (!indexByHeader.has(h)) indexByHeader.set(h, idx);
      });

      const out: ImportRowWithMeta[] = [];

      // data od wiersza 2
      for (let i = 1; i < matrix.length; i++) {
        const row = matrix[i] ?? [];
        const rowNo = i + 1; // excel: 1=header

        const obj: ImportRowWithMeta = { __rowNo: rowNo };

        (KNOWN_HEADERS as readonly string[]).forEach((h) => {
          const colIdx = indexByHeader.get(h);
          if (colIdx === undefined) return;

          const cell = row[colIdx];

          switch (h) {
            case "Typ":
              obj.Typ = String(cell ?? "");
              break;
            case "Imię":
              obj["Imię"] = String(cell ?? "");
              break;
            case "Nazwisko":
              obj["Nazwisko"] = String(cell ?? "");
              break;
            case "Telefon":
              obj.Telefon = String(cell ?? "");
              break;
            case "Email":
              obj.Email = String(cell ?? "");
              break;
            case "Relacja":
              obj.Relacja = String(cell ?? "");
              break;
            case "Strona":
              obj.Strona = String(cell ?? "");
              break;
            case "RSVP":
              obj.RSVP = String(cell ?? "");
              break;
            case "Alergeny":
              obj.Alergeny = String(cell ?? "");
              break;
            case "Notatki":
              obj.Notatki = String(cell ?? "");
              break;
            case "Osoba kontaktowa":
              obj["Osoba kontaktowa"] = String(cell ?? "");
              break;
            default:
              break;
          }
        });

        out.push(obj);
      }

      setRows(out);
      setShowAllErrors(false);
      setShowAllWarnings(false);
    } catch (e) {
      console.error(e);
      setParseError("Nie udało się odczytać pliku XLSX. Upewnij się, że to .xlsx i ma poprawne kolumny.");
    }
  };

  const clearFile = () => {
    setFile(null);
    setRows([]);
    setHeaders([]);
    setParseError(null);
    setShowAllErrors(false);
    setShowAllWarnings(false);
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

  const errorsToShow = showAllErrors ? parsed.errors : parsed.errors.slice(0, 10);
  const warningsToShow = showAllWarnings ? parsed.warnings : parsed.warnings.slice(0, 5);

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
              Wypełniaj wiersze — <b>nie zmieniaj nazw kolumn</b> i nie usuwaj nagłówków (import sprawdza nagłówki
              z pierwszego wiersza).
            </li>
            <li>
              Pole <b>Typ</b>: wybierz: <b>Gość</b> albo <b>Współgość</b>.
            </li>
            <li>
              Jeśli <b>Typ=Współgość</b>, to pole <b>Osoba kontaktowa</b> jest obowiązkowe i musi mieć format{" "}
              <b>„Imię Nazwisko”</b> dokładnie jak w wierszu Gościa (wielkość liter i spacje nie mają znaczenia).
            </li>
            <li>
              Pola <b>Relacja</b>, <b>Strona</b>, <b>RSVP</b> mają listy wartości. Jeśli wpiszesz coś spoza listy — import
              zostanie zablokowany.
            </li>
            <li>
              Telefon w imporcie jest walidowany jako <b>9 cyfr</b>. Współgoście nie mają telefonu/emaila.
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
                  setHeaders([]);
                  setShowAllErrors(false);
                  setShowAllWarnings(false);
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
                {errorsToShow.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>

              {parsed.errors.length > 10 ? (
                <button
                  type="button"
                  onClick={() => setShowAllErrors((v) => !v)}
                  className="mt-2 text-xs underline text-amber-100/90 hover:text-amber-100"
                >
                  {showAllErrors ? "Pokaż mniej" : `Pokaż wszystkie (${parsed.errors.length})`}
                </button>
              ) : null}
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
                    {warningsToShow.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>

                  {parsed.warnings.length > 5 ? (
                    <button
                      type="button"
                      onClick={() => setShowAllWarnings((v) => !v)}
                      className="mt-2 text-xs underline text-emerald-100/80 hover:text-emerald-100"
                    >
                      {showAllWarnings ? "Pokaż mniej" : `Pokaż wszystkie (${parsed.warnings.length})`}
                    </button>
                  ) : null}
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
