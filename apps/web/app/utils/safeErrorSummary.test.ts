import { describe, expect, it } from "vitest";
import { safeErrorSummary } from "./safeErrorSummary";

describe("safeErrorSummary", () => {
  it("drops everything after the first colon and handles non-errors", () => {
    expect(safeErrorSummary(new Error('Bad session: {"token":"secret"}'))).toBe(
      "Error (Bad session)",
    );
    expect(safeErrorSummary({ token: "secret" })).toBe("object");
  });
});
