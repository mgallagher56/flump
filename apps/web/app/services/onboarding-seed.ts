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

interface SeedJobBase {
  /** Stable key so a retry never creates the same record twice. */
  key: string;
  enabled: boolean;
}

/** One account or budget entry. */
interface OnboardingRecordJob extends SeedJobBase {
  endpoint: "/accounts" | "/budget-entries";
  payload: Record<string, unknown>;
}

/**
 * The mortgage and the home it is on, created and linked in one backend transaction (system audit
 * slice 4). Its key is the mortgage's, as a lone mortgage job's would be, so a retry that finds
 * the mortgage saved never adds a second one.
 */
interface OnboardingMortgageWithHomeJob extends SeedJobBase {
  endpoint: "/accounts/mortgage-with-property";
  payload: {
    mortgage: Record<string, unknown>;
    property: { name: string; balance: number };
  };
}

export type OnboardingSeedJob = OnboardingRecordJob | OnboardingMortgageWithHomeJob;

/** The name onboarding gives the mortgage it seeds. */
const ONBOARDING_MORTGAGE_NAME = "Residential Mortgage";

const account = (
  name: string,
  type: string,
  balance: number,
  accountSubtype?: string,
): OnboardingRecordJob => ({
  key: `account:${name}`,
  endpoint: "/accounts",
  payload: { name, type, ...(accountSubtype ? { accountSubtype } : {}), balance, isCurrent: true },
  enabled: balance > 0,
});

const budgetEntry = (
  name: string,
  category: string,
  amount: number,
  isIncome: boolean,
): OnboardingRecordJob => ({
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
  const homeValue = input.propertyValue ?? 0;
  // Only a home the person owns is saved; any other answer's leftover value is not.
  const savesHome =
    homeValue > 0 && (input.housingStatus === "mortgage" || input.housingStatus === "own_outright");
  const hasMortgage = input.mortgageBalance > 0;
  return [
    account("Cash and emergency savings", "Saving", input.cash),
    account("Workplace and personal pension", "Pension", input.pensionPot),
    // A mortgage and a home: one call creates both and links them (slice 4), in place of two.
    ...(savesHome && hasMortgage
      ? [
          {
            key: `account:${ONBOARDING_MORTGAGE_NAME}`,
            endpoint: "/accounts/mortgage-with-property",
            payload: {
              mortgage: {
                name: ONBOARDING_MORTGAGE_NAME,
                accountSubtype: "residential_mortgage",
                balance: input.mortgageBalance,
                isCurrent: true,
              },
              property: { name: HOME_ESTIMATE_LABEL, balance: homeValue },
            },
            enabled: true,
          } satisfies OnboardingMortgageWithHomeJob,
        ]
      : [
          // Saved as the home, so it counts as the home and not as a second property.
          ...(savesHome ? [account(HOME_ESTIMATE_LABEL, "Property", homeValue, "home")] : []),
          ...(hasMortgage
            ? [account(ONBOARDING_MORTGAGE_NAME, "Mortgage", input.mortgageBalance)]
            : []),
        ]),
    ...(input.unsecuredDebt > 0
      ? [account("Cards and loans baseline", "Credit Card", input.unsecuredDebt)]
      : []),
    budgetEntry("Monthly Take-Home Income", "income", input.monthlyTakeHome, true),
    // Linked to the saved housing payment (the profile figure saved with these answers, or the
    // mortgage account's payment once one is saved): no copy that goes stale (audit slice 5).
    ...(input.monthlyHousing > 0 && housingEntry
      ? [
          {
            key: `entry:${housingEntry}`,
            endpoint: "/budget-entries",
            payload: {
              name: housingEntry,
              category: "housing",
              amount: 0,
              isIncome: false,
              isEssential: true,
              frequency: "monthly",
              linkKind: "housing",
            },
            enabled: true,
          } satisfies OnboardingRecordJob,
        ]
      : []),
    ...(input.otherOutgoings > 0
      ? [budgetEntry("General living and outgoings", "living", input.otherOutgoings, false)]
      : []),
  ];
}
