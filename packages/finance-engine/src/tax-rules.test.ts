import { describe, expect, it } from "vitest";
import {
  getAvailableUKTaxYears,
  getCurrentUKTaxYear,
  TAX_DISCLAIMER,
  UK_EWNI_INCOME_TAX,
} from "./tax-rules.js";
import { computeUkTakeHome } from "./uk-take-home.js";
import {
  calculateIncomeTaxOnTaxable,
  getUkTaxYearRules,
  resolveUkTaxYear,
  UnsupportedUkTaxYearError,
} from "./uk-tax-year.js";

const EWNI = "ENGLAND_NI_WALES" as const;

describe("tax-rules", () => {
  it("exports disclaimers", () => {
    expect(TAX_DISCLAIMER.short).toBeDefined();
    expect(TAX_DISCLAIMER.full).toBeDefined();
    expect(TAX_DISCLAIMER.mobile).toBeDefined();
  });

  it("provides available and current tax years", () => {
    const ukYears = getAvailableUKTaxYears();
    expect(ukYears.length).toBeGreaterThan(0);
    expect(ukYears).toContain("2024/25");

    const currentUK = getCurrentUKTaxYear();
    expect(typeof currentUK).toBe("string");
  });

  it("holds the personal allowance and additional-rate threshold per year", () => {
    expect(UK_EWNI_INCOME_TAX["2024/25"]?.personalAllowance).toBe(12570);
    expect(UK_EWNI_INCOME_TAX["2024/25"]?.additionalRateThreshold).toBe(125140);
    expect(UK_EWNI_INCOME_TAX["2023/24"]?.personalAllowance).toBe(12570);
    expect(() => resolveUkTaxYear("1999/00")).toThrow(UnsupportedUkTaxYearError);
  });

  it("calculates UK EWNI Income Tax on taxable amounts across bands", () => {
    const rules = getUkTaxYearRules("2024/25");
    const tax = (taxable: number) => calculateIncomeTaxOnTaxable(taxable, rules, EWNI).total;

    // 0 taxable
    expect(tax(0)).toBe(0);

    // Basic rate only (£20,000 taxable at 20%)
    expect(tax(20000)).toBe(4000);

    // Higher rate band (£50,000 taxable: 37,700 @ 20% + 12,300 @ 40% = 7,540 + 4,920)
    const higherTax = tax(50000);
    expect(higherTax).toBe(12460);

    // Additional rate band (£150,000 taxable):
    // 37,700 @ 20% = 7,540; (125,140 - 37,700) = 87,440 @ 40% = 34,976;
    // (150,000 - 125,140) = 24,860 @ 45% = 11,187. Total 53,703.
    const addTax = tax(150000);
    expect(addTax).toBeGreaterThan(higherTax);
    expect(addTax).toBe(53703);
  });

  it("calculates Scottish Income Tax across all bands", () => {
    const rules = getUkTaxYearRules("2024/25");
    const tax = (taxable: number) => calculateIncomeTaxOnTaxable(taxable, rules, "SCOTLAND").total;
    expect(tax(0)).toBe(0);

    // Starter band (up to £2,306 at 19%)
    const starterTax = tax(2000);
    expect(starterTax).toBeCloseTo(2000 * 0.19, 1);

    // Intermediate/higher
    const higherTax = tax(50000);
    expect(higherTax).toBeGreaterThan(starterTax);
  });

  it("calculates UK EWNI take home for employed and self-employed", () => {
    const employedRes = computeUkTakeHome({
      taxYear: "2024/25",
      region: EWNI,
      salary: 50000,
      pension: { method: "salary-sacrifice", pct: 5 },
    });
    expect(employedRes.grossPay).toBe(50000);
    expect(employedRes.takeHome).toBeGreaterThan(0);
    expect(employedRes.nationalInsurance).toBeGreaterThan(0);
    expect(employedRes.studentLoan).toBe(0);

    // Net-pay pension (not salary sacrifice)
    const nonSacrificeRes = computeUkTakeHome({
      taxYear: "2024/25",
      region: EWNI,
      salary: 50000,
      pension: { method: "net-pay", pct: 5 },
    });
    expect(nonSacrificeRes.takeHome).toBeGreaterThan(0);

    // Self-employed
    const selfEmployedRes = computeUkTakeHome({
      taxYear: "2024/25",
      region: EWNI,
      salary: 50000,
      selfEmployed: true,
    });
    expect(selfEmployedRes.grossPay).toBe(50000);
    expect(selfEmployedRes.niClass).toBe("class4");
    expect(selfEmployedRes.nationalInsurance).toBeGreaterThan(0);

    // High earner (> £100,000): 130,000 tapers the whole 12,570 away
    const highEarnerRes = computeUkTakeHome({ taxYear: "2024/25", region: EWNI, salary: 130000 });
    expect(highEarnerRes.personalAllowance).toBe(0);

    // Zero income
    const zeroRes = computeUkTakeHome({ taxYear: "2024/25", region: EWNI, salary: 0 });
    expect(zeroRes.takeHome).toBe(0);
    expect(zeroRes.incomeTax).toBe(0);
  });
});

