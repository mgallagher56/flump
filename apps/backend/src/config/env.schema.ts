import { z } from "zod";

/**
 * The one schema for every environment variable the backend reads at runtime (M18).
 *
 * `validateBootEnv` (config/boot-guards.ts) parses `process.env` with it once, in main.ts, before
 * Nest starts. Formats are checked everywhere; the variables in PRODUCTION_REQUIRED must also be
 * present when NODE_ENV=production. Each failure names the variable and the rule it broke, never
 * the value. Unset and empty are the same thing (matching how the resolvers already read them).
 *
 * Deeper rules (DB pool bounds, the auth bypass, the banking key) stay in their own resolvers, which
 * run at module init with their own named errors; this schema catches shape errors first and in one
 * report, so a deploy with three bad variables fails once, naming all three.
 *
 * Test-only variables (TEST_DATABASE_URL, REQUIRE_DB_TESTS, ALLOW_DESTRUCTIVE_DB_TESTS) are not
 * part of the runtime contract and are left out. Unknown variables pass through untouched.
 */

type Raw = Record<string, string | undefined>;

const blankToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess(blankToUndefined, schema.optional());

const text = () => optional(z.string());

/** `true` or `false`, trimmed and case-insensitive. */
const bool = () =>
  optional(
    z
      .string()
      .trim()
      .toLowerCase()
      .refine((v) => v === "true" || v === "false", "must be true or false")
      .transform((v) => v === "true"),
  );

/** A whole number from min to max. */
const int = (min: number, max: number) =>
  optional(
    z
      .string()
      .trim()
      .regex(/^\d+$/, "must be a whole number")
      .transform(Number)
      .refine((n) => n >= min && n <= max, `must be from ${min} to ${max}`),
  );

const isUrl = (value: string, protocols: readonly string[]) => {
  try {
    return protocols.includes(new URL(value).protocol);
  } catch {
    return false;
  }
};

/** An absolute URL with one of the given schemes. The message never echoes the input. */
const url = (protocols: readonly string[]) =>
  optional(
    z
      .string()
      .trim()
      .refine((v) => isUrl(v, protocols), `must be a ${protocols.join(" or ")} URL`),
  );

const lowerEnum = <const T extends readonly [string, ...string[]]>(values: T) =>
  optional(
    z
      .string()
      .trim()
      .toLowerCase()
      .refine((v): v is T[number] => values.includes(v), `must be one of: ${values.join(", ")}`)
      .transform((v) => v as T[number]),
  );

const HTTP = ["http:", "https:"] as const;

const backendEnvSchema = z.looseObject({
  // Runtime
  NODE_ENV: text(),
  PORT: int(1, 65_535),
  TZ: text(),
  LOG_FORMAT: lowerEnum(["json", "text"]),

  // Database (config/db.config.ts checks the deeper rules and bounds)
  DATABASE_URL: url(["postgres:", "postgresql:"]),
  DB_HOST: text(),
  DB_PORT: int(1, 65_535),
  DB_USER: text(),
  DB_PASSWORD: text(),
  DB_NAME: text(),
  DB_SSL: lowerEnum(["true", "false", "no-verify"]),
  DB_SSL_CA: text(),
  DB_SYNCHRONIZE: bool(),
  DB_POOL_MAX: int(1, 100),
  DB_POOL_CONNECTION_TIMEOUT_MS: int(100, 60_000),
  DB_POOL_IDLE_TIMEOUT_MS: int(1_000, 600_000),
  DB_STATEMENT_TIMEOUT_MS: int(100, 600_000),
  DB_LOCK_TIMEOUT_MS: int(100, 60_000),
  DB_IDLE_IN_TRANSACTION_TIMEOUT_MS: int(1_000, 600_000),
  DB_SLOW_QUERY_MS: int(1, 600_000),

  // Keys
  BANKING_TOKEN_ENCRYPTION_KEY: optional(z.string().min(32, "must be at least 32 characters")),
  DELETION_TOMBSTONE_KEY: text(),
  MCP_AUDIT_HMAC_KEY: text(),
  /** Shared with the web service: verifies the signed client-IP header (BE-07, M9). */
  WEB_CLIENT_IP_HMAC_KEY: optional(z.string().min(32, "must be at least 32 characters")),

  // HTTP edge
  CORS_ALLOWED_ORIGINS: text(),
  TRUST_PROXY_HOPS: int(0, 100),
  BACKEND_URL: url(HTTP),
  WEB_ORIGIN: url(HTTP),

  // Mobile client policy (GET /app/client-policy). A malformed value means no minimum.
  CLIENT_POLICY_IOS_MIN_VERSION: text(),
  CLIENT_POLICY_IOS_RECOMMENDED_VERSION: text(),
  CLIENT_POLICY_ANDROID_MIN_VERSION: text(),
  CLIENT_POLICY_ANDROID_RECOMMENDED_VERSION: text(),

  // Auth
  AUTH_DEV_BYPASS: bool(),
  WORKOS_CLIENT_ID: text(),
  WORKOS_API_KEY: text(),
  WORKOS_ISSUER: url(["https:"]),

  // MCP
  MCP_ENABLED: bool(),
  MCP_OPEN_ACCESS: bool(),
  MCP_ALLOWED_USER_IDS: text(),
  MCP_ALLOWED_ORIGINS: text(),
  MCP_AUDIENCE: text(),
  AUTH_SERVER_URL: url(["https:"]),
  // Ignored since BE-06 (the purge moved to the retention cron); still accepted so an old value
  // left in Railway does not fail boot.
  AGENT_AUDIT_PURGE_ENABLED: bool(),

  // Access gates
  BETA_ALLOWED_EMAILS: text(),
  BETA_ALLOWED_USER_IDS: text(),
  BETA_OPEN: bool(),
  BANK_CONNECTIONS_ENABLED: bool(),
  BANK_CONNECTIONS_ALLOWED_USER_IDS: text(),
  STARLING_USE_SANDBOX: bool(),

  // API contract
  CONTRACT_MODE: lowerEnum(["enforce", "shadow", "off"]),
  CONTRACT_ENFORCE_GROUPS: text(),

  // Observability
  SENTRY_DSN: url(HTTP),
  SENTRY_ENVIRONMENT: text(),
  SENTRY_SELFTEST_ON_BOOT: lowerEnum(["0", "1"]),
  SENTRY_TRACES_SAMPLE_RATE: optional(
    z
      .string()
      .trim()
      .regex(/^(?:0(?:\.\d+)?|1(?:\.0+)?)$/, "must be a number from 0 to 1")
      .transform(Number),
  ),

  // Platform (set by Railway)
  RAILWAY_ENVIRONMENT: text(),
  RAILWAY_ENVIRONMENT_NAME: text(),
  RAILWAY_GIT_COMMIT_SHA: text(),
});

