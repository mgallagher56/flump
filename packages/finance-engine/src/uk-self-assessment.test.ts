import { describe, expect, it } from "vitest";
import {
  calculatePropertyProfit,
  calculateSelfAssessmentPayments,
  calculateTradingProfit,
} from "./uk-self-assessment.js";
import { getUkTaxYearRules, UnsupportedUkTaxYearError } from "./uk-tax-year.js";

const rules = getUkTaxYearRules("2026/27");

describe("calculateSelfAssessmentPayments", () => {
  // https://www.gov.uk/understand-self-assessment-bill/payments-on-account (read 2026-11-14)
  it("matches the GOV.UK example: a 3,000 bill with no payments on account made", () => {
    const p = calculateSelfAssessmentPayments({ taxYear: "2023/24", bill: 3000 });
    expect(p.paymentsOnAccountDue).toBe(true);
    expect(p.paymentOnAccount).toBe(1500);
    expect(p.january).toEqual({ date: "2025-01-31", amount: 4500 });
    expect(p.july).toEqual({ date: "2025-07-31", amount: 1500 });
  });

  it("dates the payments 31 January and 31 July after the tax year ends", () => {
    const p = calculateSelfAssessmentPayments({ taxYear: "2026/27", bill: 2480 });
    expect(p.january).toEqual({ date: "2028-01-31", amount: 3720 });
    expect(p.july).toEqual({ date: "2028-07-31", amount: 1240 });
    expect(p.balancingPayment).toBe(2480);
  });

  it("asks for none when the bill is less than 1,000", () => {
    const p = calculateSelfAssessmentPayments({ taxYear: "2026/27", bill: 999.99 });
    expect(p.reason).toBe("bill-under-threshold");
    expect(p.january.amount).toBe(999.99);
    expect(p.july).toBeNull();
    expect(p.paymentOnAccount).toBe(0);
  });

  it("asks for them at exactly 1,000", () => {
    const p = calculateSelfAssessmentPayments({ taxYear: "2026/27", bill: 1000 });
    expect(p.reason).toBe("due");
    expect(p.january.amount).toBe(1500);
  });

  it("asks for none when more than 80% of the tax owed was taken at source", () => {
    const p = calculateSelfAssessmentPayments({
      taxYear: "2026/27",
      bill: 2000,
      taxDeductedAtSource: 9000,
    });
    expect(p.reason).toBe("mostly-taken-at-source");
    expect(p.january.amount).toBe(2000);
    expect(p.july).toBeNull();
  });

  it("asks for them when exactly 80% was taken at source", () => {
    const p = calculateSelfAssessmentPayments({
      taxYear: "2026/27",
      bill: 2000,
      taxDeductedAtSource: 8000,
    });
    expect(p.reason).toBe("due");
    expect(p.january.amount).toBe(3000);
  });

  it("splits an odd bill into two payments rounded to the penny", () => {
    const p = calculateSelfAssessmentPayments({ taxYear: "2026/27", bill: 1234.57 });
    expect(p.paymentOnAccount).toBe(617.29);
    expect(p.january.amount).toBe(1851.86);
  });

  it("treats a negative or unreadable bill as nothing due", () => {
    for (const bill of [-50, Number.NaN]) {
      const p = calculateSelfAssessmentPayments({ taxYear: "2026/27", bill });
      expect(p.january.amount).toBe(0);
      expect(p.july).toBeNull();
    }
  });

  it("throws for a tax year with no rules", () => {
    expect(() => calculateSelfAssessmentPayments({ taxYear: "2031/32", bill: 3000 })).toThrow(
      UnsupportedUkTaxYearError,
    );
  });
});

describe("calculateTradingProfit and calculatePropertyProfit", () => {
  it("never deduct more allowance than the income", () => {
    expect(calculateTradingProfit(400, 0, rules)).toEqual({ profit: 0, allowanceUsed: 400 });
    expect(calculatePropertyProfit(400, 0, rules)).toEqual({ profit: 0, allowanceUsed: 400 });
  });

  it("do not deduct costs on top of the allowance", () => {
    expect(calculateTradingProfit(5000, 900, rules)).toEqual({ profit: 4000, allowanceUsed: 1000 });
  });

  it("deduct the costs, floored at no profit, when they are larger", () => {
    expect(calculateTradingProfit(5000, 7000, rules)).toEqual({ profit: 0, allowanceUsed: 0 });
    expect(calculatePropertyProfit(5000, 1200, rules)).toEqual({ profit: 3800, allowanceUsed: 0 });
  });

  it("return no profit and no allowance for no income", () => {
    expect(calculateTradingProfit(0, 0, rules)).toEqual({ profit: 0, allowanceUsed: 0 });
    expect(calculateTradingProfit(Number.NaN, -5, rules)).toEqual({ profit: 0, allowanceUsed: 0 });
  });
});
