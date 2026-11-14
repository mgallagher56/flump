import { createHmac } from "node:crypto";
import { isStrictEnv } from "../config/db.config";

export const TOMBSTONE_KEY_ENV_VAR = "DELETION_TOMBSTONE_KEY";
export const MIN_TOMBSTONE_KEY_LENGTH = 32;
/** Public on purpose: used only in development and test, where no real user is ever erased. */
const DEV_TOMBSTONE_KEY = "flump-dev-only-deletion-tombstone-key-not-secret";

/** How long a tombstone is kept (owner decision D1, recommended option). */
export const TOMBSTONE_RETENTION_MONTHS = 24;

/**
 * Strict unless NODE_ENV is explicitly development or test AND not on Railway: the same rule the
 * auth config applies to the dev bypass (auth/auth.config.ts).
 */
function isStrictTombstoneEnv(env: Record<string, string | undefined>): boolean {
  return isStrictEnv(env) || Boolean(env.RAILWAY_ENVIRONMENT);
}

export interface TombstoneKeyResolution {
  /** The HMAC key, or null when account deletion must fail closed (503). */
  key: string | null;
  /** A warning naming the variable only (never a value), when there is something to say. */
  warning?: string;
}

/**
 * The HMAC key for deletion tombstones.
 *
 * NEVER ROTATE DELETION_TOMBSTONE_KEY. A tombstone is found only by recomputing the HMAC of the
 * user id under the same key: after a rotation every existing tombstone becomes unfindable, so a
 * pending deletion can no longer be retried idempotently and erased accounts' tokens pass the
 * AuthGuard's erased check until they expire.
 *
 * - A configured key must be at least 32 characters in every environment; a shorter one is
 *   refused (null).
 * - Development and test (and not on Railway) with no key fall back to a fixed public key, with a
 *   warning.
 * - Anywhere else with no key: null, so account deletion fails closed with a 503 rather than writing
 *   tombstones a known key could reverse. Boot is not blocked, so a deploy before the owner sets
 *   the key keeps every other route working.
 */
export function resolveTombstoneKey(
  env: Record<string, string | undefined>,
): TombstoneKeyResolution {
  const configured = env[TOMBSTONE_KEY_ENV_VAR];
  if (configured) {
    if (configured.length < MIN_TOMBSTONE_KEY_LENGTH) {
      return {
        key: null,
        warning: `${TOMBSTONE_KEY_ENV_VAR} is shorter than ${MIN_TOMBSTONE_KEY_LENGTH} characters: account deletion returns 503 until it is fixed.`,
      };
    }
    return { key: configured };
  }
  if (!isStrictTombstoneEnv(env)) {
    return {
      key: DEV_TOMBSTONE_KEY,
      warning: `${TOMBSTONE_KEY_ENV_VAR} is not set: using the public development key (development and test only).`,
    };
  }
  return {
    key: null,
    warning: `${TOMBSTONE_KEY_ENV_VAR} is not set: account deletion returns 503 until it is.`,
  };
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
