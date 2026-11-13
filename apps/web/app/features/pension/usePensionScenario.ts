import { useMemo } from "react";
import { type ScenarioState, useScenarioState } from "~/hooks/useScenarioState";

/**
 * Pension what-if state: a typed adapter over the shared `useScenarioState` (in-memory only,
 * seeded from saved figures, nothing is written anywhere). `saved` is exposed so the controls can
 * show the saved figure beside an edited one.
 */
export type PensionScenarioValues = {
  /** Extra personal payment each month, on top of everything saved. */
  extraMonthly: number;
  horizonYears: number;
  /** Annual growth as a percentage figure (5 means 5%). */
  growthRate: number;
  useQualifyingEarnings: boolean;
  adjustForInflation: boolean;
  includeStatePension: boolean;
};

export const DEFAULT_HORIZON_YEARS = 25;

export type PensionScenario = ScenarioState<PensionScenarioValues> & {
  saved: PensionScenarioValues;
};

export const usePensionScenario = (savedGrowthRate: number): PensionScenario => {
  const saved = useMemo<PensionScenarioValues>(
    () => ({
      extraMonthly: 0,
      horizonYears: DEFAULT_HORIZON_YEARS,
      growthRate: savedGrowthRate,
      useQualifyingEarnings: false,
      adjustForInflation: false,
      includeStatePension: false,
    }),
    [savedGrowthRate],
  );
  const state = useScenarioState(saved);
  return { ...state, saved };
};
