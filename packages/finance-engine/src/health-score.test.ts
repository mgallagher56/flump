import { describe, expect, it } from "vitest";
import { calculateFinancialHealthScore } from "./health-score.js";

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
    expect(res.topRecommendations.length).toBeGreaterThan(0);
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
    const trapComponent = res.components.find((c) => c.name.includes("Tax Trap"));
    expect(trapComponent).toBeDefined();
    expect(trapComponent?.score).toBe(40);
  });
});
