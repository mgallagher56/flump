import { useCallback, useMemo, useState } from "react";

/**
 * Local scenario state for the pension forecast.
 *
 * TODO(E15 scenario zone): swap for the shared `useScenarioState` and `@repo/ui` `ScenarioZone`
 * when they land.
 *
 * Rules (docs: scenario zone spec, advice policy R5): values are seeded from saved data, only
 * the inputs the user has moved are held as overrides, nothing is written anywhere, and the
 * state lives in memory only (it survives tab switches and clears on reload).
 */
export interface PensionScenarioValues {
  /** Extra personal payment each month, on top of everything saved. */
  extraMonthly: number;
  horizonYears: number;
  /** Annual growth as a percentage figure (5 means 5%). */
  growthRate: number;
  useQualifyingEarnings: boolean;
  adjustForInflation: boolean;
  includeStatePension: boolean;
}

export const DEFAULT_HORIZON_YEARS = 25;

export interface PensionScenario {
  values: PensionScenarioValues;
  saved: PensionScenarioValues;
  set: <K extends keyof PensionScenarioValues>(key: K, value: PensionScenarioValues[K]) => void;
  reset: () => void;
  isModified: boolean;
  /** True when this input differs from the saved or default figure. */
  isEdited: (key: keyof PensionScenarioValues) => boolean;
}

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
  const [overrides, setOverrides] = useState<Partial<PensionScenarioValues>>({});

  const values = useMemo(() => ({ ...saved, ...overrides }), [saved, overrides]);

  const set = useCallback<PensionScenario["set"]>(
    (key, value) => {
      setOverrides((prev) => {
        const next = { ...prev };
        if (value === saved[key]) delete next[key];
        else next[key] = value;
        return next;
      });
    },
    [saved],
  );
  const reset = useCallback(() => setOverrides({}), []);
  const isEdited = useCallback(
    (key: keyof PensionScenarioValues) => values[key] !== saved[key],
    [values, saved],
  );

  return { values, saved, set, reset, isModified: Object.keys(overrides).length > 0, isEdited };
};
