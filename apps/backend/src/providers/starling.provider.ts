import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  IBankProvider,
  ProviderAccount,
  ProviderTransaction,
  TokenResponse,
} from "./provider.interface";

@Injectable()
export class StarlingProvider implements IBankProvider {
  constructor(private readonly configService: ConfigService) {}

  private getBaseUrl(): string {
    const useSandbox = this.configService.get<string>("STARLING_USE_SANDBOX") === "true";
    return useSandbox ? "https://api-sandbox.starlingbank.com" : "https://api.starlingbank.com";
  }

  getAuthUrl(clientId: string, redirectUri: string, state: string): string {
    const useSandbox = this.configService.get<string>("STARLING_USE_SANDBOX") === "true";
    const host = useSandbox
      ? "https://oauth-sandbox.starlingbank.com"
      : "https://oauth.starlingbank.com";
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      state: state,
    });
    return `${host}/?${params.toString()}`;
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

    const url = `${this.getBaseUrl()}/oauth/access-token`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Starling token exchange failed: ${errText}`);
    }

    const data = await res.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    };
  }

  async fetchAccounts(accessToken: string): Promise<ProviderAccount[]> {
    const url = `${this.getBaseUrl()}/api/v2/accounts`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch Starling accounts: ${await res.text()}`);
    }

    const accountsData = await res.json();
    const providerAccounts: ProviderAccount[] = [];

    for (const acc of accountsData.accounts || []) {
      const accountUid = acc.accountUid;
      const categoryUid = acc.defaultCategory;

      // Get Account balance
      let balance = 0;
      try {
        const balUrl = `${this.getBaseUrl()}/api/v2/accounts/${accountUid}/balance`;
        const balRes = await fetch(balUrl, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
        });
        if (balRes.ok) {
          const balData = await balRes.json();
          // Starling returns balance in minorUnits
          balance = (balData.effectiveBalance?.minorUnits || 0) / 100;
        }
      } catch (_err) {
        // Fallback to 0 if balance fetch fails
      }

      // Map Type
      const type: "Current" | "Saving" | "Mortgage" | "Credit Card" | "Investment" = "Current";
      let name = "Starling Current Account";
      if (acc.accountType === "JOINT") {
        name = "Starling Joint Account";
      } else if (acc.accountType === "SOLE_TRADER") {
        name = "Starling Sole Trader Account";
      }

      // For Starling, both accountUid and defaultCategory (categoryUid) are needed for transaction feed queries.
      // We encode both in externalAccountId as "accountUid:categoryUid".
      providerAccounts.push({
        externalAccountId: `${accountUid}:${categoryUid}`,
        name,
        type,
        balance,
        currency: acc.currency || "GBP",
      });
    }

    // Starling Savings Spaces (represented as Savings accounts)
    // Starling allows fetching savings goals/spaces per account.
    for (const mainAcc of accountsData.accounts || []) {
      try {
        const spacesUrl = `${this.getBaseUrl()}/api/v2/sub-accounts/${mainAcc.accountUid}/savings-goals`;
        const spacesRes = await fetch(spacesUrl, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
        });
        if (spacesRes.ok) {
          const spacesData = await spacesRes.json();
          for (const space of spacesData.savingsGoals || []) {
            providerAccounts.push({
              externalAccountId: `space:${mainAcc.accountUid}:${space.savingsGoalUid}`,
              name: `Starling Saving: ${space.name}`,
              type: "Saving",
              balance: (space.totalSaved?.minorUnits || 0) / 100,
              currency: space.totalSaved?.currency || "GBP",
            });
          }
        }
      } catch (_err) {
        // Skip spaces on error
      }
    }

    return providerAccounts;
  }

  async fetchTransactions(
    accessToken: string,
    externalAccountId: string,
    _details?: any,
  ): Promise<ProviderTransaction[]> {
    if (externalAccountId.startsWith("space:")) {
      // Starling savings spaces don't have a direct transactions feed API in the same format
      return [];
    }

    const [accountUid, categoryUid] = externalAccountId.split(":");
    if (!accountUid || !categoryUid) return [];

    const url = `${this.getBaseUrl()}/api/v2/feed/account/${accountUid}/category/${categoryUid}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      return [];
    }

    const feedData = await res.json();
    const transactions: ProviderTransaction[] = [];

    for (const item of feedData.feedItems || []) {
      const isOut = item.direction === "OUT";
      const rawAmount = (item.amount?.minorUnits || 0) / 100;
      const amount = isOut ? -rawAmount : rawAmount;

      // Translate Starling spendingCategory to standard categories
      let category = "General";
      const starlingCat = item.spendingCategory || "";
      if (["GROCERIES", "EATING_OUT"].includes(starlingCat)) {
        category = "Food";
      } else if (["BILLS_AND_SERVICES", "UTILITIES"].includes(starlingCat)) {
        category = "Utilities";
      } else if (starlingCat === "INCOME") {
        category = "Salary";
      } else if (starlingCat === "TRANSPORT") {
        category = "Transport";
      } else if (starlingCat === "SHOPPING") {
        category = "Shopping";
      }

      transactions.push({
        amount,
        description: item.counterPartyName || item.reference || "Starling Sync Transaction",
        category,
        timestamp: new Date(item.transactionTime),
      });
    }

    return transactions;
  }
}
