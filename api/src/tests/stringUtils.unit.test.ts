import { describe, expect, it } from "vitest";
import { normalizeEmail } from "../utils/stringUtils";

describe("normalizeEmail", () => {
  it("lowercases and trims", () => {
    expect(normalizeEmail("  TeSt@Example.COM ")).toBe("test@example.com");
  });
});
