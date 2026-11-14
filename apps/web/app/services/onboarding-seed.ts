import { HOME_ESTIMATE_LABEL } from "@flump/finance-engine";

export interface OnboardingSeedInput {
  cash: number;
  pensionPot: number;
  mortgageBalance: number;
  /**
   * The user's own estimate of their home's value. Saved as a Property account named
   * "Home (your estimate)" so net worth and loan to value count it (E16 D3); the backend does
   * not store the profile `homeValue`. Optional: absent or 0 seeds nothing.
   */
  propertyValue?: number;
  unsecuredDebt: number;
  monthlyTakeHome: number;
  /** Null when not answered: no housing entry is named as rent then. */
  housingStatus: "renting" | "mortgage" | "own_outright" | "living_with_family" | null;
  monthlyHousing: number;
  otherOutgoings: number;
}

export interface OnboardingSeedJob {
  /** Stable key so a retry never creates the same record twice. */
  key: string;
  endpoint: "/accounts" | "/budget-entries";
  payload: Record<string, unknown>;
  enabled: boolean;
}

const account = (name: string, type: string, balance: number): OnboardingSeedJob => ({
  key: `account:${name}`,
  endpoint: "/accounts",
  payload: { name, type, balance, isCurrent: true },
  enabled: balance > 0,
});

const budgetEntry = (
  name: string,
  category: string,
  amount: number,
  isIncome: boolean,
): OnboardingSeedJob => ({
  key: `entry:${name}`,
  endpoint: "/budget-entries",
  payload: { name, category, amount, isIncome, frequency: "monthly" },
  enabled: amount > 0,
});

/** The budget entry name for each answer that has a monthly housing payment. */
const HOUSING_ENTRY: Partial<Record<NonNullable<OnboardingSeedInput["housingStatus"]>, string>> = {
  renting: "Rent Payment",
  mortgage: "Mortgage Payment",
  living_with_family: "Household contribution",
};

/**
 * The baseline accounts and budget entries onboarding creates. Payloads match the backend's
 * Account and BudgetEntry fields exactly (budget entries use `name`, like BudgetContainer).
 */
export function buildOnboardingSeedJobs(input: OnboardingSeedInput): OnboardingSeedJob[] {
  const housingEntry = input.housingStatus ? HOUSING_ENTRY[input.housingStatus] : undefined;
  return [
    account("Cash and emergency savings", "Saving", input.cash),
    account("Workplace and personal pension", "Pension", input.pensionPot),
    // Only a home the person owns is saved; any other answer's leftover value is not.
    ...((input.propertyValue ?? 0) > 0 &&
    (input.housingStatus === "mortgage" || input.housingStatus === "own_outright")
      ? [account(HOME_ESTIMATE_LABEL, "Property", input.propertyValue ?? 0)]
      : []),
    ...(input.mortgageBalance > 0
      ? [account("Residential Mortgage", "Mortgage", input.mortgageBalance)]
      : []),
    ...(input.unsecuredDebt > 0
      ? [account("Cards and loans baseline", "Credit Card", input.unsecuredDebt)]
      : []),
    budgetEntry("Monthly Take-Home Income", "income", input.monthlyTakeHome, true),
    ...(input.monthlyHousing > 0 && housingEntry
      ? [budgetEntry(housingEntry, "housing", input.monthlyHousing, false)]
      : []),
    ...(input.otherOutgoings > 0
      ? [budgetEntry("General living and outgoings", "living", input.otherOutgoings, false)]
      : []),
  ];
}
