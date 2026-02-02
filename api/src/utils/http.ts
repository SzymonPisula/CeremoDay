// CeremoDay/api/src/utils/http.ts
// Helpers for safely reading Express params/query values.
// In Express/qs typings, params/query fields can be typed as string | string[].

export function pickFirstString(value: unknown): string {
  if (Array.isArray(value)) {
    const first = value[0];
    return typeof first === "string" ? first : String(first ?? "");
  }
  if (typeof value === "string") return value;
  if (value == null) return "";
  return String(value);
}

export function paramString(req: { params?: Record<string, unknown> }, key: string): string {
  return pickFirstString(req.params?.[key]);
}

export function queryString(req: { query?: Record<string, unknown> }, key: string): string {
  return pickFirstString(req.query?.[key]);
}
