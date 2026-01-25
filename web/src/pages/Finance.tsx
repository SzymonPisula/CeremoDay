// CeremoDay/web/src/pages/Finance.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Wallet,
  Sparkles,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  Search,
  Download,
  Pencil,
  Trash2,
  X,
  Loader2,
  Plus,
  CheckCircle2,
  Clock3,
  ArrowUpRight,
  ChevronRight,
} from "lucide-react";

import { api } from "../lib/api";
import Select from "../ui/Select";
import DatePicker from "../ui/DatePicker";
import { useUiStore } from "../store/ui";

type ExpenseCategory =
  | "HALL"
  | "CATERING"
  | "MUSIC"
  | "OUTFITS"
  | "TRANSPORT"
  | "DECOR"
  | "PHOTO_VIDEO"
  | "OTHER";

type ExpenseStatus = "PLANNED" | "IN_PROGRESS" | "PAID";

type SortField =
  | "name"
  | "planned_amount"
  | "actual_amount"
  | "due_date"
  | "paid_date"
  | "category"
  | "status";

type Budget = {
  id: string;
  event_id: string;
  initial_budget: number | null;
  currency: string;
  notes: string | null;
};

type Expense = {
  id: string;
  event_id: string;
  name: string;
  category: ExpenseCategory;

  status?: ExpenseStatus; // backend może jeszcze nie mieć — fallback niżej

  planned_amount: number | string | null;
  actual_amount: number | string | null;
  due_date: string | null;
  paid_date: string | null;
  vendor_name: string | null;
  notes: string | null;
};

type ExpenseCreatePayload = {
  name: string;
  category: ExpenseCategory;
  status: ExpenseStatus;
  planned_amount: number | null;
  actual_amount: number | null;
  due_date: string | null;
  paid_date: string | null;
  vendor_name: string | null;
  notes: string | null;
};

type ExpenseUpdatePayload = ExpenseCreatePayload;

type FinanceSummary = {
  currency: string;
  total_planned: number;
  total_actual: number;
  diff_planned_actual: number;
  remaining_budget: number | null;
  budget?: Budget | null;
};

const CATEGORY_OPTIONS: { value: ExpenseCategory; label: string }[] = [
  { value: "HALL", label: "Sala / miejsce" },
  { value: "CATERING", label: "Catering" },
  { value: "MUSIC", label: "Muzyka" },
  { value: "PHOTO_VIDEO", label: "Foto / Video" },
  { value: "DECOR", label: "Dekoracje" },
  { value: "OUTFITS", label: "Stroje" },
  { value: "TRANSPORT", label: "Transport" },
  { value: "OTHER", label: "Inne" },
];

const STATUS_OPTIONS: { value: ExpenseStatus; label: string; hint: string }[] = [
  { value: "PLANNED", label: "Planowane", hint: "Pomysł / plan — bez terminów" },
  { value: "IN_PROGRESS", label: "W trakcie", hint: "Ma termin płatności i kwotę faktyczną" },
  { value: "PAID", label: "Opłacone", hint: "Ma datę płatności i kwotę końcową" },
];

function toNumberOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function money(v: number | string | null | undefined): string {
  const n = toNumberOrNull(v);
  if (n === null) return "—";
  return n.toFixed(2);
}



const todayISO = () => new Date().toISOString().slice(0, 10);

const isDateFuture = (d: string) => d > todayISO();
const isDatePast = (d: string) => d < todayISO();

function resolveStatus(e: Expense): ExpenseStatus {
  if (e.status === "PAID" || e.status === "IN_PROGRESS" || e.status === "PLANNED") return e.status;
  if (e.paid_date) return "PAID";
  if (e.due_date) return "IN_PROGRESS";
  return "PLANNED";
}

function normalizeExpense(e: Expense): Expense & { status: ExpenseStatus } {
  return {
    ...e,
    planned_amount: toNumberOrNull(e.planned_amount),
    actual_amount: toNumberOrNull(e.actual_amount),
    status: resolveStatus(e),
  };
}

function parseMoneyInput(v: string): number | null {
  if (!v.trim()) return null;
  const n = Number(v.replace(",", "."));
  if (!Number.isFinite(n)) return null;
  return n;
}

function formatDateDMY(dateISO: string | null | undefined): string {
  if (!dateISO) return "—";
  // zakładamy format YYYY-MM-DD (jak w API)
  const [y, m, d] = dateISO.split("-");
  if (!y || !m || !d) return dateISO;
  return `${d}-${m}-${y}`;
}


