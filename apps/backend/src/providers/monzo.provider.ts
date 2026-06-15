import { Injectable } from "@nestjs/common";
import {
  IBankProvider,
  ProviderAccount,
  ProviderTransaction,
  TokenResponse,
} from "./provider.interface";

@Injectable()
export class MonzoProvider implements IBankProvider {
  getAuthUrl(clientId: string, redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      state: state,
    });
    return `https://auth.monzo.com/?${params.toString()}`;
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

    const res = await fetch("https://api.monzo.com/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Monzo token exchange failed: ${errText}`);
    }

    const data = await res.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    };
  }

  async fetchAccounts(accessToken: string): Promise<ProviderAccount[]> {
    // 1. Fetch main accounts
    const res = await fetch("https://api.monzo.com/accounts", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch Monzo accounts: ${await res.text()}`);
    }

    const accountsData = await res.json();
    const providerAccounts: ProviderAccount[] = [];

    for (const acc of accountsData.accounts || []) {
      if (acc.closed) continue;

      // Fetch balance for this account
      let balance = 0;
      let currency = "GBP";
      try {
        const balRes = await fetch(`https://api.monzo.com/balance?account_id=${acc.id}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (balRes.ok) {
          const balData = await balRes.json();
          // Monzo returns balance in minor units (pence)
          balance = (balData.balance || 0) / 100;
          currency = balData.currency || "GBP";
        }
      } catch (_err) {
        // Fallback to 0 if balance fetch fails
      }

      // Map Type
      const isJoint = acc.type === "uk_retail_joint";
      const name = isJoint ? "Monzo Joint Account" : "Monzo Current Account";

      providerAccounts.push({
        externalAccountId: acc.id,
        name,
        type: "Current",
        balance,
        currency,
      });

      // 2. Fetch Pots for this account and represent as Saving accounts
      try {
        const potsRes = await fetch(`https://api.monzo.com/pots?current_account_id=${acc.id}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (potsRes.ok) {
          const potsData = await potsRes.json();
          for (const pot of potsData.pots || []) {
            if (pot.deleted) continue;
            providerAccounts.push({
              externalAccountId: pot.id,
              name: `Monzo Pot: ${pot.name}`,
              type: "Saving",
              balance: (pot.balance || 0) / 100,
              currency: pot.currency || "GBP",
            });
          }
        }
      } catch (_err) {
        // Skip pots on error
      }
    }

    return providerAccounts;
  }

  async fetchTransactions(
    accessToken: string,
    externalAccountId: string,
    details?: any,
  ): Promise<ProviderTransaction[]> {
    const limit = details?.limit || 30;
    const url = `https://api.monzo.com/transactions?account_id=${externalAccountId}&limit=${limit}`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      // Pot transaction history is not queryable directly via /transactions in some cases,
      // return empty array if failed
      return [];
    }

    const txData = await res.json();
    const transactions: ProviderTransaction[] = [];

    for (const tx of txData.transactions || []) {
      if (tx.decline_reason) continue;

      // Translate Monzo categories to standard categories
      let category = "General";
      const monzoCat = tx.category || "";
      if (["groceries", "eating_out"].includes(monzoCat)) {
        category = "Food";
      } else if (["bills", "utilities"].includes(monzoCat)) {
        category = "Utilities";
      } else if (monzoCat === "salary") {
        category = "Salary";
      } else if (monzoCat === "transport") {
        category = "Transport";
      } else if (monzoCat === "shopping") {
        category = "Shopping";
      }

      transactions.push({
        amount: (tx.amount || 0) / 100, // convert from pence to pounds
        description: tx.merchant?.name || tx.description || "Monzo Sync Transaction",
        category,
        timestamp: new Date(tx.created),
      });
    }

    return transactions;
  }
}
