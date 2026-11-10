import type { BankingProviderName, FlumpAccountCategory, NormalizedAccount } from "@flump/banking";

export interface TokenResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}

export interface ProviderAccount {
  externalAccountId: string;
  name: string;
  type: "Current" | "Saving" | "Mortgage" | "Credit Card" | "Investment";
  balance: number;
  currency: string;
}

export interface ProviderTransaction {
  amount: number;
  description: string;
  category: string;
  timestamp: Date;
}

export interface IBankProvider {
  getAuthUrl(clientId: string, redirectUri: string, state: string): string;
  exchangeCode(
    clientId: string,
    clientSecret: string,
    redirectUri: string,
    code: string,
  ): Promise<TokenResponse>;
  fetchAccounts(accessToken: string): Promise<ProviderAccount[]>;
  fetchTransactions(
    accessToken: string,
    externalAccountId: string,
    details?: any,
  ): Promise<ProviderTransaction[]>;
}

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
    netWorthImpactGbp: isDebt ? -balanceMag : balanceMag,
    principalOwedGbp: isDebt ? balanceMag : 0,
    isTaxFreeIsaWrapper: false,
    lastSyncedAt: new Date().toISOString(),
  };
}
