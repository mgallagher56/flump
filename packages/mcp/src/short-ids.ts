import { createHmac } from "node:crypto";
import type { VerifiedToken } from "./auth/token-verifier.js";

/**
 * E17-N9: short, opaque ids for accounts and debts. The agent sees these instead of database UUIDs.
 *
 * `HMAC-SHA256(key = tokenId, message = "<kind>:<uuid>")`, truncated. It is recomputed on every
 * request, so there is no server state: the same token always gets the same id for the same record,
 * and a different token gets a different one. Resolving an id means recomputing it over the user's
 * own records (see `resolveShortId`), so an id can never name a record the user does not own.
 */
export type ShortIdKind = "acc" | "debt";

const ID_HEX_CHARS = 10;

/** Stable per token. A token without an id (dev tokens) is keyed on the user id instead. */
export function shortIdKey(token: Pick<VerifiedToken, "tokenId" | "userId">): string {
  return token.tokenId ?? `user:${token.userId}`;
}

export function shortId(key: string, kind: ShortIdKind, uuid: string): string {
  const digest = createHmac("sha256", key).update(`${kind}:${uuid}`).digest("hex");
  return `${kind}_${digest.slice(0, ID_HEX_CHARS)}`;
}

/** Finds the record a short id names among the caller's own records, or undefined. */
export function resolveShortId<T extends { id: string }>(
  key: string,
  kind: ShortIdKind,
  records: readonly T[],
  id: string,
): T | undefined {
  return records.find((r) => shortId(key, kind, r.id) === id);
}
