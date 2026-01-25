import type { NextFunction, Request, Response } from "express";
import { isApiError } from "../utils/apiError";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  // eslint-disable-next-line no-console
  console.error(err);

  if (isApiError(err)) {
    return res.status(err.status).json({
      ok: false,
      code: err.code,
      message: err.message,
      fields: err.fields ?? undefined,
    });
  }

  return res.status(500).json({
    ok: false,
    code: "UNKNOWN_ERROR",
    message: "Wystąpił nieznany błąd. Spróbuj ponownie.",
  });
}
