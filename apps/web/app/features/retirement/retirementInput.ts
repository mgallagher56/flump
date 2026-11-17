import type {
  BudgetEntryItem,
  BuildRetirementPlanInputArgs,
  RawAccount,
  RetirementSavedPlanInput,
} from "@flump/finance-engine";

/** The saved data the retirement route loads, as plain values. */
export interface RetirementLoaderData {
  userProfile: {
    birthYear?: number | null;
    housingStatus?: string | null;
    monthlyHousingCost?: number | null;
  } | null;
  accounts: readonly RawAccount[];
  budgetEntries: readonly BudgetEntryItem[];
  retirementPlan: RetirementSavedPlanInput | null;
}

/**
 * The web page's mapping into the shared engine builder (`buildRetirementPlanInput`). The MCP
 * tools use `retirementArgsFromContextInput` over the same saved data; a parity test keeps the two
 * giving identical figures.
 */
export function retirementArgsFromLoader(
  data: RetirementLoaderData,
  now: Date,
): BuildRetirementPlanInputArgs {
  const birthYear = data.userProfile?.birthYear;
  return {
    plan: data.retirementPlan,
    birthYear: typeof birthYear === "number" && Number.isInteger(birthYear) ? birthYear : null,
    now,
    housingStatus: data.userProfile?.housingStatus ?? null,
    monthlyHousingCostGbp: data.userProfile?.monthlyHousingCost ?? null,
    accounts: data.accounts,
    budgetEntries: data.budgetEntries,
  };
}
