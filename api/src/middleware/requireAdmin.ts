import type { NextFunction, Response } from "express";

import type { AuthRequest } from "./auth";
import { User } from "../models/User";
import { ApiError } from "../utils/apiError";

/**
 * Wymusza rolę admin.
 * - rzuca ApiError (spójny format ok:false + code + fields)
 * - NIE zwraca res.json({message}) – dzięki temu frontend zawsze dostaje przewidywalny payload.
 */
export async function requireAdmin(req: AuthRequest, _res: Response, next: NextFunction) {
  try {
    if (!req.userId) throw new ApiError(401, "UNAUTHORIZED", "Nieautoryzowany");

    const me = await User.findByPk(req.userId);
    if (!me) throw new ApiError(401, "UNAUTHORIZED", "Nieautoryzowany");

    if ((me as any).role !== "admin") {
      throw new ApiError(403, "FORBIDDEN", "Brak uprawnień (admin)");
    }

    next();
  } catch (e) {
    next(e);
  }
}
