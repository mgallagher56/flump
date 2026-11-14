import { createHmac } from "node:crypto";
import { isStrictEnv } from "../config/db.config";

export const TOMBSTONE_KEY_ENV_VAR = "DELETION_TOMBSTONE_KEY";
export const MIN_TOMBSTONE_KEY_LENGTH = 32;
/** Public on purpose: used only in development and test, where no real user is ever erased. */
const DEV_TOMBSTONE_KEY = "flump-dev-only-deletion-tombstone-key-not-secret";

/** How long a tombstone is kept (owner decision D1, recommended option). */
export const TOMBSTONE_RETENTION_MONTHS = 24;

/**
 * The HMAC key for deletion tombstones, or null when it is not usable.
 *
 * Development and test fall back to a fixed public key, as the banking key does. Anywhere else
 * (production, staging, NODE_ENV unset) the key must be set to at least 32 characters; when it is
 * not, this returns null and account deletion fails closed with a 503 rather than writing a
 * tombstone that a known key could reverse. Boot is not blocked, so a deploy before the owner sets
 * the key keeps every other route working. The value is never logged.
 */
export function resolveTombstoneKey(env: Record<string, string | undefined>): string | null {
  const configured = env[TOMBSTONE_KEY_ENV_VAR];
  if (!isStrictEnv(env)) return configured || DEV_TOMBSTONE_KEY;
  if (!configured || configured.length < MIN_TOMBSTONE_KEY_LENGTH) return null;
  return configured;
}

/** Hex HMAC-SHA256 of the user id: the only trace of the user a tombstone keeps. */
export function tombstoneSubjectHash(key: string, userId: string): string {
  return createHmac("sha256", key).update(`account-deletion:${userId}`).digest("hex");
}

/** `from` plus the retention period, in UTC calendar months. */
export function tombstoneExpiry(from: Date): Date {
  const expiry = new Date(from.getTime());
  expiry.setUTCMonth(expiry.getUTCMonth() + TOMBSTONE_RETENTION_MONTHS);
  return expiry;
}
