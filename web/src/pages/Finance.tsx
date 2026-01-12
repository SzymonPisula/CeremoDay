// CeremoDay/web/src/pages/Finance.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Wallet,
  Sparkles,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  PiggyBank,
  Search,
  Filter,
  ArrowUpDown,
  Download,
  Save,
  Pencil,
  Trash2,
  X,
  Loader2,
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

  type SortField =
  | "name"
  | "planned_amount"
  | "actual_amount"
  | "due_date"
  | "paid_date"
  | "category";

type Budget = {
  id: string;
  event_id: string;
  initial_budget: number | null;
  currency: string;
  notes: string | null;
};

type BudgetPayload = {
  initial_budget: number | null;
  currency: string;
  notes: string | null;
};

type Expense = {
  id: string;
  event_id: string;
  name: string;
  category: ExpenseCategory;
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

function normalizeExpense(e: Expense): Expense {
  return {
    ...e,
    planned_amount: toNumberOrNull(e.planned_amount),
    actual_amount: toNumberOrNull(e.actual_amount),
  };
}

const Finance: React.FC = () => {
  const { id: eventId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // -------------------------
  // STANY BUDŻETU
  // -------------------------
  const [, setBudget] = useState<Budget | null>(null);
  const [budgetInitial, setBudgetInitial] = useState<string>("");
  const [budgetCurrency, setBudgetCurrency] = useState<string>("PLN");
  const [budgetNotes, setBudgetNotes] = useState<string>("");

  // -------------------------
  // STANY WYDATKÓW I PODSUMOWANIA
  // -------------------------
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<FinanceSummary | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // -------------------------
  // FILTRY I SORTOWANIE
  // -------------------------
  const [filterSearch, setFilterSearch] = useState<string>("");
  const [filterCategory, setFilterCategory] = useState<ExpenseCategory | "all">("all");
  const [filterPaidStatus, setFilterPaidStatus] = useState<"all" | "paid" | "unpaid">("all");

  const [sortField, setSortField] = useState<SortField>("due_date");

  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // -------------------------
  // STANY FORMULARZY
  // -------------------------
  const [isSavingBudget, setIsSavingBudget] = useState(false);
  const [isSavingExpense, setIsSavingExpense] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // formularz NOWEGO wydatku
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState<ExpenseCategory>("OTHER");
  const [newPlannedAmount, setNewPlannedAmount] = useState("");
  const [newActualAmount, setNewActualAmount] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newPaidDate, setNewPaidDate] = useState("");
  const [newVendorName, setNewVendorName] = useState("");
  const [newNotes, setNewNotes] = useState("");

  // formularz EDYCJI wydatku
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState<ExpenseCategory>("OTHER");
  const [editPlannedAmount, setEditPlannedAmount] = useState("");
  const [editActualAmount, setEditActualAmount] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editPaidDate, setEditPaidDate] = useState("");
  const [editVendorName, setEditVendorName] = useState("");
  const [editNotes, setEditNotes] = useState("");

  // -------------------------
  // UI helpers (CeremoDay vibe)
  // -------------------------
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

  // -------------------------
  // ŁADOWANIE DANYCH
  // -------------------------
  const loadAll = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    setError(null);

    try {
      const [budgetRes, expensesRes, summaryRes] = await Promise.all([
        api.getFinanceBudget(eventId) as Promise<Budget | null>,
        api.getFinanceExpenses(eventId) as Promise<Expense[]>,
        api.getFinanceSummary(eventId) as Promise<FinanceSummary>,
      ]);

      setBudget(budgetRes);
      setExpenses((expensesRes ?? []).map(normalizeExpense));
      setSummary(summaryRes ?? null);

      if (budgetRes) {
        setBudgetInitial(budgetRes.initial_budget != null ? String(budgetRes.initial_budget) : "");
        setBudgetCurrency(budgetRes.currency || "PLN");
        setBudgetNotes(budgetRes.notes ?? "");
      } else {
        setBudgetInitial("");
        setBudgetCurrency("PLN");
        setBudgetNotes("");
      }
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
  // FILTROWANIE I SORTOWANIE
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

    if (filterCategory !== "all") {
      result = result.filter((e) => e.category === filterCategory);
    }

    if (filterPaidStatus === "paid") {
      result = result.filter((e) => !!e.paid_date);
    } else if (filterPaidStatus === "unpaid") {
      result = result.filter((e) => !e.paid_date);
    }

    const getSortValue = (x: Expense, field: SortField): string | number => {
  const getNum = (v: number | string | null) => toNumberOrNull(v) ?? 0;
  const getDate = (d: string | null) => (d ? Date.parse(d) : 0);

  switch (field) {
    case "name":
      return (x.name ?? "").toLowerCase();
    case "category":
      return (x.category ?? "").toLowerCase();
    case "planned_amount":
      return getNum(x.planned_amount);
    case "actual_amount":
      return getNum(x.actual_amount);
    case "due_date":
      return getDate(x.due_date);
    case "paid_date":
      return getDate(x.paid_date);
    default: {
      const _exhaustive: never = field;
      return _exhaustive;
    }
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
  }, [expenses, filterSearch, filterCategory, filterPaidStatus, sortField, sortDirection]);

  // -------------------------
  // BUDŻET – ZAPIS
  // -------------------------
  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventId) return;

    setIsSavingBudget(true);
    setError(null);

    try {
      const payload: BudgetPayload = {
        initial_budget: budgetInitial.trim() === "" ? null : Number(budgetInitial.replace(",", ".")),
        currency: budgetCurrency,
        notes: budgetNotes.trim() || null,
      };

      const saved = (await api.saveFinanceBudget(eventId, payload)) as Budget;
      setBudget(saved);

      const newSummary = (await api.getFinanceSummary(eventId)) as FinanceSummary;
      setSummary(newSummary);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Nie udało się zapisać budżetu.");
    } finally {
      setIsSavingBudget(false);
    }
  };

  // -------------------------
  // WYDATKI – EDYCJA
  // -------------------------
  const startEditExpense = (expense: Expense) => {
    setEditingId(expense.id);
    setEditName(expense.name);
    setEditCategory(expense.category);

    setEditPlannedAmount(toNumberOrNull(expense.planned_amount)?.toString() ?? "");
    setEditActualAmount(toNumberOrNull(expense.actual_amount)?.toString() ?? "");

    setEditDueDate(expense.due_date ?? "");
    setEditPaidDate(expense.paid_date ?? "");
    setEditVendorName(expense.vendor_name ?? "");
    setEditNotes(expense.notes ?? "");
  };

  const clearEditExpense = () => {
    setEditingId(null);
    setEditName("");
    setEditCategory("OTHER");
    setEditPlannedAmount("");
    setEditActualAmount("");
    setEditDueDate("");
    setEditPaidDate("");
    setEditVendorName("");
    setEditNotes("");
  };

  // -------------------------
  // WYDATKI – ZAPIS (NOWY / EDYCJA)
  // -------------------------
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventId) return;

    setIsSavingExpense(true);
    setError(null);

    try {
      if (editingId) {
        const payload: ExpenseUpdatePayload = {
          name: editName.trim(),
          category: editCategory,
          planned_amount: editPlannedAmount.trim() === "" ? null : Number(editPlannedAmount.replace(",", ".")),
          actual_amount: editActualAmount.trim() === "" ? null : Number(editActualAmount.replace(",", ".")),
          due_date: editDueDate || null,
          paid_date: editPaidDate || null,
          vendor_name: editVendorName.trim() || null,
          notes: editNotes.trim() || null,
        };

        const updated = (await api.updateFinanceExpense(eventId, editingId, payload)) as Expense;
        const normalized = normalizeExpense(updated);

        setExpenses((prev) => prev.map((x) => (x.id === normalized.id ? normalized : x)));
        clearEditExpense();
      } else {
        const payload: ExpenseCreatePayload = {
          name: newName.trim(),
          category: newCategory,
          planned_amount: newPlannedAmount.trim() === "" ? null : Number(newPlannedAmount.replace(",", ".")),
          actual_amount: newActualAmount.trim() === "" ? null : Number(newActualAmount.replace(",", ".")),
          due_date: newDueDate || null,
          paid_date: newPaidDate || null,
          vendor_name: newVendorName.trim() || null,
          notes: newNotes.trim() || null,
        };

        const created = (await api.createFinanceExpense(eventId, payload)) as Expense;
        setExpenses((prev) => [...prev, normalizeExpense(created)]);

        setNewName("");
        setNewCategory("OTHER");
        setNewPlannedAmount("");
        setNewActualAmount("");
        setNewDueDate("");
        setNewPaidDate("");
        setNewVendorName("");
        setNewNotes("");
      }

      const newSummary = (await api.getFinanceSummary(eventId)) as FinanceSummary;
      setSummary(newSummary);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Nie udało się zapisać wydatku.");
    } finally {
      setIsSavingExpense(false);
    }
  };

  // -------------------------
  // WYDATKI – USUWANIE
  // -------------------------
  const handleDeleteExpense = async (expenseId: string) => {
    if (!eventId) return;
    if (!window.confirm("Na pewno usunąć ten wydatek?")) return;

    setError(null);
    try {
      await api.deleteFinanceExpense(eventId, expenseId);

      setExpenses((prev) => prev.filter((x) => x.id !== expenseId));
      if (editingId === expenseId) clearEditExpense();

      const newSummary = (await api.getFinanceSummary(eventId)) as FinanceSummary;
      setSummary(newSummary);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Nie udało się usunąć wydatku.");
    }
  };

  // -------------------------
  // EKSPORT XLSX
  // -------------------------
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
  // RENDER
  // -------------------------
  if (!eventId) {
    return <div className="p-4 text-red-200">Brak identyfikatora wydarzenia w adresie URL.</div>;
  }

  const currency = summary?.currency || budgetCurrency || "PLN";

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
              Budżet, wydatki, filtrowanie i eksport XLSX.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleExportXlsx}
          disabled={isExporting}
          className={btnSecondary}
          title="Eksportuj XLSX"
        >
          {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {isExporting ? "Eksport…" : "Eksportuj XLSX"}
        </button>
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

      {/* Budget */}
      <section className={`${cardBase} p-6 md:p-7`}>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <PiggyBank className="w-5 h-5 text-[#d7b45a]" />
            <h3 className="text-white font-semibold text-lg">Budżet wydarzenia</h3>
          </div>
          <span className={chip}>
            <Sparkles className="w-4 h-4 text-[#d7b45a]" />
            {currency}
          </span>
        </div>

        <form onSubmit={handleSaveBudget} className="grid gap-3 md:grid-cols-3 items-end">
          <div>
            <label className="block text-xs text-white/70 mb-1">Budżet początkowy</label>
            <input
              type="number"
              step="0.01"
              className={inputBase}
              value={budgetInitial}
              onChange={(e) => setBudgetInitial(e.target.value)}
              placeholder="np. 45000"
            />
          </div>

          <div>
            <label className="block text-xs text-white/70 mb-1">Waluta</label>
            <select
              className={selectBase}
              value={budgetCurrency}
              onChange={(e) => setBudgetCurrency(e.target.value)}
            >
              <option value="PLN">PLN</option>
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
            </select>
          </div>

          <div className="md:row-span-2">
            <label className="block text-xs text-white/70 mb-1">Notatki</label>
            <textarea
              className={inputBase + " min-h-[92px] resize-none"}
              value={budgetNotes}
              onChange={(e) => setBudgetNotes(e.target.value)}
              placeholder="Uwagi do budżetu…"
            />
          </div>

          <div className="md:col-span-2 flex items-center gap-3">
            <button type="submit" disabled={isSavingBudget} className={btnGold}>
              {isSavingBudget ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isSavingBudget ? "Zapisywanie…" : "Zapisz budżet"}
            </button>

            <div className="text-xs text-white/55">
              Budżet wpływa na “Pozostały budżet” w podsumowaniu.
            </div>
          </div>
        </form>

        {summary && (
          <div className="mt-5 grid gap-3 md:grid-cols-4">
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
                {summary.remaining_budget != null
                  ? `${summary.remaining_budget.toFixed(2)} ${summary.currency}`
                  : "—"}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Filters */}
      <section className={`${cardBase} p-6 md:p-7`}>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-[#d7b45a]" />
            <h3 className="text-white font-semibold text-lg">Filtry i sortowanie</h3>
          </div>
          <span className={chip}>{filteredAndSortedExpenses.length} pozycji</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div className="md:col-span-2">
            <label className="block text-xs text-white/70 mb-1">
              Szukaj (nazwa / usługodawca / notatki)
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-white/35 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                className={inputBase + " pl-10"}
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                placeholder="np. fotograf, umowa, zaliczka…"
              />
            </div>
          </div>

          <div>
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

          <div>
            <label className="block text-xs text-white/70 mb-1">Status płatności</label>
            <select
              className={selectBase}
              value={filterPaidStatus}
              onChange={(e) => setFilterPaidStatus(e.target.value as "all" | "paid" | "unpaid")}
            >
              <option value="all">Wszystkie</option>
              <option value="paid">Opłacone</option>
              <option value="unpaid">Nieopłacone</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-white/70 mb-1">Sortuj</label>
            <select
              className={selectBase}
              value={sortField}
              onChange={(e) =>
                setSortField(
                  e.target.value as
                    | "name"
                    | "planned_amount"
                    | "actual_amount"
                    | "due_date"
                    | "paid_date"
                    | "category"
                )
              }
            >
              <option value="due_date">Termin</option>
              <option value="paid_date">Data płatności</option>
              <option value="name">Nazwa</option>
              <option value="category">Kategoria</option>
              <option value="planned_amount">Kwota planowana</option>
              <option value="actual_amount">Kwota faktyczna</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-white/70 mb-1">Kierunek</label>
            <select
              className={selectBase}
              value={sortDirection}
              onChange={(e) => setSortDirection(e.target.value as "asc" | "desc")}
            >
              <option value="asc">Rosnąco</option>
              <option value="desc">Malejąco</option>
            </select>
          </div>
        </div>

        {(filterSearch || filterCategory !== "all" || filterPaidStatus !== "all") && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs text-white/55">Aktywne filtry:</span>
            {filterSearch && <span className={chip}>Szukaj: {filterSearch}</span>}
            {filterCategory !== "all" && (
              <span className={chip}>
                Kategoria: {CATEGORY_OPTIONS.find((x) => x.value === filterCategory)?.label ?? filterCategory}
              </span>
            )}
            {filterPaidStatus !== "all" && <span className={chip}>Płatność: {filterPaidStatus}</span>}
            <button
              type="button"
              className={btnSecondary}
              onClick={() => {
                setFilterSearch("");
                setFilterCategory("all");
                setFilterPaidStatus("all");
              }}
            >
              <X className="w-4 h-4" />
              Wyczyść filtry
            </button>
          </div>
        )}
      </section>

      {/* Add / Edit expense */}
      <section className={`${cardBase} p-6 md:p-7`}>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-5 h-5 text-[#d7b45a]" />
            <h3 className="text-white font-semibold text-lg">
              {editingId ? "Edytuj wydatek" : "Dodaj wydatek"}
            </h3>
          </div>
          {editingId ? (
            <span className={chip}>
              <Pencil className="w-4 h-4 text-[#d7b45a]" />
              Tryb edycji
            </span>
          ) : (
            <span className={chip}>Nowy</span>
          )}
        </div>

        <form onSubmit={handleSaveExpense} className="grid gap-3 md:grid-cols-4">
          <div>
            <label className="block text-xs text-white/70 mb-1">Nazwa *</label>
            <input
              type="text"
              required
              className={inputBase}
              value={editingId ? editName : newName}
              onChange={(e) => (editingId ? setEditName(e.target.value) : setNewName(e.target.value))}
              placeholder="np. Zaliczka fotograf"
            />
          </div>

          <div>
            <label className="block text-xs text-white/70 mb-1">Kategoria *</label>
            <select
              required
              className={selectBase}
              value={editingId ? editCategory : newCategory}
              onChange={(e) => {
                const val = e.target.value as ExpenseCategory;
                if (editingId) setEditCategory(val);
                else setNewCategory(val);
              }}
            >
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-white/70 mb-1">Kwota planowana</label>
            <input
              type="number"
              step="0.01"
              className={inputBase}
              value={editingId ? editPlannedAmount : newPlannedAmount}
              onChange={(e) => (editingId ? setEditPlannedAmount(e.target.value) : setNewPlannedAmount(e.target.value))}
              placeholder="np. 3500"
            />
          </div>

          <div>
            <label className="block text-xs text-white/70 mb-1">Kwota faktyczna</label>
            <input
              type="number"
              step="0.01"
              className={inputBase}
              value={editingId ? editActualAmount : newActualAmount}
              onChange={(e) => (editingId ? setEditActualAmount(e.target.value) : setNewActualAmount(e.target.value))}
              placeholder="np. 3200"
            />
          </div>

          <div>
            <label className="block text-xs text-white/70 mb-1">Termin (plan)</label>
            <input
              type="date"
              className={inputBase}
              value={editingId ? editDueDate : newDueDate}
              onChange={(e) => (editingId ? setEditDueDate(e.target.value) : setNewDueDate(e.target.value))}
            />
          </div>

          <div>
            <label className="block text-xs text-white/70 mb-1">Data płatności</label>
            <input
              type="date"
              className={inputBase}
              value={editingId ? editPaidDate : newPaidDate}
              onChange={(e) => (editingId ? setEditPaidDate(e.target.value) : setNewPaidDate(e.target.value))}
            />
          </div>

          <div>
            <label className="block text-xs text-white/70 mb-1">Usługodawca</label>
            <input
              type="text"
              className={inputBase}
              value={editingId ? editVendorName : newVendorName}
              onChange={(e) => (editingId ? setEditVendorName(e.target.value) : setNewVendorName(e.target.value))}
              placeholder="np. Studio XYZ"
            />
          </div>

          <div className="md:row-span-2">
            <label className="block text-xs text-white/70 mb-1">Notatki</label>
            <textarea
              className={inputBase + " min-h-[92px] resize-none"}
              value={editingId ? editNotes : newNotes}
              onChange={(e) => (editingId ? setEditNotes(e.target.value) : setNewNotes(e.target.value))}
              placeholder="Warunki, numer umowy, co obejmuje…"
            />
          </div>

          <div className="md:col-span-3 flex flex-wrap items-center gap-2">
            <button type="submit" disabled={isSavingExpense} className={btnGold}>
              {isSavingExpense ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isSavingExpense ? "Zapisywanie…" : editingId ? "Zapisz zmiany" : "Dodaj wydatek"}
            </button>

            {editingId && (
              <button type="button" onClick={clearEditExpense} className={btnSecondary}>
                <X className="w-4 h-4" />
                Anuluj edycję
              </button>
            )}
          </div>
        </form>
      </section>

      {/* List */}
      <section className={`${cardBase} p-6 md:p-7`}>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#d7b45a]" />
            <h3 className="text-white font-semibold text-lg">Lista wydatków</h3>
          </div>
          <span className={chip}>{filteredAndSortedExpenses.length} pozycji</span>
        </div>

        {filteredAndSortedExpenses.length === 0 ? (
          <div className="text-sm text-white/55">Brak wydatków spełniających kryteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border-collapse">
              <thead>
                <tr className="bg-white/5">
                  <th className="border-b border-white/10 px-3 py-3 text-left font-semibold text-white/70">
                    Nazwa
                  </th>
                  <th className="border-b border-white/10 px-3 py-3 text-left font-semibold text-white/70">
                    Kategoria
                  </th>
                  <th className="border-b border-white/10 px-3 py-3 text-right font-semibold text-white/70">
                    Plan
                  </th>
                  <th className="border-b border-white/10 px-3 py-3 text-right font-semibold text-white/70">
                    Faktycznie
                  </th>
                  <th className="border-b border-white/10 px-3 py-3 text-left font-semibold text-white/70">
                    Usługodawca
                  </th>
                  <th className="border-b border-white/10 px-3 py-3 text-left font-semibold text-white/70">
                    Termin
                  </th>
                  <th className="border-b border-white/10 px-3 py-3 text-left font-semibold text-white/70">
                    Płatność
                  </th>
                  <th className="border-b border-white/10 px-3 py-3 text-left font-semibold text-white/70">
                    Notatki
                  </th>
                  <th className="border-b border-white/10 px-3 py-3 text-right font-semibold text-white/70">
                    Akcje
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredAndSortedExpenses.map((e) => {
                  const catLabel = CATEGORY_OPTIONS.find((c) => c.value === e.category)?.label || e.category;
                  const isPaid = !!e.paid_date;

                  return (
                    <tr key={e.id} className="hover:bg-white/4 transition">
                      <td className="border-b border-white/5 px-3 py-3 text-white/85">
                        <div className="font-semibold text-white">{e.name}</div>
                        {(e.vendor_name || e.due_date) && (
                          <div className="text-xs text-white/45 mt-1">
                            {e.vendor_name ? `• ${e.vendor_name}` : ""}
                            {e.vendor_name && e.due_date ? "  " : ""}
                            {e.due_date ? `• termin: ${e.due_date}` : ""}
                          </div>
                        )}
                      </td>

                      <td className="border-b border-white/5 px-3 py-3 text-white/75">{catLabel}</td>

                      <td className="border-b border-white/5 px-3 py-3 text-right text-white/85">
                        {money(e.planned_amount)} {currency}
                      </td>

                      <td className="border-b border-white/5 px-3 py-3 text-right text-white/85">
                        {money(e.actual_amount)} {currency}
                      </td>

                      <td className="border-b border-white/5 px-3 py-3 text-white/75">{e.vendor_name || "—"}</td>

                      <td className="border-b border-white/5 px-3 py-3 text-white/75">{e.due_date || "—"}</td>

                      <td className="border-b border-white/5 px-3 py-3">
                        {isPaid ? (
                          <span className="inline-flex items-center rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200 border border-emerald-400/20">
                            Opłacone • {e.paid_date}
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-200 border border-amber-400/20">
                            Nieopłacone
                          </span>
                        )}
                      </td>

                      <td className="border-b border-white/5 px-3 py-3 text-white/65 max-w-[320px]">
                        <div className="truncate" title={e.notes || ""}>
                          {e.notes || "—"}
                        </div>
                      </td>

                      <td className="border-b border-white/5 px-3 py-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => startEditExpense(e)}
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
      </section>
    </div>
  );
};

export default Finance;
