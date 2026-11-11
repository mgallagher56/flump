import { describe, expect, it } from "vitest";
import { monthlyMortgagePayment } from "./mortgagePayment";

describe("monthlyMortgagePayment", () => {
  it("returns 0 for any missing input rather than NaN or Infinity", () => {
    for (const args of [
      [0, 4, 25],
      [200000, 0, 25],
      [200000, 4, 0],
      [200000, 0, 0],
    ] as const) {
      const v = monthlyMortgagePayment(args[0], args[1], args[2], "repayment");
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBe(0);
    }
  });

  it("computes a repayment and an interest-only payment", () => {
    expect(monthlyMortgagePayment(200000, 4, 25, "repayment")).toBeCloseTo(1055.67, 1);
    expect(monthlyMortgagePayment(200000, 4, 25, "interest-only")).toBeCloseTo(666.67, 1);
  });
});
