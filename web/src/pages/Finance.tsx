// CeremoDay/web/src/pages/Finance.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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

  const [sortField, setSortField] = useState<
    "name" | "planned_amount" | "actual_amount" | "due_date" | "paid_date" | "category"
  >("due_date");
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
        setBudgetInitial(
          budgetRes.initial_budget != null ? String(budgetRes.initial_budget) : ""
        );
        setBudgetCurrency(budgetRes.currency || "PLN");
        setBudgetNotes(budgetRes.notes ?? "");
      } else {
        setBudgetInitial("");
        setBudgetCurrency("PLN");
        setBudgetNotes("");
      }
    } catch (err) {
      console.error(err);
      const msg =
        err instanceof Error ? err.message : "Nie udało się załadować danych finansowych.";
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

    result.sort((a, b) => {
      const dir = sortDirection === "asc" ? 1 : -1;

      const getNum = (x: number | string | null) => toNumberOrNull(x) ?? 0;
      const getDate = (d: string | null) => (d ? Date.parse(d) : 0);

      let av: string | number = 0;
      let bv: string | number = 0;

      switch (sortField) {
        case "name":
        case "category":
          av = String(a[sortField] ?? "").toLowerCase();
          bv = String(b[sortField] ?? "").toLowerCase();
          break;
        case "planned_amount":
        case "actual_amount":
          av = getNum(a[sortField]);
          bv = getNum(b[sortField]);
          break;
        case "due_date":
        case "paid_date":
          av = getDate(a[sortField]);
          bv = getDate(b[sortField]);
          break;
      }

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
        initial_budget:
          budgetInitial.trim() === "" ? null : Number(budgetInitial.replace(",", ".")),
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
    return <div className="p-4 text-red-600">Brak identyfikatora wydarzenia w adresie URL.</div>;
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-semibold mb-2">Finanse</h1>

      {error && (
        <div className="rounded border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading && <div className="text-sm text-gray-500">Ładowanie danych...</div>}

      {/* BUDŻET */}
      <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold mb-3">Budżet wydarzenia</h2>

        <form onSubmit={handleSaveBudget} className="grid gap-3 md:grid-cols-3 items-end">
          <div>
            <label className="block text-sm font-medium mb-1">Budżet początkowy</label>
            <input
              type="number"
              step="0.01"
              className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
              value={budgetInitial}
              onChange={(e) => setBudgetInitial(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Waluta</label>
            <select
              className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
              value={budgetCurrency}
              onChange={(e) => setBudgetCurrency(e.target.value)}
            >
              <option value="PLN">PLN</option>
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
            </select>
          </div>

          <div className="md:row-span-2">
            <label className="block text-sm font-medium mb-1">Notatki</label>
            <textarea
              className="w-full rounded border border-gray-300 px-2 py-1 text-sm h-[70px]"
              value={budgetNotes}
              onChange={(e) => setBudgetNotes(e.target.value)}
            />
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={isSavingBudget}
              className="inline-flex items-center rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {isSavingBudget ? "Zapisywanie..." : "Zapisz budżet"}
            </button>
          </div>
        </form>

        {summary && (
          <div className="mt-4 grid gap-3 md:grid-cols-4 text-sm">
            <div className="rounded border border-gray-200 bg-gray-50 p-2">
              <div className="text-gray-500">Suma planowana</div>
              <div className="font-semibold">
                {summary.total_planned.toFixed(2)} {summary.currency}
              </div>
            </div>

            <div className="rounded border border-gray-200 bg-gray-50 p-2">
              <div className="text-gray-500">Suma faktyczna</div>
              <div className="font-semibold">
                {summary.total_actual.toFixed(2)} {summary.currency}
              </div>
            </div>

            <div className="rounded border border-gray-200 bg-gray-50 p-2">
              <div className="text-gray-500">Różnica (plan - faktycznie)</div>
              <div className="font-semibold">
                {summary.diff_planned_actual.toFixed(2)} {summary.currency}
              </div>
            </div>

            <div className="rounded border border-gray-200 bg-gray-50 p-2">
              <div className="text-gray-500">Pozostały budżet</div>
              <div className="font-semibold">
                {summary.remaining_budget != null
                  ? `${summary.remaining_budget.toFixed(2)} ${summary.currency}`
                  : "—"}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* FILTRY + EKSPORT */}
      <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-end gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Szukaj (nazwa, usługodawca, notatki)</label>
            <input
              type="text"
              className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Kategoria</label>
            <select
              className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
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
            <label className="block text-sm font-medium mb-1">Status płatności</label>
            <select
              className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
              value={filterPaidStatus}
              onChange={(e) => setFilterPaidStatus(e.target.value as "all" | "paid" | "unpaid")}
            >
              <option value="all">Wszystkie</option>
              <option value="paid">Opłacone</option>
              <option value="unpaid">Nieopłacone</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Sortuj według</label>
            <select
              className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
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
            <label className="block text-sm font-medium mb-1">Kierunek</label>
            <select
              className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
              value={sortDirection}
              onChange={(e) => setSortDirection(e.target.value as "asc" | "desc")}
            >
              <option value="asc">Rosnąco</option>
              <option value="desc">Malejąco</option>
            </select>
          </div>

          <div className="md:ml-auto">
            <button
              type="button"
              onClick={handleExportXlsx}
              disabled={isExporting}
              className="mt-4 md:mt-0 inline-flex items-center rounded border border-emerald-600 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
            >
              {isExporting ? "Eksport..." : "Eksportuj XLSX"}
            </button>
          </div>
        </div>
      </section>

      {/* FORMULARZ WYDATKÓW */}
      <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold mb-3">{editingId ? "Edytuj wydatek" : "Dodaj wydatek"}</h2>

        <form onSubmit={handleSaveExpense} className="grid gap-3 md:grid-cols-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nazwa *</label>
            <input
              type="text"
              required
              className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
              value={editingId ? editName : newName}
              onChange={(e) => (editingId ? setEditName(e.target.value) : setNewName(e.target.value))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Kategoria *</label>
            <select
              required
              className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
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
            <label className="block text-sm font-medium mb-1">Kwota planowana</label>
            <input
              type="number"
              step="0.01"
              className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
              value={editingId ? editPlannedAmount : newPlannedAmount}
              onChange={(e) => (editingId ? setEditPlannedAmount(e.target.value) : setNewPlannedAmount(e.target.value))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Kwota faktyczna</label>
            <input
              type="number"
              step="0.01"
              className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
              value={editingId ? editActualAmount : newActualAmount}
              onChange={(e) => (editingId ? setEditActualAmount(e.target.value) : setNewActualAmount(e.target.value))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Termin (plan)</label>
            <input
              type="date"
              className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
              value={editingId ? editDueDate : newDueDate}
              onChange={(e) => (editingId ? setEditDueDate(e.target.value) : setNewDueDate(e.target.value))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Data płatności</label>
            <input
              type="date"
              className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
              value={editingId ? editPaidDate : newPaidDate}
              onChange={(e) => (editingId ? setEditPaidDate(e.target.value) : setNewPaidDate(e.target.value))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Usługodawca</label>
            <input
              type="text"
              className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
              value={editingId ? editVendorName : newVendorName}
              onChange={(e) => (editingId ? setEditVendorName(e.target.value) : setNewVendorName(e.target.value))}
            />
          </div>

          <div className="md:row-span-2">
            <label className="block text-sm font-medium mb-1">Notatki</label>
            <textarea
              className="w-full rounded border border-gray-300 px-2 py-1 text-sm h-[70px]"
              value={editingId ? editNotes : newNotes}
              onChange={(e) => (editingId ? setEditNotes(e.target.value) : setNewNotes(e.target.value))}
            />
          </div>

          <div className="md:col-span-3 flex items-center gap-2">
            <button
              type="submit"
              disabled={isSavingExpense}
              className="inline-flex items-center rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {isSavingExpense ? "Zapisywanie..." : editingId ? "Zapisz zmiany" : "Dodaj wydatek"}
            </button>

            {editingId && (
              <button
                type="button"
                onClick={clearEditExpense}
                className="inline-flex items-center rounded border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Anuluj edycję
              </button>
            )}
          </div>
        </form>
      </section>

      {/* LISTA WYDATKÓW */}
      <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold mb-3">Lista wydatków</h2>

        {filteredAndSortedExpenses.length === 0 ? (
          <div className="text-sm text-gray-500">Brak wydatków spełniających kryteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border-b border-gray-200 px-2 py-1 text-left">Nazwa</th>
                  <th className="border-b border-gray-200 px-2 py-1 text-left">Kategoria</th>
                  <th className="border-b border-gray-200 px-2 py-1 text-right">Plan</th>
                  <th className="border-b border-gray-200 px-2 py-1 text-right">Faktycznie</th>
                  <th className="border-b border-gray-200 px-2 py-1 text-left">Usługodawca</th>
                  <th className="border-b border-gray-200 px-2 py-1 text-left">Termin</th>
                  <th className="border-b border-gray-200 px-2 py-1 text-left">Płatność</th>
                  <th className="border-b border-gray-200 px-2 py-1 text-left">Notatki</th>
                  <th className="border-b border-gray-200 px-2 py-1 text-right">Akcje</th>
                </tr>
              </thead>

              <tbody>
                {filteredAndSortedExpenses.map((e) => {
                  const catLabel =
                    CATEGORY_OPTIONS.find((c) => c.value === e.category)?.label || e.category;

                  return (
                    <tr key={e.id} className="hover:bg-gray-50">
                      <td className="border-b border-gray-100 px-2 py-1">{e.name}</td>
                      <td className="border-b border-gray-100 px-2 py-1">{catLabel}</td>
                      <td className="border-b border-gray-100 px-2 py-1 text-right">
                        {money(e.planned_amount)}
                      </td>
                      <td className="border-b border-gray-100 px-2 py-1 text-right">
                        {money(e.actual_amount)}
                      </td>
                      <td className="border-b border-gray-100 px-2 py-1">{e.vendor_name || "—"}</td>
                      <td className="border-b border-gray-100 px-2 py-1">{e.due_date || "—"}</td>
                      <td className="border-b border-gray-100 px-2 py-1">
                        {e.paid_date ? (
                          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                            {e.paid_date}
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                            Nieopłacony
                          </span>
                        )}
                      </td>
                      <td className="border-b border-gray-100 px-2 py-1 max-w-xs truncate">
                        {e.notes || "—"}
                      </td>
                      <td className="border-b border-gray-100 px-2 py-1 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => startEditExpense(e)}
                          className="text-xs text-emerald-700 hover:underline"
                        >
                          Edytuj
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteExpense(e.id)}
                          className="text-xs text-red-600 hover:underline"
                        >
                          Usuń
                        </button>
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
