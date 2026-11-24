import { describe, expect, it } from "vitest";
import { computeUkTakeHome } from "./uk-take-home.js";
import { getUkIncomeThresholds } from "./uk-tax-thresholds.js";
import {
  calculateStudentLoanRepayment,
  getUkTaxYearRules,
  isStudentLoanRepayable,
  UnsupportedUkTaxYearError,
} from "./uk-tax-year.js";

// Education (Student Loans) (Repayment) Regulations 2009 (SI 2009/470) reg 15(2BA): "a borrower is
// not required to repay any part of a plan 5 loan on or before 5th April 2026".
// https://www.legislation.gov.uk/uksi/2009/470/regulation/15
// So Plan 5 collects nothing in 2023/24, 2024/25 and 2025/26; collection starts in 2026/27.
describe("Plan 5 repayments start in 2026/27 (SI 2009/470 reg 15(2BA))", () => {
  it("charges nothing on Plan 5 before 2026/27, and 9% over 25,000 from 2026/27", () => {
    for (const year of ["2023/24", "2024/25", "2025/26"]) {
      // Nothing is due in the year, whatever the pay.
      expect(calculateStudentLoanRepayment(35000, "plan5", getUkTaxYearRules(year)), year).toBe(0);
    }
    // 2026/27: (35,000 - 25,000) x 9% = 900.
    expect(calculateStudentLoanRepayment(35000, "plan5", getUkTaxYearRules("2026/27"))).toBe(900);
  });

  it("with Plan 2 and Plan 5 in 2025/26, only Plan 2 is charged", () => {
    // 2025/26 Plan 2 threshold 28,470: (35,000 - 28,470) x 9% = 587.70. Plan 5 (threshold 25,000)
    // would otherwise be the lowest threshold and charge 900, but nothing is due on it this year.
    const b = computeUkTakeHome({
      taxYear: "2025/26",
      region: "ENGLAND_NI_WALES",
      salary: 35000,
      studentLoans: ["plan2", "plan5"],
    });
    expect(b.studentLoan).toBeCloseTo(587.7, 2);
    expect(b.studentLoanByPlan).toEqual({ plan2: 587.7, plan5: 0 });
  });

  it("shows no Plan 5 repayment threshold before 2026/27", () => {
    const scenario = {
      region: "ENGLAND_NI_WALES" as const,
      salary: 35000,
      studentLoans: ["plan5" as const],
    };
    const loanEdges = (year: string) =>
      getUkIncomeThresholds(getUkTaxYearRules(year), scenario).filter(
        (t) => t.kind === "studentLoan",
      );
    expect(loanEdges("2025/26")).toEqual([]);
    // 2026/27: one edge, at Plan 5's 25,000.
    expect(loanEdges("2026/27").map((t) => [t.plan, t.grossAt])).toEqual([["plan5", 25000]]);
  });

  it("refuses a plan the year does not list with the engine's error (Plan 1 in 2027/28)", () => {
    // 2027/28 lists no Plan 1 threshold: the engine refuses rather than substitute a figure.
    expect(isStudentLoanRepayable(getUkTaxYearRules("2027/28"), "plan1")).toBe(false);
    expect(() =>
      getUkIncomeThresholds(getUkTaxYearRules("2027/28"), {
        region: "ENGLAND_NI_WALES",
        salary: 35000,
        studentLoans: ["plan1", "plan2"],
      }),
    ).toThrow(UnsupportedUkTaxYearError);
  });
});
