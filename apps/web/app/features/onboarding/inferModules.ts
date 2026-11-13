import type { AppPageKey } from "~/utils/pageConfig";
import type { OnboardingValues } from "./types";

/**
 * Which modules start switched on. A layout default only: it never picks action text (advice
 * boundary R4). Self Assessment is opt-in, so only self-employed people get it by default.
 */
export function inferModules(values: OnboardingValues): AppPageKey[] {
  const modules = new Set<AppPageKey>(["accounts", "budget", "savings"]);
  if ((values.unsecuredDebt ?? 0) > 0) modules.add("debt");
  if ((values.pensionPot ?? 0) > 0 || (values.pensionPercent ?? 0) > 0) modules.add("pension");
  if (
    values.housingStatus === "mortgage" ||
    (values.mortgageBalance ?? 0) > 0 ||
    (values.propertyValue ?? 0) > 0
  ) {
    modules.add("mortgage");
  }
  if (values.employmentType === "self-employed") modules.add("tax");
  return Array.from(modules);
}

export const MODULE_LABELS: Partial<Record<AppPageKey, string>> = {
  accounts: "Accounts",
  budget: "Budget",
  savings: "Savings",
  debt: "Debt",
  pension: "Pension",
  mortgage: "Mortgage",
  tax: "Tax",
};
