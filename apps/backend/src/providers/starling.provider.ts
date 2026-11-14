import {
  asArray,
  asDate,
  asRecord,
  asString,
  BankMalformedResponseError,
  minorUnitsToMajor,
  optionalString,
  type ProviderCallContext,
  pathSegment,
  providerFetchJson,
} from "@flump/banking/server";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
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

const PROVIDER = "starling";
const DEFAULT_FEED_DAYS = 90;

function ctx(operation: string, deadline?: AbortSignal): ProviderCallContext {
  return { provider: PROVIDER, operation, deadline };
}

function mapCategory(starlingCat: string): string {
  if (["GROCERIES", "EATING_OUT"].includes(starlingCat)) return "Food";
  if (["BILLS_AND_SERVICES", "UTILITIES"].includes(starlingCat)) return "Utilities";
  if (starlingCat === "INCOME") return "Salary";
  if (starlingCat === "TRANSPORT") return "Transport";
  if (starlingCat === "SHOPPING") return "Shopping";
  return "General";
}

function accountName(accountType: unknown): string {
  if (accountType === "JOINT") return "Starling Joint Account";
  if (accountType === "SOLE_TRADER") return "Starling Sole Trader Account";
  return "Starling Current Account";
}

@Injectable()
export class StarlingProvider implements BankProvider {
  constructor(private readonly configService: ConfigService) {}

  private useSandbox(): boolean {
    return this.configService.get<string>("STARLING_USE_SANDBOX") === "true";
  }

  private getBaseUrl(): string {
    return this.useSandbox()
      ? "https://api-sandbox.starlingbank.com"
      : "https://api.starlingbank.com";
  }

