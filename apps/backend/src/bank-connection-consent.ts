import { BankSyncOrchestrator, isBankProviderError } from "@flump/banking/server";
import { Logger } from "@nestjs/common";
import type { Repository } from "typeorm";
import { accessTokenAad } from "./bank-connection-sync";
import type { BankConnection } from "./entities/bank-connection.entity";
import { safeErrorSummary } from "./log-safe";
import type { BankProvider } from "./providers/provider.interface";

// Audit H10: removing a bank connection, or the whole account, must also withdraw Flump's access
// at the bank. Revocation is best effort: it never blocks the delete, it is retried once when the
// provider says "try later", and every outcome is logged without tokens or provider text.

/** Overall time allowed for one provider revoke call, including the one retry. */
export const REVOKE_TIMEOUT_MS = 10_000;

/**
 * - `revoked`: the provider confirmed access is withdrawn.
 * - `unsupported`: the provider has no revoke endpoint; the user must remove access in their
 *   bank's app, and the client says so.
 * - `failed`: the provider call failed, timed out, or the stored token was unusable.
 * - `no_token`: nothing to revoke (no stored access token, or no provider for the institution).
 */
export type ConsentRevokeOutcome = "revoked" | "unsupported" | "failed" | "no_token";

export interface ProviderLookup {
  getProvider(institutionId: string): BankProvider | undefined;
}

const logger = new Logger("BankConsent");

function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`revoke timed out after ${ms}ms`)), ms);
  });
  return Promise.race([work, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Revokes one connection's consent at its provider. Never throws. Call it BEFORE deleting the row
 * (the row holds the token) and OUTSIDE any database transaction (it makes a network call).
 */
export async function revokeConnectionConsent(
  providers: ProviderLookup,
  connection: Pick<BankConnection, "id" | "institutionId" | "accessToken">,
): Promise<ConsentRevokeOutcome> {
  const provider = providers.getProvider(connection.institutionId);
  if (!provider || !connection.accessToken) return "no_token";

  let accessToken: string;
  try {
    accessToken = BankSyncOrchestrator.decryptToken(
      connection.accessToken,
      accessTokenAad(connection.id),
    );
  } catch (err) {
    logger.warn(`Consent revoke skipped, stored token unusable: ${safeErrorSummary(err)}`);
    return "failed";
  }

  const attempt = () => withTimeout(provider.revokeConnection(accessToken), REVOKE_TIMEOUT_MS);
  try {
    let result: Awaited<ReturnType<typeof attempt>>;
    try {
      result = await attempt();
    } catch (err) {
      if (!isBankProviderError(err) || !err.retryable) throw err;
      result = await attempt();
    }
    if (result.revoked) {
      logger.log(`Consent revoked at ${connection.institutionId}`);
      return "revoked";
    }
    logger.log(`Consent revoke unsupported by ${connection.institutionId}`);
    return "unsupported";
  } catch (err) {
    logger.warn(`Consent revoke failed at ${connection.institutionId}: ${safeErrorSummary(err)}`);
    return "failed";
  }
}

export interface UserConsentRevokeSummary {
  attempted: number;
  revoked: number;
  unsupported: number;
  failed: number;
}

/**
 * For account deletion and data reset (BE-04): revokes consent at the provider for every bank
 * connection the user has. Never throws; returns counts only. Call it before the deleting
 * transaction starts, and delete the rows whatever it returns.
 */
export async function revokeAllBankConsentsForUser(
  deps: { connections: Repository<BankConnection>; providers: ProviderLookup },
  userId: string,
): Promise<UserConsentRevokeSummary> {
  const summary: UserConsentRevokeSummary = { attempted: 0, revoked: 0, unsupported: 0, failed: 0 };
  let rows: BankConnection[];
  try {
    rows = await deps.connections.find({ where: { userId } });
  } catch (err) {
    logger.warn(`Consent revoke could not list connections: ${safeErrorSummary(err)}`);
    return summary;
  }
  for (const row of rows) {
    const outcome = await revokeConnectionConsent(deps.providers, row);
    if (outcome === "no_token") continue;
    summary.attempted += 1;
    summary[outcome] += 1;
  }
  return summary;
}
