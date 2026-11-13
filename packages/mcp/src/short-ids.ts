import { createHmac } from "node:crypto";
import type { VerifiedToken } from "./auth/token-verifier.js";

/**
 * E17-N9: short, opaque ids for accounts, debts and tax records. The agent sees these instead of database UUIDs.
 *
 * `HMAC-SHA256(key = tokenId, message = "<kind>:<uuid>")`, truncated. It is recomputed on every
 * request, so there is no server state: the same token always gets the same id for the same record,
 * and a different token gets a different one.
 *
 * These are opaque per-token labels, NOT authentication: the key is the token id (not a secret), so
 * anyone who knows a token id and a UUID can compute the id. Ownership is enforced by only ever
 * resolving over the caller's own records. No server secret is used, deliberately (it would need an
 * owner env step). Resolving an id means recomputing it over the user's
 * own records (see `resolveShortId`), so an id can never name a record the user does not own.
 */
export type ShortIdKind = "acc" | "debt" | "tax";

const ID_HEX_CHARS = 12;

/** Stable per token. A token without an id (dev tokens) is keyed on the user id instead. */
export function shortIdKey(token: Pick<VerifiedToken, "tokenId" | "userId">): string {
  return token.tokenId ?? `user:${token.userId}`;
}

export function shortId(key: string, kind: ShortIdKind, uuid: string): string {
  const digest = createHmac("sha256", key).update(`${kind}:${uuid}`).digest("hex");
  return `${kind}_${digest.slice(0, ID_HEX_CHARS)}`;
}

/**
 * Finds the record a short id names among the caller's own records. Returns undefined when nothing
 * matches or when more than one record matches (a truncated-hash collision): never guess.
 */
export function resolveShortId<T extends { id: string }>(
  key: string,
  kind: ShortIdKind,
  records: readonly T[],
  id: string,
): T | undefined {
  const matches = records.filter((r) => shortId(key, kind, r.id) === id);
  return matches.length === 1 ? matches[0] : undefined;
}
