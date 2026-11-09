import { describe, expect, it } from "vitest";
import {
  calculateDebtSchedule,
  filterConsumerDebts,
  projectCrossoverWealth,
  sortDebtsByStrategy,
} from "./debt-payoff.js";
import type { DebtItem } from "./types.js";

describe("debt-payoff module", () => {
  const sampleDebts: DebtItem[] = [
    {
      id: "cc-1",
      name: "Barclaycard Platinum",
      balanceGbp: 3000,
      interestRateApr: 24.9,
      minimumPaymentGbp: 75,
      debtType: "credit_card",
    },
    {
      id: "overdraft-1",
      name: "Monzo Arranged Overdraft",
      balanceGbp: 800,
      interestRateApr: 39.0,
      minimumPaymentGbp: 40,
      debtType: "overdraft",
    },
    {
      id: "loan-1",
      name: "Tesco Personal Loan",
      balanceGbp: 4500,
      interestRateApr: 6.9,
      minimumPaymentGbp: 130,
      debtType: "loan_personal",
    },
    {
      id: "student-loan",
      name: "Student Finance England Plan 2",
      balanceGbp: 42000,
      interestRateApr: 7.1,
      minimumPaymentGbp: 100,
      debtType: "student_loan",
    },
  ];

  describe("filterConsumerDebts", () => {
    it("explicitly excludes UK Student Loans from commercial debt snowballs", () => {
      const { consumerDebts, excludedStudentLoans } = filterConsumerDebts(sampleDebts);
      expect(consumerDebts.length).toBe(3);
      expect(excludedStudentLoans.length).toBe(1);
      expect(excludedStudentLoans[0]?.id).toBe("student-loan");
    });
  });

  describe("sortDebtsByStrategy", () => {
    const debts = [
      { id: "1", name: "Low APR Large", balance: 5000, apr: 5 },
      { id: "2", name: "High APR Small", balance: 500, apr: 39 },
      { id: "3", name: "Med APR Med", balance: 1500, apr: 20 },
    ];

    it("sorts highest APR first for AVALANCHE", () => {
      const sorted = sortDebtsByStrategy(debts, "AVALANCHE");
      expect(sorted[0]?.id).toBe("2"); // 39%
      expect(sorted[1]?.id).toBe("3"); // 20%
      expect(sorted[2]?.id).toBe("1"); // 5%
    });

    it("sorts smallest balance first for SNOWBALL", () => {
      const sorted = sortDebtsByStrategy(debts, "SNOWBALL");
      expect(sorted[0]?.id).toBe("2"); // £500
      expect(sorted[1]?.id).toBe("3"); // £1,500
      expect(sorted[2]?.id).toBe("1"); // £5,000
    });
  });

  describe("calculateDebtSchedule", () => {
    it("calculates Avalanche payoff schedule correctly", () => {
      const res = calculateDebtSchedule(sampleDebts, 150, "AVALANCHE");

      expect(res.totalStartingDebtGbp).toBe(8300); // Excludes £42k student loan
      expect(res.monthsToPayoff).toBeGreaterThan(0);
      expect(res.debtFreeDate).toBeDefined();
      expect(res.schedule.length).toBe(res.monthsToPayoff);
      expect(res.crossoverProjection.length).toBe(60);
      expect(res.fiveYearPostDebtWealthGbp).toBeGreaterThan(0);
    });

    it("calculates Snowball payoff and identifies earliest quick win", () => {
      const res = calculateDebtSchedule(sampleDebts, 150, "SNOWBALL");

      expect(res.monthsToPayoff).toBeGreaterThan(0);
      expect(res.firstQuickWinDate).toBeDefined();
      expect(res.firstQuickWinDebtName).toBe("Monzo Arranged Overdraft");
    });

    it("detects 0% balance transfer promo cliffs and raises alert", () => {
      const debtsWithCliff: DebtItem[] = [
        {
          id: "bt-1",
          name: "Virgin Money 0% Balance Transfer",
          balanceGbp: 4000,
          interestRateApr: 0,
          minimumPaymentGbp: 50,
          promoAprExpiryDate: "2026-06-01",
          revertApr: 27.9,
          debtType: "credit_card",
        },
      ];

      const res = calculateDebtSchedule(debtsWithCliff, 0, "AVALANCHE", {
        referenceDate: new Date("2026-01-01T00:00:00Z"),
      });

      expect(res.promoCliffAlerts.length).toBe(1);
      const alert = res.promoCliffAlerts[0]!;
      expect(alert.hasCliffRisk).toBe(true);
      expect(alert.requiredMonthlyToClearBeforeCliff).toBeGreaterThan(50);
      expect(alert.revertApr).toBe(27.9);
    });

    it("handles zero debt gracefully and begins immediate wealth accumulation", () => {
      const res = calculateDebtSchedule([], 300, "AVALANCHE");
      expect(res.totalStartingDebtGbp).toBe(0);
      expect(res.monthsToPayoff).toBe(0);
      expect(res.crossoverProjection.length).toBe(60);
      expect(res.fiveYearPostDebtWealthGbp).toBeGreaterThan(0);
    });
  });

  describe("projectCrossoverWealth", () => {
    it("projects 60 months of compounding ISA investment", () => {
      const proj = projectCrossoverWealth(400, new Date("2026-01-01T00:00:00Z"), 6);
      expect(proj.length).toBe(60);
      const lastMonth = proj[59]!;
      expect(lastMonth.totalContributedGbp).toBe(24000); // 400 * 60
      expect(lastMonth.projectedWealthGbp).toBeGreaterThan(24000);
      expect(lastMonth.interestEarnedGbp).toBeGreaterThan(0);
    });
  });
});
