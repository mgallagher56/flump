import { describe, expect, it } from "vitest";
import { safeErrorSummary } from "./log-safe";

describe("safeErrorSummary", () => {
  it("keeps the class and leading phrase but drops the echoed provider body", () => {
    const err = new Error('Failed to fetch Monzo accounts: {"token":"tok_secret","balance":1234}');
    const out = safeErrorSummary(err);
    expect(out).toBe("Error (Failed to fetch Monzo accounts)");
    expect(out).not.toContain("tok_secret");
    expect(out).not.toContain("1234");
  });

  it("adds a numeric status when present and handles non-errors", () => {
    expect(safeErrorSummary(Object.assign(new Error("boom"), { status: 401 }))).toBe(
      "Error (boom) status=401",
    );
    expect(safeErrorSummary("secret string")).toBe("string");
    expect(safeErrorSummary(null)).toBe("object");
  });

  it("truncates a long leading phrase", () => {
    expect(safeErrorSummary(new Error("x".repeat(500))).length).toBeLessThan(110);
  });
});
