import {
  asArray,
  asDate,
  asFiniteNumber,
  asRecord,
  BankMalformedResponseError,
  optionalString,
  type ProviderCallContext,
  providerFetchJson,
} from "@flump/banking/server";
import { Injectable } from "@nestjs/common";
import { authorizationCodeForm, refreshTokenForm, requestOAuthToken } from "./oauth-token";
import type {
  BankProvider,
  ProviderAccount,
  ProviderCallOptions,
  ProviderTransaction,
  RevokeResult,
  TokenResponse,
} from "./provider.interface";

const BASE = "https://live.trading212.com";
const PROVIDER = "trading212";

function ctx(operation: string, deadline?: AbortSignal): ProviderCallContext {
  return { provider: PROVIDER, operation, deadline };
}

function headers(accessToken: string): Record<string, string> {
  // Trading 212 takes the key or token as-is in the Authorization header.
  return { Authorization: accessToken, Accept: "application/json" };
}

@Injectable()
export class Trading212Provider implements BankProvider {
  getAuthUrl(clientId: string, redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      state: state,
    });
    return `https://live.trading212.com/oauth/authorize?${params.toString()}`;
  }

  exchangeCode(
    clientId: string,
    clientSecret: string,
    redirectUri: string,
    code: string,
  ): Promise<TokenResponse> {
    return requestOAuthToken(
      `${BASE}/oauth/token`,
      authorizationCodeForm(clientId, clientSecret, redirectUri, code),
      ctx("exchange code"),
    );
  }

  refreshToken(
    clientId: string,
    clientSecret: string,
    refreshToken: string,
  ): Promise<TokenResponse> {
    return requestOAuthToken(
      `${BASE}/oauth/token`,
      refreshTokenForm(clientId, clientSecret, refreshToken),
      ctx("refresh token"),
    );
  }

  /** No documented revocation endpoint: the user removes the key in the Trading 212 app. */
  async revokeConnection(_accessToken: string): Promise<RevokeResult> {
    return { revoked: false, reason: "unsupported" };
  }

  async fetchAccounts(
    accessToken: string,
    options?: ProviderCallOptions,
  ): Promise<ProviderAccount[]> {
    // The portfolio total (cash plus holdings) is the balance. A failed or unreadable answer fails
    // the fetch (audit H2): it is never reported as 0.
    const cashCtx = ctx("fetch balance", options?.signal);
    const cashData = asRecord(
      await providerFetchJson(
        `${BASE}/api/v0/equity/account/cash`,
        { headers: headers(accessToken) },
        cashCtx,
      ),
      "body",
      cashCtx,
    );
    const balance = asFiniteNumber(cashData.total, "total", cashCtx);

    // The account id keys the stored account: a placeholder id after a failed call would create a
    // duplicate account, so a failure here fails the fetch too.
    const infoCtx = ctx("fetch account info", options?.signal);
    const infoData = asRecord(
      await providerFetchJson(
        `${BASE}/api/v0/equity/account/info`,
        { headers: headers(accessToken) },
        infoCtx,
      ),
      "body",
      infoCtx,
    );
    const idRaw = infoData.id;
    if (typeof idRaw !== "string" && typeof idRaw !== "number") {
      throw new BankMalformedResponseError({ ...infoCtx, field: "id" });
    }

    return [
      {
        externalAccountId: `t212-${idRaw}`,
        name: "Trading 212 Portfolio",
        type: "Investment",
        balance,
        currency: optionalString(infoData.currencyCode) ?? "GBP",
      },
    ];
  }

  async fetchTransactions(
    accessToken: string,
    _externalAccountId: string,
    options?: ProviderCallOptions,
  ): Promise<ProviderTransaction[]> {
    const txCtx = ctx("fetch transactions", options?.signal);
    const body = await providerFetchJson(
      `${BASE}/api/v0/equity/history/orders?limit=50`,
      { headers: headers(accessToken) },
      txCtx,
    );
    const list = Array.isArray(body) ? body : asRecord(body, "body", txCtx).items;

    const transactions: ProviderTransaction[] = [];
    for (const raw of asArray(list, "items", txCtx)) {
      const order = asRecord(raw, "items[]", txCtx);
      if (order.status !== "FILLED") continue;
      // Order `type` is MARKET, LIMIT, STOP or STOP_LIMIT; the side is the sign of the quantity
      // (negative for a sale).
      const quantity = asFiniteNumber(
        order.filledQuantity ?? order.quantity,
        "items[].filledQuantity",
        txCtx,
      );
      const isBuy = quantity > 0;
      const amount =
        order.filledValue === null || order.filledValue === undefined
          ? asFiniteNumber(order.fillPrice, "items[].fillPrice", txCtx) * Math.abs(quantity)
          : asFiniteNumber(order.filledValue, "items[].filledValue", txCtx);
      transactions.push({
        amount: isBuy ? -Math.abs(amount) : Math.abs(amount),
        description: `${isBuy ? "Bought" : "Sold"} ${optionalString(order.ticker) ?? "Equities"}`,
        category: "Investment",
        timestamp: asDate(order.dateExecuted, "items[].dateExecuted", txCtx),
      });
    }
    return transactions;
  }
}
