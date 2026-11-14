import { createHmac, randomBytes } from "node:crypto";
import { Logger } from "@nestjs/common";

type Env = Record<string, string | undefined>;

/**
 * Keyed, one-way references to identifiers we must not store or log in the clear (BE-15: N4, S6):
 * client addresses and user ids in `rate_limit_buckets` keys, and WorkOS user ids in log lines.
 *
 * Root secret: `MCP_AUDIT_HMAC_KEY`. With NODE_ENV=production the boot guard requires it
 * (`PRODUCTION_REQUIRED`, `config/env.schema.ts`). When it is unset (or blank):
 * - in a deployed environment (NODE_ENV=production or a non-empty `RAILWAY_*` variable, for
 *   example a Railway service running with another NODE_ENV), a random per-process root is used,
 *   created once at first use and kept for the process lifetime, and one error line is logged.
 *   Nothing throws, so rate limiting (including the fail-closed classes) keeps working, but bucket
 *   keys are process-local: limits do not hold across replicas or restarts, and log references do
 *   not correlate across restarts. Nobody outside the process can recompute them.
 * - in local development and tests, a fixed public development root is used, so keys keep one
 *   format everywhere. Those references are only pseudonymous (anyone can recompute them), which
 *   is acceptable because no real user data lives in a development or test database.
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

/** Random root for a deployed process with no configured key: created once, kept for its life. */
let processRoot: string | undefined;

function processLocalRoot(): string {
  if (processRoot === undefined) {
    processRoot = randomBytes(32).toString("hex");
    new Logger("KeyedRef").error(
      "MCP_AUDIT_HMAC_KEY is not set in a deployed environment: using a random per-process root, " +
        "so rate-limit bucket keys are process-local (limits do not hold across replicas or " +
        "restarts) and log references do not correlate across restarts until it is set",
    );
  }
  return processRoot;
}

/**
 * Blank (after trimming) counts as unset. Unset uses the per-process random root in a deployed
 * environment and the public development root for local development and tests. Never throws, so
 * it never turns a request into a refusal.
 */
function rootSecret(env: Env): string {
  const configured = env.MCP_AUDIT_HMAC_KEY?.trim() ?? "";
  if (configured !== "") return configured;
  return isDeployedEnv(env) ? processLocalRoot() : DEV_FALLBACK_ROOT;
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
