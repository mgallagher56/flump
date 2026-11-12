import {
  clearOnboardingSeed,
  DEFAULT_FINANCIAL_BASELINE,
  type FinancialBaseline,
  hydrateBaselineFromSeed,
  type OnboardingSeedPayload,
  type ProfilePersistenceAdapter,
  persistOnboardingSeed,
  readOnboardingSeed,
} from "@flump/finance-engine";
import { atom, useAtom } from "jotai";
import { useCallback, useEffect } from "react";

export const FINANCIAL_BASELINE_STORAGE_KEY = "flump_financial_baseline_v1";

export { DEFAULT_FINANCIAL_BASELINE, hydrateBaselineFromSeed };

/**
 * Initial client baseline (SSR and nothing stored). The engine default carries an invented
 * 45,000 salary, so this clears it: 0 means "no salary known" and renders as "Not set".
 */
export const NO_SALARY_BASELINE: FinancialBaseline = {
  ...DEFAULT_FINANCIAL_BASELINE,
  annualGrossSalary: 0,
};

/** True only when a seed carries a salary; without one hydrating would invent defaults. */
export function seedCarriesSalary(seed: AnySeedPayload | null | undefined): boolean {
  return Boolean(seed && (seed.annualIncome || seed.annualGrossSalary));
}

export type AnySeedPayload = OnboardingSeedPayload | Record<string, any>;

/**
 * Persists onboarding seed across localStorage and cross-subdomain cookie.
 */
export function writeOnboardingSeedCookie(payload: AnySeedPayload): void {
  persistOnboardingSeed(payload as any);
}

/**
 * Cookie and localStorage persistence adapter for pre-login and local baseline storage.
 */
export class CookieSeedAdapter implements ProfilePersistenceAdapter {
  getBaseline(): FinancialBaseline | null {
    if (typeof window === "undefined") return null;
    try {
      const saved = window.localStorage.getItem(FINANCIAL_BASELINE_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
      const seed = readOnboardingSeed();
      if (seed && seedCarriesSalary(seed)) return hydrateBaselineFromSeed(seed);
    } catch {
      return null;
    }
    return null;
  }

  saveBaseline(baseline: FinancialBaseline): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(FINANCIAL_BASELINE_STORAGE_KEY, JSON.stringify(baseline));
    } catch {
      // Ignore
    }
  }

  getSeed(): OnboardingSeedPayload | null {
    return readOnboardingSeed();
  }

  saveSeed(seed: OnboardingSeedPayload): void {
    persistOnboardingSeed(seed);
  }

  clearSeed(): void {
    clearOnboardingSeed();
  }
}

export const defaultPersistenceAdapter = new CookieSeedAdapter();

/**
 * Loads baseline from localStorage or seed cookie on initial boot.
 */
function getInitialBaseline(): FinancialBaseline {
  if (typeof window === "undefined") {
    return NO_SALARY_BASELINE;
  }

  const loaded = defaultPersistenceAdapter.getBaseline();
  if (loaded) {
    return { ...NO_SALARY_BASELINE, ...loaded };
  }

  return NO_SALARY_BASELINE;
}

export const financialBaselineAtom = atom<FinancialBaseline>(getInitialBaseline());

/**
 * Hook to access and mutate the centralized FinancialBaseline store.
 */
export function useFinancialBaseline() {
  const [baseline, setBaselineState] = useAtom(financialBaselineAtom);

  const updateBaseline = useCallback(
    (updates: Partial<FinancialBaseline>) => {
      setBaselineState((prev) => {
        const next = { ...prev, ...updates };
        defaultPersistenceAdapter.saveBaseline(next);
        return next;
      });
    },
    [setBaselineState],
  );

  const setBaseline = useCallback(
    (newBaseline: FinancialBaseline) => {
      setBaselineState(newBaseline);
      defaultPersistenceAdapter.saveBaseline(newBaseline);
    },
    [setBaselineState],
  );

  // Auto-check for onboarding seed on mount if not yet hydrated
  useEffect(() => {
    if (typeof window !== "undefined") {
      const seed = defaultPersistenceAdapter.getSeed();
      if (
        seed &&
        seedCarriesSalary(seed) &&
        (!baseline.userId || !(baseline.annualGrossSalary > 0))
      ) {
        const hydrated = hydrateBaselineFromSeed(seed, baseline.userId);
        setBaseline(hydrated);
        defaultPersistenceAdapter.clearSeed();
      }
    }
  }, [baseline.userId, baseline.annualGrossSalary, setBaseline]);

  return {
    baseline,
    updateBaseline,
    setBaseline,
    stage: baseline.financialStage,
    enabledModules: baseline.enabledModules,
  };
}
