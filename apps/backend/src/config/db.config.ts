export type Env = Record<string, string | undefined>;

export interface DbConfig {
  connection:
    | { url: string }
    | { host: string; port: number; username: string; password: string; database: string };
  ssl: false | { rejectUnauthorized: boolean; ca?: string };
  synchronize: boolean;
  migrationsRun: boolean;
  pool: DbPoolConfig;
  warnings: string[];
}

/** Pool and per-session limits, all in milliseconds except `max`. Every field has a safe default. */
export interface DbPoolConfig {
  /** Largest number of open connections per process (pg `max`). */
  max: number;
  /** How long a request waits for a free connection before failing. */
  connectionTimeoutMillis: number;
  /** How long an unused connection stays open. */
  idleTimeoutMillis: number;
  /** Server-side cap on one statement (Postgres `statement_timeout`). */
  statementTimeoutMillis: number;
  /** Server-side cap on waiting for a row or table lock (Postgres `lock_timeout`). */
  lockTimeoutMillis: number;
  /** Server-side cap on a transaction left open and idle (`idle_in_transaction_session_timeout`). */
  idleInTransactionTimeoutMillis: number;
}

interface PoolSetting {
  env: string;
  key: keyof DbPoolConfig;
  fallback: number;
  min: number;
  max: number;
}

// Conservative defaults: Railway's max_connections is unconfirmed, so one process keeps to 10
// (pg's own default). Raise DB_POOL_MAX only once max_connections and the replica count are known:
// max_connections must exceed DB_POOL_MAX x replicas plus headroom for migrations and admin.
const POOL_SETTINGS: readonly PoolSetting[] = [
  { env: "DB_POOL_MAX", key: "max", fallback: 10, min: 1, max: 100 },
  {
    env: "DB_POOL_CONNECTION_TIMEOUT_MS",
    key: "connectionTimeoutMillis",
    fallback: 5_000,
    min: 100,
    max: 60_000,
  },
  {
    env: "DB_POOL_IDLE_TIMEOUT_MS",
    key: "idleTimeoutMillis",
    fallback: 30_000,
    min: 1_000,
    max: 600_000,
  },
  {
    env: "DB_STATEMENT_TIMEOUT_MS",
    key: "statementTimeoutMillis",
    fallback: 10_000,
    min: 100,
    max: 600_000,
  },
  { env: "DB_LOCK_TIMEOUT_MS", key: "lockTimeoutMillis", fallback: 5_000, min: 100, max: 60_000 },
  {
    env: "DB_IDLE_IN_TRANSACTION_TIMEOUT_MS",
    key: "idleInTransactionTimeoutMillis",
    fallback: 30_000,
    min: 1_000,
    max: 600_000,
  },
];

/**
 * Reads the pool limits. Unset or empty uses the default; anything else must be a whole number
 * within the setting's bounds (0, which Postgres reads as "no limit", is rejected on purpose).
 */
export function resolvePoolConfig(env: Env): DbPoolConfig {
  const pool = {} as DbPoolConfig;
  for (const setting of POOL_SETTINGS) {
    const raw = env[setting.env];
    if (raw === undefined || raw.trim() === "") {
      pool[setting.key] = setting.fallback;
      continue;
    }
    const value = Number(raw);
    if (!/^\d+$/.test(raw.trim()) || value < setting.min || value > setting.max) {
      throw new Error(
        `${setting.env} must be a whole number from ${setting.min} to ${setting.max}`,
      );
    }
    pool[setting.key] = value;
  }
  if (pool.lockTimeoutMillis >= pool.statementTimeoutMillis) {
    // Otherwise a lock wait is reported as a statement timeout and the lock limit never applies.
    throw new Error("DB_LOCK_TIMEOUT_MS must be lower than DB_STATEMENT_TIMEOUT_MS");
  }
  return pool;
}

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const LOCAL_DEFAULT = "postgres";

/** Strict unless NODE_ENV is explicitly development or test; unset is strict. */
export function isStrictEnv(env: Env): boolean {
  return env.NODE_ENV !== "development" && env.NODE_ENV !== "test";
}

function isLocalHost(hostname: string): boolean {
  return LOCAL_HOSTS.has(hostname.replace(/^\[|\]$/g, "").toLowerCase());
}

function parseUrlHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    // Deliberately drop the cause: URL parse errors can echo the input.
    throw new Error("DATABASE_URL is not a valid connection URL");
  }
}

function resolveConnection(
  env: Env,
  strict: boolean,
): { connection: DbConfig["connection"]; hostname: string } {
  if (env.DATABASE_URL) {
    return { connection: { url: env.DATABASE_URL }, hostname: parseUrlHostname(env.DATABASE_URL) };
  }

  if (strict) {
    if (!env.DB_HOST) {
      throw new Error("DATABASE_URL must be set (or DB_HOST, DB_USER, DB_PASSWORD and DB_NAME)");
    }
    for (const name of ["DB_USER", "DB_NAME"] as const) {
      if (!env[name]) {
        throw new Error(`${name} must be set when DB_HOST is used`);
      }
    }
    if (!env.DB_PASSWORD || env.DB_PASSWORD === LOCAL_DEFAULT) {
      throw new Error("DB_PASSWORD must be set to a non-default value");
    }
  }

  const host = env.DB_HOST || "localhost";
  const port = env.DB_PORT ? Number(env.DB_PORT) : 5432;
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("DB_PORT must be a valid port number");
  }
  return {
    connection: {
      host,
      port,
      username: env.DB_USER || LOCAL_DEFAULT,
      password: env.DB_PASSWORD || LOCAL_DEFAULT,
      database: env.DB_NAME || LOCAL_DEFAULT,
    },
    hostname: host,
  };
}

/**
 * Resolves database configuration at boot. Pure: env is a parameter. Fails
 * closed in strict environments. Error messages name variables only, never values.
 */
export function resolveDbConfig(env: Env): DbConfig {
  const strict = isStrictEnv(env);
  const warnings: string[] = [];

  const { connection, hostname } = resolveConnection(env, strict);

  let ssl: DbConfig["ssl"];
  const mode = env.DB_SSL;
  if (mode === undefined || mode === "" || mode === "true") {
    const useTls = mode === "true" || !isLocalHost(hostname);
    ssl = useTls ? { rejectUnauthorized: true } : false;
  } else if (mode === "false") {
    ssl = false;
    if (!isLocalHost(hostname)) {
      warnings.push("DB_SSL=false disables TLS for a remote database; traffic is unencrypted");
    }
  } else if (mode === "no-verify") {
    ssl = { rejectUnauthorized: false };
    warnings.push("DB_SSL=no-verify disables TLS certificate verification");
  } else {
    throw new Error("DB_SSL must be one of: true, false, no-verify");
  }
  if (ssl && env.DB_SSL_CA) {
    ssl.ca = env.DB_SSL_CA;
  }

  if (env.DB_SYNCHRONIZE === "true" && strict) {
    throw new Error("DB_SYNCHRONIZE=true is not permitted outside development and test");
  }

  return {
    connection,
    ssl,
    synchronize: env.DB_SYNCHRONIZE === "true" && !strict,
    migrationsRun: strict,
    pool: resolvePoolConfig(env),
    warnings,
  };
}
