// Reguły PL (hard rules) – będziemy je wykorzystywać do sensownego ustawienia formalności
// i walidacji generatora (anti-"wszystko na tydzień").
//
// Uwaga: wartości są "operacyjne" (dni), a nie prawniczy kalkulator.
// Docelowo dorobimy tryb late-start z pytaniami "czy już zrobione?".

export const PL_RULES = {
  USC_EARLIEST_DAYS: 183,   // ~6 miesięcy przed
  USC_LATEST_DAYS: 31,      // ~1 miesiąc przed
  MAX_TASKS_PER_WEEK: 12,   // anti-chaos
} as const;

export function daysBetween(a: Date, b: Date) {
  return Math.ceil((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}