describe("EWNI income tax additional-rate threshold (E4 T4)", () => {
  it("taxable 125140 in 2025/26 is 42516, not 43144.50", () => {
    expect(calculateIncomeTaxOnTaxable(125140, getUkTaxYearRules("2025/26"), EWNI).total).toBe(
      42516,
    );
  });

  it("taxable 150000 in 2026/27 is 53703", () => {
    expect(calculateIncomeTaxOnTaxable(150000, getUkTaxYearRules("2026/27"), EWNI).total).toBe(
      53703,
    );
  });

  describe("take-home student loan", () => {
    const studentLoan = (
      taxYear: string,
      salary: number,
      plans: readonly ("plan2" | "plan4")[],
      pension?: { method: "salary-sacrifice" | "net-pay"; pct: number },
    ) =>
      computeUkTakeHome({ taxYear, region: EWNI, salary, studentLoans: plans, pension })
        .studentLoan;

    // Plan 2 on 35,000, no pension, rounded to pence:
    // 2025/26 (35000-28470)*9% = 6530*0.09 = 587.70;
    // 2026/27 (35000-29385)*9% = 5615*0.09 = 505.35. Thresholds: GOV.UK employer rates pages.
    // (The deleted whole-pound wrapper gave 588 and 505.)
    it("reads the per-year student loan table", () => {
      expect(studentLoan("2025/26", 35000, ["plan2"])).toBe(587.7);
      expect(studentLoan("2026/27", 35000, ["plan2"])).toBe(505.35);
    });

    it("returns 0 for none and below threshold", () => {
      expect(studentLoan("2026/27", 35000, [])).toBe(0);
      expect(studentLoan("2026/27", 25000, ["plan2"])).toBe(0);
    });

    // I4: only salary sacrifice reduces student-loan earnings.
    // Plan 2 2026/27 on 35,000 with 5% pension (1,750), rounded to pence:
    //   net pay:   (35000-29385)*9% = 5615*0.09 = 505.35
    //   sacrifice: (33250-29385)*9% = 3865*0.09 = 347.85 (the whole-pound wrapper gave 348)
    it("only salary sacrifice reduces student loan earnings", () => {
      expect(studentLoan("2026/27", 35000, ["plan2"], { method: "net-pay", pct: 5 })).toBe(505.35);
      expect(studentLoan("2026/27", 35000, ["plan2"], { method: "salary-sacrifice", pct: 5 })).toBe(
        347.85,
      );
    });

    it("floors the personal allowance taper to whole pounds", () => {
      // 110,001: taper = floor(10,001/2) = 5,000 -> PA 7,570, taxable 102,431
      // (an unfloored 5,000.5 gave taxable 102,431.5)
      const res = computeUkTakeHome({ taxYear: "2026/27", region: EWNI, salary: 110001 });
      expect(res.personalAllowance).toBe(7570);
      expect(res.taxableIncome).toBe(102431);
    });

    it("throws when the plan has no verified entry for the year (no silent zero)", () => {
      // 2020/21 page lists no Plan 4 threshold
      expect(() => studentLoan("2020/21", 35000, ["plan4"])).toThrow(UnsupportedUkTaxYearError);
    });
  });
});
