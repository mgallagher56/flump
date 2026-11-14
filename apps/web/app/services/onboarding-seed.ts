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
  housingStatus: "renting" | "mortgage" | "own_outright";
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

/**
 * The baseline accounts and budget entries onboarding creates. Payloads match the backend's
 * Account and BudgetEntry fields exactly (budget entries use `name`, like BudgetContainer).
 */
export function buildOnboardingSeedJobs(input: OnboardingSeedInput): OnboardingSeedJob[] {
  return [
    account("Cash and emergency savings", "Saving", input.cash),
    account("Workplace and personal pension", "Pension", input.pensionPot),
    // A renter's leftover answer is not a home they own.
    ...((input.propertyValue ?? 0) > 0 && input.housingStatus !== "renting"
      ? [account(HOME_ESTIMATE_LABEL, "Property", input.propertyValue ?? 0)]
      : []),
    ...(input.mortgageBalance > 0
      ? [account("Residential Mortgage", "Mortgage", input.mortgageBalance)]
      : []),
    ...(input.unsecuredDebt > 0
      ? [account("Cards and loans baseline", "Credit Card", input.unsecuredDebt)]
      : []),
    budgetEntry("Monthly Take-Home Income", "income", input.monthlyTakeHome, true),
    ...(input.monthlyHousing > 0
      ? [
          budgetEntry(
            input.housingStatus === "mortgage" ? "Mortgage Payment" : "Rent Payment",
            "housing",
            input.monthlyHousing,
            false,
          ),
        ]
      : []),
    ...(input.otherOutgoings > 0
      ? [budgetEntry("General living and outgoings", "living", input.otherOutgoings, false)]
      : []),
  ];
}
