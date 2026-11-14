import { useMemo } from "react";
import { type ScenarioState, useScenarioState } from "~/hooks/useScenarioState";

/**
 * Pension what-if state: a typed adapter over the shared `useScenarioState` (in-memory only,
 * seeded from saved figures, nothing is written anywhere). `saved` is exposed so the zone can
 * compare the illustration with the saved figures.
 */
export type PensionScenarioValues = {
  /** Your contribution as a percentage of salary (8 means 8%). */
  contributionPercent: number;
  /** Whole years until retirement. Shown as a retirement age when the user's age is known. */
  horizonYears: number;
  /** Annual growth as a percentage figure (5 means 5%). */
  growthRate: number;
  useQualifyingEarnings: boolean;
  adjustForInflation: boolean;
  includeStatePension: boolean;
};

/** Years used only inside the illustration when the user's age is not saved. */
export const DEFAULT_HORIZON_YEARS = 25;

export interface PensionScenarioSeed {
  contributionPercent: number;
  horizonYears: number;
  growthRate: number;
}

export type PensionScenario = ScenarioState<PensionScenarioValues> & {
  saved: PensionScenarioValues;
};

export const usePensionScenario = ({
  contributionPercent,
  horizonYears,
  growthRate,
}: PensionScenarioSeed): PensionScenario => {
  const saved = useMemo<PensionScenarioValues>(
    () => ({
      contributionPercent,
      horizonYears,
      growthRate,
      useQualifyingEarnings: false,
      // Figures read "in today's money" by default, matching the saved estimate.
      adjustForInflation: true,
      includeStatePension: false,
    }),
    [contributionPercent, horizonYears, growthRate],
  );
  const state = useScenarioState(saved);
  return { ...state, saved };
};