const Finance: React.FC = () => {
  const { id: eventId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const confirmAsync = useUiStore((s) => s.confirmAsync);
  const toast = useUiStore((s) => s.toast);

  const [expenses, setExpenses] = useState<Array<Expense & { status: ExpenseStatus }>>([]);
  const [summary, setSummary] = useState<FinanceSummary | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);


  // FILTRY / SORT
  const [filterSearch, setFilterSearch] = useState<string>("");
  const [filterCategory, setFilterCategory] = useState<ExpenseCategory | "all">("all");
  const [filterStatus, setFilterStatus] = useState<ExpenseStatus | "all">("all");
  const [sortField, setSortField] = useState<SortField>("due_date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const [isExporting, setIsExporting] = useState(false);

  // MODAL: add/edit
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<(Expense & { status: ExpenseStatus }) | null>(null);
  const [isSavingExpense, setIsSavingExpense] = useState(false);

  // formularz w modalu (add/edit)
  const [fName, setFName] = useState("");
  const [fCategory, setFCategory] = useState<ExpenseCategory>("OTHER");
  const [fStatus, setFStatus] = useState<ExpenseStatus>("PLANNED");
  const [fPlanned, setFPlanned] = useState("");
  const [fActual, setFActual] = useState("");
  const [fDue, setFDue] = useState("");
  const [fPaid, setFPaid] = useState("");
  const [fVendor, setFVendor] = useState("");
  const [fNotes, setFNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // MODAL: status change (tylko do przodu)
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusEditing, setStatusEditing] = useState<(Expense & { status: ExpenseStatus }) | null>(null);
  const [nextStatus, setNextStatus] = useState<ExpenseStatus | "">("");
  const [scActual, setScActual] = useState("");
  const [scDue, setScDue] = useState("");
  const [scPaid, setScPaid] = useState("");
  const [scVendor, setScVendor] = useState("");
  const [scNotes, setScNotes] = useState("");
  const [scError, setScError] = useState<string | null>(null);
  const [isSavingStatus, setIsSavingStatus] = useState(false);

  const handleExportFinancePdf = () => {
  if (!eventId) return;

  const url = `/event/${eventId}/reports?autopdf=1&scope=finance`;
  window.open(url, "_blank", "noopener,noreferrer,width=1200,height=900");
};





  // UI helpers (CeremoDay vibe)
  const cardBase =
    "rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md " +
    "shadow-[0_24px_80px_rgba(0,0,0,0.45)]";

  const inputBase =
    "w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-white placeholder:text-white/35 " +
    "outline-none focus:border-[#c8a04b]/50 focus:ring-2 focus:ring-[#c8a04b]/15 transition";

  const chip =
    "inline-flex items-center gap-2 px-3 py-1 rounded-full " +
    "border border-white/10 bg-white/5 text-white/80 text-xs";

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

  const btnDanger =
    "inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium " +
    "bg-red-500/10 text-red-200 border border-red-500/20 " +
    "hover:bg-red-500/15 hover:border-red-500/30 " +
    "focus:outline-none focus:ring-2 focus:ring-red-400/40 " +
    "transition disabled:opacity-60";




  const infoLine = (label: string, value: React.ReactNode) => (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-white/10 last:border-b-0">
      <div className="text-xs text-white/55">{label}</div>
      <div className="text-sm text-white text-right">{value}</div>
    </div>
  );

  const statusPill = (s: ExpenseStatus, dateText?: string | null, clickable = false) => {
  const chevron = clickable ? (
    <span className="ml-2 inline-flex items-center justify-center">
    <ChevronRight className="w-4 h-4 opacity-35 group-hover:opacity-90 transition group-hover:translate-x-0.5" />
    </span>
  ) : null;

  const common =
  "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border transition " +
  "group-hover:brightness-110 group-hover:shadow-[0_0_0_3px_rgba(200,160,75,0.12)] " +
  (clickable ? "cursor-pointer hover:brightness-110 active:brightness-95" : "");

  



  if (s === "PAID") {
    return (
      <span className={common + " bg-emerald-400/10 text-emerald-200 border-emerald-400/20"}>
        <CheckCircle2 className="w-3.5 h-3.5 mr-2" />
        Opłacone{dateText ? ` • ${dateText}` : ""}
        {chevron}
      </span>
    );
  }

  if (s === "IN_PROGRESS") {
    return (
      <span className={common + " bg-amber-400/10 text-amber-200 border-amber-400/20"}>
        <Clock3 className="w-3.5 h-3.5 mr-2" />
        W trakcie{dateText ? ` • termin: ${dateText}` : ""}
        {chevron}
      </span>
    );
  }

  return (
    <span className={common + " bg-white/5 text-white/75 border-white/10"}>
      <Sparkles className="w-3.5 h-3.5 mr-2 text-[#d7b45a]" />
      Planowane
      {chevron}
    </span>
  );
};


  // -------------------------
  // ŁADOWANIE
  // -------------------------
  const loadAll = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    setError(null);

    try {
      const [expensesRes, summaryRes] = await Promise.all([
        api.getFinanceExpenses(eventId) as Promise<Expense[]>,
        api.getFinanceSummary(eventId) as Promise<FinanceSummary>,
      ]);

      setExpenses((expensesRes ?? []).map(normalizeExpense));
      setSummary(summaryRes ?? null);
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Nie udało się załadować danych finansowych.";
      setError(msg);

      if (err instanceof Error && err.message === "Niepoprawny token") {
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  }, [eventId, navigate]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  // -------------------------
  // FILTROWANIE + SORT
  // -------------------------
  const filteredAndSortedExpenses = useMemo(() => {
    let result = [...expenses];

    if (filterSearch.trim()) {
      const q = filterSearch.trim().toLowerCase();
      result = result.filter((e) =>
        [e.name, e.vendor_name, e.notes]
          .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
          .some((v) => v.toLowerCase().includes(q))
      );
    }

    if (filterCategory !== "all") result = result.filter((e) => e.category === filterCategory);
    if (filterStatus !== "all") result = result.filter((e) => e.status === filterStatus);

    const getSortValue = (x: Expense & { status: ExpenseStatus }, field: SortField): string | number => {
      const getNum = (v: number | string | null) => toNumberOrNull(v) ?? 0;
      const getDate = (d: string | null) => (d ? Date.parse(d) : 0);

      switch (field) {
        case "name":
          return (x.name ?? "").toLowerCase();
        case "category":
          return (x.category ?? "").toLowerCase();
        case "status":
          return x.status;
        case "planned_amount":
          return getNum(x.planned_amount);
        case "actual_amount":
          return getNum(x.actual_amount);
        case "due_date":
          return getDate(x.due_date);
        case "paid_date":
          return getDate(x.paid_date);
      }
    };

    result.sort((a, b) => {
      const dir = sortDirection === "asc" ? 1 : -1;
      const av = getSortValue(a, sortField);
      const bv = getSortValue(b, sortField);
      if (av === bv) return 0;
      return av > bv ? dir : -dir;
    });

    return result;
  }, [expenses, filterSearch, filterCategory, filterStatus, sortField, sortDirection]);

  // -------------------------
  // MODAL helpers (add/edit)
  // -------------------------
  const openAdd = () => {
    setEditing(null);
    setFormError(null);
    setFName("");
    setFCategory("OTHER");
    setFStatus("PLANNED");
    setFPlanned("");
    setFActual("");
    setFDue("");
    setFPaid("");
    setFVendor("");
    setFNotes("");
    setModalOpen(true);
  };

  const openEdit = (e: Expense & { status: ExpenseStatus }) => {
    setEditing(e);
    setFormError(null);
    setFName(e.name ?? "");
    setFCategory(e.category);
    setFStatus(e.status);

    setFPlanned(toNumberOrNull(e.planned_amount)?.toString() ?? "");
    setFActual(toNumberOrNull(e.actual_amount)?.toString() ?? "");

    setFDue(e.due_date ?? "");
    setFPaid(e.paid_date ?? "");
    setFVendor(e.vendor_name ?? "");
    setFNotes(e.notes ?? "");
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setFormError(null);
  };

  const validateForm = (): string | null => {
    if (!fName.trim()) return "Nazwa jest wymagana.";

    if (fStatus === "PLANNED") {
      // Planowane: bez kwoty faktycznej i bez dat
      return null;
    }

    if (fStatus === "IN_PROGRESS") {
      if (!fDue) return "Dla statusu „W trakcie” wymagany jest Termin płatności.";
      if (isDatePast(fDue)) return "Termin płatności nie może być w przeszłości (tylko dziś lub przyszłość).";
      const a = parseMoneyInput(fActual);
      if (a === null || a < 0) return "Dla „W trakcie” podaj poprawną kwotę faktyczną (>= 0).";
      return null;
    }

    if (fStatus === "PAID") {
      if (!fPaid) return "Dla statusu „Opłacone” wymagana jest Data płatności.";
      if (isDateFuture(fPaid)) return "Data płatności nie może być w przyszłości (tylko dziś lub przeszłość).";
      const a = parseMoneyInput(fActual);
      if (a === null || a < 0) return "Dla „Opłacone” podaj poprawną kwotę faktyczną (>= 0).";
      return null;
    }

    return null;
  };

  const handleSaveExpense = async () => {
    if (!eventId) return;

    const v = validateForm();
    if (v) {
      setFormError(v);
      return;
    }
    setFormError(null);

    setIsSavingExpense(true);
    setError(null);

    try {
      const planned = parseMoneyInput(fPlanned);
      const actual = parseMoneyInput(fActual);

      const payload: ExpenseCreatePayload = {
        name: fName.trim(),
        category: fCategory,
        status: fStatus,

        planned_amount: planned,

        // ✅ Planowane: faktyczna zawsze null
        actual_amount: fStatus === "PLANNED" ? null : actual,

        due_date: fStatus === "IN_PROGRESS" ? (fDue || null) : null,
        paid_date: fStatus === "PAID" ? (fPaid || null) : null,

        vendor_name: fVendor.trim() || null,
        notes: fNotes.trim() || null,
      };

      if (editing) {
        const updated = (await api.updateFinanceExpense(eventId, editing.id, payload as ExpenseUpdatePayload)) as Expense;
        setExpenses((prev) => prev.map((x) => (x.id === updated.id ? normalizeExpense(updated) : x)));
      } else {
        const created = (await api.createFinanceExpense(eventId, payload)) as Expense;
        setExpenses((prev) => [...prev, normalizeExpense(created)]);
      }

      const newSummary = (await api.getFinanceSummary(eventId)) as FinanceSummary;
      setSummary(newSummary);

      closeModal();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Nie udało się zapisać wydatku.");
    } finally {
      setIsSavingExpense(false);
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!eventId) return;
    const ok = await confirmAsync({
      title: "Usunąć wydatek?",
      message: "Czy na pewno chcesz usunąć wydatek?",
      confirmText: "Usuń",
      cancelText: "Anuluj",
      tone: "danger",
    });
    if (!ok) return;

    setError(null);
    try {
      await api.deleteFinanceExpense(eventId, expenseId);
      setExpenses((prev) => prev.filter((x) => x.id !== expenseId));

      const newSummary = (await api.getFinanceSummary(eventId)) as FinanceSummary;
      setSummary(newSummary);
      toast({ tone: "success", title: "Sukces", message: "Wydatek usunięty." });
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Nie udało się usunąć wydatku.";
      setError(msg);
      toast({ tone: "danger", title: "Błąd", message: msg });
    }
  };

  const handleExportXlsx = async () => {
    if (!eventId) return;
    setIsExporting(true);
    setError(null);

    try {
      const blob = (await api.exportFinanceExpensesXlsx(eventId)) as Blob;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "wydatki.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Nie udało się wyeksportować wydatków.");
    } finally {
      setIsExporting(false);
    }
  };

  // -------------------------
  // STATUS CHANGE FLOW
  // -------------------------
  const getAllowedNextStatuses = (current: ExpenseStatus): ExpenseStatus[] => {
    if (current === "PLANNED") return ["IN_PROGRESS", "PAID"];
    if (current === "IN_PROGRESS") return ["PAID"];
    return [];
  };

  const openStatusChange = (e: Expense & { status: ExpenseStatus }) => {
    const allowed = getAllowedNextStatuses(e.status);
    if (allowed.length === 0) return;

    setStatusEditing(e);
    setNextStatus(allowed[0]);
    setScError(null);

    // domyślne wartości z wydatku (tylko do podglądu — user wpisuje nowe)
    setScActual(toNumberOrNull(e.actual_amount)?.toString() ?? "");
    setScDue(e.due_date ?? "");
    setScPaid(e.paid_date ?? "");

    // opcjonalne — tylko do dodania jeśli puste
    setScVendor(e.vendor_name ?? "");
    setScNotes(e.notes ?? "");

    setStatusModalOpen(true);
  };

  const closeStatusModal = () => {
    setStatusModalOpen(false);
    setStatusEditing(null);
    setNextStatus("");
    setScError(null);
    setIsSavingStatus(false);
  };

  const validateStatusChange = (): string | null => {
    if (!statusEditing) return "Brak wydatku.";
    if (!nextStatus) return "Wybierz docelowy status.";

    const cur = statusEditing.status;

    // Planowane -> W trakcie
    if (cur === "PLANNED" && nextStatus === "IN_PROGRESS") {
      const a = parseMoneyInput(scActual);
      if (a === null || a < 0) return "Podaj kwotę faktyczną (>= 0).";
      if (!scDue) return "Podaj termin płatności.";
      if (isDatePast(scDue)) return "Termin płatności nie może być w przeszłości.";
      return null;
    }

    // Planowane -> Opłacone
    if (cur === "PLANNED" && nextStatus === "PAID") {
      const a = parseMoneyInput(scActual);
      if (a === null || a < 0) return "Podaj kwotę faktyczną (>= 0).";
      if (!scPaid) return "Podaj datę płatności.";
      if (isDateFuture(scPaid)) return "Data płatności nie może być w przyszłości.";
      return null;
    }

    // W trakcie -> Opłacone
    if (cur === "IN_PROGRESS" && nextStatus === "PAID") {
      const a = parseMoneyInput(scActual);
      if (a === null || a < 0) return "Podaj kwotę faktyczną (>= 0).";
      if (!scPaid) return "Podaj datę płatności.";
      if (isDateFuture(scPaid)) return "Data płatności nie może być w przyszłości.";
      return null;
    }

    return "Nieprawidłowe przejście statusu.";
  };

  const handleApplyStatusChange = async () => {
    if (!eventId || !statusEditing || !nextStatus) return;

    const msg = validateStatusChange();
    if (msg) {
      setScError(msg);
      return;
    }

    setScError(null);
    setIsSavingStatus(true);
    setError(null);

    try {
      const cur = statusEditing.status;
      const a = parseMoneyInput(scActual);

      // bazujemy na istniejących danych
      const payload: ExpenseUpdatePayload = {
        name: statusEditing.name,
        category: statusEditing.category,
        status: nextStatus,
        planned_amount: toNumberOrNull(statusEditing.planned_amount),

        actual_amount: a,

        due_date:
          nextStatus === "IN_PROGRESS"
            ? scDue || null
            : nextStatus === "PAID" && cur === "IN_PROGRESS"
            ? statusEditing.due_date
            : null,

        paid_date: nextStatus === "PAID" ? scPaid || null : null,

        // opcjonalne: jeśli już były uzupełnione, nie pozwalamy edytować — tylko wyświetlamy
        vendor_name: statusEditing.vendor_name ? statusEditing.vendor_name : scVendor.trim() || null,
        notes: statusEditing.notes ? statusEditing.notes : scNotes.trim() || null,
      };

      const updated = (await api.updateFinanceExpense(eventId, statusEditing.id, payload)) as Expense;
      setExpenses((prev) => prev.map((x) => (x.id === updated.id ? normalizeExpense(updated) : x)));

      const newSummary = (await api.getFinanceSummary(eventId)) as FinanceSummary;
      setSummary(newSummary);

      closeStatusModal();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Nie udało się zmienić statusu.");
      setIsSavingStatus(false);
    }
  };

  if (!eventId) return <div className="p-4 text-red-200">Brak identyfikatora wydarzenia w adresie URL.</div>;

  const currency = summary?.currency || "PLN";

  const activeFilters =
    (filterSearch ? 1 : 0) + (filterCategory !== "all" ? 1 : 0) + (filterStatus !== "all" ? 1 : 0);

  // Szybkie liczby do kafelków
  const totalPlanned = summary?.total_planned ?? 0;
  const totalActual = summary?.total_actual ?? 0;
  const diff = summary?.diff_planned_actual ?? 0;
  const remaining = summary?.remaining_budget;

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className={`${cardBase} p-6 flex items-center gap-3 text-white/80`}>
          <Loader2 className="w-5 h-5 animate-spin" />
          Ładowanie finansów…
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl border border-white/10 bg-white/5 grid place-items-center">
            <Wallet className="w-5 h-5 text-[#d7b45a]" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Finanse</h2>
            <p className="text-sm text-white/60">
              Wydatki z widokiem plan/real + statusy (Planowane / W trakcie / Opłacone).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" onClick={handleExportFinancePdf} className={btnGold}>
            Pobierz PDF
          </button>





          <button type="button" onClick={handleExportXlsx} disabled={isExporting} className={btnSecondary}>
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {isExporting ? "Eksport…" : "Eksportuj XLSX"}
          </button>

          <button type="button" onClick={openAdd} className={btnGold}>
            <Plus className="w-4 h-4" />
            Dodaj wydatek
          </button>
        </div>
      </div>

      {error && (
        <div className={`${cardBase} p-4 border-red-500/20 bg-red-500/10`}>
          <div className="text-sm text-red-200">{error}</div>
        </div>
      )}

      {/* Summary */}
      <section className={cardBase + " p-5"}>
        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs text-white/55">Plan</div>
            <div className="mt-1 text-2xl font-bold text-white">
              {money(totalPlanned)} {currency}
            </div>
            <div className="mt-2 inline-flex items-center gap-2 text-xs text-white/50">
              <TrendingUp className="w-4 h-4" />
              suma planowana
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs text-white/55">Faktycznie</div>
            <div className="mt-1 text-2xl font-bold text-white">
              {money(totalActual)} {currency}
            </div>
            <div className="mt-2 inline-flex items-center gap-2 text-xs text-white/50">
              <TrendingDown className="w-4 h-4" />
              suma faktyczna
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs text-white/55">Różnica</div>
            <div className="mt-1 text-2xl font-bold text-white">
              {money(diff)} {currency}
            </div>
            <div className="mt-2 inline-flex items-center gap-2 text-xs text-white/50">
              <ArrowRightLeft className="w-4 h-4" />
              plan vs real
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs text-white/55">Pozostało</div>
            <div className="mt-1 text-2xl font-bold text-white">
              {remaining === null || remaining === undefined ? "—" : `${money(remaining)} ${currency}`}
            </div>
            <div className="mt-2 inline-flex items-center gap-2 text-xs text-white/50">
              <ArrowUpRight className="w-4 h-4" />
              budżet - faktycznie
            </div>
          </div>
        </div>
      </section>

      {/* Filters + list */}
      <section className={cardBase}>
        <div className="p-5 border-b border-white/10">
          <div className="grid gap-3 md:grid-cols-12">
            <div className="md:col-span-4">
              <label className="block text-xs text-white/70 mb-1">Szukaj</label>
              <div className="relative">
                <Search className="w-4 h-4 text-white/35 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  className={inputBase + " pl-10"}
                  value={filterSearch}
                  onChange={(e) => setFilterSearch(e.target.value)}
                  placeholder="np. fotograf, zaliczka, umowa…"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs text-white/70 mb-1">Kategoria</label>
              <Select<ExpenseCategory | "all">
                value={filterCategory}
                onChange={(v) => setFilterCategory(v)}
                options={[{ value: "all", label: "Wszystkie" }, ...CATEGORY_OPTIONS]}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs text-white/70 mb-1">Status</label>
              <Select<ExpenseStatus | "all">
                value={filterStatus}
                onChange={(v) => setFilterStatus(v)}
                options={[
                  { value: "all", label: "Wszystkie" },
                  ...STATUS_OPTIONS.map((s) => ({ value: s.value, label: s.label })),
                ]}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs text-white/70 mb-1">Sortuj</label>
              <Select<SortField>
                value={sortField}
                onChange={(v) => setSortField(v)}
                options={[
                  { value: "due_date", label: "Termin" },
                  { value: "paid_date", label: "Data płatności" },
                  { value: "status", label: "Status" },
                  { value: "name", label: "Nazwa" },
                  { value: "category", label: "Kategoria" },
                  { value: "planned_amount", label: "Kwota planowana" },
                  { value: "actual_amount", label: "Kwota faktyczna" },
                ]}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs text-white/70 mb-1">Kierunek</label>
              <Select<"asc" | "desc">
                value={sortDirection}
                onChange={(v) => setSortDirection(v)}
                options={[
                  { value: "asc", label: "Rosnąco" },
                  { value: "desc", label: "Malejąco" },
                ]}
              />
            </div>
          </div>

          {activeFilters ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs text-white/55">Aktywne:</span>
              {filterSearch && <span className={chip}>Szukaj: {filterSearch}</span>}
              {filterCategory !== "all" && (
                <span className={chip}>
                  Kategoria: {CATEGORY_OPTIONS.find((x) => x.value === filterCategory)?.label ?? filterCategory}
                </span>
              )}
              {filterStatus !== "all" && (
                <span className={chip}>Status: {STATUS_OPTIONS.find((s) => s.value === filterStatus)?.label ?? filterStatus}</span>
              )}

              <button
                type="button"
                className={btnSecondary}
                onClick={() => {
                  setFilterSearch("");
                  setFilterCategory("all");
                  setFilterStatus("all");
                }}
              >
                <X className="w-4 h-4" />
                Wyczyść
              </button>
            </div>
          ) : null}
        </div>

        {/* list */}
        <div className="p-5">
          {filteredAndSortedExpenses.length === 0 ? (
            <div className="text-sm text-white/55">Brak wydatków spełniających kryteria.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-white/5">
                    <th className="border-b border-white/10 px-3 py-3 text-left font-semibold text-white/70">Status</th>
                    <th className="border-b border-white/10 px-3 py-3 text-left font-semibold text-white/70">Termin / płatność</th>
                    <th className="border-b border-white/10 px-3 py-3 text-left font-semibold text-white/70">Nazwa</th>
                    <th className="border-b border-white/10 px-3 py-3 text-left font-semibold text-white/70">Kategoria</th>
                    <th className="border-b border-white/10 px-3 py-3 text-right font-semibold text-white/70">Plan</th>
                    <th className="border-b border-white/10 px-3 py-3 text-right font-semibold text-white/70">Faktycznie</th>
                    <th className="border-b border-white/10 px-3 py-3 text-left font-semibold text-white/70">Usługodawca</th>
                    <th className="border-b border-white/10 px-3 py-3 text-right font-semibold text-white/70">Akcje</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredAndSortedExpenses.map((e) => {
                    const catLabel = CATEGORY_OPTIONS.find((c) => c.value === e.category)?.label || e.category;
                    const s = e.status;
                    const dateISO = s === "PAID" ? e.paid_date : s === "IN_PROGRESS" ? e.due_date : null;

                    return (
                      <tr key={e.id} className=" group transition hover:bg-white/[0.06] hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]">
                        <td className="border-b border-white/5 px-3 py-3">
                          {getAllowedNextStatuses(s).length > 0 ? (
                            <button
                              type="button"
                              onClick={() => openStatusChange(e)}
                              className="inline-flex focus:outline-none"
                            >
                              {statusPill(s, null, true)}
                            </button>
                          ) : (
                            statusPill(s)
                          )}

                        </td>
                        <td className="border-b border-white/5 px-3 py-3 text-white/75 whitespace-nowrap tabular-nums">
                          {formatDateDMY(dateISO)}
                        </td>

                        <td className="border-b border-white/5 px-3 py-3 text-white/85">
                          <div className="font-semibold text-white">{e.name}</div>
                          {e.notes ? (
                            <div className="text-xs text-white/45 mt-1 max-w-[520px] truncate" title={e.notes}>
                              {e.notes}
                            </div>
                          ) : null}
                        </td>

                        <td className="border-b border-white/5 px-3 py-3 text-white/75">{catLabel}</td>

                        <td className="border-b border-white/5 px-3 py-3 text-right text-white/85">
                          {money(e.planned_amount)} {currency}
                        </td>

                        <td className="border-b border-white/5 px-3 py-3 text-right text-white/85">
                          {money(e.actual_amount)} {currency}
                        </td>

                        <td className="border-b border-white/5 px-3 py-3 text-white/75">{e.vendor_name || "—"}</td>

                        

                        <td className="border-b border-white/5 px-3 py-3 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openEdit(e)}
                              className={btnSecondary + " px-3 py-2 text-xs"}
                              title="Edytuj"
                            >
                              <Pencil className="w-4 h-4" />
                              Edytuj
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteExpense(e.id)}
                              className={btnDanger + " px-3 py-2 text-xs"}
                              title="Usuń"
                            >
                              <Trash2 className="w-4 h-4" />
                              Usuń
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* MODAL add/edit */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-[9999999] flex items-center justify-center"
          style={{ backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(3px)" }}
        >
          <div className="absolute inset-0" onClick={closeModal} />

          <div className="relative w-full max-w-3xl p-6 overflow-y-auto max-h-[90vh] rounded-2xl shadow-2xl border border-white/10 bg-emerald-950/70 text-white backdrop-blur-xl">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h3 className="text-xl font-semibold text-white">{editing ? "Edytuj wydatek" : "Dodaj wydatek"}</h3>
                <p className="text-sm text-white/60 mt-1">Wybierz status — pola dopasują się do procesu (plan → w trakcie → opłacone).</p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="rounded-xl border border-white/10 bg-white/5 p-2 hover:bg-white/10 transition"
                title="Zamknij"
              >
                <X className="w-4 h-4 text-white/80" />
              </button>
            </div>

            {formError ? (
              <div className="mb-4 rounded-xl border border-red-400/25 bg-red-500/10 p-3 text-sm text-red-100">{formError}</div>
            ) : null}

            <div className="grid gap-3 md:grid-cols-3">
              <div className="md:col-span-2">
                <label className="block text-xs text-white/70 mb-1">Nazwa *</label>
                <input className={inputBase} value={fName} onChange={(e) => setFName(e.target.value)} placeholder="np. Fotograf — zaliczka" />
              </div>

              <div>
                <label className="block text-xs text-white/70 mb-1">Kategoria *</label>
                <Select<ExpenseCategory>
                  value={fCategory}
                  onChange={(v) => setFCategory(v)}
                  options={CATEGORY_OPTIONS}
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs text-white/70 mb-1">Status *</label>
                <Select<ExpenseStatus>
                  value={fStatus}
                  onChange={(v) => {
                    setFStatus(v);

                    // czyścimy sprzeczne pola, żeby nie zostawały stare wartości
                    if (v === "PLANNED") {
                      setFActual("");
                      setFDue("");
                      setFPaid("");
                    } else if (v === "IN_PROGRESS") {
                      setFPaid("");
                    } else if (v === "PAID") {
                      setFDue("");
                    }
                  }}
                  options={STATUS_OPTIONS.map((s) => ({
                    value: s.value,
                    label: `${s.label} — ${s.hint}`,
                  }))}
                />
              </div>
              <div>
                <label className="block text-xs text-white/70 mb-1">Kwota planowana</label>
                <input type="number" step="0.01" className={inputBase} value={fPlanned} onChange={(e) => setFPlanned(e.target.value)} placeholder="np. 3500" />
              </div>

              {/* ✅ Planowane: bez kwoty faktycznej */}
              {fStatus !== "PLANNED" ? (
                <div>
                  <label className="block text-xs text-white/70 mb-1">Kwota faktyczna *</label>
                  <input type="number" step="0.01" className={inputBase} value={fActual} onChange={(e) => setFActual(e.target.value)} placeholder="np. 3200" />
                </div>
              ) : (
                <div className="hidden md:block" />
              )}

              <div>
                <label className="block text-xs text-white/70 mb-1">Usługodawca (opcjonalnie)</label>
                <input className={inputBase} value={fVendor} onChange={(e) => setFVendor(e.target.value)} placeholder="np. Studio XYZ" />
              </div>

              {/* status-driven daty */}
              {fStatus === "IN_PROGRESS" ? (
  <div className="md:col-span-1">
    <label className="block text-xs text-white/70 mb-1">Termin płatności *</label>
    <DatePicker value={fDue} onChange={setFDue} minDate={todayISO()} />
    <div className="text-[11px] text-white/45 mt-1">Nie może być w przeszłości.</div>
  </div>
) : null}

              {fStatus === "PAID" ? (
  <div className="md:col-span-1">
    <label className="block text-xs text-white/70 mb-1">Data płatności *</label>
    <DatePicker value={fPaid} onChange={setFPaid} maxDate={todayISO()} />
    <div className="text-[11px] text-white/45 mt-1">Nie może być w przyszłości.</div>
  </div>
) : null}

              <div className={fStatus === "PLANNED" ? "md:col-span-3" : "md:col-span-2"}>
                <label className="block text-xs text-white/70 mb-1">Notatki</label>
                <textarea className={inputBase + " min-h-[96px] resize-none"} value={fNotes} onChange={(e) => setFNotes(e.target.value)} placeholder="Warunki, umowa, co obejmuje…" />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={closeModal} className={btnSecondary}>
                Anuluj
              </button>

              <button type="button" onClick={handleSaveExpense} disabled={isSavingExpense} className={btnGold}>
                {isSavingExpense ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {editing ? "Zapisz zmiany" : "Dodaj wydatek"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL status-change */}
{statusModalOpen && statusEditing ? (() => {
  const se = statusEditing;
  const allowed = getAllowedNextStatuses(se.status);

const statusLabel = (st: ExpenseStatus) =>
  STATUS_OPTIONS.find((x) => x.value === st)?.label ?? st;

const selectOptions = [
  { value: se.status, label: `Obecny: ${statusLabel(se.status)}`, disabled: true },
  ...allowed.map((st) => ({ value: st, label: statusLabel(st) })),
];


  return (
    <div
      className="fixed inset-0 z-[9999999] flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(3px)" }}
    >
      <div className="absolute inset-0" onClick={closeStatusModal} />

      <div className="relative w-full max-w-3xl p-6 overflow-y-auto max-h-[90vh] rounded-2xl shadow-2xl border border-white/10 bg-emerald-950/70 text-white backdrop-blur-xl">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="text-xl font-semibold text-white">Zmień status wydatku</h3>
            <p className="text-sm text-white/60 mt-1">
              Status może iść tylko do przodu. Dane bazowe są tylko do podglądu.
            </p>
          </div>

          <button
            type="button"
            onClick={closeStatusModal}
            className="rounded-xl border border-white/10 bg-white/5 p-2 hover:bg-white/10 transition"
            title="Zamknij"
          >
            <X className="w-4 h-4 text-white/80" />
          </button>
        </div>

        {scError ? (
          <div className="mb-4 rounded-xl border border-red-400/25 bg-red-500/10 p-3 text-sm text-red-100">
            {scError}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          {/* LEFT: informacje */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm font-semibold text-white mb-2">Obecne dane</div>

            {infoLine(
              "Status",
              statusPill(
                se.status,
                se.status === "PAID" ? se.paid_date : se.status === "IN_PROGRESS" ? se.due_date : null
              )
            )}
            {infoLine("Nazwa", <span className="font-semibold">{se.name}</span>)}
            {infoLine("Kategoria", CATEGORY_OPTIONS.find((c) => c.value === se.category)?.label ?? se.category)}
            {infoLine("Kwota planowana", `${money(se.planned_amount)} ${currency}`)}
            {infoLine("Kwota faktyczna", `${money(se.actual_amount)} ${currency}`)}
            {infoLine("Usługodawca", se.vendor_name || "—")}
            {infoLine("Notatki", se.notes ? <span className="text-white/80">{se.notes}</span> : "—")}
            {infoLine("Termin płatności", se.due_date || "—")}
            {infoLine("Data płatności", se.paid_date || "—")}
          </div>

          {/* RIGHT: formularz przejścia */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm font-semibold text-white mb-2">Aktualizacja</div>

            {/* OBECNY + ZMIEŃ NA */}
            <div className="mb-3">
              

              <div className="mt-3">
                <label className="block text-xs text-white/70 mb-1">Zmień na *</label>
                <Select<ExpenseStatus>
                  value={(nextStatus || allowed[0]) as ExpenseStatus}
                  onChange={(v) => {
                    // blokujemy wybór “Obecny”
                    if (v === se.status) return;

                    setNextStatus(v);

                    // czyścimy pola zależne
                    if (v === "IN_PROGRESS") setScPaid("");
                    if (v === "PAID") {
                      // nic obowiązkowo; scDue zostaje jako info jeśli przejście z IN_PROGRESS
                    }
                  }}
                  options={selectOptions}
                />


              </div>
            </div>

            {/* Pola zależne od przejścia */}
            <div className="grid gap-3">
              <div>
                <label className="block text-xs text-white/70 mb-1">Kwota faktyczna *</label>
                <input
                  type="number"
                  step="0.01"
                  className={inputBase}
                  value={scActual}
                  onChange={(e) => setScActual(e.target.value)}
                  placeholder="np. 3200"
                />
              </div>

              {/* Planowane -> W trakcie */}
              {se.status === "PLANNED" && nextStatus === "IN_PROGRESS" ? (
                <div>
                  <label className="block text-xs text-white/70 mb-1">Termin płatności *</label>
                  <DatePicker value={scDue} onChange={setScDue} minDate={todayISO()} />
                  <div className="text-[11px] text-white/45 mt-1">Nie może być w przeszłości.</div>
                </div>
              ) : null}

              {/* Planowane -> Opłacone OR W trakcie -> Opłacone */}
              {nextStatus === "PAID" ? (
                <div>
                  <label className="block text-xs text-white/70 mb-1">Data płatności *</label>
                  <DatePicker value={scPaid} onChange={setScPaid} maxDate={todayISO()} />
                  <div className="text-[11px] text-white/45 mt-1">Nie może być w przyszłości.</div>
                </div>
              ) : null}

              {/* Opcjonalne: tylko jeśli były puste */}
              {!se.vendor_name ? (
                <div>
                  <label className="block text-xs text-white/70 mb-1">Usługodawca (opcjonalnie)</label>
                  <input
                    className={inputBase}
                    value={scVendor}
                    onChange={(e) => setScVendor(e.target.value)}
                    placeholder="np. Studio XYZ"
                  />
                </div>
              ) : (
                <div className="rounded-xl border border-white/10 bg-black/10 p-3">
                  <div className="text-xs text-white/55">Usługodawca</div>
                  <div className="text-sm text-white mt-1">{se.vendor_name}</div>
                </div>
              )}

              {!se.notes ? (
                <div>
                  <label className="block text-xs text-white/70 mb-1">Notatki (opcjonalnie)</label>
                  <textarea
                    className={inputBase + " min-h-[84px] resize-none"}
                    value={scNotes}
                    onChange={(e) => setScNotes(e.target.value)}
                    placeholder="Dodaj notatkę (np. warunki / umowa)…"
                  />
                </div>
              ) : (
                <div className="rounded-xl border border-white/10 bg-black/10 p-3">
                  <div className="text-xs text-white/55">Notatki</div>
                  <div className="text-sm text-white/90 mt-1">{se.notes}</div>
                </div>
              )}

              {/* informacja przy IN_PROGRESS -> PAID */}
              {se.status === "IN_PROGRESS" && nextStatus === "PAID" ? (
                <div className="rounded-xl border border-white/10 bg-black/10 p-3">
                  <div className="text-xs text-white/55">Termin płatności (info)</div>
                  <div className="text-sm text-white mt-1">{se.due_date || "—"}</div>
                </div>
              ) : null}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={closeStatusModal} className={btnSecondary}>
                Anuluj
              </button>

              <button type="button" onClick={handleApplyStatusChange} disabled={isSavingStatus} className={btnGold}>
                {isSavingStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Zapisz zmianę
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
})() : null}

    </div>
  );
};

export default Finance;
