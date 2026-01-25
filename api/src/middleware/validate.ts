import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";
import { ZodError } from "zod";
import { ApiError } from "../utils/apiError";

type AnySchema = ZodSchema<any>;

function zodToDetails(err: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const path = issue.path?.length ? issue.path.join(".") : "_global";
    if (!out[path]) out[path] = issue.message;
  }
  return out;
}

export function validateBody(schema: AnySchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      return next();
    } catch (e: any) {
      if (e instanceof ZodError) {
        return next(
          new ApiError(
            400,
            "VALIDATION_ERROR",
            "Popraw pola w formularzu.",
            zodToDetails(e) // -> details: { field: message }
          )
        );
      }
      return next(e);
    }
  };
}
