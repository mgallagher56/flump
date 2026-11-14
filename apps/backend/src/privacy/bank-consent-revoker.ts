import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { revokeConnectionConsentDetailed } from "../bank-connection-consent";
import { BankConnection } from "../entities/bank-connection.entity";
import { safeErrorSummary } from "../log-safe";
import { BankProviderRegistry } from "../providers/provider.registry";

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
 * The app uses ProviderBankConsentRevoker (BE-12).
 */
export interface BankConsentRevoker {
  revokeAll(userId: string, connections: readonly BankConnectionRef[]): Promise<void>;
}

/**
 * BE-12 (audit H10): revokes consent at each provider before the rows are deleted. Called outside
 * the deleting transaction. It reads the stored tokens itself (the refs carry ids only), calls each
 * provider once with a time limit (one retry when the provider says "try later"), and logs counts
 * only. It never throws.
 */
@Injectable()
export class ProviderBankConsentRevoker implements BankConsentRevoker {
  private readonly logger = new Logger("BankConsentRevoker");

  constructor(
    @InjectRepository(BankConnection)
    private readonly connections: Repository<BankConnection>,
    private readonly providers: BankProviderRegistry,
  ) {}

  async revokeAll(userId: string, refs: readonly BankConnectionRef[]): Promise<void> {
    if (refs.length === 0) return;
    const counts = { revoked: 0, unsupported: 0, failed: 0, no_token: 0 };
    const failures: Record<string, number> = {};
    try {
      const rows = await this.connections.find({
        where: { userId, id: In(refs.map((r) => r.id)) },
        select: { id: true, institutionId: true, accessToken: true },
      });
      for (const row of rows) {
        const result = await revokeConnectionConsentDetailed(this.providers, row);
        counts[result.outcome] += 1;
        if (result.failure) failures[result.failure] = (failures[result.failure] ?? 0) + 1;
      }
      // Audit event: counts, typed failure codes and institution ids only. No user id (the
      // account may be being erased), tokens or provider text.
      this.logger.log(
        JSON.stringify({
          event: "bank_consent_revoke",
          connections: rows.length,
          ...counts,
          failures,
          institutions: [...new Set(rows.map((r) => r.institutionId))].sort(),
        }),
      );
    } catch (err) {
      this.logger.warn(`Bank consent revoke failed: ${safeErrorSummary(err)}`);
    }
  }
}

/**
 * Records that consent should have been revoked, without calling any bank (tests, and any context
 * without provider wiring).
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
