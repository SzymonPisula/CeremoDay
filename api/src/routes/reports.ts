// CeremoDay/api/src/routes/reports.ts
import { Router, Response } from "express";
import type { AuthRequest } from "../middleware/auth";
import { authMiddleware } from "../middleware/auth";

import Budget from "../models/Budget";
import Expense from "../models/Expense";

// ⚠️ u Ciebie to są named exports (z komunikatu TS)
import { Guest } from "../models/Guest";
import { Document } from "../models/Document";

// Prawdopodobnie default export (jeśli inaczej – daj mi błąd TS, poprawimy import w 10s)
import Task from "../models/Task";
import Vendor from "../models/Vendor";

type Rsvp = "Potwierdzone" | "Odmowa" | "Nieznane";

type GuestLite = {
  id: string;
  parent_guest_id?: string | null;
  first_name: string;
  last_name: string;
  phone?: string | null;
  email?: string | null;
  side?: string | null;
  relation?: string | null;
  rsvp?: string | null;
  allergens?: string | null;
};

type ExpenseLite = {
  id: string;
  name: string;
  category: string;
  planned_amount: string | number | null;
  actual_amount: string | number | null;
  due_date: string | null;
  paid_date: string | null;
  vendor_name: string | null;
};

const router = Router();

function normalizeRsvp(raw: unknown): Rsvp {
  const v = String(raw ?? "").trim();
  const u = v.toUpperCase();

  // potwierdzone
  if (
    u === "POTWIERDZONE" ||
    u === "CONFIRMED" ||
    u === "CONFIRM" ||
    u === "YES" ||
    u === "TAK"
  ) {
    return "Potwierdzone";
  }

  // odmowa
  if (
    u === "ODMOWA" ||
    u === "DECLINED" ||
    u === "NO" ||
    u === "NIE"
  ) {
    return "Odmowa";
  }

  // nieznane / brak
  if (
    !v ||
    u === "NIEZNANE" ||
    u === "UNKNOWN" ||
    u === "PENDING" ||
    u === "NONE"
  ) {
    return "Nieznane";
  }

  // fallback
  return "Nieznane";
}

function toNumber(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function normalizeAllergens(raw: string): string[] {
  return raw
    .split(/[,;|]/g)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => s.toLowerCase());
}

function isDateString(v: unknown): v is string {
  return typeof v === "string" && v.length >= 8;
}

function daysFromToday(dateStr: string): number {
  const today = new Date();
  const d = new Date(dateStr);
  // "na dzień" (DATEONLY), bez godzin
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const d0 = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.round((d0 - t0) / (1000 * 60 * 60 * 24));
}

