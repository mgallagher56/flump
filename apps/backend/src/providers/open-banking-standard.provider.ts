import {
  asArray,
  asDate,
  asFiniteNumber,
  asRecord,
  BankMalformedResponseError,
  optionalString,
  type ProviderCallContext,
  pathSegment,
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

export interface OpenBankingConfig {
  institutionId: string;
  name: string;
  authBaseUrl: string;
  tokenUrl: string;
  apiBaseUrl: string;
  /**
   * The balance comes inline on each account (Revolut's API) rather than from a separate
   * `/accounts/{id}/balances` call.
   */
  inlineBalance?: boolean;
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
    inlineBalance: true,
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

const BALANCE_TYPE_PREFERENCE = [
  "InterimBooked",
  "ClosingBooked",
  "InterimAvailable",
  "ClosingAvailable",
  "Expected",
];

/** Open Banking amounts are unsigned; `CreditDebitIndicator: "Debit"` makes them negative. */
function signedAmount(
  amount: number,
  indicator: unknown,
  field: string,
  callCtx: ProviderCallContext,
): number {
  if (indicator === undefined || indicator === null) return amount;
  const upper = typeof indicator === "string" ? indicator.toUpperCase() : "";
  if (upper === "DEBIT") return -Math.abs(amount);
  if (upper === "CREDIT") return Math.abs(amount);
  throw new BankMalformedResponseError({ ...callCtx, field });
}

function accountType(subType: string): ProviderAccount["type"] {
  if (subType.includes("saving") || subType.includes("isa")) return "Saving";
  if (subType.includes("mortgage")) return "Mortgage";
  if (subType.includes("credit")) return "Credit Card";
  if (subType.includes("investment") || subType.includes("wealth")) return "Investment";
  return "Current";
}

@Injectable()
export class OpenBankingStandardProvider implements BankProvider {
  constructor(private readonly config: OpenBankingConfig) {}

  private ctx(operation: string, deadline?: AbortSignal): ProviderCallContext {
    return { provider: this.config.institutionId, operation, deadline };
  }

  private bearer(accessToken: string): string {
    return accessToken.startsWith("Bearer ") ? accessToken : `Bearer ${accessToken}`;
  }

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

  exchangeCode(
    clientId: string,
    clientSecret: string,
    redirectUri: string,
    code: string,
  ): Promise<TokenResponse> {
    return requestOAuthToken(
      this.config.tokenUrl,
      authorizationCodeForm(clientId, clientSecret, redirectUri, code),
      this.ctx("exchange code"),
    );
  }

  refreshToken(
    clientId: string,
    clientSecret: string,
    refreshToken: string,
  ): Promise<TokenResponse> {
    return requestOAuthToken(
      this.config.tokenUrl,
      refreshTokenForm(clientId, clientSecret, refreshToken),
      this.ctx("refresh token"),
    );
  }

  /**
   * Revoking Open Banking access means deleting the account-access consent, which needs the
   * consent id and a client-credentials token we do not hold. The user removes access in their
   * bank's app.
   */
  async revokeConnection(_accessToken: string): Promise<RevokeResult> {
    return { revoked: false, reason: "unsupported" };
  }

  async fetchAccounts(
    accessToken: string,
    options?: ProviderCallOptions,
  ): Promise<ProviderAccount[]> {
    const headers = { Authorization: this.bearer(accessToken), Accept: "application/json" };
    const accountsCtx = this.ctx("fetch accounts", options?.signal);
    const body = await providerFetchJson(
      `${this.config.apiBaseUrl}/accounts`,
      { headers },
      accountsCtx,
    );
    const rawAccounts = Array.isArray(body)
      ? body
      : (() => {
          const data = asRecord(body, "body", accountsCtx);
          const nested =
            data.Data && typeof data.Data === "object"
              ? (data.Data as Record<string, unknown>).Account
              : undefined;
          return asArray(nested ?? data.accounts, "Data.Account", accountsCtx);
        })();

    const providerAccounts: ProviderAccount[] = [];
    for (const raw of rawAccounts) {
      const acc = asRecord(raw, "Data.Account[]", accountsCtx);
      const accountIdRaw = acc.AccountId ?? acc.id ?? acc.account_id;
      if (typeof accountIdRaw !== "string" && typeof accountIdRaw !== "number") {
        throw new BankMalformedResponseError({ ...accountsCtx, field: "Data.Account[].AccountId" });
      }
      const accountId = String(accountIdRaw);
      const nickname =
        optionalString(acc.Nickname) ??
        optionalString(acc.name) ??
        optionalString(acc.AccountSubType) ??
        `${this.config.name} Account`;
      const subType = (
        optionalString(acc.AccountSubType) ??
        optionalString(acc.type) ??
        ""
      ).toLowerCase();

      // A balance we could not read fails the whole fetch (audit H2): it is never reported as 0.
      const { balance, currency } = this.config.inlineBalance
        ? {
            balance: asFiniteNumber(acc.balance, "accounts[].balance", accountsCtx),
            currency: undefined,
          }
        : await this.fetchBalance(accountId, headers, options?.signal);

      providerAccounts.push({
        externalAccountId: `${this.config.institutionId}-${accountId}`,
        name: `${this.config.name} ${nickname}`,
        type: accountType(subType),
        balance,
        currency: optionalString(acc.Currency) ?? optionalString(acc.currency) ?? currency ?? "GBP",
      });
    }

    return providerAccounts;
  }

  /**
   * Reads one balance. Open Banking returns several balance types in no set order, so the most
   * settled one present is used: booked before available, interim (today) before closing.
   */
  private async fetchBalance(
    accountId: string,
    headers: Record<string, string>,
    signal: AbortSignal | undefined,
  ): Promise<{ balance: number; currency?: string }> {
    const balanceCtx = this.ctx("fetch balance", signal);
    const balBody = asRecord(
      await providerFetchJson(
        `${this.config.apiBaseUrl}/accounts/${pathSegment(accountId, "Data.Account[].AccountId", balanceCtx)}/balances`,
        { headers },
        balanceCtx,
      ),
      "body",
      balanceCtx,
    );
    const balList =
      balBody.Data && typeof balBody.Data === "object"
        ? (balBody.Data as Record<string, unknown>).Balance
        : balBody.balances;
    const balances = asArray(balList, "Data.Balance", balanceCtx).map((b) =>
      asRecord(b, "Data.Balance[]", balanceCtx),
    );
    const balObj =
      BALANCE_TYPE_PREFERENCE.map((type) => balances.find((b) => b.Type === type)).find(Boolean) ??
      balances[0];
    if (!balObj) throw new BankMalformedResponseError({ ...balanceCtx, field: "Data.Balance" });
    const amountObj =
      balObj.Amount && typeof balObj.Amount === "object"
        ? (balObj.Amount as Record<string, unknown>)
        : undefined;
    const amount = asFiniteNumber(
      amountObj?.Amount ?? balObj.amount,
      "Data.Balance[].Amount",
      balanceCtx,
    );
    return {
      balance: signedAmount(
        amount,
        balObj.CreditDebitIndicator,
        "Data.Balance[].CreditDebitIndicator",
        balanceCtx,
      ),
      currency: optionalString(amountObj?.Currency),
    };
  }

  async fetchTransactions(
    accessToken: string,
    externalAccountId: string,
    options?: ProviderCallOptions,
  ): Promise<ProviderTransaction[]> {
    const txCtx = this.ctx("fetch transactions", options?.signal);
    const prefix = `${this.config.institutionId}-`;
    const internalId = externalAccountId.startsWith(prefix)
      ? externalAccountId.slice(prefix.length)
      : externalAccountId;
    const body = asRecord(
      await providerFetchJson(
        `${this.config.apiBaseUrl}/accounts/${pathSegment(internalId, "externalAccountId", txCtx)}/transactions`,
        { headers: { Authorization: this.bearer(accessToken), Accept: "application/json" } },
        txCtx,
      ),
      "body",
      txCtx,
    );
    const list =
      body.Data && typeof body.Data === "object"
        ? (body.Data as Record<string, unknown>).Transaction
        : body.transactions;

    const transactions: ProviderTransaction[] = [];
    for (const raw of asArray(list, "Data.Transaction", txCtx)) {
      const tx = asRecord(raw, "Data.Transaction[]", txCtx);
      const amountObj =
        tx.Amount && typeof tx.Amount === "object"
          ? (tx.Amount as Record<string, unknown>)
          : undefined;
      const amount = asFiniteNumber(
        amountObj?.Amount ?? tx.amount,
        "Data.Transaction[].Amount",
        txCtx,
      );
      const code =
        tx.ProprietaryBankTransactionCode && typeof tx.ProprietaryBankTransactionCode === "object"
          ? optionalString((tx.ProprietaryBankTransactionCode as Record<string, unknown>).Code)
          : undefined;
      transactions.push({
        amount: signedAmount(
          amount,
          tx.CreditDebitIndicator,
          "Data.Transaction[].CreditDebitIndicator",
          txCtx,
        ),
        description:
          optionalString(tx.TransactionInformation) ??
          optionalString(tx.description) ??
          "Open Banking Transaction",
        category: code ?? "General",
        timestamp: asDate(tx.BookingDateTime, "Data.Transaction[].BookingDateTime", txCtx),
      });
    }
    return transactions;
  }
}
