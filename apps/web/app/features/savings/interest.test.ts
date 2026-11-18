import { describe, expect, it } from "vitest";
import { calculateOneYearCompoundInterest } from "./interest";

describe("calculateOneYearCompoundInterest", () => {
  it("gives the AER over a year with no monthly saving", () => {
    // The stored rate is an AER, so a year's interest is balance × AER: 10,000 × 0.05 = £500.
    expect(calculateOneYearCompoundInterest(10000, 5, 0)).toBeCloseTo(500, 6);
  });

  it("adds the monthly saving at the end of each month", () => {
    // £0 and £100 a month at 12% AER: r = 1.12^(1/12) − 1 = 0.0094888,
    // end = 100 × 0.12 / 0.0094888 = 1,264.65, interest = 1,264.65 − 1,200 = £64.65.
    expect(calculateOneYearCompoundInterest(0, 12, 100)).toBeCloseTo(64.65, 1);
  });

  it("is zero at a zero rate", () => {
    expect(calculateOneYearCompoundInterest(10000, 0, 0)).toBe(0);
  });
});
