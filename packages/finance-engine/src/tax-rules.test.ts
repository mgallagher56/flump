import { describe, expect, it } from "vitest";
import {
  buildLegacyUKConfig,
  calculateIrishTakeHome,
  calculateScottishIncomeTaxOnTaxable,
  calculateUKEWNIIncomeTaxOnTaxable,
  calculateUKEWNITakeHome,
  getAvailableIrishTaxYears,
  getAvailableUKTaxYears,
  getCurrentIrishTaxYear,
  getCurrentUKTaxYear,
  getIrishTaxYearForDate,
  TAX_DISCLAIMER,
  UK_EWNI_INCOME_TAX,
  UK_SCOTLAND_INCOME_TAX,
} from "./tax-rules.js";

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

    const irishYears = getAvailableIrishTaxYears();
    expect(irishYears.length).toBeGreaterThan(0);
    expect(irishYears).toContain("2024");

    const currentUK = getCurrentUKTaxYear();
    expect(typeof currentUK).toBe("string");

    const currentIrish = getCurrentIrishTaxYear();
    expect(typeof currentIrish).toBe("string");

    expect(getIrishTaxYearForDate("2024-06-15")).toBe("2024");
    expect(getIrishTaxYearForDate("2025-01-01")).toBe("2025");
  });

  it("builds legacy UK config", () => {
    const config24 = buildLegacyUKConfig("2024/25");
    expect(config24.personalAllowance).toBe(12570);
    expect(config24.higherRateLimit).toBe(125140);

    const config23 = buildLegacyUKConfig("2023/24");
    expect(config23.personalAllowance).toBe(12570);

    const fallbackConfig = buildLegacyUKConfig("1999/00");
    expect(fallbackConfig.personalAllowance).toBe(12570);
  });

  it("calculates UK EWNI Income Tax on taxable amounts across bands", () => {
    const yearConfig = UK_EWNI_INCOME_TAX["2024/25"]!;

    // 0 taxable
    expect(calculateUKEWNIIncomeTaxOnTaxable(0, yearConfig)).toBe(0);

    // Basic rate only (£20,000 taxable at 20%)
    const basicTax = calculateUKEWNIIncomeTaxOnTaxable(20000, yearConfig);
    expect(basicTax).toBe(4000);

    // Higher rate band (£50,000 taxable: 37700 @ 20% + 12300 @ 40%)
    const higherTax = calculateUKEWNIIncomeTaxOnTaxable(50000, yearConfig);
    expect(higherTax).toBe(37700 * 0.2 + 12300 * 0.4);

    // Additional rate band (£150,000 taxable)
    const addTax = calculateUKEWNIIncomeTaxOnTaxable(150000, yearConfig);
    expect(addTax).toBeGreaterThan(higherTax);
  });

  it("calculates Scottish Income Tax across all bands", () => {
    const scotConfig = UK_SCOTLAND_INCOME_TAX["2024/25"]!;
    expect(calculateScottishIncomeTaxOnTaxable(0, scotConfig)).toBe(0);

    // Starter band (up to £2,306 at 19%)
    const starterTax = calculateScottishIncomeTaxOnTaxable(2000, scotConfig);
    expect(starterTax).toBeCloseTo(2000 * 0.19, 1);

    // Intermediate/higher
    const higherTax = calculateScottishIncomeTaxOnTaxable(50000, scotConfig);
    expect(higherTax).toBeGreaterThan(starterTax);
  });

  it("calculates UK EWNI take home for employed and self-employed", () => {
    const employedRes = calculateUKEWNITakeHome(50000, "employed", 5, true, "2024/25");
    expect(employedRes.gross).toBe(50000);
    expect(employedRes.netAnnual).toBeGreaterThan(0);
    expect(employedRes.monthlyTakeHome).toBe(Math.round(employedRes.netAnnual / 12));
    expect(employedRes.ni).toBeGreaterThan(0);
    expect(employedRes.studentLoan).toBe(0);

    // With non-salary sacrifice
    const nonSacrificeRes = calculateUKEWNITakeHome(50000, "employed", 5, false, "2024/25");
    expect(nonSacrificeRes.netAnnual).toBeGreaterThan(0);

    // Self-employed
    const selfEmployedRes = calculateUKEWNITakeHome(50000, "self-employed", 0, false, "2024/25");
    expect(selfEmployedRes.gross).toBe(50000);
    expect(selfEmployedRes.ni).toBeGreaterThan(0);

    // High earner (> £100,000)
    const highEarnerRes = calculateUKEWNITakeHome(130000, "employed", 0, false, "2024/25");
    expect(highEarnerRes.personalAllowance).toBe(0);

    // Zero or other employment type
    const zeroRes = calculateUKEWNITakeHome(0, "employed", 0, false, "2024/25");
    expect(zeroRes.netAnnual).toBe(0);
    expect(zeroRes.incomeTax).toBe(0);

    const otherRes = calculateUKEWNITakeHome(50000, "other", 0, false, "2024/25");
    expect(otherRes.netAnnual).toBe(50000);
  });

  it("calculates Irish take home correctly", () => {
    // Single employed earner
    const singleRes = calculateIrishTakeHome(50000, "2024", "employed");
    expect(singleRes.gross).toBe(50000);
    expect(singleRes.incomeTax).toBeGreaterThan(0);
    expect(singleRes.usc).toBeGreaterThan(0);
    expect(singleRes.prsi).toBeGreaterThan(0);
    expect(singleRes.netAnnual).toBeGreaterThan(0);

    // Self-employed earner
    const selfEmployedRes = calculateIrishTakeHome(70000, "2024", "self-employed");
    expect(selfEmployedRes.prsi).toBeGreaterThan(0);

    // Low income exempt from USC (< threshold)
    const lowIncomeRes = calculateIrishTakeHome(12000, "2024", "employed");
    expect(lowIncomeRes.usc).toBe(0);

    // Zero gross or other
    const zeroRes = calculateIrishTakeHome(0, "2024", "employed");
    expect(zeroRes.netAnnual).toBe(0);

    const otherRes = calculateIrishTakeHome(50000, "2024", "other");
    expect(otherRes.netAnnual).toBe(50000);
  });
});

describe("calculateUKEWNIIncomeTaxOnTaxable additional-rate threshold (E4 T4)", () => {
  it("taxable 125140 in 2025/26 is 42516, not 43144.50", () => {
    expect(calculateUKEWNIIncomeTaxOnTaxable(125140, UK_EWNI_INCOME_TAX["2025/26"]!)).toBe(42516);
  });

  it("taxable 150000 in 2026/27 is 53703", () => {
    expect(calculateUKEWNIIncomeTaxOnTaxable(150000, UK_EWNI_INCOME_TAX["2026/27"]!)).toBe(53703);
  });
});
