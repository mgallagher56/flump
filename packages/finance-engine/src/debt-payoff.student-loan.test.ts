import { describe, expect, it } from "vitest";
import { evaluateUkStudentLoan } from "./debt-payoff.js";

// The repay-before-write-off estimate (debt-payoff.ts, evaluateUkStudentLoan): a balance counts as
// likely repaid when the yearly repayment is more than 1.5 times a year's interest at 6.5% on the
// balance, and the balance is under half the write-off term's worth of repayments.
// Plan 2, 2026/27: threshold 29,385, rate 9% (GOV.UK "Repaying your student loan: what you pay",
// 2026/27 thresholds), written off after 30 years.
describe("evaluateUkStudentLoan: repaid before write-off", () => {
  it("counts a balance as likely repaid when repayments beat 1.5 times the interest", () => {
    // Salary 49,385: (49,385 - 29,385) x 9% = 20,000 x 0.09 = 1,800 a year.
    // Balance 18,000: interest 18,000 x 6.5% = 1,170; x 1.5 = 1,755. 1,800 > 1,755.
    // Half the term's repayments: 1,800 x 15 = 27,000; 18,000 < 27,000. So repaid first.
    const r = evaluateUkStudentLoan("plan2", 49_385, 18_000, "2026/27");
    expect(r.annualRepayment).toBe(1_800);
    expect(r.willLikelyRepayBeforeWriteOff).toBe(true);
    expect(r.projectedOutcome).toBe("repaid_before_write_off");
  });

  it("counts a balance as written off first when repayments fall short of 1.5 times the interest", () => {
    // Salary 49,385 repays 1,800 a year (as above).
    // Balance 20,000: interest 20,000 x 6.5% = 1,300; x 1.5 = 1,950. 1,800 is not more than 1,950,
    // so written off first, even though 20,000 is under 1,800 x 15 = 27,000.
    const r = evaluateUkStudentLoan("plan2", 49_385, 20_000, "2026/27");
    expect(r.willLikelyRepayBeforeWriteOff).toBe(false);
    expect(r.projectedOutcome).toBe("written_off_first");
  });

  it("needs repayments strictly more than 1.5 times the interest: equal is written off first", () => {
    // Salary 33,285: (33,285 - 29,385) x 9% = 3,900 x 0.09 = 351 a year.
    // Balance 3,600: interest 3,600 x 6.5% = 234; x 1.5 = 351. 351 is not more than 351.
    const atEdge = evaluateUkStudentLoan("plan2", 33_285, 3_600, "2026/27");
    expect(atEdge.annualRepayment).toBe(351);
    expect(atEdge.willLikelyRepayBeforeWriteOff).toBe(false);
    // Balance 3,500: interest 3,500 x 6.5% = 227.50; x 1.5 = 341.25. 351 > 341.25, and
    // 3,500 < 351 x 15 = 5,265, so repaid first.
    const under = evaluateUkStudentLoan("plan2", 33_285, 3_500, "2026/27");
    expect(under.willLikelyRepayBeforeWriteOff).toBe(true);
  });
});
