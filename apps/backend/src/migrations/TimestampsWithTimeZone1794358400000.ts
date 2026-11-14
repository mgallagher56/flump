import type { MigrationInterface, QueryRunner } from "typeorm";
import { takeMigrationLock } from "../config/migration-lock";

// BE-08 (backend audit 2026-11, finding M5): every timestamp column was `timestamp` (without time
// zone), so its meaning depended on Node and Postgres both running in UTC. BE-02 pinned TZ=UTC
// and the connection time zone; this converts each column to `timestamptz`, reading the stored
// wall-clock values as UTC (which is what they are under that pin), the same as
// `USING col AT TIME ZONE 'UTC'`.
//
// With the session time zone set to UTC (SET LOCAL below), Postgres 12+ treats
// timestamp -> timestamptz as binary-coercible: no table rewrite and no index rebuild, only a
// brief ACCESS EXCLUSIVE lock per table to change the catalogue. lock_timeout makes the migration
// fail fast rather than queue behind a long transaction (and stall readers behind it). A column
// that is already timestamptz (a synchronize-built database) is skipped. down() converts back
// the same way, reading each instant as UTC wall-clock time.
//
// table-laws.spec.ts fails on any entity column declared without a time zone, so a new one cannot
// reintroduce the problem.
export const TIMESTAMP_COLUMNS = [
  ["account_details", "updated_at"],
  ["accounts", "created_at"],
  ["agent_audit_events", "created_at"],
  ["bank_connections", "created_at"],
  ["bank_connections", "expires_at"],
  ["bank_connections", "last_synced_at"],
  ["bank_connections", "updated_at"],
  ["budget_entries", "created_at"],
  ["budget_entries", "updated_at"],
  ["import_batches", "committed_at"],
  ["import_batches", "created_at"],
  ["import_batches", "expires_at"],
  ["import_batches", "reverted_at"],
  ["import_batches", "updated_at"],
  ["mcp_tokens", "created_at"],
  ["mcp_tokens", "expires_at"],
  ["mcp_tokens", "last_used_at"],
  ["mcp_tokens", "revoked_at"],
  ["snapshot_checkins", "completed_at"],
  ["tax_records", "created_at"],
  ["tax_records", "updated_at"],
  ["transactions", "timestamp"],
  ["user_profiles", "created_at"],
  ["user_profiles", "updated_at"],
] as const;

export class TimestampsWithTimeZone1794358400000 implements MigrationInterface {
  name = "TimestampsWithTimeZone1794358400000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await convert(queryRunner, "timestamp without time zone", "timestamptz");
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await convert(queryRunner, "timestamp with time zone", "timestamp");
  }
}

async function convert(queryRunner: QueryRunner, from: string, to: string): Promise<void> {
  await takeMigrationLock(queryRunner);
  await queryRunner.query("SET LOCAL lock_timeout = '10s'");
  await queryRunner.query("SET LOCAL timezone = 'UTC'");
  const rows: Array<{ table_name: string; column_name: string }> = await queryRunner.query(
    `SELECT table_name, column_name FROM information_schema.columns
     WHERE table_schema = current_schema() AND data_type = $1`,
    [from],
  );
  const present = new Set(rows.map((r) => `${r.table_name}.${r.column_name}`));
  const byTable = new Map<string, string[]>();
  for (const [table, column] of TIMESTAMP_COLUMNS) {
    if (!present.has(`${table}.${column}`)) continue;
    byTable.set(table, [...(byTable.get(table) ?? []), column]);
  }
  for (const [table, columns] of byTable) {
    // One ALTER per table, so each table is locked once. No USING clause on purpose: the
    // implicit cast reads the values in the session time zone (UTC, set above), which equals
    // `USING col AT TIME ZONE 'UTC'`, and only the plain cast lets Postgres skip the rewrite.
    const clauses = columns.map((c) => `ALTER COLUMN "${c}" TYPE ${to}`);
    await queryRunner.query(`ALTER TABLE "${table}" ${clauses.join(", ")}`);
  }
}
