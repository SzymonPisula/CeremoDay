// CeremoDay/web/src/types/reports.ts
export type Rsvp = "Potwierdzone" | "Odmowa" | "Nieznane";

export type ReportsSummary = {
  generatedAt: string;

  guests: {
    total: number;
    main: number;
    sub: number;
    rsvpCounts: Record<Rsvp, number>;
    rsvpPercent: Record<Rsvp, number>;
    sideCounts: Record<string, number>;
    relationCounts: Record<string, number>;
    allergens: {
      guestsWithAllergensCount: number;
      top: Array<{ name: string; count: number }>;
    };
    toAsk: Array<{
      id: string;
      first_name: string;
      last_name: string;
      phone?: string | null;
      email?: string | null;
      side?: string | null;
      relation?: string | null;
      rsvp?: string | null;
      allergens?: string | null;
    }>;
  };

  finance: {
    budget: {
      id: string;
      event_id: string;
      initial_budget: number | string | null;
      currency: string;
      notes: string | null;
    } | null;

    totals: { planned: number; actual: number };
    byCategory: Record<string, { planned: number; actual: number }>;
    top10Costs: Array<{
      id: string;
      name: string;
      category: string;
      planned: number;
      actual: number;
      due_date: string | null;
      paid_date: string | null;
    }>;

    unpaid: {
      toPaySum: number;
      dueSoon14: Array<{
        id: string;
        name: string;
        category: string;
        due_date: string | null;
        planned: number;
        actual: number;
        vendor_name: string | null;
        days: number;
      }>;
    };

    cashflow: Array<{ date: string; plannedSum: number }>;
    alerts: string[];
  };

  tasks: {
    total: number;
    done: number;
    open: number;
    overdue: Array<{ id: string; title: string; due_date: string | null }>;
    next7: Array<{ id: string; title: string; due_date: string | null; days: number }>;
  };

  documents: {
    total: number;
    done: number;
    pending: number;
  };

    vendors: {
    total: number;
    byType: Record<string, number>;
    bySource: Record<string, number>;
    missingContact: Array<{ id: string; name: string; missing: string[] }>;
  };
};

export type ReportSectionKey = "summary" | "guests" | "finance" | "tasks" | "docsVendors";

export type ReportExportPdfBody = {
  sections?: ReportSectionKey[];
  includeCharts?: boolean;
  includeAlerts?: boolean;
  includeLongLists?: boolean;
  listLimit?: 10 | 20 | 50;
};

