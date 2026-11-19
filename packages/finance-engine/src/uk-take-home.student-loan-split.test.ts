/**
 * How a student loan repayment is divided when someone has Plan 1 and Plan 2 loans.
 *
 * Rule (GOV.UK, "Repaying your student loan: what you pay", more than one plan): you repay 9% of
 * income over the lowest threshold of your plans, as one repayment. With Plan 1 and Plan 2 the
 * Plan 1 loan has a cap set by the gap between the two thresholds, 9% x (Plan 2 threshold -
 * Plan 1 threshold); anything over the cap goes to the Plan 2 loan. A Postgraduate Loan is repaid
 * separately at 6% over its own threshold.
 *
 * Thresholds, GOV.UK "Repaying your student loan", 2025/26: Plan 1 £26,065, Plan 2 £28,470,
 * Postgraduate £21,000. Rates 9% and 6%.
 */
import { describe, expect, it } from "vitest";
import { computeUkTakeHome } from "./uk-take-home.js";

const base = { taxYear: "2025/26", region: "ENGLAND_NI_WALES" as const };

describe("student loan repayments with Plan 1 and Plan 2", () => {
  it("caps the Plan 1 share at 9% of the gap between the thresholds and puts the rest on Plan 2", () => {
    // Salary £40,000. Total: 9% x (40,000 - 26,065) = 9% x 13,935 = 1,254.15.
    // Plan 1 cap: 9% x (28,470 - 26,065) = 9% x 2,405 = 216.45.
    // Plan 2: 1,254.15 - 216.45 = 1,037.70 (the same as 9% x (40,000 - 28,470) = 9% x 11,530).
    const b = computeUkTakeHome({ ...base, salary: 40_000, studentLoans: ["plan2", "plan1"] });
    expect(b.studentLoan).toBe(1_254.15);
    expect(b.studentLoanByPlan.plan1).toBeCloseTo(216.45, 2); // toBeCloseTo: pence in floating point
    expect(b.studentLoanByPlan.plan2).toBeCloseTo(1_037.7, 2);
  });

  it("gives the whole repayment to Plan 1 while income is between the two thresholds", () => {
    // Salary £27,000. Total: 9% x (27,000 - 26,065) = 9% x 935 = 84.15, under the 216.45 cap,
    // so all of it goes to Plan 1 and none to Plan 2.
    const b = computeUkTakeHome({ ...base, salary: 27_000, studentLoans: ["plan1", "plan2"] });
    expect(b.studentLoan).toBe(84.15);
    expect(b.studentLoanByPlan.plan1).toBeCloseTo(84.15, 2);
    expect(b.studentLoanByPlan.plan2).toBe(0);
  });

  it("repays nothing on either plan below the Plan 1 threshold", () => {
    // Salary £25,000 is under £26,065, so nothing is repaid.
    const b = computeUkTakeHome({ ...base, salary: 25_000, studentLoans: ["plan1", "plan2"] });
    expect(b.studentLoan).toBe(0);
    expect(b.studentLoanByPlan.plan1).toBe(0);
    expect(b.studentLoanByPlan.plan2).toBe(0);
  });

  it("does not split a Plan 1 loan on its own", () => {
    // Plan 1 only, salary £40,000: 9% x (40,000 - 26,065) = 1,254.15, all on Plan 1, and no
    // Plan 2 entry because there is no Plan 2 loan.
    const b = computeUkTakeHome({ ...base, salary: 40_000, studentLoans: ["plan1"] });
    expect(b.studentLoanByPlan).toEqual({ plan1: 1_254.15 });
  });

  it("does not apply the Plan 1 cap to a pair without Plan 1", () => {
    // Plan 2 and Plan 5: GOV.UK sets no cap rule for this pair, so the Plan 1 and Plan 2 split
    // must not touch it, and no Plan 1 entry appears for someone with no Plan 1 loan.
    const b = computeUkTakeHome({ ...base, salary: 40_000, studentLoans: ["plan2", "plan5"] });
    expect(b.studentLoanByPlan.plan1).toBeUndefined();
  });

  it("keeps a Postgraduate Loan separate at 6% over its own threshold", () => {
    // Salary £40,000. Plan 1 216.45 and Plan 2 1,037.70 as above.
    // Postgraduate: 6% x (40,000 - 21,000) = 6% x 19,000 = 1,140.
    // Total: 1,254.15 + 1,140 = 2,394.15.
    const b = computeUkTakeHome({
      ...base,
      salary: 40_000,
      studentLoans: ["plan1", "plan2", "postgrad"],
    });
    expect(b.studentLoanByPlan.postgrad).toBe(1_140);
    expect(b.studentLoanByPlan.plan1).toBeCloseTo(216.45, 2);
    expect(b.studentLoanByPlan.plan2).toBeCloseTo(1_037.7, 2);
    expect(b.studentLoan).toBe(2_394.15);
  });
});
