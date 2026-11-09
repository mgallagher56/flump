import type {
  ActiveModule,
  FinancialBaseline,
  FinancialStage,
  OnboardingSeedPayload,
} from "@flump/finance-engine";
import { clearOnboardingSeed, readOnboardingSeed } from "@repo/common";
import { atom, useAtom } from "jotai";
import { useCallback, useEffect } from "react";

export const FINANCIAL_BASELINE_STORAGE_KEY = "flump_financial_baseline_v1";

export const DEFAULT_FINANCIAL_BASELINE: FinancialBaseline = {
  userId: "",
  taxYear: "2025/26",
  ukRegion: "ENGLAND_NI_WALES",
  employmentStatus: "PAYE",
  annualGrossSalary: 45000,
  annualBonusOrSideIncome: 0,
  pensionContributionPct: 5,
  employerPensionMatchPct: 3,
  isSalarySacrifice: true,
  studentLoanPlan: "NONE",
  propertyOwnershipSharePct: 100,
  financialStage: "STAGE_2_BUFFER_BUILD",
  enabledModules: ["accounts", "debt", "budget", "pension", "mortgage", "forecast", "tax"],
};

export type AnySeedPayload = OnboardingSeedPayload | Record<string, any>;

/**
 * Hydrates a FinancialBaseline from an OnboardingSeedPayload.
 */
export function hydrateBaselineFromSeed(seed: AnySeedPayload, userId = ""): FinancialBaseline {
  const seedAny = seed as Record<string, any>;
  const annualGrossSalary =
    seedAny.annualGrossSalary ??
    seedAny.annualIncome ??
    (seedAny.mode === "WEALTH" ? 65000 : 38000);
  const pensionContributionPct = seedAny.pensionContributionPct ?? 5;
  const isSalarySacrifice = seedAny.isSalarySacrifice ?? seedAny.salarySacrifice ?? true;

  // Determine stage if not already explicitly inferred
  let stage: FinancialStage = seedAny.inferredStage as FinancialStage;
  if (!stage) {
    if (seedAny.mode === "DEBT" || (seedAny.totalUnsecuredDebt && seedAny.totalUnsecuredDebt > 0)) {
      stage = "STAGE_1_DEBT_RECOVERY";
    } else if (annualGrossSalary >= 100000) {
      stage = "STAGE_3_WEALTH_OPTIMIZE";
    } else {
      stage = "STAGE_2_BUFFER_BUILD";
    }
  }

  // Determine enabled modules (mapping legacy 'savings' -> 'accounts')
  const rawModules: string[] = Array.isArray(seedAny.inferredModules)
    ? seedAny.inferredModules
    : [];
  let enabledModules: ActiveModule[] = rawModules
    .map((m) => (m === "savings" ? "accounts" : m))
    .filter((m): m is ActiveModule =>
      ["accounts", "debt", "budget", "pension", "mortgage", "forecast", "tax"].includes(m),
    );

  // Deduplicate
  enabledModules = Array.from(new Set(enabledModules));

  if (enabledModules.length === 0) {
    if (stage === "STAGE_1_DEBT_RECOVERY") {
      enabledModules = ["accounts", "debt", "budget"];
    } else if (stage === "STAGE_2_BUFFER_BUILD") {
      enabledModules = ["accounts", "budget", "mortgage", "forecast"];
    } else {
      enabledModules = ["accounts", "budget", "pension", "mortgage", "forecast", "tax"];
    }
  }

  return {
    ...DEFAULT_FINANCIAL_BASELINE,
    userId,
    annualGrossSalary,
    pensionContributionPct,
    isSalarySacrifice,
    financialStage: stage,
    enabledModules,
  };
}

/**
 * Writes an onboarding seed payload to the cross-subdomain cookie `flump_onboarding_seed`.
 */
export function writeOnboardingSeedCookie(payload: AnySeedPayload): void {
  if (typeof document === "undefined") return;
  const encoded = encodeURIComponent(JSON.stringify(payload));
  const domain =
    typeof window !== "undefined" && window.location.hostname.includes("flump.co.uk")
      ? "; domain=.flump.co.uk"
      : "";
  document.cookie = `flump_onboarding_seed=${encoded}; path=/; max-age=2592000; SameSite=Lax${domain}`;
}

/**
 * Loads baseline from localStorage or seed cookie on initial boot.
 */
function getInitialBaseline(): FinancialBaseline {
  if (typeof window === "undefined") {
    return DEFAULT_FINANCIAL_BASELINE;
  }

  // 1. Try reading saved baseline from localStorage
  try {
    const saved = window.localStorage.getItem(FINANCIAL_BASELINE_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_FINANCIAL_BASELINE, ...parsed };
    }
  } catch {
    // Continue
  }

  // 2. Try hydrating from cross-subdomain onboarding seed cookie/storage
  try {
    const seed = readOnboardingSeed();
    if (seed) {
      const hydrated = hydrateBaselineFromSeed(seed);
      // Persist hydrated baseline
      window.localStorage.setItem(FINANCIAL_BASELINE_STORAGE_KEY, JSON.stringify(hydrated));
      return hydrated;
    }
  } catch {
    // Continue
  }

  return DEFAULT_FINANCIAL_BASELINE;
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
        if (typeof window !== "undefined") {
          try {
            window.localStorage.setItem(FINANCIAL_BASELINE_STORAGE_KEY, JSON.stringify(next));
          } catch {
            // Ignore
          }
        }
        return next;
      });
    },
    [setBaselineState],
  );

  const setBaseline = useCallback(
    (newBaseline: FinancialBaseline) => {
      setBaselineState(newBaseline);
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(FINANCIAL_BASELINE_STORAGE_KEY, JSON.stringify(newBaseline));
        } catch {
          // Ignore
        }
      }
    },
    [setBaselineState],
  );

  // Auto-check for onboarding seed on mount if not yet hydrated
  useEffect(() => {
    if (typeof window !== "undefined") {
      const seed = readOnboardingSeed();
      if (
        seed &&
        (!baseline.userId ||
          baseline.annualGrossSalary === DEFAULT_FINANCIAL_BASELINE.annualGrossSalary)
      ) {
        const hydrated = hydrateBaselineFromSeed(seed, baseline.userId);
        setBaseline(hydrated);
        clearOnboardingSeed();
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
