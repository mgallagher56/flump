import {
  hydrateBaselineFromSeed,
  type OnboardingSeedPayload,
  readOnboardingSeed,
} from "@flump/finance-engine";
import { useEffect, useState } from "react";
import type { OnboardingValues } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

const seedCarriesNumbers = (seed: OnboardingSeedPayload) =>
  Boolean(seed.annualIncome || seed.annualGrossSalary || seed.initialCashSavings !== undefined);

/**
 * Pure part: the fields a fresh seed fills in. Only fields the seed actually carries are filled;
 * everything else stays unknown.
 */
export function valuesFromSeed(parsed: OnboardingSeedPayload): Partial<OnboardingValues> {
  const hydrated = hydrateBaselineFromSeed(parsed);
  const patch: Partial<OnboardingValues> = {};
  if (parsed.annualIncome || parsed.annualGrossSalary)
    patch.grossSalary = hydrated.annualGrossSalary;
  if (hydrated.age) patch.age = hydrated.age;
  if (hydrated.employmentStatus === "SELF_EMPLOYED") patch.employmentType = "self-employed";
  if (parsed.pensionContributionPct !== undefined) {
    patch.pensionPercent = hydrated.pensionContributionPct;
  }
  if (parsed.isSalarySacrifice !== undefined || parsed.salarySacrifice !== undefined) {
    patch.isSalarySacrifice = hydrated.isSalarySacrifice;
  }
  if (hydrated.totalCashSavings > 0) patch.cashSavings = hydrated.totalCashSavings;
  if (hydrated.totalPensionPot > 0) patch.pensionPot = hydrated.totalPensionPot;
  patch.mortgageBalance = hydrated.mortgageBalance > 0 ? hydrated.mortgageBalance : null;
  if (hydrated.mortgageBalance > 0) {
    patch.housingStatus = "mortgage";
    patch.propertyValue = hydrated.propertyValue > 0 ? hydrated.propertyValue : null;
  } else if (hydrated.housingStatus === "OWN_OUTRIGHT") {
    patch.housingStatus = "own_outright";
  } else {
    patch.housingStatus = "renting";
  }
  patch.unsecuredDebt = hydrated.totalUnsecuredDebt > 0 ? hydrated.totalUnsecuredDebt : null;
  if (hydrated.monthlyHousingCost > 0) patch.monthlyHousingCost = hydrated.monthlyHousingCost;
  if (hydrated.monthlyOtherOutgoings > 0) {
    patch.monthlyOtherOutgoings = hydrated.monthlyOtherOutgoings;
  }
  return patch;
}

/** Reads the tools/calculators seed once on mount and hands fresh numbers to `apply`. */
export function useSeedHydration(apply: (patch: Partial<OnboardingValues>) => void) {
  const [seed, setSeed] = useState<OnboardingSeedPayload | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const parsed = readOnboardingSeed();
      if (!parsed) return;
      const isFresh = Date.now() - (parsed.timestamp || 0) < DAY_MS;
      const carriesNumbers = seedCarriesNumbers(parsed);
      const carriesChoices = Boolean(parsed.inferredModules?.length || parsed.inferredStage);
      if (isFresh && (carriesNumbers || carriesChoices)) {
        setSeed(parsed);
        setShowBanner(true);
      }
      if (isFresh && carriesNumbers) apply(valuesFromSeed(parsed));
    } catch (err) {
      console.error("Failed to read onboarding seed:", err);
    }
  }, []);

  return {
    seed,
    showBanner,
    dismissBanner: () => setShowBanner(false),
    seedHasNumbers: Boolean(seed && seedCarriesNumbers(seed)),
  };
}
