import { DataSource } from "typeorm";
import { assertSafeTestDatabase } from "../../src/testing/assertSafeTestDatabase";

/**
 * Used by the setup file of the backend "db" Vitest project (per-worker-database.setup.mts,
 * vitest.config.ts, E41 P2).
 *
 * The real-Postgres specs each reset the schema of TEST_DATABASE_URL, so two of them must never
 * share one database at the same time. Rather than run them one at a time, each Vitest worker gets
 * a database of its own on the same local server: "<name>_w<worker>", created on first use. Files
 * in one worker still run one after another against that worker's database, exactly as they did
 * against the one shared database, so nothing about what a spec sees changes except that no other
 * spec is writing to it. This adds isolation; it removes none.
 *
 * The base URL passes the same safety check the specs use (local host, a test-named database), and
 * the derived name keeps the "test" word, so the specs' own check passes on it too.
 */
export function workerDatabaseName(baseName: string, poolId: string): string {
  if (!/^[A-Za-z0-9_-]+$/.test(baseName)) {
    throw new Error("TEST_DATABASE_URL database name must be letters, digits, _ or -");
  }
  if (!/^\d+$/.test(poolId)) throw new Error("VITEST_POOL_ID must be a whole number");
  const name = `${baseName}_w${poolId}`;
  // Postgres cuts names at 63 bytes; two cut names could be the same database.
  if (Buffer.byteLength(name) > 63) throw new Error("TEST_DATABASE_URL database name is too long");
  return name;
}

export function workerDatabaseUrl(baseUrl: string, poolId: string): string {
  const url = new URL(baseUrl);
  url.pathname = `/${workerDatabaseName(decodeURIComponent(url.pathname.slice(1)), poolId)}`;
  return url.toString();
}

const DUPLICATE_DATABASE = "42P04";
const TEMPLATE_IN_USE = "55006";

async function ensureDatabase(baseUrl: string, name: string): Promise<void> {
  for (let attempt = 1; ; attempt++) {
    const ds = new DataSource({ type: "postgres", url: baseUrl, entities: [], migrations: [] });
    await ds.initialize();
    const runner = ds.createQueryRunner();
    try {
      // TypeORM checks pg_database first and quotes the name itself.
      await runner.createDatabase(name, true);
      return;
    } catch (error) {
      const code =
        (error as { code?: string; driverError?: { code?: string } }).driverError?.code ??
        (error as { code?: string }).code;
      if (code === DUPLICATE_DATABASE) return;
      // Two workers creating their databases at once can briefly find the template busy.
      if (code !== TEMPLATE_IN_USE || attempt >= 5) throw error;
      await new Promise((resolve) => setTimeout(resolve, 200 * attempt));
    } finally {
      await runner.release();
      await ds.destroy();
    }
  }
}

/**
 * Points TEST_DATABASE_URL at this worker's own database, creating it if needed. Does nothing
 * without a database URL (the specs then skip, or fail at collection under REQUIRE_DB_TESTS=1).
 */
export async function setUpWorkerDatabase(env: NodeJS.ProcessEnv = process.env): Promise<void> {
  // The URL as first given, so a worker that runs several files never derives from a derived name.
  const base = env.TEST_DATABASE_URL_BEFORE_WORKER ?? env.TEST_DATABASE_URL;
  const poolId = env.VITEST_POOL_ID;
  if (!base) return;
  // Without a worker id every worker would share the one database: refuse rather than race.
  if (!poolId)
    throw new Error("VITEST_POOL_ID is not set; cannot give this worker its own database");
  assertSafeTestDatabase(base, env);
  const derived = workerDatabaseUrl(base, poolId);
  await ensureDatabase(base, decodeURIComponent(new URL(derived).pathname.slice(1)));
  env.TEST_DATABASE_URL_BEFORE_WORKER = base;
  env.TEST_DATABASE_URL = derived;
}
