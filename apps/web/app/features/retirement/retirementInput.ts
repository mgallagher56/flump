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
    /** Saved employment type: self-employed or other has no workplace pension. */
    employmentType?: string | null;
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

const EMPLOYMENT_TYPES = ["employed", "self-employed", "other"] as const;

/**
 * The saved workplace pension from the profile's pension fields, or null without a salary or for
 * a self-employed or other employment type.
 */
export function workplacePensionFromLoader(
  profile: RetirementLoaderData["userProfile"],
): WorkplacePensionInput | null {
  if (!profile) return null;
  const employmentType = EMPLOYMENT_TYPES.find((type) => type === profile.employmentType) ?? null;
  return workplacePensionFromProfile({
    employmentType,
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
