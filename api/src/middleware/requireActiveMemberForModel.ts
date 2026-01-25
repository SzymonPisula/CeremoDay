// CeremoDay/api/src/middleware/requireActiveMemberForModel.ts
import type { Request, Response, NextFunction } from "express";
import type { Model, ModelStatic } from "sequelize";

import { AuthRequest } from "./auth";
import { EventUser } from "../models/EventUser";
import { ApiError } from "../utils/apiError";

type Options<T extends Model> = {
  model: ModelStatic<T>;
  idParam: string;
  label: string;

  /**
   * Domyślnie middleware próbuje pobrać event_id z rekordu:
   * - (instance as any).event_id
   * Możesz wskazać inną nazwę pola:
   */
  eventIdField?: string;

  /**
   * ✅ NOWE: jeśli rekord nie ma event_id (np. InspirationItem),
   * możesz podać funkcję, która wyliczy eventId z innych pól (np. board_id).
   */
  resolveEventId?: (instance: T) => Promise<string | null> | (string | null);
};

async function requireActiveMemberByEventId(eventId: string, userId: string) {
  const membership = await EventUser.findOne({
    where: {
      event_id: eventId,
      user_id: userId,
      status: "active",
    },
  });

  return !!membership;
}

export function requireActiveMemberForModel<T extends Model>(opts: Options<T>) {
  const eventField = opts.eventIdField ?? "event_id";

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const r = req as AuthRequest;

      if (!r.user?.id) {
        return next(new ApiError(401, "UNAUTHORIZED", "Brak autoryzacji."));
      }

      const id = String((req.params as Record<string, unknown>)[opts.idParam] ?? "").trim();
      if (!id) {
        return next(new ApiError(400, "VALIDATION_ERROR", `Brak parametru ${opts.idParam}.`));
      }

      const instance = await opts.model.findByPk(id);
      if (!instance) {
        return next(new ApiError(404, "NOT_FOUND", `${opts.label} nie została znaleziona.`));
      }

      // 1) Spróbuj event_id bezpośrednio z pola
      const anyInst = instance as unknown as Record<string, unknown>;
      let eventId: string | null =
        typeof anyInst[eventField] === "string" && String(anyInst[eventField]).trim()
          ? String(anyInst[eventField]).trim()
          : null;

      // 2) ✅ Fallback: resolveEventId (np. po board_id)
      if (!eventId && opts.resolveEventId) {
        const resolved = await opts.resolveEventId(instance);
        eventId = resolved ? String(resolved).trim() : null;
      }

      if (!eventId) {
        // To jest dokładnie ten przypadek, który u Ciebie wywalał 500
        return next(
          new ApiError(
            400,
            "VALIDATION_ERROR",
            `${opts.label} nie ma poprawnego event_id.`
          )
        );
      }

      const ok = await requireActiveMemberByEventId(eventId, r.user.id);
      if (!ok) {
        return next(new ApiError(403, "FORBIDDEN", "Brak dostępu do tego wydarzenia."));
      }

      // opcjonalnie: przydaję się w handlerach
      (req as unknown as Record<string, unknown>).__eventId = eventId;

      return next();
    } catch (err) {
      console.error("requireActiveMemberForModel error:", err);
      return next(new ApiError(500, "SERVER_ERROR", "Błąd serwera (ACL)."));
    }
  };
}
