import type { OnboardingSeedPayload } from "@flump/finance-engine";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  CookieSeedAdapter,
  DEFAULT_FINANCIAL_BASELINE,
  FINANCIAL_BASELINE_STORAGE_KEY,
  hydrateBaselineFromSeed,
  NO_SALARY_BASELINE,
  useFinancialBaseline,
  writeOnboardingSeedCookie,
} from "./baseline.store";

describe("salary-less seeds", () => {
  it("never fabricate a baseline", () => {
    window.localStorage.clear();
    const adapter = new CookieSeedAdapter();
    adapter.saveSeed({
      mode: "WEALTH",
      inferredStage: "STAGE_2_BUFFER_BUILD",
      inferredModules: ["accounts"],
      timestamp: Date.now(),
    });
    expect(adapter.getBaseline()).toBeNull();
    const { result } = renderHook(() => useFinancialBaseline());
    // No stored or seeded salary: the store must never supply the engine's 45,000 default.
    expect(result.current.baseline.annualGrossSalary).toBe(0);
    expect(NO_SALARY_BASELINE.annualGrossSalary).toBe(0);
    expect(adapter.getSeed()).not.toBeNull();
    adapter.clearSeed();
  });
});

describe("Phase 2 Verification Gate: baseline.store & Onboarding Seed Hydration", () => {
  it("handles CookieSeedAdapter methods and useFinancialBaseline updates", () => {
    const adapter = new CookieSeedAdapter();
    window.localStorage.clear();
    adapter.clearSeed();

    expect(adapter.getBaseline()).toBeNull();

    writeOnboardingSeedCookie({
      mode: "DEBT",
      annualGrossSalary: 44000,
      totalUnsecuredDebt: 5000,
      timestamp: Date.now(),
    });
    expect(adapter.getSeed()?.annualGrossSalary).toBe(44000);
    expect(adapter.getBaseline()?.annualGrossSalary).toBe(44000);

    adapter.saveBaseline({
      ...DEFAULT_FINANCIAL_BASELINE,
      annualGrossSalary: 72000,
    });
    expect(adapter.getBaseline()?.annualGrossSalary).toBe(72000);

    window.localStorage.setItem(FINANCIAL_BASELINE_STORAGE_KEY, "{invalid_json");
    expect(adapter.getBaseline()).toBeNull();
    window.localStorage.clear();

    adapter.saveSeed({
      mode: "WEALTH",
      annualGrossSalary: 88000,
      timestamp: Date.now(),
      inferredModules: ["accounts", "savings", "forecast"],
    });

    const { result } = renderHook(() => useFinancialBaseline());
    act(() => {
      result.current.updateBaseline({ annualGrossSalary: 61000 });
    });
    expect(result.current.baseline.annualGrossSalary).toBe(61000);

    act(() => {
      result.current.setBaseline({
        ...DEFAULT_FINANCIAL_BASELINE,
        annualGrossSalary: 80000,
      });
    });
    expect(result.current.baseline.annualGrossSalary).toBe(80000);
  });

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
    // Self Assessment is opt-in: a high salary alone no longer switches it on.
    expect(baseline.enabledModules).not.toContain("tax");
  });
});

describe("legacy v1 baseline migration", () => {
  const V1 = "flump_financial_baseline_v1";

  it("blanks only the invented 45,000 salary and keeps every other field", () => {
    window.localStorage.clear();
    window.localStorage.setItem(
      V1,
      JSON.stringify({
        ...DEFAULT_FINANCIAL_BASELINE,
        annualGrossSalary: 45000,
        ukRegion: "SCOTLAND",
        pensionContributionPct: 9,
        isSalarySacrifice: false,
        propertyOwnershipSharePct: 50,
      }),
    );
    expect(FINANCIAL_BASELINE_STORAGE_KEY).not.toBe(V1);

    const migrated = new CookieSeedAdapter().getBaseline();
    expect(migrated?.annualGrossSalary).toBe(0);
    expect(migrated?.ukRegion).toBe("SCOTLAND");
    expect(migrated?.pensionContributionPct).toBe(9);
    expect(migrated?.isSalarySacrifice).toBe(false);
    expect(migrated?.propertyOwnershipSharePct).toBe(50);
    expect(window.localStorage.getItem(V1)).toBeNull();
    expect(window.localStorage.getItem(FINANCIAL_BASELINE_STORAGE_KEY)).not.toBeNull();
  });

  it("keeps a real salary and a salary backed by a userId", () => {
    window.localStorage.clear();
    window.localStorage.setItem(
      V1,
      JSON.stringify({ ...DEFAULT_FINANCIAL_BASELINE, annualGrossSalary: 52000 }),
    );
    expect(new CookieSeedAdapter().getBaseline()?.annualGrossSalary).toBe(52000);

    window.localStorage.clear();
    window.localStorage.setItem(
      V1,
      JSON.stringify({ ...DEFAULT_FINANCIAL_BASELINE, annualGrossSalary: 45000, userId: "u1" }),
    );
    expect(new CookieSeedAdapter().getBaseline()?.annualGrossSalary).toBe(45000);
  });

  it("never overwrites an existing v2 baseline", () => {
    window.localStorage.clear();
    window.localStorage.setItem(
      FINANCIAL_BASELINE_STORAGE_KEY,
      JSON.stringify({ ...DEFAULT_FINANCIAL_BASELINE, annualGrossSalary: 61000 }),
    );
    window.localStorage.setItem(
      V1,
      JSON.stringify({ ...DEFAULT_FINANCIAL_BASELINE, annualGrossSalary: 45000 }),
    );
    expect(new CookieSeedAdapter().getBaseline()?.annualGrossSalary).toBe(61000);
    expect(window.localStorage.getItem(V1)).toBeNull();
  });

  it("boots the baseline atom with no salary but keeps the Scottish region", async () => {
    window.localStorage.clear();
    window.localStorage.setItem(
      V1,
      JSON.stringify({
        ...DEFAULT_FINANCIAL_BASELINE,
        annualGrossSalary: 45000,
        ukRegion: "SCOTLAND",
      }),
    );
    vi.resetModules();
    const fresh = await import("./baseline.store");
    const { getDefaultStore } = await import("jotai");
    const baseline = getDefaultStore().get(fresh.financialBaselineAtom);
    expect(baseline.annualGrossSalary).toBe(0);
    expect(baseline.ukRegion).toBe("SCOTLAND");
    window.localStorage.clear();
  });
});
