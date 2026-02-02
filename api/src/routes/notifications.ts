import { Router, Response } from "express";
import { Op } from "sequelize";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { requireActiveMember } from "../middleware/requireActiveMember";
import Task from "../models/Task";
import { Notification } from "../models/Notification";
import EventInterview from "../models/EventInterview";
import { notificationsMarkReadSchema } from "../validation/schemas";
import { paramString } from "../utils/http";

const router = Router();

type Frequency = "daily" | "every_3_days" | "weekly" | "only_critical";

function getThresholds(freq: Frequency): number[] {
  // “dni do terminu” – kiedy tworzymy przypomnienia
  switch (freq) {
    case "daily":
      return [14, 7, 3, 1, 0];
    case "every_3_days":
      return [14, 7, 3, 1, 0];
    case "weekly":
      return [14, 7, 0];
    case "only_critical":
      return [3, 1, 0];
    default:
      return [7, 3, 1, 0];
  }
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function daysDiff(a: Date, b: Date) {
  // b - a w dniach (a i b obcięte do 00:00)
  const A = startOfDay(a).getTime();
  const B = startOfDay(b).getTime();
  return Math.round((B - A) / (1000 * 60 * 60 * 24));
}

async function ensureNotificationsForUserEvent(args: {
  eventId: string;
  userId: string;
}) {
  const { eventId, userId } = args;

  const interview = await EventInterview.findOne({
    where: { event_id: eventId },
  });

  const freq = ((interview as any)?.notification_frequency ??
    "every_3_days") as Frequency;

  const thresholds = getThresholds(freq);

  const tasks = await Task.findAll({
    where: {
      event_id: eventId,
      status: { [Op.ne]: "done" },
      due_date: { [Op.ne]: null },
    } as any,
    order: [["due_date", "ASC"]],
  });

  if (!tasks.length) return { created: 0 };

  const existing = await Notification.findAll({
    where: { user_id: userId },
  });

  const existingKey = new Set(
    existing.map((n: any) => `${n.task_id ?? "none"}::${String(n.type ?? "")}`)
  );

  const now = new Date();
  let created = 0;

  for (const t of tasks as any[]) {
    const due: Date | null = t.due_date ? new Date(t.due_date) : null;
    if (!due) continue;

    const d = daysDiff(now, due); // ile dni do terminu (0 = dziś, <0 = po terminie)

    // overdue
    if (d < 0) {
      const key = `${t.id}::overdue`;
      if (!existingKey.has(key)) {
        await Notification.create({
          user_id: userId,
          task_id: t.id,
          title: "Zadanie po terminie",
          message: `„${t.title}” jest po terminie (${Math.abs(d)} dni).`,
          type: "overdue",
          read: false,
          created_at: new Date(),
        } as any);
        existingKey.add(key);
        created++;
      }
      continue;
    }

    // due thresholds
    for (const th of thresholds) {
      if (d === th) {
        const key = `${t.id}::due_${th}`;
        if (existingKey.has(key)) continue;

        const when =
          th === 0
            ? "Termin jest dzisiaj."
            : `Termin za ${th} dni.`;

        await Notification.create({
          user_id: userId,
          task_id: t.id,
          title: "Zbliża się termin zadania",
          message: `„${t.title}” — ${when}`,
          type: `due_${th}`,
          read: false,
          created_at: new Date(),
        } as any);

        existingKey.add(key);
        created++;
      }
    }
  }

  return { created };
}

/**
 * GET /events/:id/notifications
 * - tworzy brakujące (on-demand) powiadomienia dla usera
 * - zwraca feed posortowany od najnowszych
 */
router.get(
  "/events/:id/notifications",
  authMiddleware,
  requireActiveMember("id"),
  async (req: AuthRequest, res: Response) => {
  try {
    const eventId = paramString(req, "id");
    const userId = req.userId as string;

    await ensureNotificationsForUserEvent({ eventId, userId });

    const list = await Notification.findAll({
      where: { user_id: userId },
      order: [["created_at", "DESC"]],
      limit: 200,
    });

    return res.json({ notifications: list });
  } catch (err) {
    console.error("GET notifications error:", err);
    return res.status(500).json({ message: "Błąd serwera" });
  }
});

/**
 * POST /events/:id/notifications/mark-read
 * body: { ids?: string[] }  // jeśli brak ids -> wszystkie
 */
router.post(
  "/events/:id/notifications/mark-read",
  authMiddleware,
  requireActiveMember("id"),
  validateBody(notificationsMarkReadSchema),
  async (req: AuthRequest, res: Response) => {
    try {
      const eventId = paramString(req, "id");
      const userId = req.userId;
      if (!userId) return res.status(401).json({ message: "Nieautoryzowany" });

      const ids = (req.body as any)?.ids ?? null;

      if (!ids) {
        await Notification.update(
          { read: true } as any,
          { where: { user_id: userId, read: false } }
        );
      } else {
        await Notification.update(
          { read: true } as any,
          { where: { user_id: userId, id: { [Op.in]: ids } } }
        );
      }

      return res.json({ ok: true });
    } catch (err) {
      console.error("mark-read error:", err);
      return res.status(500).json({ message: "Błąd serwera" });
    }
  }
);

export default router;
