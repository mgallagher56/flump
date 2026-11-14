import type { TaxRegion, UserProfile, UserProfileUpdate } from "~/hooks/useUserProfile";
import { birthYearFromAge } from "./age";
import { HOUSING_STATUSES, INITIAL_VALUES, type OnboardingValues } from "./types";

/** Where "Save and exit" goes. The home page sends a person who has not finished back to setup. */
export const SAVE_AND_EXIT_PATH = "/app/accounts";

export const SAVE_AND_EXIT_ERROR =
  "We could not save your details. They are still in this browser tab. Check your connection and try again.";

/**
 * The profile facts "Save and exit" keeps: only answers the person gave, and never
 * `onboardingCompleted`, so setup carries on next time. Balances are saved as accounts only by
 * Finish (the profile has no field for them), so they are not part of the draft.
 */
export function draftFromValues(values: OnboardingValues): UserProfileUpdate {
  const draft: UserProfileUpdate = { employmentType: values.employmentType };
  const birthYear = birthYearFromAge(values.age);
  if (birthYear !== undefined) draft.birthYear = birthYear;
  if (values.taxRegion) draft.taxRegion = values.taxRegion;
  if (values.studentLoanPlan !== "NONE") draft.studentLoanPlans = [values.studentLoanPlan];
  if (values.incomeMode === "gross" && (values.grossSalary ?? 0) > 0) {
    draft.annualSalary = values.grossSalary;
  }
  if (values.incomeMode === "net" && (values.monthlyTakeHome ?? 0) > 0) {
    draft.monthlyTakeHome = values.monthlyTakeHome;
  }
  if (values.housingStatus) draft.housingStatus = values.housingStatus;
  if (values.housingStatus !== "own_outright" && values.monthlyHousingCost !== null) {
    draft.monthlyHousingCost = values.monthlyHousingCost;
  }
  if (values.monthlyOtherOutgoings !== null) {
    draft.monthlyOtherOutgoings = values.monthlyOtherOutgoings;
  }
  return draft;
}

/**
 * Where setup picks up after "Save and exit": the answers a saved profile holds. Anything not
 * saved stays unknown; housing is never presumed. Only for a person who has not finished setup.
 */
export function valuesFromProfile(
  profile: Partial<UserProfile> | null | undefined,
): OnboardingValues {
  const values: OnboardingValues = { ...INITIAL_VALUES };
  if (!profile || profile.onboardingCompleted) return values;
  if (typeof profile.birthYear === "number") {
    values.age = new Date().getFullYear() - profile.birthYear;
  }
  if (profile.employmentType === "self-employed") values.employmentType = "self-employed";
  if (profile.taxRegion) values.taxRegion = profile.taxRegion as TaxRegion;
  const plan = profile.studentLoanPlans?.[0];
  if (plan) values.studentLoanPlan = plan;
  if ((profile.annualSalary ?? 0) > 0) {
    values.grossSalary = profile.annualSalary ?? null;
  } else if ((profile.monthlyTakeHome ?? 0) > 0) {
    values.incomeMode = "net";
    values.monthlyTakeHome = profile.monthlyTakeHome ?? null;
  }
  const status = HOUSING_STATUSES.find((s) => s === profile.housingStatus);
  if (status) values.housingStatus = status;
  if (typeof profile.monthlyHousingCost === "number") {
    values.monthlyHousingCost = profile.monthlyHousingCost;
  }
  if (typeof profile.monthlyOtherOutgoings === "number") {
    values.monthlyOtherOutgoings = profile.monthlyOtherOutgoings;
  }
  return values;
}
