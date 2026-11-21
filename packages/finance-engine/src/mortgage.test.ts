import { describe, expect, it } from "vitest";
import {
  calculateLoanFromMonthlyPayment,
  calculateLtvMilestones,
  calculateMonthlyMortgagePayment,
  calculateMortgageAmortization,
  calculateMortgageCostSummary,
  calculateMortgagePayment,
  calculateMortgageVsIsa,
  compareMortgageOverpayVsSave,
  compareMortgageRates,
  estimateMortgageAtFixEnd,
  simulateMortgageOverpayment,
} from "./mortgage.js";

describe("mortgage module", () => {
  describe("unknown property value", () => {
    it("returns no LTV milestones rather than reporting every band as achieved", () => {
      expect(calculateLtvMilestones(0, 180000)).toEqual([]);
    });
  });

  describe("calculateMonthlyMortgagePayment", () => {
    it("calculates monthly repayment for standard UK repayment mortgage", () => {
      // £250,000 at 4.5% over 25 years (300 months)
      const payment = calculateMonthlyMortgagePayment(250000, 4.5, 300);
      // M = P r (1+r)^n / ((1+r)^n - 1), r = 0.045/12 = 0.00375, n = 300:
      // 250000 x 0.00375 x 3.073742528 / 2.073742528 = 1389.5811949 -> 1389.58
      expect(payment).toBe(1389.58);
    });

    it("handles 0% interest rate as linear repayment", () => {
      const payment = calculateMonthlyMortgagePayment(120000, 0, 120);
      expect(payment).toBe(1000);
    });
  });

  describe("calculateLtvMilestones", () => {
    it("calculates lump sum needed to reach 80%, 75%, and 60% LTV", () => {
      // £400,000 property value, current balance £340,000 (85% LTV)
      const milestones = calculateLtvMilestones(
        400000,
        340000,
        "2026-12-01",
        new Date("2026-01-01T00:00:00Z"),
      );

      expect(milestones.length).toBe(4);
      const ltv80 = milestones.find((m) => m.targetLtvPct === 80)!;
      // 80% of 400k is 320k -> lump sum needed is 20k
      expect(ltv80.targetBalanceGbp).toBe(320000);
      expect(ltv80.lumpSumNeededGbp).toBe(20000);
      expect(ltv80.requiredMonthlyOverpaymentBeforeFixGbp).toBeGreaterThan(0);
      expect(ltv80.isAchieved).toBe(false);
    });
  });

  describe("calculateMortgageAmortization", () => {
    it("computes overpayment savings and compares against after-tax ISA investment", () => {
      const res = calculateMortgageAmortization({
        propertyValueGbp: 350000,
        currentBalanceGbp: 250000,
        interestRateApr: 5.0,
        remainingTermMonths: 300,
        monthlyOverpaymentGbp: 200,
        afterTaxIsaExpectedReturnApr: 6.0,
      });

      expect(res.currentLtvPct).toBe(71.4);
      expect(res.interestSavedGbp).toBeGreaterThan(0);
      expect(res.monthsSaved).toBeGreaterThan(0);
      expect(res.overpayVsIsaComparison.guaranteedMortgageInterestSavedGbp).toBe(
        res.interestSavedGbp,
      );
      expect(res.overpayVsIsaComparison.projectedIsaWealthGbp).toBeGreaterThan(0);
    });

    it("calculateMortgageVsIsa returns comparison results", () => {
      const res = calculateMortgageVsIsa(200000, 4.5, 20, 200, 6.0);
      expect(res.standardPayment).toBeGreaterThan(0);
      expect(res.interestSaved).toBeGreaterThan(0);
      expect(res.monthsShaved).toBeGreaterThan(0);
      expect(res.isaAccumulatedValue).toBeGreaterThan(res.totalIsaContributed);
    });
  });

  describe("calculateMortgagePayment", () => {
    it("returns 0 for missing or non-positive inputs rather than NaN or Infinity", () => {
      expect(calculateMortgagePayment(0, 4, 25)).toBe(0);
      expect(calculateMortgagePayment(200000, 4, 0)).toBe(0);
      expect(calculateMortgagePayment(200000, Number.NaN, 25)).toBe(0);
    });

    it("treats a negative rate as 0%, in both functions", () => {
      // 120,000 over 10 years = 120 months: 120,000 / 120 = 1,000 a month, as at 0%.
      expect(calculateMonthlyMortgagePayment(120000, -1, 120)).toBe(1000);
      expect(calculateMortgagePayment(120000, -1, 10)).toBe(1000);
      // Interest-only at a negative rate has no interest to pay.
      expect(calculateMortgagePayment(120000, -1, 10, "interest-only")).toBe(0);
    });

    it("repays a 0% mortgage in equal parts, the same as calculateMonthlyMortgagePayment", () => {
      // £120,000 over 10 years at 0%: 120,000 / 120 months = £1,000 a month.
      expect(calculateMortgagePayment(120000, 0, 10, "repayment")).toBe(1000);
      expect(calculateMonthlyMortgagePayment(120000, 0, 120)).toBe(1000);
      // Interest-only at 0% has no interest to pay.
      expect(calculateMortgagePayment(120000, 0, 10, "interest-only")).toBe(0);
    });

    it("gives the same repayment as the months-based formula, worked by hand", () => {
      // M = P r (1+r)^n / ((1+r)^n - 1), r = 0.045 / 12 = 0.00375, n = 25 x 12 = 300:
      // (1.00375)^300 = 3.073742528, so 250,000 x 0.00375 x 3.073742528 / 2.073742528
      // = 1,389.5811949, which rounds to 1,389.58 (the same figure calculateMonthlyMortgagePayment gives).
      expect(calculateMortgagePayment(250000, 4.5, 25)).toBeCloseTo(1389.5811949, 6);
      // 0%: 186,000 / (18 x 12 = 216) = 861.111..., equal parts.
      expect(calculateMortgagePayment(186000, 0, 18)).toBeCloseTo(861.1111111, 6);
      expect(calculateMonthlyMortgagePayment(186000, 0, 216)).toBe(861.11);
    });

    it("computes repayment and interest-only monthly payments", () => {
      expect(calculateMortgagePayment(200000, 4, 25, "repayment")).toBeCloseTo(1055.67, 1);
      expect(calculateMortgagePayment(200000, 4, 25, "interest-only")).toBeCloseTo(666.67, 1);
    });
  });

  describe("calculateMortgageCostSummary", () => {
    it("returns null when required inputs are missing", () => {
      expect(calculateMortgageCostSummary(0, 4.5, 20)).toBeNull();
      expect(calculateMortgageCostSummary(200000, 0, 20)).toBeNull();
      expect(calculateMortgageCostSummary(200000, 4.5, 0)).toBeNull();
    });

    it("computes total interest, total paid, and interest share for repayment and interest-only", () => {
      const repayment = calculateMortgageCostSummary(200000, 4.5, 25, "repayment");
      expect(repayment).not.toBeNull();
      expect(repayment?.totalPaid).toBeCloseTo((repayment?.totalInterest ?? 0) + 200000, 2);
      expect(repayment?.interestPercentage).toBeGreaterThan(0);

      const io = calculateMortgageCostSummary(120000, 5, 10, "interest-only");
      expect(io?.monthlyPayment).toBeCloseTo(500, 2);
      expect(io?.totalInterest).toBeCloseTo(60000, 2);
      expect(io?.totalPaid).toBeCloseTo(180000, 2);
    });
  });

  describe("simulateMortgageOverpayment", () => {
    it("reduces term and interest for repayment overpayments", () => {
      const sim = simulateMortgageOverpayment({
        loanAmount: 200000,
        annualRatePct: 4.5,
        termYears: 20,
        overpayment: 250,
        mortgageType: "repayment",
      });
      expect(sim).not.toBeNull();
      expect(sim?.monthsSaved).toBeGreaterThan(0);
      expect(sim?.interestSaved).toBeGreaterThan(0);
      expect(sim?.standardBalances).toHaveLength(241);
      expect(sim?.overpayBalances.at(-1)).toBe(0);
    });

    it("reduces principal without shortening term for interest-only overpayments", () => {
      const sim = simulateMortgageOverpayment({
        loanAmount: 200000,
        annualRatePct: 4.5,
        termYears: 10,
        overpayment: 200,
        mortgageType: "interest-only",
      });
      expect(sim).not.toBeNull();
      expect(sim?.principalReduced).toBeGreaterThan(0);
      expect(sim?.interestSaved).toBeGreaterThan(0);
    });
  });

  describe("compareMortgageOverpayVsSave", () => {
    it("compares overpaying against saving the same monthly amount", () => {
      const res = compareMortgageOverpayVsSave({
        loanAmount: 200000,
        annualRatePct: 5,
        termYears: 20,
        overpayment: 200,
        netSavingsRatePct: 3,
        horizonYears: 5,
      });
      expect(res.totalInvested).toBe(12000);
      expect(res.debtReduction).toBeGreaterThan(12000);
      expect(res.savingsBalance).toBeGreaterThan(12000);
      expect(res.isOverpayBetter).toBe(true);
    });
  });

  describe("calculateLoanFromMonthlyPayment", () => {
    it("worked case 2: 0% rate over 300 months gives payment * months", () => {
      // E39 section 8 case 2: £900 x 300 months = £270,000.
      expect(calculateLoanFromMonthlyPayment(900, 0, 300)).toBe(270000);
    });

    it("treats negative annual rate as 0%", () => {
      // -2% treated as 0%: £900 x 300 = £270,000.
      expect(calculateLoanFromMonthlyPayment(900, -2, 300)).toBe(270000);
    });

    it("worked case 3: £1,000/month at 4.5% over 25 years (300 months)", () => {
      // E39 section 8 case 3:
      // r = 0.045 / 12 = 0.00375, n = 300
      // (1 + r)^n = 1.00375^300 = 3.073742528...
      // loan = 1000 * (3.073742528 - 1) / (0.00375 * 3.073742528) = 179910.32
      expect(calculateLoanFromMonthlyPayment(1000, 4.5, 300)).toBe(179910.32);
    });

    it("returns 0 for non-positive payment, non-positive term, or non-finite rate", () => {
      expect(calculateLoanFromMonthlyPayment(0, 4.5, 300)).toBe(0);
      expect(calculateLoanFromMonthlyPayment(-100, 4.5, 300)).toBe(0);
      expect(calculateLoanFromMonthlyPayment(1000, 4.5, 0)).toBe(0);
      expect(calculateLoanFromMonthlyPayment(1000, 4.5, -12)).toBe(0);
      expect(calculateLoanFromMonthlyPayment(1000, Number.NaN, 300)).toBe(0);
      expect(calculateLoanFromMonthlyPayment(1000, Number.POSITIVE_INFINITY, 300)).toBe(0);
    });

    it("handles very large term where (1 + r)^n overflows to Infinity", () => {
      // When factor overflows, loan approaches payment / r:
      // r = 0.12 / 12 = 0.01 -> 1000 / 0.01 = 100000.
      expect(calculateLoanFromMonthlyPayment(1000, 12, 100000)).toBe(100000);
    });
  });

  describe("compareMortgageRates", () => {
    it("worked case 4: £200,000 over 25 years at 4% +/- 2 percentage points", () => {
      // E39 section 8 case 4:
      // At 4%: r = 0.04/12, (1+r)^300 = 2.713765... -> payment = £1,055.67
      // At 6%: r = 0.06/12 = 0.005, (1.005)^300 = 4.4649698... -> payment = £1,288.60 (rise: +£232.93)
      // At 2%: r = 0.02/12, (1+r)^300 = 1.648041... -> payment = £847.71 (fall: -£207.96)
      const res = compareMortgageRates({
        loanGbp: 200000,
        annualRatePct: 4,
        termMonths: 300,
        deltaPct: 2,
      });
      expect(res.baseRatePct).toBe(4);
      expect(res.higherRatePct).toBe(6);
      expect(res.lowerRatePct).toBe(2);
      expect(res.deltaPct).toBe(2);
      expect(res.baseMonthlyPaymentGbp).toBe(1055.67);
      expect(res.higherMonthlyPaymentGbp).toBe(1288.6);
      expect(res.lowerMonthlyPaymentGbp).toBe(847.71);
      expect(res.higherDeltaMonthlyGbp).toBe(232.93);
      expect(res.lowerDeltaMonthlyGbp).toBe(-207.96);
    });

    it("worked case 5: floors lower rate at 0%", () => {
      // E39 section 8 case 5: £120,000 over 240 months at 1.5% less 2 points -> 0%:
      // 120,000 / 240 = £500.00.
      // At 1.5%: r = 0.00125, (1.00125)^240 = 1.3496069... -> £579.05
      // At 3.5%: r = 0.035/12, (1+r)^240 = 2.012470... -> £695.95
      const res = compareMortgageRates({
        loanGbp: 120000,
        annualRatePct: 1.5,
        termMonths: 240,
        deltaPct: 2,
      });
      expect(res.lowerRatePct).toBe(0);
      expect(res.lowerMonthlyPaymentGbp).toBe(500);
      expect(res.baseMonthlyPaymentGbp).toBe(579.05);
      expect(res.higherRatePct).toBe(3.5);
      expect(res.higherMonthlyPaymentGbp).toBe(695.95);
    });

    it("defaults deltaPct to 1 and supports interest-only (both spellings)", () => {
      // £240,000 interest-only at 5% = 240000 * 0.05 / 12 = £1,000/month
      // At 6% = £1,200/month; at 4% = £800/month
      const res = compareMortgageRates({
        loanGbp: 240000,
        annualRatePct: 5,
        termMonths: 300,
        repaymentType: "interest_only",
      });
      expect(res.deltaPct).toBe(1);
      expect(res.baseMonthlyPaymentGbp).toBe(1000);
      expect(res.higherMonthlyPaymentGbp).toBe(1200);
      expect(res.lowerMonthlyPaymentGbp).toBe(800);
      expect(res.higherDeltaMonthlyGbp).toBe(200);
      expect(res.lowerDeltaMonthlyGbp).toBe(-200);
    });

    it("returns 0 payments for non-positive or infinite inputs and handles 0% interest-only and negative delta", () => {
      const inf = compareMortgageRates({
        loanGbp: Number.POSITIVE_INFINITY,
        annualRatePct: -2,
        termMonths: Number.POSITIVE_INFINITY,
        deltaPct: -1,
      });
      expect(inf.baseRatePct).toBe(0);
      expect(inf.deltaPct).toBe(0);
      expect(inf.baseMonthlyPaymentGbp).toBe(0);

      const zero = compareMortgageRates({ loanGbp: -100, annualRatePct: 4, termMonths: 0 });
      expect(zero.baseMonthlyPaymentGbp).toBe(0);
      expect(zero.higherMonthlyPaymentGbp).toBe(0);
      expect(zero.lowerMonthlyPaymentGbp).toBe(0);

      const ioZero = compareMortgageRates({
        loanGbp: 100000,
        annualRatePct: 0,
        termMonths: 120,
        deltaPct: 0,
        repaymentType: "interest-only",
      });
      expect(ioZero.baseMonthlyPaymentGbp).toBe(0);
      expect(ioZero.higherDeltaMonthlyGbp).toBe(0);
      expect(ioZero.lowerDeltaMonthlyGbp).toBe(0);
    });
  });

  describe("estimateMortgageAtFixEnd", () => {
    it("worked case 6: projects balance over 2-month fix and compares post-fix rates", () => {
      // E39 section 8 case 6:
      // £100,000 at 3% with 240 months left, paying £500/month for 2 months.
      // Month 1: interest = 100000 * 0.03 / 12 = £250.00 -> balance = 100000 + 250 - 500 = £99,750.00
      // Month 2: interest = 99750 * 0.03 / 12 = £249.375 -> balance = 99750 + 249.375 - 500 = 99499.375 -> £99,499.38
      // Remaining term = 240 - 2 = 238 months.
      // At 5% over 238 months: r = 0.05/12 = 0.0041666667, (1+r)^238 = 2.690179... -> payment = £659.87.
      const res = estimateMortgageAtFixEnd({
        balanceGbp: 100000,
        currentAnnualRatePct: 3,
        remainingTermMonths: 240,
        monthsUntilFixEnd: 2,
        currentMonthlyPaymentGbp: 500,
        comparisonAnnualRatePct: 5,
        deltaPct: 1,
      });
      expect(res.monthsProjected).toBe(2);
      expect(res.remainingTermAtFixEndMonths).toBe(238);
      expect(res.monthlyPaymentDuringFixGbp).toBe(500);
      expect(res.balanceAtFixEndGbp).toBe(99499.38);
      expect(res.rates.baseRatePct).toBe(5);
      expect(res.rates.baseMonthlyPaymentGbp).toBe(659.87);
    });

    it("estimates current payment when omitted and keeps balance unchanged for interest-only (both spellings)", () => {
      const res = estimateMortgageAtFixEnd({
        balanceGbp: 150000,
        currentAnnualRatePct: 4,
        remainingTermMonths: 240,
        monthsUntilFixEnd: 12,
        repaymentType: "interest_only",
      });
      // Interest-only: 150000 * 0.04 / 12 = £500/month during fix; balance stays £150,000.
      expect(res.monthlyPaymentDuringFixGbp).toBe(500);
      expect(res.balanceAtFixEndGbp).toBe(150000);
      expect(res.remainingTermAtFixEndMonths).toBe(228);
      expect(res.rates.baseMonthlyPaymentGbp).toBe(500);
      expect(res.rates.higherMonthlyPaymentGbp).toBe(625);
      expect(res.rates.lowerMonthlyPaymentGbp).toBe(375);

      // Even with a higher or lower saved payment during fix, interest-only keeps principal unchanged.
      const ioHyphen = estimateMortgageAtFixEnd({
        balanceGbp: 150000,
        currentAnnualRatePct: 4,
        remainingTermMonths: 240,
        monthsUntilFixEnd: 12,
        currentMonthlyPaymentGbp: 700,
        repaymentType: "interest-only",
      });
      expect(ioHyphen.balanceAtFixEndGbp).toBe(150000);

      const ioUnderscore = estimateMortgageAtFixEnd({
        balanceGbp: 150000,
        currentAnnualRatePct: 4,
        remainingTermMonths: 240,
        monthsUntilFixEnd: 12,
        currentMonthlyPaymentGbp: 700,
        repaymentType: "interest_only",
      });
      expect(ioUnderscore.balanceAtFixEndGbp).toBe(150000);
    });

    it("caps monthsProjected at remainingTermMonths and handles non-positive inputs", () => {
      const res = estimateMortgageAtFixEnd({
        balanceGbp: 10000,
        currentAnnualRatePct: 4,
        remainingTermMonths: 6,
        monthsUntilFixEnd: 12,
      });
      expect(res.monthsProjected).toBe(6);
      expect(res.remainingTermAtFixEndMonths).toBe(0);
      expect(res.rates.baseMonthlyPaymentGbp).toBe(0);

      const zeroed = estimateMortgageAtFixEnd({
        balanceGbp: Number.POSITIVE_INFINITY,
        currentAnnualRatePct: Number.POSITIVE_INFINITY,
        remainingTermMonths: Number.POSITIVE_INFINITY,
        monthsUntilFixEnd: Number.POSITIVE_INFINITY,
        currentMonthlyPaymentGbp: 0,
        comparisonAnnualRatePct: -2,
      });
      expect(zeroed.balanceAtFixEndGbp).toBe(0);
      expect(zeroed.monthsProjected).toBe(0);
      expect(zeroed.monthlyPaymentDuringFixGbp).toBe(0);
      expect(zeroed.rates.baseRatePct).toBe(0);

      // Explicit 0 currentMonthlyPaymentGbp on a positive balance falls back to estimated payment,
      // and negative monthsUntilFixEnd is clamped to 0.
      const fallbackPayment = estimateMortgageAtFixEnd({
        balanceGbp: 100000,
        currentAnnualRatePct: 3,
        remainingTermMonths: 240,
        monthsUntilFixEnd: -3,
        currentMonthlyPaymentGbp: 0,
        comparisonAnnualRatePct: Number.NaN,
      });
      expect(fallbackPayment.monthsProjected).toBe(0);
      expect(fallbackPayment.balanceAtFixEndGbp).toBe(100000);
      expect(fallbackPayment.monthlyPaymentDuringFixGbp).toBe(554.6);
      expect(fallbackPayment.rates.baseRatePct).toBe(3);
    });
  });
});
