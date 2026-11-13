import type { TaxRegion } from "~/hooks/useUserProfile";

export type EmploymentType = "employed" | "self-employed";
export type IncomeMode = "gross" | "net";
export type HousingStatus = "renting" | "mortgage" | "own_outright";

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
  housingStatus: HousingStatus;
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
  housingStatus: "renting",
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

export const STEP_IDS = ["income", "housing", "savings", "bank", "review"] as const;
export type StepId = (typeof STEP_IDS)[number];

export const STEP_LABELS: Record<StepId, string> = {
  income: "You and income",
  housing: "Housing and outgoings",
  savings: "Savings and debt",
  bank: "Bank (optional)",
  review: "Review",
};

/** Step numbers count from 1, matching the Stepper. */
export const REVIEW_STEP = STEP_IDS.length;
