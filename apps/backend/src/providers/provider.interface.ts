import type {
  BankingProviderName,
  FlumpAccountCategory,
  NormalizedAccount,
  ProviderAccount,
} from "@flump/banking/server";

// The provider interface and its types live in @flump/banking (audit M20): one definition for
// every bank integration. Re-exported here so backend code imports from one place.
export type {
  BankProvider,
  FetchTransactionsOptions,
  ProviderAccount,
  ProviderCallOptions,
  ProviderTransaction,
  RevokeResult,
  TokenResponse,
} from "@flump/banking/server";

export function toNormalizedAccount(
  account: ProviderAccount,
  provider: BankingProviderName,
  institutionName: string,
): NormalizedAccount {
  const isDebt = account.type === "Credit Card" || account.type === "Mortgage";
  const categoryMap: Record<ProviderAccount["type"], FlumpAccountCategory> = {
    Current: "CURRENT",
    Saving: "SAVINGS",
    Mortgage: "MORTGAGE_RESIDENTIAL",
    "Credit Card": "CREDIT_CARD",
    Investment: "GENERAL_INVESTMENT",
  };

  const balanceMag = Math.abs(account.balance);

  return {
    externalAccountId: account.externalAccountId,
    provider,
    institutionName,
    name: account.name,
    category: categoryMap[account.type] || "CURRENT",
    currency: account.currency,
    // Assets keep their real sign (an overdrawn current account is negative); debts are -owed.
    netWorthImpactGbp: isDebt ? -balanceMag : account.balance,
    principalOwedGbp: isDebt ? balanceMag : 0,
    isTaxFreeIsaWrapper: false,
    lastSyncedAt: new Date().toISOString(),
  };
}
