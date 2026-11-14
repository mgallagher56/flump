import { describe, expect, it } from "vitest";
import { ADVICE_PATTERNS } from "./compliance/advice-lexicon.js";
import {
  calculateFinancialHealthScore,
  calculateSafeToSpend,
  evaluateFinancialStage,
  isHighInterestDebt,
} from "./health-score.js";

describe("health-score module", () => {
  it("assigns stage-weighted score for STAGE_1_DEBT_RECOVERY", () => {
    const res = calculateFinancialHealthScore({
      stage: "STAGE_1_DEBT_RECOVERY",
      highInterestDebtGbp: 6500,
      totalUnsecuredDebtGbp: 6500,
      monthlyNetIncomeGbp: 2400,
      monthlyEssentialBillsGbp: 1800,
      monthlyMinimumDebtPaymentGbp: 200,
      emergencyFundGbp: 400,
    });

    expect(res.stage).toBe("STAGE_1_DEBT_RECOVERY");
    expect(res.components.length).toBe(3);
    expect(res.overallScore).toBeLessThan(75);
    expect(res.observations.length).toBeGreaterThan(0);
    expect(res.topRecommendations).toEqual([]);
  });

  it("states the tapering band as an observation, not an action", () => {
    const res = calculateFinancialHealthScore({
      stage: "STAGE_3_WEALTH_OPTIMIZE",
      adjustedNetIncomeGbp: 108000,
      annualIsaContributionGbp: 5000,
    });
    expect(res.observations).toContain(
      "Adjusted net income is £108,000, in the £100,000 to £125,140 band where the Personal Allowance reduces.",
    );
    expect(res.observations.join(" ")).toContain(
      "£15,000 of this tax year's ISA allowance is unused",
    );
  });

  it("never emits an observation or stage label matching ADVICE_PATTERNS", () => {
    const stages = [
      "STAGE_1_DEBT_RECOVERY",
      "STAGE_2_BUFFER_BUILD",
      "STAGE_3_WEALTH_OPTIMIZE",
    ] as const;
    const texts: string[] = [];
    for (const stage of stages) {
      for (const input of [
        {
          monthlyNetIncomeGbp: 1500,
          monthlyEssentialBillsGbp: 1800,
          highInterestDebtGbp: 8000,
          emergencyFundGbp: 100,
          cashSavingsYieldApr: 1,
          annualIsaContributionGbp: 0,
          adjustedNetIncomeGbp: 110000,
        },
        {
          monthlyNetIncomeGbp: 4000,
          monthlyEssentialBillsGbp: 2000,
          emergencyFundGbp: 20000,
          cashSavingsYieldApr: 5,
          annualIsaContributionGbp: 20000,
          adjustedNetIncomeGbp: 50000,
        },
      ]) {
        texts.push(...calculateFinancialHealthScore({ stage, ...input }).observations);
      }
    }
    for (const evaluation of [
      evaluateFinancialStage({
        debts: [
          {
            id: "1",
            name: "Card",
            balance: 2000,
            apr: 24.9,
            minimumPayment: 50,
            type: "credit_card",
          },
        ],
        monthlySurplus: 200,
        liquidSavings: 500,
        monthlyEssentialExpenses: 1500,
      }),
      evaluateFinancialStage({
        debts: [],
        monthlySurplus: 500,
        liquidSavings: 2000,
        monthlyEssentialExpenses: 1500,
      }),
      evaluateFinancialStage({
        debts: [],
        monthlySurplus: 1000,
        liquidSavings: 6000,
        monthlyEssentialExpenses: 1500,
      }),
    ]) {
      texts.push(evaluation.headline, evaluation.subline);
    }
    expect(texts.length).toBeGreaterThan(6);
    for (const text of texts) {
      for (const { id, pattern } of ADVICE_PATTERNS) {
        expect(pattern.test(text), `${id}: ${text}`).toBe(false);
      }
    }
  });

  it("weights emergency living runway for STAGE_2_BUFFER_BUILD", () => {
    const res = calculateFinancialHealthScore({
      stage: "STAGE_2_BUFFER_BUILD",
      totalUnsecuredDebtGbp: 0,
      monthlyNetIncomeGbp: 3200,
      monthlyEssentialBillsGbp: 2000,
      emergencyFundGbp: 12000, // 6 months runway
      cashSavingsYieldApr: 4.8,
    });

    expect(res.stage).toBe("STAGE_2_BUFFER_BUILD");
    expect(res.overallScore).toBeGreaterThanOrEqual(85);
    expect(res.grade).toBe("EXCELLENT");
  });

  it("weights tax allowances and tax trap mitigation for STAGE_3_WEALTH_OPTIMIZE", () => {
    const res = calculateFinancialHealthScore({
      stage: "STAGE_3_WEALTH_OPTIMIZE",
      monthlyNetIncomeGbp: 5500,
      monthlyEssentialBillsGbp: 2500,
      emergencyFundGbp: 20000,
      annualIsaContributionGbp: 20000,
      annualPensionContributionGbp: 30000,
      adjustedNetIncomeGbp: 108000, // In tax trap
    });

    expect(res.stage).toBe("STAGE_3_WEALTH_OPTIMIZE");
    const trapComponent = res.components.find((c) => c.name.includes("£100,000 to £125,140 band"));
    expect(trapComponent).toBeDefined();
    expect(trapComponent?.score).toBe(40);
  });

  describe("calculateSafeToSpend", () => {
    it("computes safe-to-spend weekly and daily metrics", () => {
      const res = calculateSafeToSpend(3000, 1000, 200, 400);
      expect(res.fixedCommitments).toBe(1600);
      expect(res.monthlyDiscretionary).toBe(1400);
      expect(res.weeklyAllowance).toBeCloseTo(323.08, 1);
      expect(res.dailyAllowance).toBeCloseTo(46.15, 1);
    });
  });

  describe("evaluateFinancialStage", () => {
    it("evaluates Stage 1 for high interest debt", () => {
      const res = evaluateFinancialStage({
        debts: [
          {
            id: "1",
            name: "Card",
            balance: 2000,
            apr: 24.9,
            minimumPayment: 50,
            type: "credit_card",
          },
        ],
        monthlySurplus: 200,
        liquidSavings: 500,
        monthlyEssentialExpenses: 1500,
      });
      expect(res.stage).toBe("stabilize");
      expect(res.canonicalStage).toBe("STAGE_1_DEBT_RECOVERY");
    });

    it("evaluates Stage 2 when debt is cleared but runway < 3 months", () => {
      const res = evaluateFinancialStage({
        debts: [],
        monthlySurplus: 500,
        liquidSavings: 2000,
        monthlyEssentialExpenses: 1500,
      });
      expect(res.stage).toBe("buffer");
      expect(res.canonicalStage).toBe("STAGE_2_BUFFER_BUILD");
    });

    it("evaluates Stage 3 when debt is cleared and runway >= 3 months", () => {
      const res = evaluateFinancialStage({
        debts: [],
        monthlySurplus: 1000,
        liquidSavings: 6000,
        monthlyEssentialExpenses: 1500,
      });
      expect(res.stage).toBe("optimize");
      expect(res.canonicalStage).toBe("STAGE_3_WEALTH_OPTIMIZE");
    });
  });
});

describe("isHighInterestDebt", () => {
  it("flags cards, overdrafts and APR of 6.5% or more", () => {
    expect(isHighInterestDebt({ id: "a", name: "Card", apr: 22.9, type: "credit_card" })).toBe(
      true,
    );
    expect(isHighInterestDebt({ id: "b", name: "OD", apr: 0, type: "overdraft" })).toBe(true);
    expect(isHighInterestDebt({ id: "c", name: "Loan", apr: 6.5, type: "loan" })).toBe(true);
  });
  it("does not flag a 3% loan", () => {
    expect(isHighInterestDebt({ id: "d", name: "Loan", apr: 3, type: "loan" })).toBe(false);
  });
});
