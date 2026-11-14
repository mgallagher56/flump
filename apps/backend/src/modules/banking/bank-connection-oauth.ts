import { createHash, randomBytes } from "node:crypto";
import { BankSyncOrchestrator } from "@flump/banking/server";
import type { EntityManager } from "typeorm";

// Audit M4: the OAuth state was `institutionId:userId`, guessable, so a forged callback could
// link an attacker's bank to a victim's account. It is now 256 random bits, stored only as a
// hash, single use and valid for ten minutes, and every consent carries a PKCE S256 challenge.
// BE-06: when the callback is built it must write the `bank_connection.connected` audit row and
// the `bank_access` consent in the transaction that stores the tokens (see finance.service.ts).
// No callback route exists yet (bank connections are off, D11); `consumeOAuthState` is what it
// must call before exchanging the code.

export const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

const base64url = (buf: Buffer): string => buf.toString("base64url");
const sha256Hex = (value: string): string => createHash("sha256").update(value).digest("hex");

export interface IssuedOAuthState {
  state: string;
  codeChallenge: string;
}

/** Creates and stores a fresh state and PKCE verifier for one consent redirect. */
export async function issueOAuthState(
  manager: EntityManager,
  input: { userId: string; institutionId: string; redirectUri: string; now?: Date },
): Promise<IssuedOAuthState> {
  const now = input.now ?? new Date();
  const state = base64url(randomBytes(32));
  const verifier = base64url(randomBytes(32));
  const stateHash = sha256Hex(state);
  // Expired rows are useless; clearing this user's on each issue keeps the table small.
  await manager.query(
    `DELETE FROM "bank_oauth_states" WHERE "user_id" = $1 AND "expires_at" < $2`,
    [input.userId, now],
  );
  await manager.query(
    `INSERT INTO "bank_oauth_states"
       ("user_id", "institution_id", "state_hash", "code_verifier", "redirect_uri", "expires_at")
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      input.userId,
      input.institutionId.toLowerCase(),
      stateHash,
      BankSyncOrchestrator.encryptToken(verifier, stateHash),
      input.redirectUri,
      new Date(now.getTime() + OAUTH_STATE_TTL_MS),
    ],
  );
  return { state, codeChallenge: base64url(createHash("sha256").update(verifier).digest()) };
}

export interface ConsumedOAuthState {
  userId: string;
  institutionId: string;
  codeVerifier: string;
  redirectUri: string;
}

/**
 * Spends a state exactly once: the row is deleted in the same statement that reads it, so a
 * replayed or concurrent callback gets null. Null too when expired or for another institution.
 */
export async function consumeOAuthState(
  manager: EntityManager,
  state: string,
  institutionId: string,
  now: Date = new Date(),
): Promise<ConsumedOAuthState | null> {
  if (!state || state.length > 128) return null;
  const stateHash = sha256Hex(state);
  const result: unknown = await manager.query(
    `DELETE FROM "bank_oauth_states" WHERE "state_hash" = $1
     RETURNING "user_id", "institution_id", "code_verifier", "redirect_uri", "expires_at"`,
    [stateHash],
  );
  // A DELETE RETURNING through query() yields [rows, count] on the pg driver.
  const rows = (Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result) as Array<{
    user_id: string;
    institution_id: string;
    code_verifier: string;
    redirect_uri: string;
    expires_at: Date;
  }>;
  const row = rows[0];
  if (!row) return null;
  if (new Date(row.expires_at).getTime() <= now.getTime()) return null;
  if (row.institution_id !== institutionId.toLowerCase()) return null;
  return {
    userId: row.user_id,
    institutionId: row.institution_id,
    codeVerifier: BankSyncOrchestrator.decryptToken(row.code_verifier, stateHash),
    redirectUri: row.redirect_uri,
  };
}

/** Adds the PKCE S256 challenge to a provider's consent URL. */
export function withPkceChallenge(authUrl: string, codeChallenge: string): string {
  const url = new URL(authUrl);
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}