  getAuthUrl(clientId: string, redirectUri: string, state: string): string {
    const host = this.useSandbox()
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

  exchangeCode(
    clientId: string,
    clientSecret: string,
    redirectUri: string,
    code: string,
  ): Promise<TokenResponse> {
    return requestOAuthToken(
      `${this.getBaseUrl()}/oauth/access-token`,
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
      `${this.getBaseUrl()}/oauth/access-token`,
      refreshTokenForm(clientId, clientSecret, refreshToken),
      ctx("refresh token"),
    );
  }

  /** No documented revocation endpoint: the user removes access in the Starling app. */
  async revokeConnection(_accessToken: string): Promise<RevokeResult> {
    return { revoked: false, reason: "unsupported" };
  }

  async fetchAccounts(
    accessToken: string,
    options?: ProviderCallOptions,
  ): Promise<ProviderAccount[]> {
    const headers = { Authorization: `Bearer ${accessToken}`, Accept: "application/json" };
    const base = this.getBaseUrl();
    const accountsCtx = ctx("fetch accounts", options?.signal);
    const accountsData = asRecord(
      await providerFetchJson(`${base}/api/v2/accounts`, { headers }, accountsCtx),
      "body",
      accountsCtx,
    );
    const accounts = asArray(accountsData.accounts, "accounts", accountsCtx).map((raw) =>
      asRecord(raw, "accounts[]", accountsCtx),
    );

    const providerAccounts: ProviderAccount[] = [];
    for (const acc of accounts) {
      const accountUid = asString(acc.accountUid, "accounts[].accountUid", accountsCtx);
      const categoryUid = asString(acc.defaultCategory, "accounts[].defaultCategory", accountsCtx);

      // A balance we could not read fails the whole fetch (audit H2): it is never reported as 0.
      const balanceCtx = ctx("fetch balance", options?.signal);
      const balData = asRecord(
        await providerFetchJson(
          `${base}/api/v2/accounts/${pathSegment(accountUid, "accounts[].accountUid", balanceCtx)}/balance`,
          { headers },
          balanceCtx,
        ),
        "body",
        balanceCtx,
      );
      const effective = asRecord(balData.effectiveBalance, "effectiveBalance", balanceCtx);

      // Transaction feeds need both ids, so the external id encodes "accountUid:categoryUid".
      providerAccounts.push({
        externalAccountId: `${accountUid}:${categoryUid}`,
        name: accountName(acc.accountType),
        type: "Current",
        balance: minorUnitsToMajor(effective.minorUnits, "effectiveBalance.minorUnits", balanceCtx),
        currency: optionalString(acc.currency) ?? "GBP",
      });
    }

    // Savings spaces are separate savings accounts; a failed call fails the fetch rather than
    // silently dropping them.
    for (const acc of accounts) {
      const accountUid = asString(acc.accountUid, "accounts[].accountUid", accountsCtx);
      const spacesCtx = ctx("fetch savings spaces", options?.signal);
      const spacesData = asRecord(
        await providerFetchJson(
          `${base}/api/v2/account/${pathSegment(accountUid, "accounts[].accountUid", spacesCtx)}/savings-goals`,
          { headers },
          spacesCtx,
        ),
        "body",
        spacesCtx,
      );
      for (const rawSpace of asArray(spacesData.savingsGoals, "savingsGoals", spacesCtx)) {
        const space = asRecord(rawSpace, "savingsGoals[]", spacesCtx);
        const totalSaved = asRecord(space.totalSaved, "savingsGoals[].totalSaved", spacesCtx);
        providerAccounts.push({
          externalAccountId: `space:${accountUid}:${asString(space.savingsGoalUid, "savingsGoals[].savingsGoalUid", spacesCtx)}`,
          name: `Starling Saving: ${optionalString(space.name) ?? "Space"}`,
          type: "Saving",
          balance: minorUnitsToMajor(
            totalSaved.minorUnits,
            "savingsGoals[].totalSaved.minorUnits",
            spacesCtx,
          ),
          currency: optionalString(totalSaved.currency) ?? "GBP",
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
    // Savings spaces have no transaction feed in this API: nothing to fetch, by design.
    if (externalAccountId.startsWith("space:")) return [];

    const txCtx = ctx("fetch transactions", options?.signal);
    const [accountUid, categoryUid] = externalAccountId.split(":");
    if (!accountUid || !categoryUid) {
      throw new BankMalformedResponseError({ ...txCtx, field: "externalAccountId" });
    }

    // The feed requires `changesSince`; without it Starling answers 400.
    const since = options?.since ?? new Date(Date.now() - DEFAULT_FEED_DAYS * 24 * 60 * 60 * 1000);
    const query = new URLSearchParams({ changesSince: since.toISOString() });
    const feedData = asRecord(
      await providerFetchJson(
        `${this.getBaseUrl()}/api/v2/feed/account/${pathSegment(accountUid, "externalAccountId", txCtx)}/category/${pathSegment(categoryUid, "externalAccountId", txCtx)}?${query.toString()}`,
        { headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" } },
        txCtx,
      ),
      "body",
      txCtx,
    );

    const transactions: ProviderTransaction[] = [];
    for (const raw of asArray(feedData.feedItems, "feedItems", txCtx)) {
      const item = asRecord(raw, "feedItems[]", txCtx);
      if (item.direction !== "IN" && item.direction !== "OUT") {
        throw new BankMalformedResponseError({ ...txCtx, field: "feedItems[].direction" });
      }
      const amountObj = asRecord(item.amount, "feedItems[].amount", txCtx);
      const magnitude = minorUnitsToMajor(
        amountObj.minorUnits,
        "feedItems[].amount.minorUnits",
        txCtx,
      );
      transactions.push({
        amount: item.direction === "OUT" ? -magnitude : magnitude,
        description:
          optionalString(item.counterPartyName) ??
          optionalString(item.reference) ??
          "Starling Sync Transaction",
        category: mapCategory(optionalString(item.spendingCategory) ?? ""),
        timestamp: asDate(item.transactionTime, "feedItems[].transactionTime", txCtx),
      });
    }
    return transactions;
  }
}
