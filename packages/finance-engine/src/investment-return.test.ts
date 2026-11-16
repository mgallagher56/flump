import { describe, expect, it } from "vitest";
import { computeInvestmentReturns } from "./investment-return.js";

describe("computeInvestmentReturns", () => {
  it("returns null overall and empty yearly list when fewer than 2 snapshots exist", () => {
    expect(computeInvestmentReturns([])).toEqual({
      overallAnnualReturnPct: null,
      yearlyReturns: [],
      spanMonths: 0,
    });
    expect(computeInvestmentReturns([{ year: 2026, month: 1, value: 10000 }])).toEqual({
      overallAnnualReturnPct: null,
      yearlyReturns: [],
      spanMonths: 0,
    });
  });

  it("computes overall and year-by-year annualized return with no contributions", () => {
    const result = computeInvestmentReturns([
      { year: 2024, month: 12, value: 10000 },
      { year: 2025, month: 12, value: 11000 },
      { year: 2026, month: 12, value: 12100 },
    ]);
    expect(result.spanMonths).toBe(24);
    expect(result.overallAnnualReturnPct).toBe(10);
    expect(result.yearlyReturns).toEqual([
      { year: 2025, annualReturnPct: 10, startValue: 10000, endValue: 11000, months: 12 },
      { year: 2026, annualReturnPct: 10, startValue: 11000, endValue: 12100, months: 12 },
    ]);
  });

  it("subtracts regular monthly contributions so deposits are not counted as growth", () => {
    // Start £10,000, deposit £200/mo for 12 months (£2,400), end £12,400 -> 0% investment return
    const result = computeInvestmentReturns(
      [
        { year: 2025, month: 1, value: 10000 },
        { year: 2026, month: 1, value: 12400 },
      ],
      200,
    );
    expect(result.overallAnnualReturnPct).toBe(0);
  });
});
