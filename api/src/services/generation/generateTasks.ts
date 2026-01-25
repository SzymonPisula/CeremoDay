import { Op } from "sequelize";
import { Task } from "../../models/Task";
import EventInterview from "../../models/EventInterview";
import { PL_RULES, daysBetween } from "./rulesPL";
import { TASK_LIBRARY, type InterviewCeremonyType, type TaskTemplate } from "./taskLibrary";

function parseWeddingDate(v: any): Date | null {
  if (!v) return null;
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v;

  const s = String(v);
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function makeDueDate(weddingDate: Date, tpl: TaskTemplate, ceremonyType: InterviewCeremonyType): Date {
  const due = new Date(weddingDate);
  due.setDate(due.getDate() + tpl.offsetDays);

  // Formalności w oknie 6m…1m (operacyjne zabezpieczenie)
  if (tpl.module === "formalities" && ceremonyType !== "RECEPTION_ONLY") {
    const earliest = new Date(weddingDate);
    earliest.setDate(earliest.getDate() - PL_RULES.USC_EARLIEST_DAYS);

    const latest = new Date(weddingDate);
    latest.setDate(latest.getDate() - PL_RULES.USC_LATEST_DAYS);

    if (due < earliest) return earliest;
    if (due > latest) return latest;
  }

  return due;
}

// prościutki limiter tygodniowy (wersja 1)
function enforceWeeklyLimit(items: Array<{ due_date: Date }>) {
  const buckets = new Map<string, number>();

  for (const it of items) {
    const d = new Date(it.due_date);
    const day = d.getDay();         // 0..6
    const diffToMon = (day + 6) % 7; // cofnij do poniedziałku
    d.setDate(d.getDate() - diffToMon);

    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const c = (buckets.get(key) ?? 0) + 1;
    buckets.set(key, c);

    if (c > PL_RULES.MAX_TASKS_PER_WEEK) {
      // przesuwamy o tydzień wcześniej (najprostsza wersja)
      it.due_date.setDate(it.due_date.getDate() - 7);
    }
  }
}

export async function generateTasksForEvent(args: {
  eventId: string;
  mode: "initial" | "regen";
  keepDone: boolean;
  transaction: any;
}) {
  const { eventId, mode, keepDone, transaction } = args;

  const interview = await EventInterview.findOne({
    where: { event_id: eventId },
    transaction,
  });

  const weddingDate = parseWeddingDate((interview as any)?.event_date);
  if (!weddingDate) {
    return {
      summary: { created: 0, updated: 0, skipped: 0 },
      warning: "Brak daty ślubu w wywiadzie – nie wygenerowano zadań.",
    };
  }

  const ceremonyType = ((interview as any)?.ceremony_type ?? "RECEPTION_ONLY") as InterviewCeremonyType;

  // regen/initial: usuwamy tylko auto-generated z generatora (nie ruszamy manualnych)
  const GEN_MARK = "event-generator";

  if (mode === "regen") {
    if (keepDone) {
      await Task.destroy({
        where: {
          event_id: eventId,
          auto_generated: true,
          generated_from: GEN_MARK,
          status: { [Op.ne]: "done" },
        } as any,
        transaction,
      });
    } else {
      await Task.destroy({
        where: {
          event_id: eventId,
          auto_generated: true,
          generated_from: GEN_MARK,
        } as any,
        transaction,
      });
    }
  } else {
    await Task.destroy({
      where: {
        event_id: eventId,
        auto_generated: true,
        generated_from: GEN_MARK,
      } as any,
      transaction,
    });
  }

  // filtr biblioteki wg ceremonii
  const templates = TASK_LIBRARY.filter((t) => {
    if (t.ceremonyScope === "ANY" || !t.ceremonyScope) return true;
    if (t.ceremonyScope === "BOTH") return true;

    if (ceremonyType === "RECEPTION_ONLY") {
      // przy samym przyjęciu: formalności odpadają
      return t.module !== "formalities";
    }

    if (ceremonyType === "CIVIL") return t.ceremonyScope === "CIVIL";
    if (ceremonyType === "CHURCH") return t.ceremonyScope === "CHURCH";
    return true;
  });

  const now = new Date();

  const tasksToCreate = templates.map((tpl) => {
    const due = makeDueDate(weddingDate, tpl, ceremonyType);

    return {
      event_id: eventId,
      title: tpl.title,
      description: (tpl as any).description ?? null,
      status: "pending",
      category: tpl.category,
      due_date: due,
      auto_generated: true,
      generated_from: GEN_MARK,
      created_at: now,
      updated_at: now,
    };
  });

  enforceWeeklyLimit(tasksToCreate);

  await Task.bulkCreate(tasksToCreate as any, { transaction });

  const daysToWedding = daysBetween(new Date(), weddingDate);
  const warning =
    daysToWedding <= 30
      ? "Uwaga: do ślubu zostało mało czasu. Następny krok: tryb 'late start' z pytaniami 'czy już zrobione?'."
      : undefined;

  return {
    summary: { created: tasksToCreate.length, updated: 0, skipped: 0 },
    wedding_date: weddingDate.toISOString().slice(0, 10),
    ceremony_type: ceremonyType,
    warning,
  };
}
