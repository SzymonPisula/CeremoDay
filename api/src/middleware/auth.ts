// /CeremoDay/api/src/middleware/auth.ts
import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { ApiError } from "../utils/apiError";

// Jeśli masz swój typ payloadu JWT – podepnij go tutaj.
// Poniżej jest bezpieczny minimalny kształt:
type JwtPayloadLike = {
  userId?: string;
  id?: string;
  sub?: string;
  email?: string;
  role?: string;
};

export type AuthUser = {
  id: string;
};

export interface AuthRequest extends Request {
  userId?: string; // legacy / szybki dostęp
  user?: AuthUser; // preferowane w nowych routach: req.user.id
}

export function authMiddleware(req: AuthRequest, _res: Response, next: NextFunction) {
  try {
    const auth = req.headers.authorization;
    const token = auth?.startsWith("Bearer ") ? auth.slice("Bearer ".length).trim() : null;

    if (!token) {
      return next(new ApiError(401, "UNAUTHORIZED", "Brak tokena uwierzytelniającego."));
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return next(new ApiError(500, "SERVER_MISCONFIG", "Brak konfiguracji JWT_SECRET na serwerze."));
    }

    const decoded = jwt.verify(token, secret) as JwtPayloadLike;

    const id = decoded.userId ?? decoded.id ?? decoded.sub;
    if (!id) {
      return next(new ApiError(401, "UNAUTHORIZED", "Nieprawidłowy token (brak identyfikatora użytkownika)."));
    }

    // ✅ ustawiamy oba — kompatybilnie i czytelnie
    req.userId = id;
    req.user = { id };

    return next();
  } catch (e) {
    return next(new ApiError(401, "UNAUTHORIZED", "Nieprawidłowy lub wygasły token."));
  }
}
