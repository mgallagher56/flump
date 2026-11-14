import type { QueryRunner } from "typeorm";

// Postgres advisory-lock key shared by every migration that must not run concurrently
// across instances (taken with pg_advisory_xact_lock inside the migration transaction).
export const MIGRATION_LOCK_KEY = "1794355200000";

/**
 * Takes the shared migration lock inside the migration's transaction, first lifting the pool's
 * statement and lock timeouts for that transaction only (SET LOCAL). Without that, a second
 * instance booting during a rolling deploy would give up on the advisory lock after the pool's
 * lock_timeout and crash, and a data migration on a large table would hit statement_timeout.
 * Every migration after AddUserIdIndexes1794357420000 must use this (or the session form
 * below) instead of calling pg_advisory_xact_lock directly; migration-files.spec.ts enforces it.
 */
export async function takeMigrationLock(queryRunner: QueryRunner): Promise<void> {
  await queryRunner.query("SET LOCAL statement_timeout = 0");
  await queryRunner.query("SET LOCAL lock_timeout = 0");
  await queryRunner.query("SELECT pg_advisory_xact_lock($1)", [MIGRATION_LOCK_KEY]);
}

/**
 * For a migration with `transaction = false`: lifts the timeouts for the session, takes the
 * session-level lock, runs `body`, then always unlocks before restoring the timeouts (RESET
 * returns to the connection's startup values, the pool's limits). The unlock comes first so a
 * failing RESET can never return a connection to the pool still holding the lock.
 */
export async function withSessionMigrationLock(
  queryRunner: QueryRunner,
  body: () => Promise<void>,
): Promise<void> {
  await queryRunner.query("SET statement_timeout = 0");
  await queryRunner.query("SET lock_timeout = 0");
  try {
    await queryRunner.query("SELECT pg_advisory_lock($1)", [MIGRATION_LOCK_KEY]);
    try {
      await body();
    } finally {
      await queryRunner.query("SELECT pg_advisory_unlock($1)", [MIGRATION_LOCK_KEY]);
    }
  } finally {
    await queryRunner.query("RESET statement_timeout");
    await queryRunner.query("RESET lock_timeout");
  }
}
