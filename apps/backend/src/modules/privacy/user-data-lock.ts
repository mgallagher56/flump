import type { EntityManager } from "typeorm";

/** The statement that serialises a user's reset and erasure. Exported so tests can match it. */
export const DATA_LOCK_STATEMENT = "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))";

/**
 * Takes the transaction-scoped advisory lock on one user's data. The financial-data reset and
 * the account erasure both take it as their first statement, so they never interleave: a reset
 * that starts while an erasure is running waits for it to commit, then sees the tombstone and
 * refuses, rather than recreating a profile row the erasure has just deleted. The lock is
 * released when the transaction ends.
 */
export async function lockUserData(manager: EntityManager, userId: string): Promise<void> {
  // Namespaced like the other per-user locks (`terms:`, `imports:`).
  await manager.query(DATA_LOCK_STATEMENT, [`user-data:${userId}`]);
}
