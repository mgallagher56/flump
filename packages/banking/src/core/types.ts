export type BankingProviderName = "plaid" | "truelayer" | "csv" | "sandbox" | "manual";

export type FlumpAccountCategory =
  | "CURRENT"
  | "SAVINGS"
  | "CASH_ISA"
  | "STOCKS_ISA"
  | "GENERAL_INVESTMENT"
  | "PENSION_WORKPLACE"
  | "PENSION_SIPP"
  | "CREDIT_CARD"
  | "OVERDRAFT"
  | "LOAN_PERSONAL"
  | "CAR_FINANCE_PCP_HP"
  | "MORTGAGE_RESIDENTIAL"
  | "MORTGAGE_BTL";

export type ConsentStatus =
  | "ACTIVE"
  | "EXPIRING_SOON" // < 7 days until 90-day UK FCA expiry
  | "REAUTH_REQUIRED"
  | "ERROR"
  | "MANUAL";

export interface NormalizedAccount {
  externalAccountId: string;
  provider: BankingProviderName;
  institutionName: string;
  name: string;
  category: FlumpAccountCategory;
  currency: string;
  /**
   * SIGN CONVENTION LAW:
   * Assets (Current, Savings, ISA, Pension) are POSITIVE.
   * Liabilities (Credit Card debt, Overdraft used, Loans, Mortgages) are NEGATIVE for Net Worth math,
   * while `principalOwedGbp` is exposed as a POSITIVE number for Debt/Mortgage payoff calculators.
   */
  netWorthImpactGbp: number;
  principalOwedGbp: number;
  creditLimitGbp?: number;
  interestRateApr?: number;
  promoAprExpiryDate?: string;
  revertApr?: number;
  mortgageFixExpiryDate?: string;
  isTaxFreeIsaWrapper: boolean;
  lastSyncedAt: string;
}

export type FlumpBudgetBucket =
  | "PRIORITY_HOUSING_COUNCIL_ENERGY"
  | "ESSENTIAL_BILLS_GROCERIES"
  | "DEBT_MINIMUM_REPAYMENT"
  | "DEBT_OVERPAYMENT"
  | "DISCRETIONARY_WANTS"
  | "SAVINGS_INVESTMENTS_TRANSFER"
  | "INCOME";

export interface NormalizedTransaction {
  externalTransactionId: string;
  externalAccountId: string;
  postedDate: string;
  merchantOrDescription: string;
  amountGbp: number; // Outflows negative, Inflows positive
  flumpBucket: FlumpBudgetBucket;
  isRecurringContract: boolean;
  rawProviderCategory?: string;
}
