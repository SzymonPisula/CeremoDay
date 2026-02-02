/**
 * Normalizuje imię/nazwę do wersji bez zbędnych spacji.
 * Prosta, deterministyczna funkcja – dobra do unit testów.
 */
export function normalizeDisplayName(input: string): string {
  return input.trim().replace(/\s+/g, " ");
}

/**
 * Bezpiecznie zamienia nieznaną wartość na liczbę.
 */
export function toNumber(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}
