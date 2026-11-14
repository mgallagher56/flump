// Shared helpers for the DB-backed ops tests (not a test file itself).
//
// Runs against the throwaway database in TEST_DATABASE_URL only. psql is run through the PSQL
// environment variable when set (a command, e.g. a wrapper), else a local `psql` (present on
// GitHub's ubuntu runners), else
// `docker exec -i $E18_PG_CONTAINER psql` (default container e18-a01-pg) so the tests work on
// machines without libpq.
import type { Client } from "pg";
import { assertSafeTestDatabase } from "../../apps/backend/src/testing/assertSafeTestDatabase";
import { resolveDbTestMode } from "../../apps/backend/src/testing/dbTestMode";

// Read through a local alias: these are test-only variables, not Turborepo task inputs.
const env: Record<string, string | undefined> = process.env;

export const TEST_DATABASE_URL = env.TEST_DATABASE_URL;

// Throws at import (so collection fails) when REQUIRE_DB_TESTS=1 but TEST_DATABASE_URL is
// missing, instead of silently skipping the real-Postgres suites (same rule as the backend).
export const DB_TESTS_ENABLED = resolveDbTestMode(env) === "run";

export function guardTestDatabase(): string {
  if (!TEST_DATABASE_URL) throw new Error("TEST_DATABASE_URL is not set");
  // Local host only and a database name containing "test"; throws otherwise.
  assertSafeTestDatabase(TEST_DATABASE_URL, process.env);
  return TEST_DATABASE_URL;
}

export async function withClient<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  // pg is only installed under apps/backend (workspace-isolated), and importing it lazily keeps
  // these files loadable, and the tests skippable, where TEST_DATABASE_URL is unset.
  const { Client: PgClient } = (await import("../../apps/backend/node_modules/pg")) as {
    Client: new (config: { connectionString: string }) => Client;
  };
  const client = new PgClient({ connectionString: guardTestDatabase() });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

// Just enough of TypeORM's QueryRunner for the migrations under test.
export function pgQueryRunner(client: Client) {
  return {
    connection: {
      options: { migrationsTableName: "migrations" },
      driver: { escape: (name: string) => `"${name}"` },
    },
    async query(sql: string, params?: unknown[]) {
      return (await client.query(sql, params as unknown[])).rows;
    },
    async hasTable(name: string) {
      const result = await client.query(
        "SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1",
        [name],
      );
      return result.rowCount === 1;
    },
  };
}

export async function runInTransaction(
  client: Client,
  migration: { up: (qr: never) => Promise<void>; transaction?: boolean },
): Promise<void> {
  // Like TypeORM: a migration that sets `transaction = false` (CREATE INDEX CONCURRENTLY) runs bare.
  if (migration.transaction === false) {
    await migration.up(pgQueryRunner(client) as never);
    return;
  }
  await client.query("BEGIN");
  try {
    await migration.up(pgQueryRunner(client) as never);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

export async function resetSchema(client: Client): Promise<void> {
  await client.query("DROP SCHEMA public CASCADE");
  await client.query("CREATE SCHEMA public");
  await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
}

export interface PsqlResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export function runPsql(sql: string, vars: Record<string, string> = {}): PsqlResult {
  const url = guardTestDatabase();
  const database = decodeURIComponent(new URL(url).pathname.replace(/^\//, ""));
  const varArgs = Object.entries(vars).flatMap(([key, value]) => ["-v", `${key}=${value}`]);
  const tail = ["-X", ...varArgs, "-f", "-"];

  let command: string[];
  if (env.PSQL) {
    command = [...env.PSQL.split(/\s+/).filter(Boolean), url, ...tail];
  } else if (Bun.which("psql")) {
    command = ["psql", url, ...tail];
  } else {
    const container = env.E18_PG_CONTAINER ?? "e18-a01-pg";
    command = [
      "docker",
      "exec",
      "-i",
      container,
      "psql",
      "-U",
      "postgres",
      "-d",
      database,
      ...tail,
    ];
  }

  const proc = Bun.spawnSync(command, {
    stdin: new TextEncoder().encode(sql),
    stdout: "pipe",
    stderr: "pipe",
  });
  return {
    exitCode: proc.exitCode ?? 1,
    stdout: proc.stdout.toString(),
    stderr: proc.stderr.toString(),
  };
}
