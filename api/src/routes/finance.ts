// CeremoDay/api/src/routes/finance.ts
import { Router, Response } from "express";
import type { AuthRequest } from "../middleware/auth";
import { authMiddleware } from "../middleware/auth";
import Budget from "../models/Budget";
import Expense from "../models/Expense";
import * as XLSX from "xlsx";

const router = Router();

// Backendowy union (spójny z DB)
export type ExpenseCategory =
  | "HALL"
  | "CATERING"
  | "MUSIC"
  | "OUTFITS"
  | "TRANSPORT"
  | "DECOR"
  | "PHOTO_VIDEO"
  | "OTHER";

/**
 * Sequelize DECIMAL potrafi wrócić jako string.
 * Normalizujemy wszystko do JSON-friendly wartości.
 */
function normalizeExpense(row: any) {
  const e = typeof row?.toJSON === "function" ? row.toJSON() : row;

  return {
    ...e,
    planned_amount:
      e.planned_amount === null || e.planned_amount === undefined
        ? null
        : Number(e.planned_amount),
    actual_amount:
      e.actual_amount === null || e.actual_amount === undefined
        ? null
        : Number(e.actual_amount),
    // DATEONLY zwykle już jest stringiem "YYYY-MM-DD" – zostawiamy jak jest
    due_date: e.due_date ?? null,
    paid_date: e.paid_date ?? null,
  };
}

function normalizeBudget(row: any) {
  if (!row) return null;
  const b = typeof row?.toJSON === "function" ? row.toJSON() : row;

  return {
    ...b,
    initial_budget:
      b.initial_budget === null || b.initial_budget === undefined
        ? null
        : Number(b.initial_budget),
  };
}

// --------- BUDŻET ----------

// GET /finance/:eventId/budget
router.get(
  "/:eventId/budget",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { eventId } = req.params;

      const budget = await Budget.findOne({
        where: { event_id: eventId },
      });

      return res.json(normalizeBudget(budget));
    } catch (err) {
      console.error("Error getting budget", err);
      return res.status(500).json({ message: "Błąd pobierania budżetu" });
    }
  }
);

