import type {
  BankingProviderName,
  NormalizedAccount,
  NormalizedTransaction,
} from "../core/types.js";

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
