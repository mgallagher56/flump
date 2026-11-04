import { describe, expect, it } from "vitest";
import {
  calculateAvalanche,
  calculateCarFinanceBalloon,
  calculateDebtToWealthBridge,
  calculateMinimumOnly,
  calculateOverdraftCost,
  calculateSafeToSpend,
  calculateSnowball,
  calculateZeroPercentCliff,
  compareAvalancheAndSnowball,
  type DebtItem,
  evaluateFinancialStage,
  evaluateUkStudentLoan,
} from "./debtCalculators";

describe("debtCalculators", () => {
  const sampleDebts: DebtItem[] = [
    {
      id: "cc-1",
      name: "Barclaycard Platinum",
      balance: 3000,
      apr: 22.9,
      minimumPayment: 75,
      type: "credit_card",
    },
    {
      id: "bnpl-1",
      name: "Klarna Pay in 3",
      balance: 450,
      apr: 18.9,
      minimumPayment: 50,
      type: "bnpl",
    },
    {
      id: "loan-1",
      name: "Tesco Personal Loan",
      balance: 5000,
      apr: 7.9,
      minimumPayment: 150,
      type: "loan",
    },
  ];

  it("calculates Avalanche payoff schedule prioritizing high APR", () => {
    const res = calculateAvalanche(sampleDebts, 100);
    expect(res.months).toBeGreaterThan(0);
    expect(res.totalInterest).toBeGreaterThan(0);
    expect(res.debtFreeDate).toContain("202");
    expect(res.monthlySchedule.length).toBe(res.months);
    // Final balance is 0
    expect(res.monthlySchedule[res.months - 1].totalBalance).toBe(0);
  });

  it("calculates Snowball payoff identifying early quick win", () => {
    const res = calculateSnowball(sampleDebts, 100);
    expect(res.quickWinDebtName).toBe("Klarna Pay in 3");
    expect(res.quickWinMonths).toBeLessThanOrEqual(4);
  });

  it("compares Avalanche vs Snowball vs Minimum Only", () => {
    const comparison = compareAvalancheAndSnowball(sampleDebts, 50);
    expect(comparison.avalanche.totalInterest).toBeLessThanOrEqual(
      comparison.snowball.totalInterest,
    );
    expect(comparison.avalanche.months).toBeLessThan(comparison.minimumOnly.months);
    expect(comparison.interestSavedAvalancheVsMin).toBeGreaterThan(0);
    expect(comparison.snowballFirstWinDescription).toContain("Klarna Pay in 3");
  });

  it("calculates 0% Balance Transfer Cliff metrics", () => {
    const cliff = calculateZeroPercentCliff(2400, 12, 24.9);
    expect(cliff.requiredMonthlyPayment).toBe(200);
    expect(cliff.alertRequired).toBe(false);

    const urgentCliff = calculateZeroPercentCliff(1500, 1.5, 24.9);
    expect(urgentCliff.alertRequired).toBe(true);
    expect(urgentCliff.daysRemaining).toBeLessThanOrEqual(60);
  });

  it("calculates Overdraft pound cost under UK EAR", () => {
    const cost = calculateOverdraftCost(1000, 39.9);
    expect(cost.annualPoundCost).toBe(399);
    expect(cost.monthlyPoundCost).toBeCloseTo(33.25, 1);
  });

  it("calculates Car Finance Balloon sinking fund requirement", () => {
    const balloon = calculateCarFinanceBalloon(280, 24, 7200);
    expect(balloon.monthlySinkingFundNeeded).toBe(300);
    expect(balloon.totalCostOfFinance).toBe(280 * 24 + 7200);
  });

  it("evaluates UK Student Loan graduate tax protection", () => {
    const plan2 = evaluateUkStudentLoan("plan2", 35000, 45000);
    // (35000 - 27295) * 0.09 = 7705 * 0.09 = 693.45 / yr
    expect(plan2.annualRepayment).toBeCloseTo(693.45, 1);
    expect(plan2.willLikelyRepayBeforeWriteOff).toBe(false);
    expect(plan2.recommendation).toBe("do_not_overpay");
    expect(plan2.reasoning).toContain("gift to HM Treasury");
  });

  it("calculates Debt to Wealth bridge 5 years post-debt", () => {
    const bridge = calculateDebtToWealthBridge(sampleDebts, 50, 6.0, 5);
    expect(bridge.length).toBeGreaterThan(5);
    const lastPoint = bridge[bridge.length - 1];
    expect(lastPoint.isPostDebtFree).toBe(true);
    expect(lastPoint.wealthAccumulated).toBeGreaterThan(15000);
    expect(lastPoint.debtRemaining).toBe(0);
  });

  it("calculates Safe-to-Spend Weekly Allowance", () => {
    // 3000 net, 1200 fixed bills, 300 debt min, 400 groceries => 1100 discretionary
    // 1100 / 4.333333 = 253.85 / week
    const safe = calculateSafeToSpend(3000, 1200, 300, 400);
    expect(safe.monthlyDiscretionary).toBe(1100);
    expect(safe.weeklyAllowance).toBeCloseTo(253.85, 1);
    expect(safe.dailyAllowance).toBeCloseTo(36.26, 1);
  });

  describe("evaluateFinancialStage", () => {
    it("assigns Stage 1: Stabilize & Clear when user has high-interest debt", () => {
      const stage = evaluateFinancialStage({
        debts: sampleDebts,
        monthlySurplus: 250,
        liquidSavings: 500,
        monthlyEssentialExpenses: 1500,
      });
      expect(stage.stage).toBe("stabilize");
      expect(stage.primaryHeroMetric).toBe("unsecured_debt");
    });

    it("assigns Stage 1: Stabilize & Clear when user has a deficit", () => {
      const stage = evaluateFinancialStage({
        debts: [],
        monthlySurplus: -150,
        liquidSavings: 2000,
        monthlyEssentialExpenses: 1500,
      });
      expect(stage.stage).toBe("stabilize");
      expect(stage.primaryHeroMetric).toBe("unsecured_debt");
    });

    it("assigns Stage 2: Buffer & Protect when debt cleared but runway < 3 months", () => {
      const stage = evaluateFinancialStage({
        debts: [],
        monthlySurplus: 300,
        liquidSavings: 2500,
        monthlyEssentialExpenses: 1500, // runway = 1.7 mos
      });
      expect(stage.stage).toBe("buffer");
      expect(stage.primaryHeroMetric).toBe("emergency_runway");
    });

    it("assigns Stage 3: Build & Optimize when high interest debt is £0 and runway >= 3 months", () => {
      const stage = evaluateFinancialStage({
        debts: [],
        monthlySurplus: 600,
        liquidSavings: 10000,
        monthlyEssentialExpenses: 2000, // runway = 5 mos
      });
      expect(stage.stage).toBe("optimize");
      expect(stage.primaryHeroMetric).toBe("net_worth");
    });
  });
});
