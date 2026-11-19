import { describe, expect, it } from "vitest";
import {
  calculateCompoundInterestEarned,
  calculateMonthsToSavingsGoal,
  futureValue,
  projectCompoundSavings,
} from "./forecast.js";

describe("futureValue input guards", () => {
  it("treats a negative principal as zero", () => {
    // No principal, no contributions, no growth: 0.
    expect(futureValue(-500, 0, 0, 12)).toBe(0);
  });

  it("treats a negative monthly contribution as zero", () => {
    expect(futureValue(0, -100, 0, 12)).toBe(0);
  });

  it("adds contributions without growth when the monthly rate is negative", () => {
    // Rate at or below zero takes the no-growth path: 1,000 + 50 * 12 = 1,600.
    expect(futureValue(1000, 50, -0.01, 12)).toBe(1600);
  });
});

describe("calculateCompoundInterestEarned input guards", () => {
  it("earns nothing on a negative balance", () => {
    // Balance counts as 0, no contributions: interest 0.
    expect(calculateCompoundInterestEarned(-500, 12, 0, 12)).toBe(0);
  });

  it("earns nothing on a negative monthly contribution", () => {
    expect(calculateCompoundInterestEarned(0, 12, -100, 12)).toBe(0);
  });
});

describe("projectCompoundSavings input guards", () => {
  it("starts from zero when the starting balance is negative", () => {
    const res = projectCompoundSavings({ starting: -1000, monthly: 0, annualRatePct: 5, years: 1 });
    expect(res.points[0]).toEqual({ year: 0, balance: 0 });
    expect(res.final).toBe(0);
    expect(res.flat).toBe(true);
  });

  it("counts a negative monthly amount as nothing paid in", () => {
    const res = projectCompoundSavings({ starting: 0, monthly: -100, annualRatePct: 0, years: 1 });
    expect(res.paidIn).toBe(0);
    expect(res.interest).toBe(0);
    expect(res.final).toBe(0);
  });

  it("treats a rate that is not a finite number as no growth", () => {
    for (const annualRatePct of [Number.NaN, Number.POSITIVE_INFINITY]) {
      const res = projectCompoundSavings({ starting: 1000, monthly: 0, annualRatePct, years: 1 });
      // No growth and nothing added: stays 1,000 and is flat.
      expect(res.final).toBe(1000);
      expect(res.flat).toBe(true);
    }
  });
});

describe("projectCompoundSavings interest and flat flag", () => {
  it("reports interest as the growth on the starting balance", () => {
    const res = projectCompoundSavings({ starting: 1000, monthly: 0, annualRatePct: 10, years: 1 });
    // A year with nothing added grows by exactly the AER: 1,000 * 1.10 = 1,100, interest 100.
    // toBeCloseTo because twelve monthly steps of (1.1)^(1/12) carry floating point error.
    expect(res.final).toBeCloseTo(1100, 6);
    expect(res.interest).toBeCloseTo(100, 6);
    expect(res.flat).toBe(false);
  });

  it("is not flat when money is added each month, even with no rate and no start", () => {
    const res = projectCompoundSavings({ starting: 0, monthly: 100, annualRatePct: 0, years: 1 });
    // 100 * 12 = 1,200 paid in, no growth.
    expect(res.final).toBe(1200);
    expect(res.paidIn).toBe(1200);
    expect(res.interest).toBe(0);
    expect(res.flat).toBe(false);
  });

  it("is flat when there is a rate but nothing to grow", () => {
    const res = projectCompoundSavings({ starting: 0, monthly: 0, annualRatePct: 5, years: 2 });
    expect(res.final).toBe(0);
    expect(res.flat).toBe(true);
  });
});

describe("calculateMonthsToSavingsGoal input guards and limits", () => {
  it("starts from zero when the starting balance is negative", () => {
    // Start 0, 100 a month, no growth, goal 100: reached after 1 month.
    expect(
      calculateMonthsToSavingsGoal({ starting: -1000, monthly: 100, annualRatePct: 0, goal: 100 }),
    ).toEqual({ status: "months", months: 1 });
  });

  it("counts a negative monthly amount as nothing saved", () => {
    // Only growth: 1,000 * 1.1^(m/12) >= 1,050 needs m/12 >= ln 1.05 / ln 1.1 = 0.5119, m >= 6.14.
    // Month 6: 1.1^0.5 = 1.04881 (short). Month 7: 1.1^(7/12) = 1.05717 (reached).
    expect(
      calculateMonthsToSavingsGoal({
        starting: 1000,
        monthly: -100,
        annualRatePct: 10,
        goal: 1050,
      }),
    ).toEqual({ status: "months", months: 7 });
  });

  it("counts a goal reached in exactly the last month searched", () => {
    // 100 a month, no growth: 1,200 after month 12, which is maxMonths.
    expect(
      calculateMonthsToSavingsGoal({
        starting: 0,
        monthly: 100,
        annualRatePct: 0,
        goal: 1200,
        maxMonths: 12,
      }),
    ).toEqual({ status: "months", months: 12 });
  });
});
