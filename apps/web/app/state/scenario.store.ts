import type { FinancialBaseline } from "@flump/finance-engine";
import { atom, useAtom } from "jotai";
import { useCallback } from "react";
import { financialBaselineAtom } from "./baseline.store.js";

export interface ScenarioOverrides {
  annualGrossSalary?: number;
  pensionContributionPct?: number;
  isSalarySacrifice?: boolean;
  monthlyExtraDebtRepaymentGbp?: number;
  monthlySavingsSurplusGbp?: number;
  expectedInvestmentReturnApr?: number;
}

export const isScenarioActiveAtom = atom<boolean>(false);
export const scenarioOverridesAtom = atom<ScenarioOverrides>({});

/**
 * Derived atom that overlays What-If sandbox adjustments on top of the FinancialBaseline.
 */
export const effectiveBaselineAtom = atom<FinancialBaseline>((get) => {
  const baseline = get(financialBaselineAtom);
  const isActive = get(isScenarioActiveAtom);
  const overrides = get(scenarioOverridesAtom);

  if (!isActive) {
    return baseline;
  }

  return {
    ...baseline,
    annualGrossSalary: overrides.annualGrossSalary ?? baseline.annualGrossSalary,
    pensionContributionPct: overrides.pensionContributionPct ?? baseline.pensionContributionPct,
    isSalarySacrifice: overrides.isSalarySacrifice ?? baseline.isSalarySacrifice,
  };
});

/**
 * Hook to manage Global "What-If" Scenario State across /forecast, /pension, /tax, and /debt.
 */
export function useScenario() {
  const [isActive, setIsActive] = useAtom(isScenarioActiveAtom);
  const [overrides, setOverrides] = useAtom(scenarioOverridesAtom);
  const [effectiveBaseline] = useAtom(effectiveBaselineAtom);

  const toggleScenario = useCallback(
    (active?: boolean) => {
      setIsActive((prev) => (typeof active === "boolean" ? active : !prev));
    },
    [setIsActive],
  );

  const updateOverrides = useCallback(
    (newOverrides: Partial<ScenarioOverrides>) => {
      setOverrides((prev) => ({ ...prev, ...newOverrides }));
      setIsActive(true);
    },
    [setOverrides, setIsActive],
  );

  const resetScenario = useCallback(() => {
    setOverrides({});
    setIsActive(false);
  }, [setOverrides, setIsActive]);

  return {
    isActive,
    overrides,
    effectiveBaseline,
    toggleScenario,
    updateOverrides,
    resetScenario,
  };
}
