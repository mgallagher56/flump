import { createHmac } from "node:crypto";

type Env = Record<string, string | undefined>;

/**
 * Keyed, one-way references to identifiers we must not store or log in the clear (BE-15: N4, S6):
 * client addresses and user ids in `rate_limit_buckets` keys, and WorkOS user ids in log lines.
 *
 * Root secret: `MCP_AUDIT_HMAC_KEY`, required in production by the boot guard
 * (`config/env.schema.ts`). Outside production, when it is unset, a fixed public development
 * secret is used instead, so keys keep one format everywhere. Those references are only
 * pseudonymous (anyone can recompute them), which is acceptable because no real user data lives
 * in a development or test database.
 *
 * The root secret is never used directly. Each use derives its own key first:
 * `derived = HMAC-SHA256(root, label)` with a fixed, versioned label per use, then
 * `ref = HMAC-SHA256(derived, value)`. The audit fingerprint (`AgentAuditService.fingerprint`)
 * uses the root key itself over canonical JSON. These uses cannot collide or be confused: a
 * derived key is an HMAC output under the root key for a fixed label, so knowing a bucket key or
 * log reference reveals nothing about the root key or another use's derived key (HMAC is a PRF),
 * and two uses never share a key (different labels give independent derived keys). A reference
 * from one use therefore cannot be matched against, or replayed as, another.
 */

/** Public on purpose: development and test only, where no real user is ever recorded. */
const DEV_FALLBACK_ROOT = "flump-dev-only-keyed-reference-root-not-secret";

export const RATE_LIMIT_BUCKET_LABEL = "flump:rate-limit-bucket:v1";
export const LOG_REF_LABEL = "flump:log-user-ref:v1";

/** 128 bits of the HMAC, hex: the stored bucket key. */
const BUCKET_HEX_CHARS = 32;
/** 64 bits, hex: enough to correlate log lines for one user, short enough to read. */
const LOG_REF_HEX_CHARS = 16;

/** Per label: the derived key and the root it came from (recomputed if the root changes). */
const derivedCache = new Map<string, { root: string; key: Buffer }>();

/**
 * Production or any Railway deploy: where the public development root must never be used. A
 * `RAILWAY_*` variable counts only when it has a value: the E2E servers set
 * `RAILWAY_ENVIRONMENT=""` on purpose to say "not Railway".
 */
function isDeployedEnv(env: Env): boolean {
  return (
    env.NODE_ENV === "production" ||
    Object.entries(env).some(
      ([name, value]) => name.startsWith("RAILWAY_") && (value?.trim() ?? "") !== "",
    )
  );
}

/**
 * Blank (after trimming) counts as unset. Unset falls back to the public development root only
 * for local development and tests; in production or on Railway it throws, naming the variable.
 * This cannot throw per request in production: `MCP_AUDIT_HMAC_KEY` is in `PRODUCTION_REQUIRED`
 * (`config/env.schema.ts`), so boot has already failed without it and the first request never
 * reaches this branch.
 */
function rootSecret(env: Env): string {
  const configured = env.MCP_AUDIT_HMAC_KEY?.trim() ?? "";
  if (configured !== "") return configured;
  if (isDeployedEnv(env)) {
    throw new Error("MCP_AUDIT_HMAC_KEY is required in production and on Railway but is not set");
  }
  return DEV_FALLBACK_ROOT;
}

/** HMAC-SHA256(root, label). */
function derivedKey(label: string, env: Env): Buffer {
  const root = rootSecret(env);
  const cached = derivedCache.get(label);
  if (cached && cached.root === root) return cached.key;
  const key = createHmac("sha256", root).update(label).digest();
  derivedCache.set(label, { root, key });
  return key;
}

function keyedRef(label: string, value: string, hexChars: number, env: Env): string {
  return createHmac("sha256", derivedKey(label, env))
    .update(value)
    .digest("hex")
    .slice(0, hexChars);
}

/**
 * The key a rate-limit bucket is stored under in Postgres: `rl1:` plus 128 bits of a keyed HMAC of
 * the logical key (which may hold a client address or a user id). Same input, same bucket.
 */
export function rateLimitStorageKey(logicalKey: string, env: Env = process.env): string {
  return `rl1:${keyedRef(RATE_LIMIT_BUCKET_LABEL, logicalKey, BUCKET_HEX_CHARS, env)}`;
}

/** A short keyed reference to a user id for log lines: never log the WorkOS id itself. */
export function logUserRef(userId: string, env: Env = process.env): string {
  return keyedRef(LOG_REF_LABEL, userId, LOG_REF_HEX_CHARS, env);
}
