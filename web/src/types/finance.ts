// web/src/types/finance.ts

export type ExpenseCategory =
  | "HALL"
  | "CATERING"
  | "MUSIC"
  | "OUTFITS"
  | "TRANSPORT"
  | "DECOR"
  | "PHOTO_VIDEO"
  | "OTHER";

export interface Budget {
  id: string;
  event_id: string;
  initial_budget: number | null;
  currency: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface BudgetPayload {
  initial_budget: number | null;
  currency: string;
  notes: string | null;
}

export interface Expense {
  id: string;
  event_id: string;

  name: string;
  category: ExpenseCategory;

  // WAŻNE: traktujemy jako number | null po naszej stronie,
  // backend i tak zwraca string z DECIMAL, ale my to zamienimy.
  planned_amount: number | null;
  actual_amount: number | null;

  due_date: string | null;
  paid_date: string | null;

  vendor_name: string | null;
  notes: string | null;

  created_at: string;
  updated_at: string;
}

export interface ExpenseCreatePayload {
  name: string;
  category: ExpenseCategory;
  planned_amount: number | null;
  actual_amount: number | null;
  due_date: string | null;
  paid_date: string | null;
  vendor_name: string | null;
  notes: string | null;
}

export type ExpenseUpdatePayload = ExpenseCreatePayload;

export interface FinanceSummary {
  total_planned: number;
  total_actual: number;
  diff_planned_actual: number;
  remaining_budget: number | null;
  currency: string;
  // Jeśli będziesz chciał używać breakdownu per kategoria:
  byCategory?: Record<
    ExpenseCategory,
    { planned: number; actual: number }
  >;
}
