import { describe, expect, it } from "vitest";
import { normalizeDisplayName, toNumber } from "../strings";

describe("normalizeDisplayName", () => {
  it("trimuje i redukuje wielokrotne spacje", () => {
    expect(normalizeDisplayName("  Jan   Kowalski  ")).toBe("Jan Kowalski");
  });
});

describe("toNumber", () => {
  it("parsuje liczbę z stringa", () => {
    expect(toNumber("12.5")).toBe(12.5);
  });

  it("zwraca fallback dla NaN", () => {
    expect(toNumber("abc", 7)).toBe(7);
  });
});
