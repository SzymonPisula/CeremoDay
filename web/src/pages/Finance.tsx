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
  Filter,
  Download,
  Pencil,
  Trash2,
  X,
  Loader2,
  Plus,
  CheckCircle2,
  Clock3,
  CalendarDays,
} from "lucide-react";
import { api } from "../lib/api";

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

type SortField = "name" | "planned_amount" | "actual_amount" | "due_date" | "paid_date" | "category" | "status";

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

const Finance: React.FC = () => {
  const { id: eventId } = useParams<{ id: string }>();
  const navigate = useNavigate();

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

  // formularz w modalu
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

  // UI helpers (CeremoDay vibe)
  const cardBase =
    "rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md " +
    "shadow-[0_24px_80px_rgba(0,0,0,0.45)]";

  const inputBase =
    "w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-white placeholder:text-white/35 " +
    "outline-none focus:border-[#c8a04b]/50 focus:ring-2 focus:ring-[#c8a04b]/15 transition";

  const selectBase =
    inputBase +
    " pr-9 appearance-none " +
    "[&>option]:bg-[#07160f] [&>option]:text-white";

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

  const statusPill = (s: ExpenseStatus, dateText?: string | null) => {
    if (s === "PAID") {
      return (
        <span className="inline-flex items-center rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200 border border-emerald-400/20">
          <CheckCircle2 className="w-3.5 h-3.5 mr-2" />
          Opłacone{dateText ? ` • ${dateText}` : ""}
        </span>
      );
    }
    if (s === "IN_PROGRESS") {
      return (
        <span className="inline-flex items-center rounded-full bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-200 border border-amber-400/20">
          <Clock3 className="w-3.5 h-3.5 mr-2" />
          W trakcie{dateText ? ` • termin: ${dateText}` : ""}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-white/75 border border-white/10">
        <Sparkles className="w-3.5 h-3.5 mr-2 text-[#d7b45a]" />
        Planowane
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

    const getSortValue = (x: (Expense & { status: ExpenseStatus }), field: SortField): string | number => {
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
  // MODAL helpers
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

    // status-driven wymagania
    if (fStatus === "PLANNED") {
      // daty niepotrzebne, wyczyśćmy je w payloadzie
      return null;
    }

    if (fStatus === "IN_PROGRESS") {
      if (!fDue) return "Dla statusu „W trakcie” wymagany jest Termin płatności.";
      if (isDatePast(fDue)) return "Termin płatności nie może być w przeszłości (tylko dziś lub przyszłość).";

      // kwota faktyczna — wg Twojego opisu: w trakcie warto ją mieć
      const a = fActual.trim() === "" ? null : Number(fActual.replace(",", "."));
      if (a === null || !Number.isFinite(a) || a < 0) return "Dla „W trakcie” podaj poprawną kwotę faktyczną (>= 0).";

      return null;
    }

    if (fStatus === "PAID") {
      if (!fPaid) return "Dla statusu „Opłacone” wymagana jest Data płatności.";
      if (isDateFuture(fPaid)) return "Data płatności nie może być w przyszłości (tylko dziś lub przeszłość).";

      const a = fActual.trim() === "" ? null : Number(fActual.replace(",", "."));
      if (a === null || !Number.isFinite(a) || a < 0) return "Dla „Opłacone” podaj poprawną kwotę faktyczną (>= 0).";

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
      const planned = fPlanned.trim() === "" ? null : Number(fPlanned.replace(",", "."));
      const actual = fActual.trim() === "" ? null : Number(fActual.replace(",", "."));

      const payload: ExpenseCreatePayload = {
        name: fName.trim(),
        category: fCategory,
        status: fStatus,

        planned_amount: Number.isFinite(planned as number) ? planned : null,
        actual_amount: Number.isFinite(actual as number) ? actual : null,

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
    if (!window.confirm("Na pewno usunąć ten wydatek?")) return;

    setError(null);
    try {
      await api.deleteFinanceExpense(eventId, expenseId);
      setExpenses((prev) => prev.filter((x) => x.id !== expenseId));

      const newSummary = (await api.getFinanceSummary(eventId)) as FinanceSummary;
      setSummary(newSummary);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Nie udało się usunąć wydatku.");
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

  if (!eventId) return <div className="p-4 text-red-200">Brak identyfikatora wydarzenia w adresie URL.</div>;

  const currency = summary?.currency || "PLN";

  const activeFilters =
    (filterSearch ? 1 : 0) + (filterCategory !== "all" ? 1 : 0) + (filterStatus !== "all" ? 1 : 0);

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
            <p className="text-sm text-white/60">Wydatki z widokiem plan/real + statusy (Planowane / W trakcie / Opłacone).</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
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

      {loading && (
        <div className={`${cardBase} p-4`}>
          <div className="text-sm text-white/65 inline-flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Ładowanie danych…
          </div>
        </div>
      )}

      {/* Summary (budżet z wywiadu) */}
      {summary && (
        <section className={`${cardBase} p-6 md:p-7`}>
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#d7b45a]" />
              <h3 className="text-white font-semibold text-lg">Podsumowanie</h3>
            </div>
            <span className={chip}>{currency}</span>
          </div>

          <div className="text-xs text-white/55 mb-4">
            Budżet ustawiasz w <b>Wywiadzie</b>. Tutaj wyświetlamy tylko podsumowania i listę wydatków.
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/4 p-4">
              <div className="text-xs text-white/55 mb-1">Suma planowana</div>
              <div className="text-white text-lg font-semibold inline-flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#d7b45a]" />
                {summary.total_planned.toFixed(2)} {summary.currency}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/4 p-4">
              <div className="text-xs text-white/55 mb-1">Suma faktyczna</div>
              <div className="text-white text-lg font-semibold inline-flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-[#d7b45a]" />
                {summary.total_actual.toFixed(2)} {summary.currency}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/4 p-4">
              <div className="text-xs text-white/55 mb-1">Różnica (plan - faktycznie)</div>
              <div className="text-white text-lg font-semibold inline-flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-[#d7b45a]" />
                {summary.diff_planned_actual.toFixed(2)} {summary.currency}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/4 p-4">
              <div className="text-xs text-white/55 mb-1">Pozostały budżet</div>
              <div className="text-white text-lg font-semibold inline-flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#d7b45a]" />
                {summary.remaining_budget != null ? `${summary.remaining_budget.toFixed(2)} ${summary.currency}` : "—"}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Filters + List (zintegrowane) */}
      <section className={`${cardBase} p-0 overflow-hidden`}>
        {/* sticky filters */}
        <div className="sticky top-0 z-10 border-b border-white/10 bg-emerald-950/55 backdrop-blur-xl p-5">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-[#d7b45a]" />
              <h3 className="text-white font-semibold text-lg">Wydatki</h3>
            </div>
            <span className={chip}>
              {filteredAndSortedExpenses.length} pozycji{activeFilters ? ` • filtry: ${activeFilters}` : ""}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
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
              <select
                className={selectBase}
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value as ExpenseCategory | "all")}
              >
                <option value="all">Wszystkie</option>
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs text-white/70 mb-1">Status</label>
              <select
                className={selectBase}
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as ExpenseStatus | "all")}
              >
                <option value="all">Wszystkie</option>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs text-white/70 mb-1">Sortuj</label>
              <select className={selectBase} value={sortField} onChange={(e) => setSortField(e.target.value as SortField)}>
                <option value="due_date">Termin</option>
                <option value="paid_date">Data płatności</option>
                <option value="status">Status</option>
                <option value="name">Nazwa</option>
                <option value="category">Kategoria</option>
                <option value="planned_amount">Kwota planowana</option>
                <option value="actual_amount">Kwota faktyczna</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs text-white/70 mb-1">Kierunek</label>
              <select className={selectBase} value={sortDirection} onChange={(e) => setSortDirection(e.target.value as "asc" | "desc")}>
                <option value="asc">Rosnąco</option>
                <option value="desc">Malejąco</option>
              </select>
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
              {filterStatus !== "all" && <span className={chip}>Status: {STATUS_OPTIONS.find((s) => s.value === filterStatus)?.label ?? filterStatus}</span>}

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
                    <th className="border-b border-white/10 px-3 py-3 text-left font-semibold text-white/70">Nazwa</th>
                    <th className="border-b border-white/10 px-3 py-3 text-left font-semibold text-white/70">Status</th>
                    <th className="border-b border-white/10 px-3 py-3 text-left font-semibold text-white/70">Kategoria</th>
                    <th className="border-b border-white/10 px-3 py-3 text-right font-semibold text-white/70">Plan</th>
                    <th className="border-b border-white/10 px-3 py-3 text-right font-semibold text-white/70">Faktycznie</th>
                    <th className="border-b border-white/10 px-3 py-3 text-left font-semibold text-white/70">Usługodawca</th>
                    <th className="border-b border-white/10 px-3 py-3 text-left font-semibold text-white/70">Termin / płatność</th>
                    <th className="border-b border-white/10 px-3 py-3 text-right font-semibold text-white/70">Akcje</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredAndSortedExpenses.map((e) => {
                    const catLabel = CATEGORY_OPTIONS.find((c) => c.value === e.category)?.label || e.category;
                    const s = e.status;

                    const dateLabel =
                      s === "PAID" ? e.paid_date : s === "IN_PROGRESS" ? e.due_date : null;

                    return (
                      <tr key={e.id} className="hover:bg-white/4 transition">
                        <td className="border-b border-white/5 px-3 py-3 text-white/85">
                          <div className="font-semibold text-white">{e.name}</div>
                          {e.notes ? (
                            <div className="text-xs text-white/45 mt-1 max-w-[520px] truncate" title={e.notes}>
                              {e.notes}
                            </div>
                          ) : null}
                        </td>

                        <td className="border-b border-white/5 px-3 py-3">{statusPill(s, dateLabel)}</td>

                        <td className="border-b border-white/5 px-3 py-3 text-white/75">{catLabel}</td>

                        <td className="border-b border-white/5 px-3 py-3 text-right text-white/85">
                          {money(e.planned_amount)} {currency}
                        </td>

                        <td className="border-b border-white/5 px-3 py-3 text-right text-white/85">
                          {money(e.actual_amount)} {currency}
                        </td>

                        <td className="border-b border-white/5 px-3 py-3 text-white/75">{e.vendor_name || "—"}</td>

                        <td className="border-b border-white/5 px-3 py-3 text-white/75">
                          {s === "PLANNED" ? (
                            <span className="text-white/55">—</span>
                          ) : s === "IN_PROGRESS" ? (
                            <span className="inline-flex items-center gap-2">
                              <CalendarDays className="w-4 h-4 text-white/40" />
                              {e.due_date || "—"}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-2">
                              <CalendarDays className="w-4 h-4 text-white/40" />
                              {e.paid_date || "—"}
                            </span>
                          )}
                        </td>

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
                <p className="text-sm text-white/60 mt-1">
                  Wybierz status — pola dopasują się do procesu (plan → w trakcie → opłacone).
                </p>
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
              <div className="mb-4 rounded-xl border border-red-400/25 bg-red-500/10 p-3 text-sm text-red-100">
                {formError}
              </div>
            ) : null}

            <div className="grid gap-3 md:grid-cols-3">
              <div className="md:col-span-2">
                <label className="block text-xs text-white/70 mb-1">Nazwa *</label>
                <input className={inputBase} value={fName} onChange={(e) => setFName(e.target.value)} placeholder="np. Fotograf — zaliczka" />
              </div>

              <div>
                <label className="block text-xs text-white/70 mb-1">Kategoria *</label>
                <select className={selectBase} value={fCategory} onChange={(e) => setFCategory(e.target.value as ExpenseCategory)}>
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs text-white/70 mb-1">Status *</label>
                <select className={selectBase} value={fStatus} onChange={(e) => setFStatus(e.target.value as ExpenseStatus)}>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label} — {s.hint}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-white/70 mb-1">Kwota planowana</label>
                <input type="number" step="0.01" className={inputBase} value={fPlanned} onChange={(e) => setFPlanned(e.target.value)} placeholder="np. 3500" />
              </div>

              <div>
                <label className="block text-xs text-white/70 mb-1">Kwota faktyczna {fStatus === "PLANNED" ? "(opcjonalnie)" : "*"}</label>
                <input type="number" step="0.01" className={inputBase} value={fActual} onChange={(e) => setFActual(e.target.value)} placeholder="np. 3200" />
              </div>

              <div>
                <label className="block text-xs text-white/70 mb-1">Usługodawca (opcjonalnie)</label>
                <input className={inputBase} value={fVendor} onChange={(e) => setFVendor(e.target.value)} placeholder="np. Studio XYZ" />
              </div>

              {/* status-driven daty */}
              {fStatus === "IN_PROGRESS" ? (
                <div className="md:col-span-1">
                  <label className="block text-xs text-white/70 mb-1">Termin płatności *</label>
                  <input
                    type="date"
                    className={inputBase}
                    value={fDue}
                    min={todayISO()}
                    onChange={(e) => setFDue(e.target.value)}
                  />
                </div>
              ) : null}

              {fStatus === "PAID" ? (
                <div className="md:col-span-1">
                  <label className="block text-xs text-white/70 mb-1">Data płatności *</label>
                  <input
                    type="date"
                    className={inputBase}
                    value={fPaid}
                    max={todayISO()}
                    onChange={(e) => setFPaid(e.target.value)}
                  />
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
    </div>
  );
};

export default Finance;
