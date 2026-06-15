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
