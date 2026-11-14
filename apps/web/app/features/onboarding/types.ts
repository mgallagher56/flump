import type { TaxRegion } from "~/hooks/useUserProfile";

export type EmploymentType = "employed" | "self-employed";
export type IncomeMode = "gross" | "net";
export const HOUSING_STATUSES = [
  "renting",
  "mortgage",
  "own_outright",
  "living_with_family",
] as const;
export type HousingStatus = (typeof HOUSING_STATUSES)[number];

/** True for the answers where the person owns the home they live in. */
export const ownsHome = (status: HousingStatus | null): boolean =>
  status === "mortgage" || status === "own_outright";

/**
 * Everything the flow collects. `null` means "not given" (unknown), never zero: a typed 0 is a real
 * amount. Derived figures treat unknown as 0 for arithmetic only; saves use the raw values.
 */
export interface OnboardingValues {
  age: number | null;
  employmentType: EmploymentType;
  incomeMode: IncomeMode;
  grossSalary: number | null;
  monthlyTakeHome: number | null;
  studentLoanPlan: string;
  taxRegion: TaxRegion | null;
  /** Null until the person picks an answer: never presumed to be renting. */
  housingStatus: HousingStatus | null;
  monthlyHousingCost: number | null;
  propertyValue: number | null;
  mortgageBalance: number | null;
  monthlyOtherOutgoings: number | null;
  cashSavings: number | null;
  pensionPot: number | null;
  pensionPercent: number | null;
  isSalarySacrifice: boolean | null;
  unsecuredDebt: number | null;
}

export const INITIAL_VALUES: OnboardingValues = {
  age: null,
  employmentType: "employed",
  incomeMode: "gross",
  grossSalary: null,
  monthlyTakeHome: null,
  studentLoanPlan: "NONE",
  taxRegion: null,
  housingStatus: null,
  monthlyHousingCost: null,
  propertyValue: null,
  mortgageBalance: null,
  monthlyOtherOutgoings: null,
  cashSavings: null,
  pensionPot: null,
  pensionPercent: null,
  isSalarySacrifice: null,
  unsecuredDebt: null,
};

export const STEP_IDS = ["income", "housing", "savings", "review"] as const;
export type StepId = (typeof STEP_IDS)[number];

/** Step titles, as headed on each step and on the review. */
export const STEP_LABELS: Record<StepId, string> = {
  income: "You and income",
  housing: "Housing and spending",
  savings: "Savings and debt",
  review: "Review",
};

/** One-word names for the stepper, so no step name wraps at tablet widths. */
export const STEPPER_LABELS: Record<StepId, string> = {
  income: "Income",
  housing: "Housing",
  savings: "Savings",
  review: "Review",
};

/** Steps that can be skipped. "You and income" holds what Finish needs, so it has no skip. */
export const OPTIONAL_STEPS: ReadonlySet<StepId> = new Set(["housing", "savings"]);

/** Step numbers count from 1, matching the Stepper. */
export const REVIEW_STEP = STEP_IDS.length;