// POST /finance/:eventId/budget
router.post(
  "/:eventId/budget",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { eventId } = req.params;

      const {
        initial_budget,
        currency,
        notes,
      }: {
        initial_budget: number | null;
        currency: string;
        notes: string | null;
      } = req.body;

      let budget = await Budget.findOne({ where: { event_id: eventId } });

      if (!budget) {
        budget = await Budget.create({
          event_id: eventId,
          initial_budget,
          currency,
          notes,
        });
      } else {
        (budget as any).initial_budget = initial_budget;
        (budget as any).currency = currency;
        (budget as any).notes = notes;
        await budget.save();
      }

      return res.json(normalizeBudget(budget));
    } catch (err) {
      console.error("Error saving budget", err);
      return res.status(500).json({ message: "Błąd zapisu budżetu" });
    }
  }
);
// GET /finance/:eventId/expenses/export-xlsx
router.get(
  "/:eventId/expenses/export-xlsx",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { eventId } = req.params;

      const expenses = await Expense.findAll({
        where: { event_id: eventId },
        order: [["created_at", "ASC"]],
      });

      const rows = expenses.map((e) => ({
        id: e.id,
        name: e.name,
        category: e.category,
        planned_amount: e.planned_amount != null ? Number(e.planned_amount) : null,
        actual_amount: e.actual_amount != null ? Number(e.actual_amount) : null,
        due_date: e.due_date ? String(e.due_date) : null,
        paid_date: e.paid_date ? String(e.paid_date) : null,
        vendor_name: e.vendor_name,
        notes: e.notes,
        created_at: e.created_at ? String(e.created_at) : null,
        updated_at: e.updated_at ? String(e.updated_at) : null,
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Wydatki");

      const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="wydatki_${eventId}.xlsx"`
      );

      return res.status(200).send(buffer);
    } catch (err) {
      console.error("Error exporting expenses xlsx", err);
      return res.status(500).json({ message: "Błąd eksportu XLSX" });
    }
  }
);

// --------- WYDATKI ----------

// GET /finance/:eventId/expenses
router.get(
  "/:eventId/expenses",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { eventId } = req.params;

      const expenses = await Expense.findAll({
        where: { event_id: eventId },
        order: [["created_at", "ASC"]],
      });

      return res.json(expenses.map(normalizeExpense));
    } catch (err) {
      console.error("Error getting expenses", err);
      return res.status(500).json({ message: "Błąd pobierania wydatków" });
    }
  }
);

// POST /finance/:eventId/expenses
router.post(
  "/:eventId/expenses",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { eventId } = req.params;

      const body = req.body as {
        name: string;
        category: ExpenseCategory;
        planned_amount: number | null;
        actual_amount: number | null;
        due_date: string | null;
        paid_date: string | null;
        vendor_name: string | null;
        notes: string | null;
      };

      const expense = await Expense.create({
        event_id: eventId,
        name: body.name,
        category: body.category ?? "OTHER",
        planned_amount: body.planned_amount,
        actual_amount: body.actual_amount,
        due_date: body.due_date ? new Date(body.due_date) : null,
        paid_date: body.paid_date ? new Date(body.paid_date) : null,
        vendor_name: body.vendor_name,
        notes: body.notes,
      });

      return res.status(201).json(normalizeExpense(expense));
    } catch (err) {
      console.error("Error creating expense", err);
      return res.status(500).json({ message: "Błąd dodawania wydatku" });
    }
  }
);

// ✅ PUT /finance/:eventId/expenses/:expenseId  (TO BRAKOWAŁO – edycja)
router.put(
  "/:eventId/expenses/:expenseId",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { eventId, expenseId } = req.params;

      const body = req.body as Partial<{
        name: string;
        category: ExpenseCategory;
        planned_amount: number | null;
        actual_amount: number | null;
        due_date: string | null;
        paid_date: string | null;
        vendor_name: string | null;
        notes: string | null;
      }>;

      const expense = await Expense.findOne({
        where: { id: expenseId, event_id: eventId },
      });

      if (!expense) {
        return res.status(404).json({ message: "Wydatek nie znaleziony" });
      }

      if (body.name !== undefined) (expense as any).name = body.name;
      if (body.category !== undefined)
        (expense as any).category = body.category ?? "OTHER";

      if (body.planned_amount !== undefined)
        (expense as any).planned_amount = body.planned_amount;
      if (body.actual_amount !== undefined)
        (expense as any).actual_amount = body.actual_amount;

      if (body.due_date !== undefined)
        (expense as any).due_date = body.due_date ? new Date(body.due_date) : null;
      if (body.paid_date !== undefined)
        (expense as any).paid_date = body.paid_date ? new Date(body.paid_date) : null;

      if (body.vendor_name !== undefined)
        (expense as any).vendor_name = body.vendor_name;
      if (body.notes !== undefined) (expense as any).notes = body.notes;

      await expense.save();

      return res.json(normalizeExpense(expense));
    } catch (err) {
      console.error("Error updating expense", err);
      return res.status(500).json({ message: "Błąd edycji wydatku" });
    }
  }
);

// ✅ DELETE /finance/:eventId/expenses/:expenseId  (spójne z frontendem)
router.delete(
  "/:eventId/expenses/:expenseId",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { eventId, expenseId } = req.params;

      const deleted = await Expense.destroy({
        where: { id: expenseId, event_id: eventId },
      });

      if (!deleted) {
        return res.status(404).json({ message: "Wydatek nie znaleziony" });
      }

      return res.status(204).send();
    } catch (err) {
      console.error("Error deleting expense", err);
      return res.status(500).json({ message: "Błąd usuwania wydatku" });
    }
  }
);

// (zostawiamy kompatybilność ze starym endpointem)
router.delete(
  "/expenses/:id",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const deleted = await Expense.destroy({ where: { id } });

      if (!deleted) {
        return res.status(404).json({ message: "Wydatek nie znaleziony" });
      }

      return res.status(204).send();
    } catch (err) {
      console.error("Error deleting expense", err);
      return res.status(500).json({ message: "Błąd usuwania wydatku" });
    }
  }
);

// --------- PODSUMOWANIE ----------

// GET /finance/:eventId/summary
router.get(
  "/:eventId/summary",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { eventId } = req.params;

      const [budgetRow, expenseRows] = await Promise.all([
        Budget.findOne({ where: { event_id: eventId } }),
        Expense.findAll({ where: { event_id: eventId } }),
      ]);

      const budget = normalizeBudget(budgetRow);
      const expenses = expenseRows.map(normalizeExpense);

      const totals = expenses.reduce(
        (acc: { planned: number; actual: number }, e: any) => {
          acc.planned += e.planned_amount ? Number(e.planned_amount) : 0;
          acc.actual += e.actual_amount ? Number(e.actual_amount) : 0;
          return acc;
        },
        { planned: 0, actual: 0 }
      );

      const byCategory: Record<
        ExpenseCategory,
        { planned: number; actual: number }
      > = {
        HALL: { planned: 0, actual: 0 },
        CATERING: { planned: 0, actual: 0 },
        MUSIC: { planned: 0, actual: 0 },
        OUTFITS: { planned: 0, actual: 0 },
        TRANSPORT: { planned: 0, actual: 0 },
        DECOR: { planned: 0, actual: 0 },
        PHOTO_VIDEO: { planned: 0, actual: 0 },
        OTHER: { planned: 0, actual: 0 },
      };

      for (const e of expenses) {
        const cat = (e.category as ExpenseCategory) ?? "OTHER";
        const planned = e.planned_amount ? Number(e.planned_amount) : 0;
        const actual = e.actual_amount ? Number(e.actual_amount) : 0;

        if (!(cat in byCategory)) {
          (byCategory as any)[cat] = { planned: 0, actual: 0 };
        }

        byCategory[cat].planned += planned;
        byCategory[cat].actual += actual;
      }

      const total_planned = totals.planned;
      const total_actual = totals.actual;
      const diff_planned_actual = total_planned - total_actual;

      const currency = budget?.currency ?? "PLN";
      const remaining_budget =
        budget?.initial_budget != null ? budget.initial_budget - total_actual : null;

      // ✅ zwracamy “stary” format + “nowy” format (dla frontu)
      return res.json({
        budget,
        totals,
        byCategory,

        // front-friendly
        currency,
        total_planned,
        total_actual,
        diff_planned_actual,
        remaining_budget,
      });
    } catch (err) {
      console.error("Error getting finance summary", err);
      return res.status(500).json({ message: "Błąd podsumowania finansowego" });
    }
  }
);

export default router;
