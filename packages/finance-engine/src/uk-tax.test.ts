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
  UK_TAX_VECTORS,
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
  STUDENT_LOAN_THRESHOLDS,
  toStudentLoanPlanKey,
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

  describe("tax trap default year after the last supported year", () => {
    it("does not throw when the clock passes 6 April 2027 (falls back to the latest supported year)", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2027-04-06T12:00:00Z"));
      expect(() => calculateTaxTrapRelief(110000)).not.toThrow();
      expect(() => analyzeTaxTrap(110000)).not.toThrow();
      expect(() => calculate100kTaxTrap(110000)).not.toThrow();
      expect(calculateTaxTrapRelief(110000)).toEqual(calculateTaxTrapRelief(110000, "2026/27"));
    });

    it("still throws for an explicitly passed unsupported year", () => {
      expect(() => calculateTaxTrapRelief(110000, "2027/28")).toThrow(UnsupportedUkTaxYearError);
      expect(() => analyzeTaxTrap(110000, "ENGLAND_NI_WALES", "2027/28")).toThrow(
        UnsupportedUkTaxYearError,
      );
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

    // I6. Hand derivations use 2025/26 tables (PA 12,570; EWNI basic band 37,700, additional above
    // 125,140; Scotland taxable bands 2,827 / 14,921 / 31,092 / 62,430 / 125,140 at 19/20/21/42/45/48%;
    // NI 8% to 50,270 then 2%). Rates are income tax only; the effective rate adds employee NI.
    it.each([
      // [income, region, marginalRatePct, effectiveMarginalRatePct]
      [10000, "ENGLAND_NI_WALES", 0, 0], // inside the personal allowance
      [30000, "ENGLAND_NI_WALES", 20, 28],
      [50270, "ENGLAND_NI_WALES", 20, 28], // taxable 37,700 is the last basic-rate pound
      [50271, "ENGLAND_NI_WALES", 40, 42],
      [125141, "ENGLAND_NI_WALES", 45, 47],
      [10000, "SCOTLAND", 0, 0],
      [15000, "SCOTLAND", 19, 27], // taxable 2,430, starter band
      [20000, "SCOTLAND", 20, 28], // taxable 7,430, basic band
      [30000, "SCOTLAND", 21, 29], // taxable 17,430, intermediate band
      [50000, "SCOTLAND", 42, 50], // taxable 37,430, higher band (old code: 20); NI still 8% below 50,270
      [74000, "SCOTLAND", 42, 44], // taxable 61,430, still higher band
      [80000, "SCOTLAND", 45, 47], // taxable 67,430, advanced band from 75,000 gross (old code: 42)
      [125141, "SCOTLAND", 48, 50], // top band
    ] as const)(
      "marginal rates outside the trap: %i %s -> %d / %d",
      (income, region, rate, eff) => {
        const t = analyzeTaxTrap(income, region, "2025/26");
        expect(t.marginalRatePct).toBe(rate);
        expect(t.effectiveMarginalRatePct).toBe(eff);
      },
    );

    it("Scottish trap rate follows the year's band: 2023/24 Higher 42% x 1.5 = 63", () => {
      // 2023/24 Scotland has no Advanced band: taxable 102,430 is in Higher (42% to 125,140).
      expect(analyzeTaxTrap(110000, "SCOTLAND", "2023/24").marginalRatePct).toBe(63);
      expect(analyzeTaxTrap(110000, "SCOTLAND", "2025/26").marginalRatePct).toBe(67.5);
    });

    it("EWNI tax saved by escaping at 150,000 is the true tax difference, 26,271 (not 22,500)", () => {
      // tax(150,000): PA 0; 37,700 x 20% = 7,540; (125,140 - 37,700) x 40% = 34,976; 24,860 x 45% = 11,187 -> 53,703
      // tax(100,000): taxable 87,430: 7,540 + 49,730 x 40% = 19,892 -> 27,432
      const t = analyzeTaxTrap(150000, "ENGLAND_NI_WALES", "2025/26");
      expect(t.estimatedTaxSavedByEscapingGbp).toBe(26271);
      // plus employee NI saved: 50,000 x 2% = 1,000
      expect(t.estimatedTaxSaved).toBe(27271);
    });

    it("Scottish tax saved by escaping at 150,000 is 28,902.30 (income tax) / 29,902.30 (with NI)", () => {
      // tax(150,000): 537.13 + 2,418.80 + 3,395.91 + 13,161.96 + 62,710 x 45% (28,219.50) + 24,860 x 48% (11,932.80) = 59,666.10
      // tax(100,000): taxable 87,430: 19,513.80 + 25,000 x 45% = 30,763.80
      const t = analyzeTaxTrap(150000, "SCOTLAND", "2025/26");
      expect(t.estimatedTaxSavedByEscapingGbp).toBe(28902.3);
      expect(t.estimatedTaxSaved).toBe(29902.3);
    });

    it("rounds escape savings to pence, not whole pounds", () => {
      // 100,001: PA unchanged (floor 0.5 = 0), 1 x 40% = 0.40 income tax, 1 x 2% = 0.02 NI
      const t = analyzeTaxTrap(100001, "ENGLAND_NI_WALES", "2025/26");
      expect(t.estimatedTaxSavedByEscapingGbp).toBe(0.4);
      expect(t.estimatedTaxSaved).toBe(0.42);
    });

    it("saves nothing at or below the escape level", () => {
      const t = analyzeTaxTrap(100000, "SCOTLAND", "2025/26");
      expect(t.estimatedTaxSavedByEscapingGbp).toBe(0);
      expect(t.estimatedTaxSaved).toBe(0);
    });

    it("defaults the tax year to the current year and throws for an unsupported year", () => {
      expect(analyzeTaxTrap(110000).marginalRatePct).toBe(60);
      expect(() => analyzeTaxTrap(110000, "ENGLAND_NI_WALES", "1999/00")).toThrow(
        UnsupportedUkTaxYearError,
      );
    });

    it("calculateTaxTrapRelief aliases work as expected", () => {
      const relief = calculateTaxTrapRelief(110000);
      expect(relief.isInTaxTrap).toBe(true);
      expect(relief.excessAbove100k).toBe(10000);
      expect(relief.recommendedSacrifice).toBe(10000);
      expect(relief.estimatedTaxSaved).toBe(6200);
      // D7-a: income tax only (60) and incl. NI (62) are separate fields
      expect(relief.marginalRatePct).toBe(60);
      expect(relief.effectiveMarginalRatePct).toBe(62);
      expect(relief.estimatedTaxSavedByEscapingGbp).toBe(6000);
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

  describe("calculateUkTax employee NI uses the per-year table", () => {
    it("matches every employeeNi vector for its tax year", () => {
      let checked = 0;
      for (const v of UK_TAX_VECTORS) {
        if (v.kind !== "employeeNi") continue;
        const { grossEarnings } = v.input as { grossEarnings: number };
        const r = calculateUkTax({ grossSalary: grossEarnings, taxYear: v.taxYear });
        expect(r.nationalInsuranceGbp, v.id).toBeCloseTo(v.expected, 2);
        checked++;
      }
      expect(checked).toBeGreaterThan(0);
    });

    it("gives 2460, about 2303 and about 2004 at 30,000 for 2020/21, 2022/23 and 2023/24", () => {
      expect(calculateUkTax({ grossSalary: 30000, taxYear: "2020/21" }).nationalInsuranceGbp).toBe(
        2460,
      );
      // 2022/23 table (11,908 PT, 12.73%): (30,000 - 11,908) x 0.1273 = 2,303.11 (rounded 2,303).
      expect(
        calculateUkTax({ grossSalary: 30000, taxYear: "2022/23" }).nationalInsuranceGbp,
      ).toBeCloseTo(2303.11, 2);
      expect(
        calculateUkTax({ grossSalary: 30000, taxYear: "2023/24" }).nationalInsuranceGbp,
      ).toBeCloseTo(2004.45, 2);
    });
  });

  describe("toStudentLoanPlanKey", () => {
    it("ignores inherited properties such as constructor", () => {
      expect(toStudentLoanPlanKey("constructor")).toBeUndefined();
      expect(toStudentLoanPlanKey("toString")).toBeUndefined();
      expect(toStudentLoanPlanKey("PLAN_2")).toBe("plan2");
      expect(calculateStudentLoanDeduction(40000, "constructor" as never)).toBe(0);
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

  describe("calculateUkTax reports the pension annual allowance for the requested year", () => {
    it("uses 40,000 for 2021/22 and 60,000 for 2024/25", () => {
      const old = calculateUkTax({ grossSalary: 50000, taxYear: "2021/22" });
      expect(old.allowances.pensionAnnualAllowanceGbp).toBe(40000);
      expect(old.allowances.pensionAllowanceRemainingGbp).toBe(40000);
      const recent = calculateUkTax({ grossSalary: 50000, taxYear: "2024/25" });
      expect(recent.allowances.pensionAnnualAllowanceGbp).toBe(60000);
      expect(recent.allowances.pensionAllowanceRemainingGbp).toBe(60000);
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

    it("Scotland Gift Aid extends the Basic band upper limit and the bands above it, and still tapers (s.414(2)(b))", () => {
      // 110000, 4000 net -> gross 5000. ANI 105000, taper 2500, PA 10070, taxable 99930.
      // 2025/26 limits move by 5000: 2827 / 19921 / 36092 / 67430 / 130140.
      // 537.13 + (19921 - 2827)*.2 (3418.8) + (36092 - 19921)*.21 (3395.91)
      //   + (67430 - 36092)*.42 (13161.96) + (99930 - 67430)*.45 (14625) = 35138.8
      const r = scot(110000, "2025/26", 4000);
      expect(r.adjustedNetIncomeGbp).toBe(105000);
      expect(r.taxableIncomeGbp).toBe(99930);
      expect(r.incomeTaxGbp).toBe(35138.8);
    });

    it("Scotland Gift Aid below the taper start still extends the bands", () => {
      // 50000, 1000 net -> ext 1250, taxable 37430: 2026/27 limits 3967 / 18206 / 32342 / 63680.
      // 753.73 + 14239*.2 (2847.8) + 14136*.21 (2968.56) + (37430 - 32342)*.42 (2136.96) = 8707.05
      expect(scot(50000, "2026/27", 1000).incomeTaxGbp).toBe(8707.05);
      expect(scot(50000, "2026/27").incomeTaxGbp).toBe(8982.05);
    });

    it("Scotland Gift Aid does not move the starter band", () => {
      // 14000 taxable-ish income inside starter+basic only: the starter limit stays 2827.
      const without = scot(16000, "2025/26").incomeTaxGbp;
      const withGa = scot(16000, "2025/26", 1000).incomeTaxGbp;
      // taxable 3430: 2827*.19 + 603*.2 identical either way (still inside the basic band)
      expect(withGa).toBe(without);
    });

    it("no longer carries a Gift Aid disclaimer", () => {
      expect(scot(50000, "2026/27", 1000)).not.toHaveProperty("giftAidDisclaimer");
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

import {
  calculate100kTaxTrap,
  calculateSalarySacrificeSaving,
  estimateSalarySacrificeTaxSaving,
  getDisplayMarginalRatePct,
} from "./uk-tax.js";

describe("display marginal rate (trap-only NI inclusion)", () => {
  it("keeps the income-tax-only rate outside the trap", () => {
    expect(getDisplayMarginalRatePct(calculate100kTaxTrap(30000))).toBe(20);
    expect(getDisplayMarginalRatePct(calculate100kTaxTrap(60000))).toBe(40);
    expect(getDisplayMarginalRatePct(calculate100kTaxTrap(97000))).toBe(40);
    expect(getDisplayMarginalRatePct(calculate100kTaxTrap(150000))).toBe(45);
  });

  it("uses the NI-inclusive rate inside the trap", () => {
    expect(getDisplayMarginalRatePct(calculate100kTaxTrap(110000))).toBe(62);
    expect(getDisplayMarginalRatePct(calculate100kTaxTrap(110000, 0, true, "SCOTLAND"))).toBe(69.5);
  });

  it("estimates the 5% salary-sacrifice saving from the display rate", () => {
    const a = calculate100kTaxTrap(40000);
    expect(estimateSalarySacrificeTaxSaving(40000, 5, a)).toBe(400);
  });
});

describe("calculateSalarySacrificeSaving (income tax difference plus employee NI difference)", () => {
  // EWNI 2025/26 and 2026/27 share: PA 12,570 (tapered by 1 per 2 over 100,000), basic 20% to
  // taxable 37,700, higher 40% to taxable 125,140, additional 45%; NI 8% to 50,270, 2% above.
  it("97,000 income, 3,000 sacrifice: all in the 40% band, outside the taper => 1,260", () => {
    // Tax(97,000): taxable 84,430 => 37,700*.2 (7,540) + 46,730*.4 (18,692) = 26,232
    // Tax(94,000): taxable 81,430 => 7,540 + 43,730*.4 (17,492) = 25,032; diff 1,200
    // NI diff: both above 50,270 => 3,000*.02 = 60. Total 1,260 (not 3,000*.62 = 1,860).
    expect(calculateSalarySacrificeSaving(97000, 3000, "2025/26")).toBe(1260);
    expect(calculateSalarySacrificeSaving(97000, 3000, "2026/27")).toBe(1260);
  });

  it("130,000 income, 25,140 sacrifice: spans additional, higher and taper => 14,857.80", () => {
    // Tax(130,000): ANI over 100k by 30,000 => PA 0, taxable 130,000
    //   7,540 + (125,140-37,700)*.4 (34,976) + (130,000-125,140)*.45 (2,187) = 44,703
    // Tax(104,860): taper floor(4,860/2) = 2,430 => PA 10,140, taxable 94,720
    //   7,540 + (94,720-37,700)*.4 (22,808) = 30,348; diff 14,355
    // NI diff: 25,140*.02 = 502.80. Total 14,857.80 (flat 62% would give 15,586.80, +729).
    expect(calculateSalarySacrificeSaving(130000, 25140, "2025/26")).toBe(14857.8);
  });

  it("clamps the sacrifice to the income and ignores negatives", () => {
    expect(calculateSalarySacrificeSaving(50000, 0, "2025/26")).toBe(0);
    expect(calculateSalarySacrificeSaving(50000, -100, "2025/26")).toBe(0);
  });
});

describe("calculateUkTax result-boundary rounding (I7, D5-a)", () => {
  it("returns every money figure rounded to pence", () => {
    const res = calculateUkTax({
      taxYear: "2026/27",
      grossSalary: 33333.33,
      bonusOrSideIncome: 111.111,
      pensionContributionPct: 4.4444,
      employerPensionMatchPct: 3.3333,
      giftAidContributionsGbp: 77.777,
      isSalarySacrifice: false,
    });
    const isPence = (n: number) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-6;
    for (const key of [
      "grossIncomeGbp",
      "adjustedNetIncomeGbp",
      "taxableIncomeGbp",
      "incomeTaxGbp",
      "nationalInsuranceGbp",
      "studentLoanDeductionGbp",
      "employeePensionDeductionGbp",
      "employerPensionContributionGbp",
      "employerNiSavingsGbp",
      "giftAidContributionsGbp",
      "totalDeductionsGbp",
      "netTakeHomePayAnnualGbp",
      "netTakeHomePayMonthlyGbp",
    ] as const) {
      expect(isPence(res[key]), `${key}=${res[key]}`).toBe(true);
    }
    // 33333.33 * 4.4444% = 1481.4...: exact pence, not the unrounded float
    expect(res.employeePensionDeductionGbp).toBe(
      Math.round(((33333.33 * 4.4444) / 100) * 100) / 100,
    );
    expect(res.grossIncomeGbp).toBe(33444.44);
  });
});

// Owner ruling replacing D9-B: ITA 2007 s.414(2)(b) extends the upper limit of the Scottish basic
// rate and the limits of the Scottish rates above it by the grossed-up gift. Vectors are UNVERIFIED
// (hand-derived from the statute text); see docs/tax-vector-signoff.md.
describe("Scottish Gift Aid band extension vectors (s.414(2)(b))", () => {
  it("calculateUkTax matches the hand-derived extended-band income tax", () => {
    const vectors = selectUkTaxVectors({ kind: "giftAid", region: "SCOTLAND" });
    const res = runUkTaxVectors(vectors, (v) => {
      const i = v.input as { grossIncome: number; giftAidNet: number };
      return calculateUkTax({
        grossSalary: i.grossIncome,
        taxYear: v.taxYear as UkTaxYear,
        region: "SCOTLAND",
        giftAidContributionsGbp: i.giftAidNet,
      }).incomeTaxGbp;
    });
    expect(res.checked).toBe(16);
    expect(res.failures).toEqual([]);
  });
});

describe("E25-T4 tax trap fixes", () => {
  it("uses the year's taper zone: 2020/21 ends at 125,000", () => {
    expect(analyzeTaxTrap(125000, "ENGLAND_NI_WALES", "2020/21").isInTaxTrap).toBe(true);
    expect(analyzeTaxTrap(125100, "ENGLAND_NI_WALES", "2020/21").isInTaxTrap).toBe(false);
    expect(analyzeTaxTrap(125100, "ENGLAND_NI_WALES", "2020/21").excessAbove100k).toBe(25000);
    expect(analyzeTaxTrap(125100, "ENGLAND_NI_WALES", "2026/27").isInTaxTrap).toBe(true);
  });

  it("reads the NI rate from NI pay when given", () => {
    // ANI 40,000 after a net-pay pension, but NI pay 60,000 is above the UEL (2%, not 8%).
    const t = analyzeTaxTrap(40000, "ENGLAND_NI_WALES", "2026/27", { niPay: 60000 });
    expect(t.effectiveMarginalRatePct).toBe(22);
    expect(analyzeTaxTrap(40000, "ENGLAND_NI_WALES", "2026/27").effectiveMarginalRatePct).toBe(28);
  });

  it("honours the salary sacrifice flag in calculate100kTaxTrap", () => {
    // 60,000 with 20% net pay: ANI 48,000, NI still on 60,000 (2%); sacrifice: NI on 48,000 (8%).
    expect(
      calculate100kTaxTrap(60000, 20, false, "ENGLAND_NI_WALES", "2026/27")
        .effectiveMarginalRatePct,
    ).toBe(22);
    expect(
      calculate100kTaxTrap(60000, 20, true, "ENGLAND_NI_WALES", "2026/27").effectiveMarginalRatePct,
    ).toBe(28);
  });

  it("calculateUkTax reads the trap's NI rate from payroll pay", () => {
    // 60,000 with a 20% net-pay pension: ANI 48,000 but NI pay 60,000 (above the UEL, 2%).
    const r = calculateUkTax({
      grossSalary: 60000,
      pensionContributionPct: 20,
      taxYear: "2026/27",
    });
    expect(r.taxTrap.effectiveMarginalRatePct).toBe(22);
  });
});
