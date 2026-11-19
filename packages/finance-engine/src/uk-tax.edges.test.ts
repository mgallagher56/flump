import { describe, expect, it } from "vitest";
import {
  analyzeTaxTrap,
  calculate100kTaxTrap,
  calculateEwniIncomeTax,
  getTaxYearRemainingDays,
} from "./uk-tax.js";

// Figures from GOV.UK Income Tax rates and Personal Allowances, 2025/26, GOV.UK Scottish Income
// Tax 2025 to 2026 and GOV.UK National Insurance rates 2025/26, unless a case says otherwise.

describe("analyzeTaxTrap band edges", () => {
  it("keeps the Scottish basic rate on the last pound of the basic band", () => {
    // Scottish basic rate 20% on 15,398 to 27,491. 27,491 - 12,570 = 14,921 taxable, the top of
    // the band; one pound more is in the 21% intermediate band.
    expect(analyzeTaxTrap(27491, "SCOTLAND", "2025/26").marginalRatePct).toBe(20);
    expect(analyzeTaxTrap(27492, "SCOTLAND", "2025/26").marginalRatePct).toBe(21);
  });

  it("charges no NI on the marginal pound at exactly the primary threshold", () => {
    // Class 1 at 8% is on pay above 12,570. At 12,570 the marginal pound carries no income tax
    // (inside the allowance) and no NI; at 12,571 it carries 20% + 8% = 28%.
    expect(analyzeTaxTrap(12570, "ENGLAND_NI_WALES", "2025/26").effectiveMarginalRatePct).toBe(0);
    expect(analyzeTaxTrap(12571, "ENGLAND_NI_WALES", "2025/26").effectiveMarginalRatePct).toBe(28);
  });

  it("estimates no saving from escaping the taper when income is already below it", () => {
    // 80,000 is under the 100,000 taper start: nothing to escape, so the saving is 0, not the
    // (negative) tax difference between 80,000 and 100,000.
    const t = analyzeTaxTrap(80000, "ENGLAND_NI_WALES", "2025/26");
    expect(t.estimatedTaxSavedByEscapingGbp).toBe(0);
    expect(t.estimatedTaxSaved).toBe(0);
  });
});

describe("calculate100kTaxTrap", () => {
  it("treats the pension as salary sacrifice by default, which lowers NI pay", () => {
    // 52,000 with 5% sacrificed: 2,600, so pay is 49,400. Taxable 49,400 - 12,570 = 36,830, basic
    // rate 20%. NI pay 49,400 is under the 50,270 upper earnings limit, so 8%: 20 + 8 = 28.
    // (Net pay would leave NI on 52,000, over the limit, at 2%.)
    const t = calculate100kTaxTrap(52000, 5, undefined, "ENGLAND_NI_WALES", "2025/26");
    expect(t.effectiveMarginalRatePct).toBe(28);
  });
});

describe("calculateEwniIncomeTax", () => {
  it("widens the basic band by the Gift Aid extension", () => {
    // ITA 2007 s.414: grossed-up Gift Aid of 5,000 lifts the basic rate limit from 37,700 to
    // 42,700. Taxable 60,000 - 12,570 = 47,430: 42,700 x 20% = 8,540 plus
    // (47,430 - 42,700) x 40% = 4,730 x 0.4 = 1,892, total 10,432.
    expect(calculateEwniIncomeTax(60000, 12570, 5000, "2025/26")).toBe(10432);
  });
});

describe("getTaxYearRemainingDays", () => {
  it("counts whole days, rounding up, to the end of 5 April", () => {
    // From 00:00 on 1 January 2026 to 23:59:59 on 5 April 2026: January 31 days, February 28,
    // March 31 = 90 days to 1 April, plus 4 days to 5 April 00:00 = 94, plus most of 5 April,
    // so 94.99 days, rounded up to 95.
    const r = getTaxYearRemainingDays(new Date("2026-01-01T00:00:00Z"), "2025/26");
    expect(r.daysRemaining).toBe(95);
  });

  it("defaults to the 2025/26 tax year", () => {
    const r = getTaxYearRemainingDays(new Date("2026-01-01T00:00:00Z"));
    expect(r.endDateFormatted).toBe("5 April 2026");
    expect(r.daysRemaining).toBe(95);
  });
});
