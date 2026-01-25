import type { Response, NextFunction } from "express";

import type { AuthRequest } from "./auth";
import { EventUser } from "../models/EventUser";
import { ApiError } from "../utils/apiError";

/**
 * Wymusza przynależność użytkownika do eventu (EventUser.status = "active").
 *
 * Użycie:
 *   router.get("/:eventId/...", authMiddleware, requireActiveMember(), ...)
 *   router.get("/events/:id/...", authMiddleware, requireActiveMember("id"), ...)
 */
export function requireActiveMember(paramName: string = "eventId") {
  return async (req: AuthRequest, _res: Response, next: NextFunction) => {
    try {
      if (!req.userId) {
        return next(new ApiError(401, "UNAUTHORIZED", "Nieautoryzowany"));
      }

      const eventId = (req.params as Record<string, string | undefined>)[paramName];
      if (!eventId) {
        return next(
          new ApiError(
            400,
            "VALIDATION_ERROR",
            `Złe dane w polu „${paramName}”: Brak identyfikatora wydarzenia.`,
            { [paramName]: "Brak identyfikatora wydarzenia" }
          )
        );
      }

      const membership = await EventUser.findOne({
        where: { event_id: eventId, user_id: req.userId, status: "active" },
      });

      if (!membership) {
        return next(
          new ApiError(
            403,
            "FORBIDDEN",
            "Brak dostępu do tego wydarzenia (musisz być aktywnym członkiem)."
          )
        );
      }

      next();
    } catch (e) {
      next(e);
    }
  };
}

/**
 * Wymusza przynależność do eventu wskazanego w body (np. event_id).
 * Przydaje się w endpointach typu POST /guests, gdzie eventId nie jest w URL.
 */
export function requireActiveMemberFromBody(fieldName: string = "event_id") {
  return async (req: AuthRequest, _res: Response, next: NextFunction) => {
    try {
      if (!req.userId) {
        return next(new ApiError(401, "UNAUTHORIZED", "Nieautoryzowany"));
      }

      const eventId = (req.body as Record<string, unknown> | undefined)?.[fieldName];
      if (!eventId || typeof eventId !== "string") {
        return next(
          new ApiError(
            400,
            "VALIDATION_ERROR",
            `Złe dane w polu „${fieldName}”: Brak identyfikatora wydarzenia.`,
            { [fieldName]: "Brak identyfikatora wydarzenia" }
          )
        );
      }

      const membership = await EventUser.findOne({
        where: { event_id: eventId, user_id: req.userId, status: "active" },
      });

      if (!membership) {
        return next(
          new ApiError(
            403,
            "FORBIDDEN",
            "Brak dostępu do tego wydarzenia (musisz być aktywnym członkiem)."
          )
        );
      }

      next();
    } catch (e) {
      next(e);
    }
  };
}

/**
 * Wymusza przynależność do eventu wskazanego w query (np. ?event_id=...).
 * Przydatne w endpointach typu GET /vendors?event_id=...
 */
export function requireActiveMemberFromQuery(fieldName: string = "event_id") {
  return async (req: AuthRequest, _res: Response, next: NextFunction) => {
    try {
      if (!req.userId) {
        return next(new ApiError(401, "UNAUTHORIZED", "Nieautoryzowany"));
      }

      const eventIdRaw = (req.query as Record<string, unknown> | undefined)?.[fieldName];
      const eventId = typeof eventIdRaw === "string" ? eventIdRaw : undefined;

      if (!eventId) {
        return next(
          new ApiError(
            400,
            "VALIDATION_ERROR",
            `Złe dane w polu „${fieldName}”: Brak identyfikatora wydarzenia.`,
            { [fieldName]: "Brak identyfikatora wydarzenia" }
          )
        );
      }

      const membership = await EventUser.findOne({
        where: { event_id: eventId, user_id: req.userId, status: "active" },
      });

      if (!membership) {
        return next(
          new ApiError(
            403,
            "FORBIDDEN",
            "Brak dostępu do tego wydarzenia (musisz być aktywnym członkiem)."
          )
        );
      }

      next();
    } catch (e) {
      next(e);
    }
  };
}
