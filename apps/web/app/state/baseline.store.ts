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
  age: 32,
  taxYear: "2025/26",
  ukRegion: "ENGLAND_NI_WALES",
  employmentStatus: "PAYE",
  annualGrossSalary: 45000,
  monthlyTakeHomeOverride: undefined,
  annualBonusOrSideIncome: 0,
  housingStatus: "RENTING",
  monthlyHousingCost: 900,
  propertyValue: 0,
  mortgageBalance: 0,
  monthlyOtherOutgoings: 1100,
  totalCashSavings: 5000,
  totalPensionPot: 15000,
  totalUnsecuredDebt: 0,
  pensionContributionPct: 5,
  employerPensionMatchPct: 3,
  isSalarySacrifice: true,
  studentLoanPlan: "NONE",
  propertyOwnershipSharePct: 100,
  financialStage: "STAGE_2_BUFFER_BUILD",
  enabledModules: ["accounts", "budget", "pension", "forecast"],
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
  const totalUnsecuredDebt =
    seedAny.totalUnsecuredDebt !== undefined ? seedAny.totalUnsecuredDebt : 0;
  const totalCashSavings = seedAny.totalCashSavings ?? seedAny.initialCashSavings ?? 5000;
  const mortgageBalance = seedAny.mortgageBalance ?? 0;
  const propertyValue =
    seedAny.propertyValue ?? (mortgageBalance > 0 ? Math.round(mortgageBalance * 1.35) : 0);
  const housingStatus = seedAny.housingStatus ?? (mortgageBalance > 0 ? "MORTGAGE" : "RENTING");
  const monthlyHousingCost =
    seedAny.monthlyHousingCost ?? (housingStatus === "OWN_OUTRIGHT" ? 0 : 900);
  const monthlyOtherOutgoings = seedAny.monthlyOtherOutgoings ?? 1100;
  const totalPensionPot = seedAny.totalPensionPot ?? seedAny.initialInvestments ?? 15000;
  const age = seedAny.age ?? 32;
  const studentLoanPlan = seedAny.studentLoanPlan ?? "NONE";
  const employmentStatus = seedAny.isSelfEmployed
    ? "SELF_EMPLOYED"
    : (seedAny.employmentStatus ?? "PAYE");

  // Determine stage if not already explicitly inferred
  let stage: FinancialStage = seedAny.inferredStage as FinancialStage;
  if (!stage) {
    if (seedAny.mode === "DEBT" || totalUnsecuredDebt > 0) {
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
    enabledModules = ["accounts", "budget", "forecast"];
    if (totalUnsecuredDebt > 0 || stage === "STAGE_1_DEBT_RECOVERY") {
      enabledModules.push("debt");
    }
    if (totalPensionPot > 0 || pensionContributionPct > 0) {
      enabledModules.push("pension");
    }
    if (housingStatus === "MORTGAGE" || mortgageBalance > 0) {
      enabledModules.push("mortgage");
    }
    if (employmentStatus === "SELF_EMPLOYED" || annualGrossSalary >= 95000) {
      enabledModules.push("tax");
    }
    enabledModules = Array.from(new Set(enabledModules));
  }

  return {
    ...DEFAULT_FINANCIAL_BASELINE,
    userId,
    age,
    employmentStatus,
    annualGrossSalary,
    monthlyTakeHomeOverride: seedAny.monthlyTakeHomeOverride,
    housingStatus,
    monthlyHousingCost,
    propertyValue,
    mortgageBalance,
    monthlyOtherOutgoings,
    totalCashSavings,
    totalPensionPot,
    totalUnsecuredDebt,
    pensionContributionPct,
    isSalarySacrifice,
    studentLoanPlan,
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
