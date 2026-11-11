import { afterEach, describe, expect, it, vi } from "vitest";
import {
  calculateDebtSchedule,
  calculateDebtToWealthBridge,
  calculateOverdraftCost,
  calculateZeroPercentCliff,
  compareAvalancheAndSnowball,
  evaluateUkStudentLoan,
  filterConsumerDebts,
  projectCrossoverWealth,
  sortDebtsByStrategy,
} from "./debt-payoff.js";
import { STUDENT_LOAN_WRITE_OFF_YEARS } from "./tax-rules.js";
import { selectUkTaxVectors } from "./test-vectors/uk-tax.vectors.js";
import type { DebtItem } from "./types.js";
import { UnsupportedUkTaxYearError } from "./uk-tax-year.js";

afterEach(() => {
  vi.useRealTimers();
});

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

  describe("tool calculators", () => {
    it("compareAvalancheAndSnowball compares both strategies", () => {
      const cmp = compareAvalancheAndSnowball(sampleDebts, 100);
      expect(cmp.avalanche.months).toBeGreaterThan(0);
      expect(cmp.snowball.months).toBeGreaterThan(0);
      expect(cmp.minimumOnly.months).toBeGreaterThanOrEqual(cmp.avalanche.months);
    });

    it("calculateZeroPercentCliff detects cliff alert when near expiry", () => {
      const cliff = calculateZeroPercentCliff(3000, 1, 24.9, 50);
      expect(cliff.alertRequired).toBe(true);
      expect(cliff.requiredMonthlyPayment).toBe(3000);
    });

    it("calculateOverdraftCost calculates cost from EAR", () => {
      const cost = calculateOverdraftCost(1000, 39.9);
      expect(cost.annualPoundCost).toBe(399);
      expect(cost.monthlyPoundCost).toBe(33.25);
    });

    it("evaluateUkStudentLoan reads the per-year table (2025/26 Plan 2)", () => {
      // https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2025-to-2026
      // threshold 28,470; (35,000 - 28,470) * 9% = 587.70; monthly 587.70 / 12 = 48.975 -> 48.98
      const sl = evaluateUkStudentLoan("plan2", 35000, 40000, "2025/26");
      expect(sl.threshold).toBe(28470);
      expect(sl.annualRepayment).toBe(587.7);
      expect(sl.monthlyRepayment).toBe(48.98);
      expect(sl.rate).toBe(9);
      expect(sl.writeOffYears).toBe(30);
    });

    it("evaluateUkStudentLoan agrees for PLAN_2 and plan2 spellings", () => {
      for (const year of ["2024/25", "2025/26", "2026/27"]) {
        expect(evaluateUkStudentLoan("PLAN_2", 35000, 40000, year)).toEqual(
          evaluateUkStudentLoan("plan2", 35000, 40000, year),
        );
      }
    });

    it("evaluateUkStudentLoan defaults to the current UK tax year", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-11-11T12:00:00Z"));
      // 2026/27 Plan 2: threshold 29,385; (35,000 - 29,385) * 9% = 505.35
      const sl = evaluateUkStudentLoan("PLAN_2", 35000, 40000);
      expect(sl.threshold).toBe(29385);
      expect(sl.annualRepayment).toBe(505.35);
    });

    it("evaluateUkStudentLoan throws for an unsupported tax year", () => {
      expect(() => evaluateUkStudentLoan("plan2", 35000, 40000, "2019/20")).toThrow(
        UnsupportedUkTaxYearError,
      );
    });

    it("evaluateUkStudentLoan takes write-off years from STUDENT_LOAN_WRITE_OFF_YEARS", () => {
      expect(evaluateUkStudentLoan("plan5", 35000, 40000, "2026/27").writeOffYears).toBe(
        STUDENT_LOAN_WRITE_OFF_YEARS.plan5,
      );
      expect(evaluateUkStudentLoan("postgrad", 35000, 40000, "2026/27").writeOffYears).toBe(30);
    });

    it("evaluateUkStudentLoan matches every VERIFIED studentLoan vector", () => {
      for (const v of selectUkTaxVectors({ kind: "studentLoan", status: "VERIFIED" })) {
        const input = v.input as { grossIncome: number; plan: string };
        const sl = evaluateUkStudentLoan(input.plan, input.grossIncome, 100000, v.taxYear);
        expect(sl.annualRepayment, v.id).toBeCloseTo(v.expected, 2);
      }
    });

    it("calculateDebtToWealthBridge returns crossover points", () => {
      const bridge = calculateDebtToWealthBridge(sampleDebts, 50, 6.0, 5);
      expect(bridge.length).toBeGreaterThan(5);
      const last = bridge[bridge.length - 1]!;
      expect(last.isPostDebtFree).toBe(true);
      expect(last.wealthAccumulated).toBeGreaterThan(0);
    });
  });
});
