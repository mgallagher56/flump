import type { MigrationInterface, QueryRunner } from "typeorm";
import { convertTimestampColumns } from "../integrity/timestamp-columns";

// BE-08 (backend audit 2026-11, finding M5): every timestamp column was `timestamp` (without time
// zone), so its meaning depended on Node and Postgres both running in UTC. BE-02 pinned TZ=UTC
// and the connection time zone; this converts each column to `timestamptz`, reading the stored
// wall-clock values as UTC (which is what they are under that pin), the same as
// `USING col AT TIME ZONE 'UTC'`.
//
// With the session time zone set to UTC (SET LOCAL below), Postgres 12+ treats
// timestamp -> timestamptz as binary-coercible: no table rewrite, only a brief ACCESS
// EXCLUSIVE lock per table to change the catalogue. Indexes on a converted column may still be
// rebuilt (the operator class differs); the tables are small, so that is quick. lock_timeout makes the migration
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

export class TimestampsWithTimeZone1794358500000 implements MigrationInterface {
  name = "TimestampsWithTimeZone1794358500000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await convertTimestampColumns(
      queryRunner,
      TIMESTAMP_COLUMNS,
      "timestamp without time zone",
      "timestamptz",
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await convertTimestampColumns(
      queryRunner,
      TIMESTAMP_COLUMNS,
      "timestamp with time zone",
      "timestamp",
    );
  }
}
