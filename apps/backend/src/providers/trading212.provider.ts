import { Injectable } from "@nestjs/common";
import {
  IBankProvider,
  ProviderAccount,
  ProviderTransaction,
  TokenResponse,
} from "./provider.interface";

@Injectable()
export class Trading212Provider implements IBankProvider {
  getAuthUrl(clientId: string, redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      state: state,
    });
    return `https://live.trading212.com/oauth/authorize?${params.toString()}`;
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

    const res = await fetch("https://live.trading212.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Trading 212 token exchange failed: ${errText}`);
    }

    const data = await res.json();
    return {
      accessToken: data.access_token || data.accessToken,
      refreshToken: data.refresh_token || data.refreshToken,
      expiresIn: data.expires_in || data.expiresIn,
    };
  }

  async fetchAccounts(accessToken: string): Promise<ProviderAccount[]> {
    // 1. Fetch cash & portfolio totals
    const cashRes = await fetch("https://live.trading212.com/api/v0/equity/account/cash", {
      headers: {
        Authorization: accessToken.startsWith("Bearer ") ? accessToken : `${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!cashRes.ok) {
      const err = await cashRes.text();
      throw new Error(`Failed to fetch Trading 212 account cash: ${err}`);
    }

    const cashData = await cashRes.json();

    // 2. Fetch account info (currency, id)
    let currency = "GBP";
    let accountId = "t212-primary";
    try {
      const infoRes = await fetch("https://live.trading212.com/api/v0/equity/account/info", {
        headers: {
          Authorization: accessToken.startsWith("Bearer ") ? accessToken : `${accessToken}`,
          Accept: "application/json",
        },
      });
      if (infoRes.ok) {
        const infoData = await infoRes.json();
        if (infoData.currencyCode) currency = infoData.currencyCode;
        if (infoData.id) accountId = `t212-${infoData.id}`;
      }
    } catch (_err) {
      // Fallback to default
    }

    // Total account balance is total portfolio value (cash + stocks)
    const balance = Number(cashData.total ?? cashData.invested ?? 0);

    return [
      {
        externalAccountId: accountId,
        name: "Trading 212 Portfolio",
        type: "Investment",
        balance,
        currency,
      },
    ];
  }

  async fetchTransactions(
    accessToken: string,
    _externalAccountId: string,
  ): Promise<ProviderTransaction[]> {
    try {
      const res = await fetch("https://live.trading212.com/api/v0/equity/history/orders?limit=50", {
        headers: {
          Authorization: accessToken.startsWith("Bearer ") ? accessToken : `${accessToken}`,
          Accept: "application/json",
        },
      });

      if (!res.ok) {
        return [];
      }

      const orders = await res.json();
      const transactions: ProviderTransaction[] = [];

      for (const order of orders.items || orders || []) {
        if (order.status !== "FILLED") continue;

        const amount = Number(order.filledValue ?? order.value ?? 0);
        const isBuy = (order.type || "").toUpperCase().includes("BUY");
        const signedAmount = isBuy ? -Math.abs(amount) : Math.abs(amount);

        transactions.push({
          amount: signedAmount,
          description: `${isBuy ? "Bought" : "Sold"} ${order.ticker || "Equities"}`,
          category: "Investment",
          timestamp: order.dateExecuted ? new Date(order.dateExecuted) : new Date(),
        });
      }

      return transactions;
    } catch (_err) {
      return [];
    }
  }
}