export type BackendEnv = z.infer<typeof backendEnvSchema>;

/** Present when NODE_ENV=production, or boot fails. `DATABASE_URL` may be replaced by DB_HOST. */
export const PRODUCTION_REQUIRED = [
  "DATABASE_URL",
  "CORS_ALLOWED_ORIGINS",
  "MCP_AUDIT_HMAC_KEY",
  "WORKOS_CLIENT_ID",
  "BANKING_TOKEN_ENCRYPTION_KEY",
] as const;

const MIN_PRODUCTION_HMAC_KEY = 32;

export interface EnvIssue {
  variable: string;
  problem: string;
}

/** Boot refused: one or more variables are missing or malformed. Lists names, never values. */
export class EnvValidationError extends Error {
  override readonly name = "EnvValidationError";
  constructor(readonly issues: readonly EnvIssue[]) {
    super(`Invalid environment: ${issues.map((i) => `${i.variable} ${i.problem}`).join("; ")}`);
  }
}

export const isProduction = (env: Raw): boolean => env.NODE_ENV?.trim() === "production";

function productionIssues(env: Raw): EnvIssue[] {
  if (!isProduction(env)) return [];
  const present = (name: string) => (env[name]?.trim() ?? "") !== "";
  const issues: EnvIssue[] = [];
  for (const name of PRODUCTION_REQUIRED) {
    if (name === "DATABASE_URL" && present("DB_HOST")) continue;
    if (!present(name)) issues.push({ variable: name, problem: "is required in production" });
  }
  const hmac = env.MCP_AUDIT_HMAC_KEY?.trim() ?? "";
  if (hmac !== "" && hmac.length < MIN_PRODUCTION_HMAC_KEY) {
    issues.push({
      variable: "MCP_AUDIT_HMAC_KEY",
      problem: `must be at least ${MIN_PRODUCTION_HMAC_KEY} characters in production`,
    });
  }
  return issues;
}

/**
 * Parses and checks the environment. Throws EnvValidationError listing every bad variable (format
 * errors plus production-required ones). Pure: env is a parameter.
 */
export function parseBackendEnv(env: Raw): BackendEnv {
  const result = backendEnvSchema.safeParse(env);
  const issues: EnvIssue[] = result.success
    ? []
    : result.error.issues.map((issue) => ({
        variable: String(issue.path[0] ?? "environment"),
        // zod's own messages for these schemas never contain the input; ours are fixed strings.
        problem: issue.message,
      }));
  issues.push(...productionIssues(env));
  if (issues.length > 0 || !result.success) throw new EnvValidationError(issues);
  return result.data;
}
