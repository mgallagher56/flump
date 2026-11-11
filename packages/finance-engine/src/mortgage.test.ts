import { describe, expect, it } from "vitest";
import {
  calculateLtvMilestones,
  calculateMonthlyMortgagePayment,
  calculateMortgageAmortization,
  calculateMortgageVsIsa,
} from "./mortgage.js";

describe("mortgage module", () => {
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
});
