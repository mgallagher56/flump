import { describe, expect, it } from "vitest";
import { calculateSection24Tax } from "./section24.js";

/**
 * The calculator's derived fields: the share of profit paid as tax, the higher rate flag and
 * how pence round. 2025/26, England, Wales and NI, hand-worked from GOV.UK, read 2026-11-19:
 * - Income Tax rates and Personal Allowances, 2025/26: personal allowance 12,570, basic rate
 *   20% on the first 37,700 of taxable income, higher rate 40% above it.
 * - Tax relief for residential landlords: how it's worked out (finance costs earn a 20% credit,
 *   ITTOIA 2005 s.272A and s.274AA).
 * - Tax-free allowances on property and trading income: property allowance 1,000.
 */
const Y = "2025/26" as const;
const run = (salary: number, rent: number, costs: number, interest: number) =>
  calculateSection24Tax({
    grossRentalIncomeGbp: rent,
    allowableExpensesGbp: costs,
    mortgageInterestGbp: interest,
    otherTaxableIncomeGbp: salary,
    taxYear: Y,
  });

describe("share of the rental profit paid as tax", () => {
  it("is the tax after the credit over the profit before interest, to one decimal place", () => {
    // Salary 30,000; rent 10,000; costs 2,000; interest 3,000. Profit 8,000, all at 20%:
    // 1,600, less the credit 20% x 3,000 = 600: 1,000. (The property allowance route would be
    // 9,000 x 20% = 1,800 with no credit, so the costs are kept.) 1,000 / 8,000 = 12.5%.
    const r = run(30000, 10000, 2000, 3000);
    expect(r.netRentalTaxLiabilityGbp).toBe(1000);
    expect(r.effectiveRentalTaxRatePct).toBe(12.5);
  });

  it("is 30% for a higher rate landlord: 4,800 on 16,000", () => {
    // Salary 60,000 (taxable 47,430, so higher rate); rent 18,000; costs 2,000; interest 8,000.
    // 16,000 x 40% = 6,400 less 20% x 8,000 = 1,600: 4,800. 4,800 / 16,000 = 30%.
    expect(run(60000, 18000, 2000, 8000).effectiveRentalTaxRatePct).toBe(30);
  });

  it("is 0 when costs take the whole rent", () => {
    // Rent 5,000 less costs 5,000 is no profit, so there is nothing to divide by.
    expect(run(30000, 5000, 5000, 0).effectiveRentalTaxRatePct).toBe(0);
  });
});

describe("higher rate flag", () => {
  it("is set from other income of 12,570 + 37,700 = 50,270", () => {
    expect(run(50270, 0, 0, 0).isHigherRate).toBe(true);
    expect(run(50269, 0, 0, 0).isHigherRate).toBe(false);
  });
});

describe("rounding", () => {
  it("never shows minus zero when the cash left rounds to nothing", () => {
    // Rent 0.70 less costs 0.40 less interest 0.30 is 0 in pence, but the floating point sum is
    // a tiny negative. en-GB currency formatting shows -0 as "-£0.00", so it must be +0.
    const r = run(30000, 0.7, 0.4, 0.3);
    expect(r.actualCashProfit).toBe(0);
    expect(Object.is(r.actualCashProfit, -0)).toBe(false);
    expect(Object.is(r.netRentalIncomeAfterTax, -0)).toBe(false);
  });
});
