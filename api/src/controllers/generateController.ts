import type { Response } from "express";
import type { AuthRequest } from "../middleware/auth";
import { EventUser } from "../models/EventUser";
import { runGeneration } from "../services/generation/runGeneration";
import { paramString } from "../utils/http";

/**
 * Bezpieczne pobranie userId z requesta — różne wersje auth middleware
 * mogą w Twoim projekcie zapisywać dane w różnych polach.
 */
function getAuthUserId(req: AuthRequest): string | null {
  const anyReq = req as any;

  if (typeof anyReq.userId === "string") return anyReq.userId;
  if (typeof anyReq.user_id === "string") return anyReq.user_id;
  if (typeof anyReq.user?.id === "string") return anyReq.user.id;
  if (typeof anyReq.user?.userId === "string") return anyReq.user.userId;

  return null;
}

async function requireActiveMember(eventId: string, userId: string) {
  const membership = await EventUser.findOne({
    where: { event_id: eventId, user_id: userId, status: "active" },
  });

  if (!membership) {
    const err: any = new Error("Brak dostępu do wydarzenia lub konto nieaktywne.");
    err.status = 403;
    throw err;
  }
}

export async function generateForEvent(req: AuthRequest, res: Response) {
  const eventId = paramString(req, "id");

  const userId = getAuthUserId(req);
  if (!userId) {
    return res.status(401).json({ message: "Brak autoryzacji." });
  }

  const mode = (req.body?.mode ?? "initial") as "initial" | "regen";
  const keepDone = Boolean(req.body?.keep_done ?? true);

  await requireActiveMember(eventId, userId);

  const result = await runGeneration({ eventId, userId, mode, keepDone });
  return res.json(result);
}
