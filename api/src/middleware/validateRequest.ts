import { ZodSchema } from "zod";
import { Request, Response, NextFunction } from "express";
import { ValidationException } from "../validation/common/errors";

export function validateRequest(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      throw new ValidationException(
        result.error.issues.map(i => ({
          field: String(i.path.join(".")),
          message: i.message,
          rule: i.code,
        }))
      );
    }
    req.body = result.data;
    next();
  };
}