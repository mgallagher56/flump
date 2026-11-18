import { describe, expect, it } from "vitest";
import {
  calculatePropertyProfit,
  calculateSelfAssessmentPayments,
  calculateTradingProfit,
  compareExpensesWithAllowance,
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

describe("compareExpensesWithAllowance", () => {
  // https://www.gov.uk/guidance/tax-free-allowances-on-property-and-trading-income (read 2026-11-18)
  // Every expected value below is worked by hand; none comes from the engine.

  it("gives full relief when income is 1,000 or less", () => {
    // income 800, expenses 100, allowance 1,000
    // usable allowance = min(1,000, 800) = 800 (never more than the income)
    // with allowance 800; with expenses 100; larger = allowance
    // 0 < income 800 <= 1,000, so within full relief
    const c = compareExpensesWithAllowance({
      source: "self-employed",
      taxYear: "2026/27",
      grossIncome: 800,
      recordedExpenses: 100,
    });
    expect(c.allowance).toBe(1000);
    expect(c.usableAllowance).toBe(800);
    expect(c.allowanceDeduction).toBe(800);
    expect(c.expensesDeduction).toBe(100);
    expect(c.withinFullRelief).toBe(true);
    expect(c.larger).toBe("allowance");
    expect(c.exclusions).toEqual(["partnership", "employer-or-connected"]);
    expect(c.sourceUrl).toBe(
      "https://www.gov.uk/guidance/tax-free-allowances-on-property-and-trading-income",
    );
  });

  it("reports expenses as larger when they are above the allowance", () => {
    // income 20,000, expenses 3,500, allowance 1,000 (2025/26)
    // with allowance = min(1,000, 20,000) = 1,000; with expenses 3,500
    // 3,500 > 1,000, so larger = expenses; income 20,000 > 1,000, so no full relief
    const c = compareExpensesWithAllowance({
      source: "self-employed",
      taxYear: "2025/26",
      grossIncome: 20000,
      recordedExpenses: 3500,
    });
    expect(c.larger).toBe("expenses");
    expect(c.expensesDeduction).toBe(3500);
    expect(c.allowanceDeduction).toBe(1000);
    expect(c.withinFullRelief).toBe(false);
  });

  it("reports the allowance as larger when expenses are below it", () => {
    // income 1,800, expenses 400, allowance 1,000
    // with allowance = min(1,000, 1,800) = 1,000; with expenses 400; larger = allowance
    const c = compareExpensesWithAllowance({
      source: "self-employed",
      taxYear: "2026/27",
      grossIncome: 1800,
      recordedExpenses: 400,
    });
    expect(c.usableAllowance).toBe(1000);
    expect(c.allowanceDeduction).toBe(1000);
    expect(c.expensesDeduction).toBe(400);
    expect(c.larger).toBe("allowance");
    expect(c.withinFullRelief).toBe(false);
  });

  it("reports equal when the two deductions match", () => {
    // income 5,000, expenses 1,000, allowance 1,000
    // with allowance = min(1,000, 5,000) = 1,000; with expenses 1,000; 1,000 = 1,000, so equal
    const c = compareExpensesWithAllowance({
      source: "self-employed",
      taxYear: "2026/27",
      grossIncome: 5000,
      recordedExpenses: 1000,
    });
    expect(c.allowanceDeduction).toBe(1000);
    expect(c.expensesDeduction).toBe(1000);
    expect(c.larger).toBe("equal");
  });

  it("allows nothing with no income, so the allowance cannot create a loss", () => {
    // income 0, expenses 0: usable allowance = min(1,000, 0) = 0; 0 = 0, so equal
    // income 0 is not above 0, so not within full relief
    const none = compareExpensesWithAllowance({
      source: "self-employed",
      taxYear: "2026/27",
      grossIncome: 0,
      recordedExpenses: 0,
    });
    expect(none.usableAllowance).toBe(0);
    expect(none.larger).toBe("equal");
    expect(none.withinFullRelief).toBe(false);
    // income 0, expenses 400: with allowance min(1,000, 0) = 0; with expenses 400; larger = expenses
    const costsOnly = compareExpensesWithAllowance({
      source: "self-employed",
      taxYear: "2026/27",
      grossIncome: 0,
      recordedExpenses: 400,
    });
    expect(costsOnly.allowanceDeduction).toBe(0);
    expect(costsOnly.expensesDeduction).toBe(400);
    expect(costsOnly.larger).toBe("expenses");
  });

  it("uses the owner's share of rent and expenses for rental", () => {
    // whole-property rent 12,000, expenses 1,600, owner's share 50%
    // share of rent = 12,000 x 0.5 = 6,000; share of expenses = 1,600 x 0.5 = 800
    // with allowance = min(1,000, 6,000) = 1,000; with expenses 800; larger = allowance
    const c = compareExpensesWithAllowance({
      source: "rental",
      taxYear: "2026/27",
      grossIncome: 12000,
      recordedExpenses: 1600,
      ownershipSharePct: 50,
    });
    expect(c.grossIncome).toBe(6000);
    expect(c.recordedExpenses).toBe(800);
    expect(c.allowanceDeduction).toBe(1000);
    expect(c.expensesDeduction).toBe(800);
    expect(c.larger).toBe("allowance");
    expect(c.exclusions).toEqual(["rent-a-room", "finance-cost-relief"]);
  });

  it("gives a joint owner full relief on a share of 1,000 or less", () => {
    // whole-property rent 1,500, expenses 0, share 50%: share of rent = 1,500 x 0.5 = 750
    // usable allowance = min(1,000, 750) = 750; 0 < 750 <= 1,000, so within full relief
    const c = compareExpensesWithAllowance({
      source: "rental",
      taxYear: "2026/27",
      grossIncome: 1500,
      recordedExpenses: 0,
      ownershipSharePct: 50,
    });
    expect(c.grossIncome).toBe(750);
    expect(c.usableAllowance).toBe(750);
    expect(c.withinFullRelief).toBe(true);
  });

  it("leaves finance costs out of rental expenses and says so", () => {
    // rent 9,000, expenses 600, finance costs 4,000, share 100%
    // finance costs are not expenses here: with expenses 600 (not 4,600)
    // with allowance = min(1,000, 9,000) = 1,000; 1,000 > 600, so larger = allowance
    const c = compareExpensesWithAllowance({
      source: "rental",
      taxYear: "2026/27",
      grossIncome: 9000,
      recordedExpenses: 600,
      financeCosts: 4000,
    });
    expect(c.recordedExpenses).toBe(600);
    expect(c.expensesDeduction).toBe(600);
    expect(c.financeCosts).toBe(4000);
    expect(c.financeCostsExcluded).toBe(true);
    expect(c.larger).toBe("allowance");
  });

  it("applies the owner's share to finance costs too", () => {
    // finance costs 4,000 x share 25% = 1,000
    const c = compareExpensesWithAllowance({
      source: "rental",
      taxYear: "2026/27",
      grossIncome: 9000,
      recordedExpenses: 600,
      financeCosts: 4000,
      ownershipSharePct: 25,
    });
    expect(c.financeCosts).toBe(1000);
    // expenses 600 x 25% = 150; rent 9,000 x 25% = 2,250
    expect(c.recordedExpenses).toBe(150);
    expect(c.grossIncome).toBe(2250);
  });

  it("ignores finance costs for self-employed income", () => {
    // finance costs are a rental rule only: self-employed finance costs read as 0
    const c = compareExpensesWithAllowance({
      source: "self-employed",
      taxYear: "2026/27",
      grossIncome: 9000,
      recordedExpenses: 600,
      financeCosts: 4000,
    });
    expect(c.financeCosts).toBe(0);
    expect(c.financeCostsExcluded).toBe(false);
  });

  it("throws for an unsupported year", () => {
    expect(() =>
      compareExpensesWithAllowance({
        source: "rental",
        taxYear: "2030/31",
        grossIncome: 1,
        recordedExpenses: 0,
      }),
    ).toThrow(UnsupportedUkTaxYearError);
  });
});
