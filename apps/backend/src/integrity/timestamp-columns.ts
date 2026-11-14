import type { QueryRunner } from "typeorm";
import { takeMigrationLock } from "../config/migration-lock";

// Shared by the timestamptz migrations (BE-08, audit M5). It lives outside migrations/ because
// TypeORM loads every exported function in a migration file as a migration.

/** Converts the listed columns that currently have type `from` to `to`, one ALTER per table. */
export async function convertTimestampColumns(
  queryRunner: QueryRunner,
  columnsToConvert: ReadonlyArray<readonly [string, string]>,
  from: string,
  to: string,
): Promise<void> {
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
  for (const [table, column] of columnsToConvert) {
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
