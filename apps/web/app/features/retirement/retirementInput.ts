import {
  type BudgetEntryItem,
  type BuildRetirementPlanInputArgs,
  type RawAccount,
  type RetirementSavedPlanInput,
  type WorkplacePensionInput,
  workplacePensionFromProfile,
} from "@flump/finance-engine";

/** The saved data the retirement route loads, as plain values. */
export interface RetirementLoaderData {
  userProfile: {
    birthYear?: number | null;
    housingStatus?: string | null;
    monthlyHousingCost?: number | null;
    /** Saved workplace pension facts, from the Pension page's details. */
    annualSalary?: number | null;
    pensionPercent?: number | null;
    pensionEmployerPercent?: number | null;
    isSalarySacrifice?: boolean | null;
    isSalarySacrificeEmployerNi?: boolean | null;
  } | null;
  accounts: readonly RawAccount[];
  budgetEntries: readonly BudgetEntryItem[];
  retirementPlan: RetirementSavedPlanInput | null;
}

/** The saved workplace pension from the profile's pension fields, or null without a salary. */
export function workplacePensionFromLoader(
  profile: RetirementLoaderData["userProfile"],
): WorkplacePensionInput | null {
  if (!profile) return null;
  return workplacePensionFromProfile({
    annualSalary: profile.annualSalary ?? null,
    pensionPercent: profile.pensionPercent ?? undefined,
    pensionEmployerPercent: profile.pensionEmployerPercent ?? undefined,
    isSalarySacrifice: profile.isSalarySacrifice ?? undefined,
    isSalarySacrificeEmployerNi: profile.isSalarySacrificeEmployerNi ?? undefined,
  });
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
    workplacePension: workplacePensionFromLoader(data.userProfile),
  };
}