// GET /reports/:eventId/summary
router.get(
  "/:eventId/summary",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { eventId } = req.params;

      const [budget, expenses, guests, tasks, documents, vendors] =
        await Promise.all([
          Budget.findOne({ where: { event_id: eventId } }),
          Expense.findAll({ where: { event_id: eventId } }),
          Guest.findAll({ where: { event_id: eventId } }),
          Task.findAll({ where: { event_id: eventId } }),
          Document.findAll({ where: { event_id: eventId } }),
          Vendor.findAll({ where: { event_id: eventId } }),
        ]);

      // -------------------------
      // GOŚCIE
      // -------------------------
      const guestsLite: GuestLite[] = guests.map((g) => ({
        id: String((g as unknown as { id: string }).id),
        parent_guest_id: (g as unknown as { parent_guest_id?: string | null }).parent_guest_id ?? null,
        first_name: String((g as unknown as { first_name: string }).first_name ?? ""),
        last_name: String((g as unknown as { last_name: string }).last_name ?? ""),
        phone: (g as unknown as { phone?: string | null }).phone ?? null,
        email: (g as unknown as { email?: string | null }).email ?? null,
        side: (g as unknown as { side?: string | null }).side ?? null,
        relation: (g as unknown as { relation?: string | null }).relation ?? null,
        rsvp: (g as unknown as { rsvp?: string | null }).rsvp ?? null,
        allergens: (g as unknown as { allergens?: string | null }).allergens ?? null,
      }));

      const totalGuests = guestsLite.length;
      const mainGuests = guestsLite.filter((g) => !g.parent_guest_id).length;
      const subGuests = totalGuests - mainGuests;

      const rsvpCounts: Record<Rsvp, number> = {
        Potwierdzone: 0,
        Odmowa: 0,
        Nieznane: 0,
      };

      const sideCounts: Record<string, number> = {};
      const relationCounts: Record<string, number> = {};

      let guestsWithAllergensCount = 0;
      const allergenCounts: Record<string, number> = {};

      const toAskList: GuestLite[] = [];

      for (const g of guestsLite) {
        const rsvp = normalizeRsvp(g.rsvp);
        if (rsvpCounts[rsvp] == null) rsvpCounts.Nieznane += 1;
        else rsvpCounts[rsvp] += 1;

        if (rsvp === "Nieznane") {
          toAskList.push(g);
        }

        if (g.side) sideCounts[g.side] = (sideCounts[g.side] ?? 0) + 1;
        if (g.relation) relationCounts[g.relation] = (relationCounts[g.relation] ?? 0) + 1;

        if (g.allergens && g.allergens.trim().length > 0) {
          guestsWithAllergensCount += 1;
          const tags = normalizeAllergens(g.allergens);
          for (const a of tags) {
            allergenCounts[a] = (allergenCounts[a] ?? 0) + 1;
          }
        }
      }

      const allergenTop = Object.entries(allergenCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, count]) => ({ name, count }));

      // -------------------------
      // FINANSE
      // -------------------------
      const expensesLite: ExpenseLite[] = expenses.map((e) => ({
        id: String((e as unknown as { id: string }).id),
        name: String((e as unknown as { name: string }).name ?? ""),
        category: String((e as unknown as { category: string }).category ?? "OTHER"),
        planned_amount: (e as unknown as { planned_amount: string | number | null }).planned_amount ?? null,
        actual_amount: (e as unknown as { actual_amount: string | number | null }).actual_amount ?? null,
        due_date: (e as unknown as { due_date: string | null }).due_date ?? null,
        paid_date: (e as unknown as { paid_date: string | null }).paid_date ?? null,
        vendor_name: (e as unknown as { vendor_name: string | null }).vendor_name ?? null,
      }));

      const totals = expensesLite.reduce(
        (acc, e) => {
          acc.planned += toNumber(e.planned_amount);
          acc.actual += toNumber(e.actual_amount);
          return acc;
        },
        { planned: 0, actual: 0 }
      );

      const byCategory: Record<string, { planned: number; actual: number }> = {};
      for (const e of expensesLite) {
        const cat = e.category || "OTHER";
        if (!byCategory[cat]) byCategory[cat] = { planned: 0, actual: 0 };
        byCategory[cat].planned += toNumber(e.planned_amount);
        byCategory[cat].actual += toNumber(e.actual_amount);
      }

      const top10Costs = [...expensesLite]
        .sort((a, b) => (toNumber(b.actual_amount) || toNumber(b.planned_amount)) - (toNumber(a.actual_amount) || toNumber(a.planned_amount)))
        .slice(0, 10)
        .map((e) => ({
          id: e.id,
          name: e.name,
          category: e.category,
          planned: toNumber(e.planned_amount),
          actual: toNumber(e.actual_amount),
          due_date: e.due_date,
          paid_date: e.paid_date,
        }));

      const unpaid = expensesLite.filter((e) => !e.paid_date);
      const unpaidToPaySum = unpaid.reduce((acc, e) => acc + (toNumber(e.planned_amount) || toNumber(e.actual_amount)), 0);

      const unpaidDueSoon14 = unpaid
        .filter((e) => isDateString(e.due_date))
        .map((e) => ({ ...e, days: daysFromToday(e.due_date as string) }))
        .filter((e) => e.days >= 0 && e.days <= 14)
        .sort((a, b) => a.days - b.days)
        .map((e) => ({
          id: e.id,
          name: e.name,
          category: e.category,
          due_date: e.due_date,
          planned: toNumber(e.planned_amount),
          actual: toNumber(e.actual_amount),
          vendor_name: e.vendor_name,
          days: e.days,
        }));

      const alerts: string[] = [];

      for (const [cat, v] of Object.entries(byCategory)) {
        if (v.planned > 0 && v.actual > v.planned) {
          alerts.push(`Przekroczono plan w kategorii ${cat}: ${v.actual.toFixed(2)} > ${v.planned.toFixed(2)}`);
        }
      }

      const unpaidDueSoon7 = unpaid
        .filter((e) => isDateString(e.due_date))
        .map((e) => ({ ...e, days: daysFromToday(e.due_date as string) }))
        .filter((e) => e.days >= 0 && e.days <= 7);

      if (unpaidDueSoon7.length > 0) {
        alerts.push(`Zbliża się termin płatności (${unpaidDueSoon7.length}) i brak paid_date`);
      }

      // prosty cashflow: suma planowanych wg due_date (DATEONLY)
      const cashflowByDueDate: Record<string, number> = {};
      for (const e of expensesLite) {
        if (!e.due_date) continue;
        const k = e.due_date;
        cashflowByDueDate[k] = (cashflowByDueDate[k] ?? 0) + (toNumber(e.planned_amount) || 0);
      }
      const cashflow = Object.entries(cashflowByDueDate)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(0, 60)
        .map(([date, plannedSum]) => ({ date, plannedSum }));

      // -------------------------
      // ZADANIA
      // -------------------------
      const tasksLite = tasks.map((t) => ({
        id: String((t as unknown as { id: string }).id),
        title: String((t as unknown as { title?: string }).title ?? (t as unknown as { name?: string }).name ?? ""),
        status: (t as unknown as { status?: string | null }).status ?? null,
        is_done: Boolean((t as unknown as { is_done?: boolean }).is_done ?? false),
        due_date: (t as unknown as { due_date?: string | null }).due_date ?? null,
      }));

      const doneCount = tasksLite.filter((t) => (t.status ?? "").toLowerCase() === "done").length;
      const openCount = tasksLite.length - doneCount;

      const overdueTasks = tasksLite
        .filter((t) => (t.status ?? "").toLowerCase() !== "done" && isDateString(t.due_date) && daysFromToday(t.due_date) < 0)
        .sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""))
        .slice(0, 20);

      const next7Tasks = tasksLite
        .filter((t) => (t.status ?? "").toLowerCase() !== "done" && isDateString(t.due_date))
        .map((t) => ({ ...t, days: daysFromToday(t.due_date as string) }))
        .filter((t) => t.days >= 0 && t.days <= 7)
        .sort((a, b) => a.days - b.days)
        .slice(0, 30);

      // -------------------------
      // DOKUMENTY
      // -------------------------
      const docsLite = documents.map((d) => ({
        id: String((d as unknown as { id: string }).id),
        title: String((d as unknown as { title?: string }).title ?? (d as unknown as { name?: string }).name ?? ""),
        status: (d as unknown as { status?: string | null }).status ?? null,
        is_done: Boolean((d as unknown as { is_done?: boolean }).is_done ?? false),
      }));

      const docsDone = docsLite.filter((d) => (d.status ?? "").toLowerCase() === "done").length;
      const docsPending = docsLite.length - docsDone;

      // -------------------------
      // USŁUGODAWCY
      // -------------------------
      const vendorsLite = vendors.map((v) => ({
        id: String((v as unknown as { id: string }).id),
        name: String((v as unknown as { name?: string }).name ?? ""),
        type: String((v as unknown as { type?: string | null }).type ?? "other"),
        source: String((v as unknown as { source?: string | null }).source ?? "CUSTOM"),
        address: String((v as unknown as { address?: string | null }).address ?? ""),
        phone: (v as unknown as { phone?: string | null }).phone ?? null,
        email: (v as unknown as { email?: string | null }).email ?? null,
        website: (v as unknown as { website?: string | null }).website ?? null,
      }));

      const vendorsByType: Record<string, number> = {};
      const vendorsBySource: Record<string, number> = {};
      for (const v of vendorsLite) {
        const t = v.type || "other";
        const s = v.source || "CUSTOM";
        vendorsByType[t] = (vendorsByType[t] ?? 0) + 1;
        vendorsBySource[s] = (vendorsBySource[s] ?? 0) + 1;
      }

      const vendorsMissingContact = vendorsLite
        .filter((v) => !v.phone || !v.email || !v.website || !v.address)
        .map((v) => ({
          id: v.id,
          name: v.name,
          missing: [
            !v.phone ? "phone" : null,
            !v.email ? "email" : null,
            !v.website ? "website" : null,
            !v.address ? "address" : null,
          ].filter((x): x is string => x != null),
        }))
        .slice(0, 50);

      return res.json({
        generatedAt: new Date().toISOString(),
        guests: {
          total: totalGuests,
          main: mainGuests,
          sub: subGuests,
          rsvpCounts,
          rsvpPercent: {
            Potwierdzone: totalGuests ? (rsvpCounts.Potwierdzone / totalGuests) * 100 : 0,
            Odmowa: totalGuests ? (rsvpCounts.Odmowa / totalGuests) * 100 : 0,
            Nieznane: totalGuests ? (rsvpCounts.Nieznane / totalGuests) * 100 : 0,
          },
          sideCounts,
          relationCounts,
          allergens: {
            guestsWithAllergensCount,
            top: allergenTop,
          },
          toAsk: toAskList.slice(0, 50),
        },
        finance: {
          budget: budget ?? null,
          totals,
          byCategory,
          top10Costs,
          unpaid: {
            toPaySum: unpaidToPaySum,
            dueSoon14: unpaidDueSoon14,
          },
          cashflow,
          alerts,
        },
        tasks: {
          total: tasksLite.length,
          done: doneCount,
          open: openCount,
          overdue: overdueTasks,
          next7: next7Tasks,
        },
        documents: {
          total: docsLite.length,
          done: docsDone,
          pending: docsPending,
        },
        vendors: {
          total: vendorsLite.length,
          byType: vendorsByType,
          bySource: vendorsBySource,
          missingContact: vendorsMissingContact,
        },
      });
    } catch (err) {
      console.error("Error getting reports summary", err);
      return res.status(500).json({ message: "Błąd generowania raportu" });
    }
  }
);

export default router;
