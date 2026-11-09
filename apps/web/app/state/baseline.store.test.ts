import type { OnboardingSeedPayload } from "@flump/finance-engine";
import { describe, expect, it } from "vitest";
import { DEFAULT_FINANCIAL_BASELINE, hydrateBaselineFromSeed } from "./baseline.store";

describe("Phase 2 Verification Gate: baseline.store & Onboarding Seed Hydration", () => {
  it("defaults to STAGE_2_BUFFER_BUILD with standard UK parameters", () => {
    expect(DEFAULT_FINANCIAL_BASELINE.taxYear).toBe("2025/26");
    expect(DEFAULT_FINANCIAL_BASELINE.ukRegion).toBe("ENGLAND_NI_WALES");
    expect(DEFAULT_FINANCIAL_BASELINE.financialStage).toBe("STAGE_2_BUFFER_BUILD");
    expect(DEFAULT_FINANCIAL_BASELINE.enabledModules).toContain("accounts");
    expect(DEFAULT_FINANCIAL_BASELINE.enabledModules).toContain("budget");
  });

  it("VERIFICATION GATE: hydrator pre-fills FinancialBaseline and assigns STAGE_1_DEBT_RECOVERY for DEBT seed", () => {
    const debtSeed: OnboardingSeedPayload = {
      mode: "DEBT",
      annualGrossSalary: 38000,
      totalUnsecuredDebt: 6200,
      averageDebtApr: 24.9,
      monthlyDebtRepaymentBudget: 350,
      inferredStage: "STAGE_1_DEBT_RECOVERY",
      inferredModules: ["accounts", "debt", "budget"],
      timestamp: Date.now(),
    };

    const baseline = hydrateBaselineFromSeed(debtSeed, "user_debt_test");

    expect(baseline.userId).toBe("user_debt_test");
    expect(baseline.annualGrossSalary).toBe(38000);
    expect(baseline.financialStage).toBe("STAGE_1_DEBT_RECOVERY");
    expect(baseline.enabledModules).toEqual(["accounts", "debt", "budget"]);
  });

  it("VERIFICATION GATE: hydrator pre-fills FinancialBaseline and assigns STAGE_3_WEALTH_OPTIMIZE for WEALTH seed", () => {
    const wealthSeed: OnboardingSeedPayload = {
      mode: "WEALTH",
      annualGrossSalary: 108000,
      pensionContributionPct: 8,
      isSalarySacrifice: true,
      initialInvestments: 50000,
      inferredStage: "STAGE_3_WEALTH_OPTIMIZE",
      inferredModules: ["accounts", "budget", "pension", "mortgage", "forecast", "tax"],
      timestamp: Date.now(),
    };

    const baseline = hydrateBaselineFromSeed(wealthSeed, "user_wealth_test");

    expect(baseline.userId).toBe("user_wealth_test");
    expect(baseline.annualGrossSalary).toBe(108000);
    expect(baseline.pensionContributionPct).toBe(8);
    expect(baseline.isSalarySacrifice).toBe(true);
    expect(baseline.financialStage).toBe("STAGE_3_WEALTH_OPTIMIZE");
    expect(baseline.enabledModules).toContain("pension");
    expect(baseline.enabledModules).toContain("tax");
    expect(baseline.enabledModules).toContain("forecast");
  });

  it("correctly infers STAGE_1_DEBT_RECOVERY when totalUnsecuredDebt > 0 even if inferredStage is unset", () => {
    const rawSeed = {
      mode: "DEBT" as const,
      annualGrossSalary: 42000,
      totalUnsecuredDebt: 3000,
      timestamp: Date.now(),
    } as OnboardingSeedPayload;

    const baseline = hydrateBaselineFromSeed(rawSeed);
    expect(baseline.financialStage).toBe("STAGE_1_DEBT_RECOVERY");
    expect(baseline.enabledModules).toContain("debt");
  });

  it("correctly infers STAGE_3_WEALTH_OPTIMIZE when salary >= £100k even if inferredStage is unset", () => {
    const rawSeed = {
      mode: "WEALTH" as const,
      annualGrossSalary: 115000,
      timestamp: Date.now(),
    } as OnboardingSeedPayload;

    const baseline = hydrateBaselineFromSeed(rawSeed);
    expect(baseline.financialStage).toBe("STAGE_3_WEALTH_OPTIMIZE");
    expect(baseline.enabledModules).toContain("tax");
  });
});
