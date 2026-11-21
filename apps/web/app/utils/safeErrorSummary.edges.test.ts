// @vitest-environment node
import { describe, expect, it } from "vitest";
import { safeErrorSummary } from "./safeErrorSummary";

describe("safeErrorSummary phrase", () => {
  it("trims the leading phrase", () => {
    expect(safeErrorSummary(new TypeError("  Token expired   : details"))).toBe(
      "TypeError (Token expired)",
    );
  });

  it("keeps at most 80 characters of the phrase", () => {
    const long = "x".repeat(100);
    expect(safeErrorSummary(new Error(long))).toBe(`Error (${"x".repeat(80)})`);
  });
});
