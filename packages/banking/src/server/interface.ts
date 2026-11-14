import type {
  BankingProviderName,
  NormalizedAccount,
  NormalizedTransaction,
} from "../core/types.js";

// ---------------------------------------------------------------------------------------------
// The bank-provider interface (audit M20). Every live bank or broker integration (Monzo,
// Starling, Trading 212, the Open Banking standard banks) implements `BankProvider`.
//
// Failure contract: a method either returns real data from the provider or rejects with a
// `BankProviderError` (see provider-errors.ts). It never substitutes a default (a 0 balance, an
// empty list, a placeholder id) for data it could not fetch.
// ---------------------------------------------------------------------------------------------

export interface TokenResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}

export type ProviderAccountType = "Current" | "Saving" | "Mortgage" | "Credit Card" | "Investment";

export interface ProviderAccount {
  externalAccountId: string;
  name: string;
  type: ProviderAccountType;
  /** The balance the provider reported, in major units. Always a real reading, never a default. */
  balance: number;
  currency: string;
}

export interface ProviderTransaction {
  amount: number;
  description: string;
  category: string;
  timestamp: Date;
}

export interface ProviderCallOptions {
  /** Overall deadline for the whole operation (all its provider calls). */
  signal?: AbortSignal;
}

export interface FetchTransactionsOptions extends ProviderCallOptions {
  /** Maximum transactions to request, where the provider supports a limit. */
  limit?: number;
  /** Earliest transaction wanted, where the provider supports it (default: 90 days ago). */
  since?: Date;
}

/**
 * The outcome of asking a provider to revoke access. `revoked: false` with `unsupported` means
 * the provider has no revocation endpoint we can call; the user has to remove access in their
 * bank's app, and the caller must tell them so.
 */
export type RevokeResult = { revoked: true } | { revoked: false; reason: "unsupported" };

export interface BankProvider {
  getAuthUrl(clientId: string, redirectUri: string, state: string): string;
  exchangeCode(
    clientId: string,
    clientSecret: string,
    redirectUri: string,
    code: string,
  ): Promise<TokenResponse>;
  /** Exchanges a refresh token (`grant_type=refresh_token`) for a new access token. */
  refreshToken(
    clientId: string,
    clientSecret: string,
    refreshToken: string,
  ): Promise<TokenResponse>;
  /** Revokes the access token at the provider, where the provider supports it. */
  revokeConnection(accessToken: string): Promise<RevokeResult>;
  fetchAccounts(accessToken: string, options?: ProviderCallOptions): Promise<ProviderAccount[]>;
  fetchTransactions(
    accessToken: string,
    externalAccountId: string,
    options?: FetchTransactionsOptions,
  ): Promise<ProviderTransaction[]>;
}

/**
 * @deprecated Not a bank-provider interface: only the CSV statement parser and the unused
 * adapter registry in `orchestrator.ts` use it. Live bank integrations implement `BankProvider`.
 * Remove it together with that registry.
 */
export interface BankingProviderAdapter {
  readonly providerName: BankingProviderName;
  createLinkSession(
    userId: string,
    reauthConnectionId?: string,
  ): Promise<{ linkTokenOrUrl: string; expiresAt: string }>;
  exchangePublicToken(publicTokenOrCode: string): Promise<{
    accessTokenEncrypted: string;
    providerItemId: string;
    consentExpiresAt: string; // Default +90 days for UK Open Banking
  }>;
  getAccounts(accessTokenEncrypted: string): Promise<NormalizedAccount[]>;
  syncTransactions(
    accessTokenEncrypted: string,
    cursor?: string,
  ): Promise<{
    added: NormalizedTransaction[];
    modified: NormalizedTransaction[];
    removedIds: string[];
    nextCursor: string;
  }>;
  revokeConnection(accessTokenEncrypted: string): Promise<void>;
}
