import { describe, expect, it } from "vitest";
import {
  analyzeTaxTrap,
  calculateEwniIncomeTax,
  calculateNationalInsurance,
  calculatePersonalAllowance,
  calculateScottishIncomeTax,
  calculateStudentLoanDeduction,
  calculateUkTax,
  getTaxYearRemainingDays,
} from "./uk-tax.js";

describe("uk-tax module", () => {
  describe("calculatePersonalAllowance", () => {
    it("returns full personal allowance of £12,570 for income <= £100,000", () => {
      const res = calculatePersonalAllowance(85000);
      expect(res.effectiveAllowance).toBe(12570);
      expect(res.taperAmount).toBe(0);
    });

    it("tapers allowance by £1 for every £2 above £100,000", () => {
      // £110,000 is £10,000 over £100k -> taper = £5,000 -> allowance = £7,570
      const res = calculatePersonalAllowance(110000);
      expect(res.taperAmount).toBe(5000);
      expect(res.effectiveAllowance).toBe(7570);
    });

    it("reduces allowance to £0 when income reaches £125,140", () => {
      const res = calculatePersonalAllowance(125140);
      expect(res.taperAmount).toBe(12570);
      expect(res.effectiveAllowance).toBe(0);
    });

    it("maintains £0 allowance for income exceeding £125,140", () => {
      const res = calculatePersonalAllowance(150000);
      expect(res.effectiveAllowance).toBe(0);
    });
  });

  describe("analyzeTaxTrap", () => {
    it("accurately identifies £110k earner in 60% tax trap", () => {
      const trap = analyzeTaxTrap(110000, "ENGLAND_NI_WALES");
      expect(trap.isInTaxTrap).toBe(true);
      expect(trap.marginalRatePct).toBe(60);
      expect(trap.excessOver100kGbp).toBe(10000);
      expect(trap.contributionRequiredToEscapeGbp).toBe(10000);
      expect(trap.estimatedTaxSavedByEscapingGbp).toBe(6000);
    });

    it("identifies Scottish taxpayer in trap with higher marginal rate", () => {
      const trap = analyzeTaxTrap(110000, "SCOTLAND");
      expect(trap.isInTaxTrap).toBe(true);
      expect(trap.marginalRatePct).toBe(67.5);
    });

    it("reports not in trap for £80k earner", () => {
      const trap = analyzeTaxTrap(80000);
      expect(trap.isInTaxTrap).toBe(false);
      expect(trap.excessOver100kGbp).toBe(0);
      expect(trap.contributionRequiredToEscapeGbp).toBe(0);
    });
  });

  describe("calculateEwniIncomeTax", () => {
    it("returns 0 for income within personal allowance", () => {
      expect(calculateEwniIncomeTax(12000, 12570)).toBe(0);
    });

    it("calculates 20% basic rate correctly", () => {
      // £30,000 income - £12,570 allowance = £17,430 at 20% = £3,486
      expect(calculateEwniIncomeTax(30000, 12570)).toBe(3486);
    });

    it("calculates higher rate (40%) correctly for £60k earner", () => {
      // Basic rate band: £37,700 * 20% = £7,540
      // Higher rate band: (£60,000 - £50,270) * 40% = £9,730 * 40% = £3,892
      // Total = £11,432
      expect(calculateEwniIncomeTax(60000, 12570)).toBe(11432);
    });
  });

  describe("calculateScottishIncomeTax", () => {
    it("applies Scottish starter, basic, intermediate, and higher bands", () => {
      const tax = calculateScottishIncomeTax(50000, 12570);
      expect(tax).toBeGreaterThan(0);
    });
  });

  describe("calculateNationalInsurance", () => {
    it("returns 0 below primary threshold of £12,570", () => {
      expect(calculateNationalInsurance(12000)).toBe(0);
    });

    it("calculates 8% main rate up to £50,270", () => {
      // (£30,000 - £12,570) * 8% = £17,430 * 0.08 = £1,394.40
      expect(calculateNationalInsurance(30000)).toBe(1394.4);
    });

    it("calculates 2% upper rate above £50,270", () => {
      // Main rate band: (£50,270 - £12,570) * 8% = £37,700 * 0.08 = £3,016
      // Upper band: (£60,000 - £50,270) * 2% = £9,730 * 0.02 = £194.60
      // Total = £3,210.60
      expect(calculateNationalInsurance(60000)).toBe(3210.6);
    });
  });

  describe("calculateStudentLoanDeduction", () => {
    it("returns 0 for NONE", () => {
      expect(calculateStudentLoanDeduction(40000, "NONE")).toBe(0);
    });

    it("calculates Plan 2 repayment at 9% above £28,470", () => {
      // (£38,470 - £28,470) * 9% = £10,000 * 0.09 = £900
      expect(calculateStudentLoanDeduction(38470, "PLAN_2")).toBe(900);
    });

    it("calculates Postgraduate repayment at 6% above £21,000", () => {
      // (£31,000 - £21,000) * 6% = £10,000 * 0.06 = £600
      expect(calculateStudentLoanDeduction(31000, "POSTGRAD")).toBe(600);
    });
  });

  describe("calculateUkTax full pipeline", () => {
    it("handles standard PAYE salary with pension and allowances", () => {
      const res = calculateUkTax({
        grossSalary: 60000,
        pensionContributionPct: 5,
        employerPensionMatchPct: 3,
        isSalarySacrifice: true,
        studentLoanPlan: "PLAN_2",
      });

      expect(res.grossIncomeGbp).toBe(60000);
      expect(res.employeePensionDeductionGbp).toBe(3000);
      expect(res.employerPensionContributionGbp).toBe(1800);
      expect(res.adjustedNetIncomeGbp).toBe(57000);
      expect(res.netTakeHomePayAnnualGbp).toBeGreaterThan(0);
      expect(res.allowances.isaAllowanceGbp).toBe(20000);
      expect(res.allowances.pensionAnnualAllowanceGbp).toBe(60000);
      expect(res.allowances.personalSavingsAllowanceGbp).toBe(500); // Higher rate
    });

    it("detects £108k earner in tax trap and outputs allowance status", () => {
      const res = calculateUkTax({
        grossSalary: 108000,
      });

      expect(res.taxTrap.isInTaxTrap).toBe(true);
      expect(res.taxTrap.excessOver100kGbp).toBe(8000);
      expect(res.taxTrap.contributionRequiredToEscapeGbp).toBe(8000);
    });
  });

  describe("getTaxYearRemainingDays", () => {
    it("returns positive days remaining before 5 April", () => {
      const res = getTaxYearRemainingDays(new Date("2026-01-01T00:00:00Z"), "2025/26");
      expect(res.daysRemaining).toBeGreaterThan(0);
      expect(res.endDateFormatted).toBe("5 April 2026");
    });
  });
});
