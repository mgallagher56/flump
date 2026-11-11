import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getCurrentUKTaxYear,
  STUDENT_LOAN_WRITE_OFF_YEARS,
  UK_STUDENT_LOANS,
} from "./tax-rules.js";
import {
  runUkTaxVectors,
  selectUkTaxVectors,
  UK_TAX_PENSION_TREATMENT,
} from "./test-vectors/uk-tax.vectors.js";
import type { UkTaxYear } from "./types.js";
import {
  analyzeTaxTrap,
  calculateEmployerNISavings,
  calculateEwniIncomeTax,
  calculateNationalInsurance,
  calculatePersonalAllowance,
  calculateScottishIncomeTax,
  calculateStudentLoanDeduction,
  calculateTaxTrapRelief,
  calculateUKTakeHome,
  calculateUkTax,
  getTaxYearRemainingDays,
  SCOTLAND_GIFT_AID_DISCLAIMER,
  STUDENT_LOAN_THRESHOLDS,
} from "./uk-tax.js";
import { getCurrentUkTaxYear, UnsupportedUkTaxYearError } from "./uk-tax-year.js";

afterEach(() => {
  vi.useRealTimers();
});

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

    it("calculateTaxTrapRelief aliases work as expected", () => {
      const relief = calculateTaxTrapRelief(110000);
      expect(relief.isInTaxTrap).toBe(true);
      expect(relief.excessAbove100k).toBe(10000);
      expect(relief.recommendedSacrifice).toBe(10000);
      expect(relief.estimatedTaxSaved).toBe(6200);
      expect(relief.lostPersonalAllowance).toBe(5000);
    });
  });

  describe("calculateEmployerNISavings from the per-year table (E4 T7)", () => {
    it("every employerNiSaving vector matches calculateEmployerNISavings", () => {
      const vectors = selectUkTaxVectors({ kind: "employerNiSaving" });
      const res = runUkTaxVectors(vectors, (v) => {
        const i = v.input as { grossSalary: number; salarySacrifice: number };
        return calculateEmployerNISavings(i.grossSalary, i.salarySacrifice, v.taxYear);
      });
      expect(res.checked).toBeGreaterThanOrEqual(9);
      expect(res.failures).toEqual([]);
    });

    it("2025/26: 60000 salary, 3000 sacrifice gives 450 (15%, ST 5000)", () => {
      expect(calculateEmployerNISavings(60000, 3000, "2025/26")).toBe(450);
    });

    it("2024/25: 60000, 3000 gives 414 (13.8%, ST 9100)", () => {
      expect(calculateEmployerNISavings(60000, 3000, "2024/25")).toBe(414);
    });

    it("sacrifice capped at earnings above the secondary threshold (6000, 3000, 2026/27 gives 150)", () => {
      // 1000 above ST 5000 x 15% = 150; the other 2000 of sacrifice saves nothing
      expect(calculateEmployerNISavings(6000, 3000, "2026/27")).toBe(150);
    });

    it("rounds to pence, not whole pounds", () => {
      // 2024/25: 1234.56 x 13.8% = 170.36928
      expect(calculateEmployerNISavings(60000, 1234.56, "2024/25")).toBe(170.37);
    });

    it("defaults to the current tax year", () => {
      expect(calculateEmployerNISavings(60000, 3000)).toBe(
        calculateEmployerNISavings(60000, 3000, getCurrentUkTaxYear()),
      );
    });

    it("throws UnsupportedUkTaxYearError for 2030/31", () => {
      expect(() => calculateEmployerNISavings(60000, 3000, "2030/31")).toThrow(
        UnsupportedUkTaxYearError,
      );
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

  describe("calculateScottishIncomeTax (per-year table, E4 T6)", () => {
    it("2026/27 gross 50000 is 8982.05 (was a bare > 0 assertion)", () => {
      // Source: https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027
      // Taxable 50000 - 12570 = 37430: 3967*.19 = 753.73; 12989*.2 = 2597.8;
      // 14136*.21 = 2968.56; 6338*.42 = 2661.96. Total 8982.05.
      expect(calculateScottishIncomeTax(50000, 12570, "2026/27")).toBe(8982.05);
    });

    it("2025/26 and 2026/27 differ at 30000 (the tax year is honoured)", () => {
      const a = calculateScottishIncomeTax(30000, 12570, "2025/26");
      const b = calculateScottishIncomeTax(30000, 12570, "2026/27");
      // Taxable 17430. 2025/26: 2827*.19 + 12094*.2 + 2509*.21 = 537.13 + 2418.8 + 526.89 = 3482.82
      // 2026/27: 3967*.19 + 12989*.2 + 474*.21 = 753.73 + 2597.8 + 99.54 = 3451.07
      expect(a).toBe(3482.82);
      expect(b).toBe(3451.07);
    });

    it("uses the year's band widths for 2023/24 (no advanced band, 42% to 125140)", () => {
      // Taxable 50000 - 12570 = 37430: 2162*.19 + 10956*.2 + 17974*.21 + 6338*.42
      // = 410.78 + 2191.2 + 3774.54 + 2661.96 = 9038.48
      expect(calculateScottishIncomeTax(50000, 12570, "2023/24")).toBe(9038.48);
    });

    it("returns 0 at or below the personal allowance", () => {
      expect(calculateScottishIncomeTax(12570, 12570, "2025/26")).toBe(0);
      expect(calculateScottishIncomeTax(0, 12570, "2025/26")).toBe(0);
    });

    it("throws for an unsupported tax year", () => {
      expect(() => calculateScottishIncomeTax(50000, 12570, "2030/31")).toThrow(
        UnsupportedUkTaxYearError,
      );
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

    it("calculates Plan 2 repayment at 9% above the 2025/26 threshold of £28,470", () => {
      // https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2025-to-2026
      // (£38,470 - £28,470) * 9% = £10,000 * 0.09 = £900
      expect(calculateStudentLoanDeduction(38470, "PLAN_2", "2025/26")).toBe(900);
    });

    it("calculates Postgraduate repayment at 6% above £21,000", () => {
      // (£31,000 - £21,000) * 6% = £10,000 * 0.06 = £600
      expect(calculateStudentLoanDeduction(31000, "POSTGRAD", "2025/26")).toBe(600);
    });

    it("uses the per-year table: Plan 2 on 35,000 is 587.70 in 2025/26 and 505.35 in 2026/27", () => {
      // 2025/26: (35000 - 28470) * 9% = 587.70; 2026/27: (35000 - 29385) * 9% = 505.35
      expect(calculateStudentLoanDeduction(35000, "PLAN_2", "2025/26")).toBe(587.7);
      expect(calculateStudentLoanDeduction(35000, "PLAN_2", "2026/27")).toBe(505.35);
    });

    it("defaults the tax year to the current UK tax year", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-11-11T12:00:00Z"));
      expect(calculateStudentLoanDeduction(35000, "PLAN_2")).toBe(505.35);
      vi.setSystemTime(new Date("2026-01-11T12:00:00Z"));
      expect(calculateStudentLoanDeduction(35000, "PLAN_2")).toBe(587.7);
    });

    it("throws UnsupportedUkTaxYearError for an unknown year", () => {
      expect(() => calculateStudentLoanDeduction(35000, "PLAN_2", "2019/20")).toThrow(
        UnsupportedUkTaxYearError,
      );
    });

    it("matches every VERIFIED studentLoan vector", () => {
      const vectors = selectUkTaxVectors({ kind: "studentLoan", status: "VERIFIED" });
      expect(vectors.length).toBeGreaterThan(20);
      const res = runUkTaxVectors(vectors, (v) => {
        const input = v.input as { grossIncome: number; plan: string };
        const plan = input.plan === "postgrad" ? "POSTGRAD" : input.plan.replace("plan", "PLAN_");
        return calculateStudentLoanDeduction(input.grossIncome, plan as never, v.taxYear);
      });
      expect(res.failures).toEqual([]);
    });
  });

  describe("STUDENT_LOAN_THRESHOLDS (deprecated alias)", () => {
    it("is derived from the current year's UK_STUDENT_LOANS table", () => {
      const year = UK_STUDENT_LOANS[getCurrentUKTaxYear()] ?? UK_STUDENT_LOANS["2026/27"]!;
      expect(STUDENT_LOAN_THRESHOLDS.PLAN_2?.threshold).toBe(year.plans.plan2.threshold);
      expect(STUDENT_LOAN_THRESHOLDS.PLAN_1?.threshold).toBe(year.plans.plan1.threshold);
      expect(STUDENT_LOAN_THRESHOLDS.POSTGRAD?.rate).toBe(year.plans.postgrad.rate);
      expect(STUDENT_LOAN_THRESHOLDS.PLAN_2?.writeOffYears).toBe(
        STUDENT_LOAN_WRITE_OFF_YEARS.plan2,
      );
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

    it("handles basic rate taxpayer allowances", () => {
      const res = calculateUkTax({
        grossSalary: 30000,
      });
      expect(res.allowances.personalSavingsAllowanceGbp).toBe(1000); // Basic rate
      expect(res.allowances.marginalIncomeTaxBand).toBe("BASIC");
    });

    it("calculates UK take home with calculateUKTakeHome helper", () => {
      const res = calculateUKTakeHome(45000, 5, true);
      expect(res.netAnnual).toBeGreaterThan(0);
      expect(res.trapAnalysis.isInTaxTrap).toBe(false);
    });
  });

  describe("calculateUkTax EWNI on extended bands (E4 T5)", () => {
    const tax = (grossSalary: number, taxYear: UkTaxYear = "2025/26", giftAid = 0) =>
      calculateUkTax({ grossSalary, taxYear, giftAidContributionsGbp: giftAid });

    it("110000 EWNI 2025/26 incomeTaxGbp is 33432 (was 31432)", () => {
      expect(tax(110000).incomeTaxGbp).toBe(33432);
    });

    it("125140 gives 42516 and 150000 gives 53703", () => {
      expect(tax(125140).incomeTaxGbp).toBe(42516);
      expect(tax(150000).incomeTaxGbp).toBe(53703);
    });

    it("60000 with 1000 net Gift Aid gives 11182 (was 10682)", () => {
      expect(tax(60000, "2025/26", 1000).incomeTaxGbp).toBe(11182);
    });

    it("Gift Aid restores allowance: 105000 with 4000 net Gift Aid gives ANI 100000 and PA 12570", () => {
      const r = tax(105000, "2025/26", 4000);
      expect(r.adjustedNetIncomeGbp).toBe(100000);
      // Taxable = 105000 - 12570 (full allowance, no taper at ANI 100000) = 92430.
      expect(r.taxableIncomeGbp).toBe(92430);
      // Gross gift 5000 extends basic band to 42700: 42700*.2 = 8540; (92430-42700)*.4 = 19892.
      expect(r.incomeTaxGbp).toBe(28432);
    });

    it("pension is deducted net-pay from taxable income (pinned, owner ruling pending)", () => {
      expect(UK_TAX_PENSION_TREATMENT.pinned).toBe("net-pay");
      // 60000 salary, 5% pension 3000: taxable 60000 - 3000 - 12570 = 44430.
      // 37700*.2 = 7540; (44430-37700)*.4 = 2692; total 10232.
      const r = calculateUkTax({
        grossSalary: 60000,
        pensionContributionPct: 5,
        taxYear: "2025/26",
      });
      expect(r.incomeTaxGbp).toBe(10232);
    });

    it("default taxYear equals the current UK tax year", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2025-07-01T12:00:00Z"));
      expect(calculateUkTax({ grossSalary: 30000 }).taxYear).toBe("2025/26");
      vi.setSystemTime(new Date("2026-07-01T12:00:00Z"));
      expect(calculateUkTax({ grossSalary: 30000 }).taxYear).toBe("2026/27");
    });

    it("unknown tax year throws", () => {
      expect(() => calculateUkTax({ grossSalary: 30000, taxYear: "2030/31" as UkTaxYear })).toThrow(
        UnsupportedUkTaxYearError,
      );
    });

    it("every EWNI incomeTax vector matches calculateUkTax", () => {
      const vectors = selectUkTaxVectors({ kind: "incomeTax", region: "ENGLAND_NI_WALES" });
      const res = runUkTaxVectors(
        vectors,
        (v) =>
          tax((v.input as { grossIncome: number }).grossIncome, v.taxYear as UkTaxYear)
            .incomeTaxGbp,
      );
      expect(res.checked).toBeGreaterThan(20);
      expect(res.failures).toEqual([]);
    });

    it("every EWNI giftAid vector matches calculateUkTax", () => {
      const vectors = selectUkTaxVectors({ kind: "giftAid", region: "ENGLAND_NI_WALES" });
      const res = runUkTaxVectors(vectors, (v) => {
        const i = v.input as { grossIncome: number; giftAidNet: number };
        return tax(i.grossIncome, v.taxYear as UkTaxYear, i.giftAidNet).incomeTaxGbp;
      });
      expect(res.checked).toBe(14);
      expect(res.failures).toEqual([]);
    });
  });

  describe("calculateUkTax Scotland from the per-year table (E4 T6)", () => {
    const scot = (grossSalary: number, taxYear: UkTaxYear = "2025/26", giftAid = 0) =>
      calculateUkTax({
        grossSalary,
        taxYear,
        region: "SCOTLAND",
        giftAidContributionsGbp: giftAid,
      });

    it("every Scotland incomeTax vector matches calculateUkTax", () => {
      const vectors = selectUkTaxVectors({ kind: "incomeTax", region: "SCOTLAND" });
      const res = runUkTaxVectors(
        vectors,
        (v) =>
          scot((v.input as { grossIncome: number }).grossIncome, v.taxYear as UkTaxYear)
            .incomeTaxGbp,
      );
      expect(res.checked).toBeGreaterThanOrEqual(37);
      expect(res.failures).toEqual([]);
    });

    it("taper region: 110000 in 2025/26 is 37513.80 and the advanced band starts at taxable 62430", () => {
      const r = scot(110000);
      expect(r.taxableIncomeGbp).toBe(102430);
      expect(r.incomeTaxGbp).toBe(37513.8);
    });

    it("125140 in 2025/26 has no allowance and reaches the top of the advanced band", () => {
      const r = scot(125140);
      expect(r.taxableIncomeGbp).toBe(125140);
      expect(r.incomeTaxGbp).toBe(47733.3);
    });

    it("Scotland Gift Aid only changes the allowance taper, not the bands (D9-B)", () => {
      // 110000, 4000 net -> gross 5000. ANI 105000, taper 2500, PA 10070, taxable 99930.
      // 2025/26: 537.13 + 2418.8 + 3395.91 + 13161.96 + (99930 - 62430)*.45 (16875) = 36388.8
      const r = scot(110000, "2025/26", 4000);
      expect(r.adjustedNetIncomeGbp).toBe(105000);
      expect(r.taxableIncomeGbp).toBe(99930);
      expect(r.incomeTaxGbp).toBe(36388.8);
    });

    it("Scotland Gift Aid below the taper start changes nothing", () => {
      expect(scot(50000, "2026/27", 1000).incomeTaxGbp).toBe(8982.05);
    });

    it("carries the Gift Aid disclaimer only for Scotland with Gift Aid", () => {
      expect(SCOTLAND_GIFT_AID_DISCLAIMER).toMatch(/band extension is not modelled/i);
      expect(scot(50000, "2026/27", 1000).giftAidDisclaimer).toBe(SCOTLAND_GIFT_AID_DISCLAIMER);
      expect(scot(50000, "2026/27").giftAidDisclaimer).toBeUndefined();
      expect(
        calculateUkTax({ grossSalary: 50000, taxYear: "2026/27", giftAidContributionsGbp: 1000 })
          .giftAidDisclaimer,
      ).toBeUndefined();
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
