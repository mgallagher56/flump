import { Injectable } from "@nestjs/common";
import {
  IBankProvider,
  ProviderAccount,
  ProviderTransaction,
  TokenResponse,
} from "./provider.interface";

export interface OpenBankingConfig {
  institutionId: string;
  name: string;
  authBaseUrl: string;
  tokenUrl: string;
  apiBaseUrl: string;
}

export const OPEN_BANKING_INSTITUTIONS: Record<string, OpenBankingConfig> = {
  hsbc: {
    institutionId: "hsbc",
    name: "HSBC Bank",
    authBaseUrl: "https://api.hsbc.com/oauth/v1/authorize",
    tokenUrl: "https://api.hsbc.com/oauth/v1/token",
    apiBaseUrl: "https://api.hsbc.com/open-banking/v3.1/aisp",
  },
  barclays: {
    institutionId: "barclays",
    name: "Barclays Bank",
    authBaseUrl: "https://oauth.barclays.com/as/authorization.oauth2",
    tokenUrl: "https://oauth.barclays.com/as/token.oauth2",
    apiBaseUrl: "https://api.barclays.com/open-banking/v3.1/aisp",
  },
  revolut: {
    institutionId: "revolut",
    name: "Revolut",
    authBaseUrl: "https://business.revolut.com/app-confirm",
    tokenUrl: "https://b2b.revolut.com/api/1.0/auth/token",
    apiBaseUrl: "https://b2b.revolut.com/api/1.0",
  },
  santander: {
    institutionId: "santander",
    name: "Santander",
    authBaseUrl: "https://api.santander.co.uk/retail/sb/oauth2/authorize",
    tokenUrl: "https://api.santander.co.uk/retail/sb/oauth2/token",
    apiBaseUrl: "https://api.santander.co.uk/open-banking/v3.1/aisp",
  },
  natwest: {
    institutionId: "natwest",
    name: "NatWest",
    authBaseUrl: "https://api.natwest.com/secure/as/authorization.oauth2",
    tokenUrl: "https://api.natwest.com/token",
    apiBaseUrl: "https://api.natwest.com/open-banking/v3.1/aisp",
  },
  lloyds: {
    institutionId: "lloyds",
    name: "Lloyds Bank",
    authBaseUrl: "https://authorise-api.lloydsbank.co.uk/business/as/authorization.oauth2",
    tokenUrl: "https://authorise-api.lloydsbank.co.uk/business/as/token.oauth2",
    apiBaseUrl: "https://api.lloydsbank.com/open-banking/v3.1/aisp",
  },
  chase: {
    institutionId: "chase",
    name: "Chase",
    authBaseUrl: "https://api.chase.co.uk/oauth2/v1/authorize",
    tokenUrl: "https://api.chase.co.uk/oauth2/v1/token",
    apiBaseUrl: "https://api.chase.co.uk/open-banking/v3.1/aisp",
  },
};

@Injectable()
export class OpenBankingStandardProvider implements IBankProvider {
  constructor(private readonly config: OpenBankingConfig) {}

  getAuthUrl(clientId: string, redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid accounts",
      state: state,
    });
    return `${this.config.authBaseUrl}?${params.toString()}`;
  }

  async exchangeCode(
    clientId: string,
    clientSecret: string,
    redirectUri: string,
    code: string,
  ): Promise<TokenResponse> {
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code: code,
    });

    const res = await fetch(this.config.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: body.toString(),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`${this.config.name} token exchange failed: ${errText}`);
    }

    const data = await res.json();
    return {
      accessToken: data.access_token || data.accessToken,
      refreshToken: data.refresh_token || data.refreshToken,
      expiresIn: data.expires_in || data.expiresIn,
    };
  }

  async fetchAccounts(accessToken: string): Promise<ProviderAccount[]> {
    const bearer = accessToken.startsWith("Bearer ") ? accessToken : `Bearer ${accessToken}`;

    // 1. Fetch Accounts from AISP standard endpoint
    const res = await fetch(`${this.config.apiBaseUrl}/accounts`, {
      headers: {
        Authorization: bearer,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to fetch ${this.config.name} accounts: ${err}`);
    }

    const data = await res.json();
    const rawAccounts: any[] =
      data.Data?.Account || data.accounts || (Array.isArray(data) ? data : []);

    const providerAccounts: ProviderAccount[] = [];

    for (const acc of rawAccounts) {
      const accountId = acc.AccountId || acc.id || acc.account_id;
      const currency = acc.Currency || acc.currency || "GBP";
      const nickname =
        acc.Nickname || acc.name || acc.AccountSubType || `${this.config.name} Account`;

      // Map Type
      const subType = (acc.AccountSubType || acc.type || "").toLowerCase();
      let type: ProviderAccount["type"] = "Current";
      if (subType.includes("saving") || subType.includes("isa")) {
        type = "Saving";
      } else if (subType.includes("mortgage")) {
        type = "Mortgage";
      } else if (subType.includes("credit")) {
        type = "Credit Card";
      } else if (subType.includes("investment") || subType.includes("wealth")) {
        type = "Investment";
      }

      // 2. Fetch Balance for this account
      let balance = 0;
      try {
        const balRes = await fetch(`${this.config.apiBaseUrl}/accounts/${accountId}/balances`, {
          headers: {
            Authorization: bearer,
            Accept: "application/json",
          },
        });
        if (balRes.ok) {
          const balData = await balRes.json();
          const balObj = balData.Data?.Balance?.[0] || balData.balances?.[0] || balData;
          const rawAmount = balObj.Amount?.Amount ?? balObj.amount ?? 0;
          balance = Number(rawAmount);
        }
      } catch (_err) {
        // Fallback to 0 if balance endpoint unavailable
      }

      providerAccounts.push({
        externalAccountId: `${this.config.institutionId}-${accountId}`,
        name: `${this.config.name} ${nickname}`,
        type,
        balance,
        currency,
      });
    }

    return providerAccounts;
  }

  async fetchTransactions(
    accessToken: string,
    externalAccountId: string,
  ): Promise<ProviderTransaction[]> {
    try {
      const bearer = accessToken.startsWith("Bearer ") ? accessToken : `Bearer ${accessToken}`;
      const internalId = externalAccountId.replace(`${this.config.institutionId}-`, "");
      const res = await fetch(`${this.config.apiBaseUrl}/accounts/${internalId}/transactions`, {
        headers: {
          Authorization: bearer,
          Accept: "application/json",
        },
      });

      if (!res.ok) return [];

      const data = await res.json();
      const rawTxList: any[] = data.Data?.Transaction || data.transactions || [];
      const transactions: ProviderTransaction[] = [];

      for (const tx of rawTxList) {
        const rawAmount = Number(tx.Amount?.Amount ?? tx.amount ?? 0);
        const creditDebit = (tx.CreditDebitIndicator || "").toUpperCase();
        const signedAmount = creditDebit === "DEBIT" ? -Math.abs(rawAmount) : Math.abs(rawAmount);

        transactions.push({
          amount: signedAmount,
          description: tx.TransactionInformation || tx.description || "Open Banking Transaction",
          category: tx.ProprietaryBankTransactionCode?.Code || "General",
          timestamp: tx.BookingDateTime ? new Date(tx.BookingDateTime) : new Date(),
        });
      }

      return transactions;
    } catch (_err) {
      return [];
    }
  }
}
