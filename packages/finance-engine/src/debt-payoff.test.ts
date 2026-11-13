import { afterEach, describe, expect, it, vi } from "vitest";
import {
  calculateAvalanche,
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

  describe("sortDebtsByStrategy with unknown APR", () => {
    it("puts aprKnown false debts last under AVALANCHE", () => {
      const sorted = sortDebtsByStrategy(
        [
          { id: "u", name: "Unknown", balance: 100, apr: 0, aprKnown: false },
          { id: "z", name: "Zero", balance: 100, apr: 0, aprKnown: true },
          { id: "h", name: "High", balance: 100, apr: 20, aprKnown: true },
        ],
        "AVALANCHE",
      );
      expect(sorted.map((d) => d.id)).toEqual(["h", "z", "u"]);
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

  describe("C-13 payoff achievability and simulated minimum-only baseline", () => {
    const ref = new Date("2026-01-01T00:00:00Z");

    // Independent reference loop (single debt, constant APR, no promo). Mirrors the documented
    // engine rule: interest = round2(balance * apr/1200) added each month, then payment
    // min(balance, payment). Returns total interest and months to clear (capped).
    function refLoop(balance: number, aprPct: number, payment: number, cap = 360) {
      let bal = balance;
      let interest = 0;
      let months = 0;
      while (bal > 0.01 && months < cap) {
        months++;
        const i = Math.round(bal * (aprPct / 1200) * 100) / 100;
        bal += i;
        interest += i;
        bal -= Math.min(bal, payment);
      }
      return { interest, months, bal };
    }

    const debt = (balanceGbp: number, apr: number, min: number): DebtItem[] => [
      { id: "d", name: "D", balanceGbp, interestRateApr: apr, minimumPaymentGbp: min },
    ];

    it("10000 at 24.9% with minimum 5 is BALANCE_GROWING with null debtFreeDate", () => {
      // Derivation: monthly interest = 10000 * 24.9/1200 = 207.50 > 5 payment, so the balance
      // grows every month and never clears.
      const res = calculateDebtSchedule(debt(10000, 24.9, 5), 0, "AVALANCHE", {
        referenceDate: ref,
      });
      expect(res.payoffAchievable).toBe(false);
      expect(res.unachievableReason).toBe("BALANCE_GROWING");
      expect(res.debtFreeDate).toBeNull();
      expect(res.monthsToPayoff).toBe(360);
      expect(res.schedule[0]?.totalInterestGbp).toBe(207.5);
      expect(res.schedule[0]?.remainingDebtGbp).toBe(10202.5);
    });

    it("5000 at 20%, min 150, extra 100: interest saved equals simulated baseline minus this run", () => {
      // Derivation: total payment 250 -> n = ln(1/(1-r*P/pmt))/ln(1+r), r=20/1200:
      // 1-83.333/250=0.66667, n=ln1.5/ln1.016667=24.53 -> 25 months; interest ~ 250*24.53-5000 ~ 1133.
      // Baseline 150/month: 1-83.333/150=0.44444, n=49.06 -> 50 months; interest ~ 2359.
      // Saved ~ 1226 (audit quotes about 1226.03); exact value from the reference loop below.
      const withExtra = refLoop(5000, 20, 250);
      const baseline = refLoop(5000, 20, 150);
      expect(withExtra.months).toBe(25);
      expect(baseline.months).toBe(50);
      const expectedSaved = Math.round((baseline.interest - withExtra.interest) * 100) / 100;
      expect(expectedSaved).toBeGreaterThan(1200);
      expect(expectedSaved).toBeLessThan(1250);

      const res = calculateDebtSchedule(debt(5000, 20, 150), 100, "AVALANCHE", {
        referenceDate: ref,
      });
      expect(res.payoffAchievable).toBe(true);
      expect(res.unachievableReason).toBeUndefined();
      expect(res.monthsToPayoff).toBe(25);
      expect(res.totalInterestPaidGbp).toBeCloseTo(withExtra.interest, 2);
      expect(res.interestSavedVsMinimumGbp).toBeCloseTo(expectedSaved, 2);
    });

    it("multi-debt baseline is true minimum-only: freed minimums do not roll over", () => {
      // Independent reference: each debt amortises alone on its own minimum, no rollover.
      const debts: DebtItem[] = [
        { id: "a", name: "A", balanceGbp: 600, interestRateApr: 18, minimumPaymentGbp: 100 },
        { id: "b", name: "B", balanceGbp: 6000, interestRateApr: 24, minimumPaymentGbp: 160 },
      ];
      const baselineInterest =
        Math.round((refLoop(600, 18, 100).interest + refLoop(6000, 24, 160).interest) * 100) / 100;

      // The plan keeps the total commitment fixed (freed minimums roll into the target debt),
      // so even at extra = 0 it beats paying each minimum in isolation.
      const none = calculateDebtSchedule(debts, 0, "AVALANCHE", { referenceDate: ref });
      const noneSaved = Math.round((baselineInterest - none.totalInterestPaidGbp) * 100) / 100;
      expect(noneSaved).toBeGreaterThan(0);
      expect(none.interestSavedVsMinimumGbp).toBeCloseTo(noneSaved, 1);

      // extra = 50: saved = true minimum-only interest minus this run's interest.
      const res = calculateDebtSchedule(debts, 50, "AVALANCHE", { referenceDate: ref });
      const expectedSaved = Math.round((baselineInterest - res.totalInterestPaidGbp) * 100) / 100;
      expect(expectedSaved).toBeGreaterThan(0);
      expect(res.interestSavedVsMinimumGbp).toBeCloseTo(expectedSaved, 1);
    });

    it("cap reached with a shrinking balance gives MAX_MONTHS_REACHED", () => {
      // 5000 at 20%, min 150 needs 50 months; capped at 12 it is still shrinking.
      const reference = refLoop(5000, 20, 150, 12);
      expect(reference.bal).toBeGreaterThan(0.01);
      expect(reference.bal).toBeLessThan(5000);
      const res = calculateDebtSchedule(debt(5000, 20, 150), 0, "AVALANCHE", {
        referenceDate: ref,
        maxMonths: 12,
      });
      expect(res.payoffAchievable).toBe(false);
      expect(res.unachievableReason).toBe("MAX_MONTHS_REACHED");
      expect(res.debtFreeDate).toBeNull();
      expect(res.monthsToPayoff).toBe(12);
      expect(res.schedule.at(-1)?.remainingDebtGbp).toBeCloseTo(reference.bal, 2);
    });

    it("payable debt keeps payoffAchievable true and the existing schedule", () => {
      const res = calculateDebtSchedule(sampleDebts, 150, "AVALANCHE", { referenceDate: ref });
      expect(res.payoffAchievable).toBe(true);
      expect(res.unachievableReason).toBeUndefined();
      expect(res.debtFreeDate).toEqual(expect.any(String));
      expect(res.schedule.length).toBe(res.monthsToPayoff);
    });

    it("no consumer debt is achievable with a date", () => {
      const res = calculateDebtSchedule([], 300, "AVALANCHE");
      expect(res.payoffAchievable).toBe(true);
      expect(res.debtFreeDate).toEqual(expect.any(String));
    });

    it("legacy PayoffResult wrappers expose the flag and a string date", () => {
      const res = calculateAvalanche(debt(10000, 24.9, 5), 0);
      expect(res.payoffAchievable).toBe(false);
      expect(res.unachievableReason).toBe("BALANCE_GROWING");
      expect(typeof res.debtFreeDate).toBe("string");
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

    it("evaluateUkStudentLoan reports a projectedOutcome and no recommendation field", () => {
      const written = evaluateUkStudentLoan("plan2", 35000, 90000, "2025/26");
      expect(written.projectedOutcome).toBe("written_off_first");
      expect("recommendation" in written).toBe(false);
      const repaid = evaluateUkStudentLoan("plan2", 80000, 5000, "2025/26");
      expect(repaid.projectedOutcome).toBe("repaid_before_write_off");
    });

    it("evaluateUkStudentLoan reasoning states the projected outcome without imperatives or advice wording", () => {
      const written = evaluateUkStudentLoan("plan2", 35000, 90000, "2025/26");
      expect(written.reasoning).toContain("written off before it is repaid");
      expect(written.reasoning).not.toMatch(/gift|prioritise|should|consider/i);
      const repaid = evaluateUkStudentLoan("plan2", 80000, 5000, "2025/26");
      expect(repaid.reasoning).toContain("is projected to clear");
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
