import { Injectable, Logger } from "@nestjs/common";

export const BANK_CONSENT_REVOKER = "BANK_CONSENT_REVOKER";

/** The bank link being removed. Identifiers only; the stored tokens are not passed. */
export interface BankConnectionRef {
  id: string;
  institutionId: string;
  authType: string;
}

/**
 * Seam for revoking consent at the bank before Flump deletes its copy of a connection (BE-04, H10).
 * Called before account deletion and financial reset. It must never throw for a provider failure:
 * the person's request to erase their data goes ahead regardless, and a failure is logged.
 * BE-12 replaces the default with real provider calls.
 */
export interface BankConsentRevoker {
  revokeAll(userId: string, connections: readonly BankConnectionRef[]): Promise<void>;
}

/**
 * Default until BE-12: records that consent should have been revoked, without calling any bank.
 * The event carries the institution ids and a count only: no user id, tokens or names.
 */
@Injectable()
export class LoggingBankConsentRevoker implements BankConsentRevoker {
  private readonly logger = new Logger("BankConsentRevoker");

  async revokeAll(_userId: string, connections: readonly BankConnectionRef[]): Promise<void> {
    if (connections.length === 0) return;
    try {
      this.logger.warn(
        JSON.stringify({
          event: "bank_consent_revoke_pending",
          connections: connections.length,
          institutions: [...new Set(connections.map((c) => c.institutionId))].sort(),
        }),
      );
    } catch {
      // logging failure is ignored
    }
  }
}
