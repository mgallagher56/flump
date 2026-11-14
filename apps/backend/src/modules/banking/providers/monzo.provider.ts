import {
  asArray,
  asDate,
  asRecord,
  asString,
  minorUnitsToMajor,
  optionalString,
  type ProviderCallContext,
  providerFetch,
  providerFetchJson,
} from "@flump/banking/server";
import { Injectable } from "@nestjs/common";
import { authorizationCodeForm, refreshTokenForm, requestOAuthToken } from "./oauth-token";
import type {
  BankProvider,
  FetchTransactionsOptions,
  ProviderAccount,
  ProviderCallOptions,
  ProviderTransaction,
  RevokeResult,
  TokenResponse,
} from "./provider.interface";

const API = "https://api.monzo.com";
const PROVIDER = "monzo";

function ctx(operation: string, deadline?: AbortSignal): ProviderCallContext {
  return { provider: PROVIDER, operation, deadline };
}

function mapCategory(monzoCat: string): string {
  if (["groceries", "eating_out"].includes(monzoCat)) return "Food";
  if (["bills", "utilities"].includes(monzoCat)) return "Utilities";
  if (monzoCat === "salary") return "Salary";
  if (monzoCat === "transport") return "Transport";
  if (monzoCat === "shopping") return "Shopping";
  return "General";
}

@Injectable()
export class MonzoProvider implements BankProvider {
  getAuthUrl(clientId: string, redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      state: state,
    });
    return `https://auth.monzo.com/?${params.toString()}`;
  }

  exchangeCode(
    clientId: string,
    clientSecret: string,
    redirectUri: string,
    code: string,
  ): Promise<TokenResponse> {
    return requestOAuthToken(
      `${API}/oauth2/token`,
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
      `${API}/oauth2/token`,
      refreshTokenForm(clientId, clientSecret, refreshToken),
      ctx("refresh token"),
    );
  }

  async revokeConnection(accessToken: string): Promise<RevokeResult> {
    await providerFetch(
      `${API}/oauth2/logout`,
      { method: "POST", headers: { Authorization: `Bearer ${accessToken}` } },
      ctx("revoke connection"),
    );
    return { revoked: true };
  }

  async fetchAccounts(
    accessToken: string,
    options?: ProviderCallOptions,
  ): Promise<ProviderAccount[]> {
    const headers = { Authorization: `Bearer ${accessToken}` };
    const accountsCtx = ctx("fetch accounts", options?.signal);
    const accountsData = asRecord(
      await providerFetchJson(`${API}/accounts`, { headers }, accountsCtx),
      "body",
      accountsCtx,
    );

    const providerAccounts: ProviderAccount[] = [];
    for (const raw of asArray(accountsData.accounts, "accounts", accountsCtx)) {
      const acc = asRecord(raw, "accounts[]", accountsCtx);
      if (acc.closed === true) continue;
      const accountId = asString(acc.id, "accounts[].id", accountsCtx);

      // A balance we could not read fails the whole fetch (audit H2): it is never reported as 0.
      const balanceCtx = ctx("fetch balance", options?.signal);
      const balData = asRecord(
        await providerFetchJson(
          `${API}/balance?account_id=${encodeURIComponent(accountId)}`,
          { headers },
          balanceCtx,
        ),
        "body",
        balanceCtx,
      );

      providerAccounts.push({
        externalAccountId: accountId,
        name: acc.type === "uk_retail_joint" ? "Monzo Joint Account" : "Monzo Current Account",
        type: "Current",
        // Monzo reports minor units (pence).
        balance: minorUnitsToMajor(balData.balance, "balance", balanceCtx),
        currency: optionalString(balData.currency) ?? "GBP",
      });

      // Pots are savings accounts with their own balances; a failed pots call fails the fetch
      // rather than silently dropping them. Only retail current accounts have pots.
      if (acc.type !== "uk_retail" && acc.type !== "uk_retail_joint") continue;
      const potsCtx = ctx("fetch pots", options?.signal);
      const potsData = asRecord(
        await providerFetchJson(
          `${API}/pots?current_account_id=${encodeURIComponent(accountId)}`,
          { headers },
          potsCtx,
        ),
        "body",
        potsCtx,
      );
      for (const rawPot of asArray(potsData.pots, "pots", potsCtx)) {
        const pot = asRecord(rawPot, "pots[]", potsCtx);
        if (pot.deleted === true) continue;
        providerAccounts.push({
          externalAccountId: asString(pot.id, "pots[].id", potsCtx),
          name: `Monzo Pot: ${asString(pot.name, "pots[].name", potsCtx)}`,
          type: "Saving",
          balance: minorUnitsToMajor(pot.balance, "pots[].balance", potsCtx),
          currency: optionalString(pot.currency) ?? "GBP",
        });
      }
    }

    return providerAccounts;
  }

  async fetchTransactions(
    accessToken: string,
    externalAccountId: string,
    options?: FetchTransactionsOptions,
  ): Promise<ProviderTransaction[]> {
    // Pots have no transaction feed in the Monzo API: there is nothing to fetch, by design.
    if (externalAccountId.startsWith("pot_")) return [];

    const txCtx = ctx("fetch transactions", options?.signal);
    const limit = options?.limit ?? 30;
    const params = new URLSearchParams({ account_id: externalAccountId, limit: String(limit) });
    const txData = asRecord(
      await providerFetchJson(
        `${API}/transactions?${params.toString()}`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
        txCtx,
      ),
      "body",
      txCtx,
    );

    const transactions: ProviderTransaction[] = [];
    for (const raw of asArray(txData.transactions, "transactions", txCtx)) {
      const tx = asRecord(raw, "transactions[]", txCtx);
      if (tx.decline_reason) continue;
      const merchant =
        tx.merchant && typeof tx.merchant === "object"
          ? optionalString((tx.merchant as Record<string, unknown>).name)
          : undefined;
      transactions.push({
        amount: minorUnitsToMajor(tx.amount, "transactions[].amount", txCtx),
        description: merchant ?? optionalString(tx.description) ?? "Monzo Sync Transaction",
        category: mapCategory(optionalString(tx.category) ?? ""),
        timestamp: asDate(tx.created, "transactions[].created", txCtx),
      });
    }
    return transactions;
  }
}
