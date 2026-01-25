import { sequelize } from "../../config/database";
import EventInterview from "../../models/EventInterview";
import { ensureDefaultDocuments } from "./ensureDefaultDocuments";
import { generateTasksForEvent } from "./generateTasks";
import { generateNotificationsForEvent } from "./generateNotifications";

export async function runGeneration(args: {
  eventId: string;
  userId: string;
  mode: "initial" | "regen";
  keepDone: boolean;
}) {
  const { eventId, mode, keepDone } = args;

  return await sequelize.transaction(async (t) => {
    const interview = await EventInterview.findOne({
      where: { event_id: eventId },
      transaction: t,
    });

    const ceremonyType = ((interview as any)?.ceremony_type ?? "RECEPTION_ONLY") as
      | "CIVIL"
      | "CHURCH"
      | "RECEPTION_ONLY";

    // 1) Dokumenty: tylko ensure domyślnych, bez robienia “drugiej listy”
    const docsEnsured = await ensureDefaultDocuments({
      eventId,
      ceremonyType,
      includeExtras: true,
      transaction: t,
    });

    // 2) Zadania: generator (auto_generated + generated_from)
    const tasks = await generateTasksForEvent({
      eventId,
      mode,
      keepDone,
      transaction: t,
    });

    // 3) Powiadomienia: stub teraz, wdrożymy 1:1 w następnym kroku
    const notifications = await generateNotificationsForEvent({
      eventId,
      mode,
      transaction: t,
    });

    return {
      ok: true,
      event_id: eventId,
      documents_ensured: docsEnsured,
      tasks: tasks.summary,
      tasks_warning: (tasks as any).warning,
      notifications: notifications.summary,
    };
  });
}
