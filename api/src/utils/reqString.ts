// CeremoDay/api/src/utils/reqString.ts
import type { Response } from "express";

export function firstString(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return typeof value[0] === "string" ? value[0] : undefined;
  return undefined;
}

export function requireString(
  res: Response,
  value: unknown,
  label: string
): string | null {
  const v = firstString(value);
  if (!v) {
    res.status(400).json({ message: `Brak ${label}` });
    return null;
  }
  return v;
}
