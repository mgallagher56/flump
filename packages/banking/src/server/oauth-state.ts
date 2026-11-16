import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { type BankingKeyring, encryptBankingToken, safeDecryptBankingToken } from "./crypto.js";

export const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
export const MAX_OAUTH_STATE_LENGTH = 128;

const base64url = (buf: Buffer): string => buf.toString("base64url");

/** SHA-256 hex digest of an OAuth `state` parameter. Only the digest is persisted. */
export function hashOAuthState(state: string): string {
  return createHash("sha256").update(state).digest("hex");
}

/** Computes the PKCE S256 `code_challenge` from a plaintext `code_verifier`. */
export function pkceChallengeFromVerifier(codeVerifier: string): string {
  return base64url(createHash("sha256").update(codeVerifier).digest());
}

export interface IssuedOAuthState {
  state: string;
  codeChallenge: string;
}

export interface StoredOAuthStateRecord {
  userId: string;
  institutionId: string;
  stateHash: string;
  encryptedCodeVerifier: string;
  redirectUri: string;
  expiresAt: Date;
}

export interface CreateOAuthStateInput {
  userId: string;
  institutionId: string;
  redirectUri: string;
  now?: Date;
  keyring?: BankingKeyring;
}

/**
 * Generates a fresh 256-bit random OAuth state and PKCE S256 verifier/challenge pair, returning
 * the public redirect values (`issued`) and the database record (`record`) whose `codeVerifier`
 * is AES-256-GCM encrypted with `stateHash` as AAD.
 */
export function createOAuthStateRecord(input: CreateOAuthStateInput): {
  issued: IssuedOAuthState;
  record: StoredOAuthStateRecord;
} {
  const now = input.now ?? new Date();
  const state = base64url(randomBytes(32));
  const verifier = base64url(randomBytes(32));
  const stateHash = hashOAuthState(state);
  const encryptedCodeVerifier = encryptBankingToken(verifier, {
    aad: stateHash,
    keyring: input.keyring,
  });

  return {
    issued: {
      state,
      codeChallenge: pkceChallengeFromVerifier(verifier),
    },
    record: {
      userId: input.userId,
      institutionId: input.institutionId.toLowerCase(),
      stateHash,
      encryptedCodeVerifier,
      redirectUri: input.redirectUri,
      expiresAt: new Date(now.getTime() + OAUTH_STATE_TTL_MS),
    },
  };
}

export interface ConsumedOAuthState {
  userId: string;
  institutionId: string;
  codeVerifier: string;
  redirectUri: string;
}

export interface VerifyOAuthStateInput {
  state: string;
  institutionId: string;
  now?: Date;
  keyring?: BankingKeyring;
}

function hashesMatch(aHex: string, bHex: string): boolean {
  if (aHex.length !== bHex.length) return false;
  return timingSafeEqual(Buffer.from(aHex, "utf8"), Buffer.from(bHex, "utf8"));
}

/**
 * Verifies a stored OAuth state record against the callback's `state`, `institutionId`, and
 * current timestamp, and decrypts the PKCE `codeVerifier` bound to `stateHash`. Returns `null`
 * when missing, malformed, expired, bound to another institution, or tampered.
 */
export function verifyOAuthStateRecord(
  record: StoredOAuthStateRecord | null | undefined,
  input: VerifyOAuthStateInput,
): ConsumedOAuthState | null {
  if (
    !input.state ||
    typeof input.state !== "string" ||
    input.state.length > MAX_OAUTH_STATE_LENGTH
  ) {
    return null;
  }
  if (!record) return null;

  const expectedHash = hashOAuthState(input.state);
  if (!hashesMatch(expectedHash, record.stateHash)) return null;

  const now = input.now ?? new Date();
  const expiresMs = new Date(record.expiresAt).getTime();
  if (!Number.isFinite(expiresMs) || expiresMs <= now.getTime()) return null;

  if (record.institutionId !== input.institutionId.toLowerCase()) return null;

  try {
    const codeVerifier = safeDecryptBankingToken(record.encryptedCodeVerifier, {
      aad: record.stateHash,
      keyring: input.keyring,
    });
    if (!codeVerifier) return null;
    return {
      userId: record.userId,
      institutionId: record.institutionId,
      codeVerifier,
      redirectUri: record.redirectUri,
    };
  } catch {
    return null;
  }
}

/** Adds the PKCE S256 challenge to a provider's consent URL. */
export function withPkceChallenge(authUrl: string, codeChallenge: string): string {
  const url = new URL(authUrl);
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}
