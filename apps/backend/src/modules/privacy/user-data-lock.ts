import { AsyncLocalStorage } from "node:async_hooks";
import type { EntityManager } from "typeorm";

/** The statement that serialises a user's reset and erasure. Exported so tests can match it. */
export const DATA_LOCK_STATEMENT = "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))";

/** The shared form of the same lock, taken by every write of a signed-in request (the write fence). */
export const SHARED_DATA_LOCK_STATEMENT =
  "SELECT pg_advisory_xact_lock_shared(hashtextextended($1, 0))";

// Namespaced like the other per-user locks (`terms:`, `imports:`).
const lockKey = (userId: string) => `user-data:${userId}`;

/**
 * Whose request the current code runs for. Set by UserDataWriteFenceInterceptor around every
 * signed-in request; `exempt` inside withoutWriteFence. Outside a request (jobs, boot, tests that
 * call services directly) there is no store and the fence does nothing.
 */
type FenceContext = { userId: string } | { exempt: true };
const fenceContext = new AsyncLocalStorage<FenceContext>();

/** Runs `fn` as part of a signed-in request of `userId`: its transactions take the write fence. */
export function runAsUserRequest<T>(userId: string, fn: () => T): T {
  return fenceContext.run({ userId }, fn);
}

/**
 * Runs `fn` without the write fence. Only for code that takes the exclusive lockUserData itself and
 * checks the tombstone inside it (the erasure and the reset), or that cannot write (the export's
 * read-only transaction).
 */
export function withoutWriteFence<T>(fn: () => T): T {
  return fenceContext.run({ exempt: true }, fn);
}

/** The user whose writes must take the fence here, or null when there is none. */
export function fencedUserId(): string | null {
  const store = fenceContext.getStore();
  return store && "userId" in store ? store.userId : null;
}

/**
 * Takes the transaction-scoped advisory lock on one user's data. The financial-data reset and
 * the account erasure both take it as their first statement, so they never interleave: a reset
 * that starts while an erasure is running waits for it to commit, then sees the tombstone and
 * refuses, rather than recreating a profile row the erasure has just deleted. Every write of a
 * signed-in request takes the shared form (UserDataWriteFence), so the erasure also waits for
 * writes in flight and a write that waited sees the tombstone. The lock is released when the
 * transaction ends.
 */
export async function lockUserData(manager: EntityManager, userId: string): Promise<void> {
  // A transaction that already holds the shared lock would deadlock against another one asking
  // for the exclusive lock (each waits for the other's shared lock). Callers run withoutWriteFence.
  if (fencedUserId() !== null) {
    throw new Error("lockUserData needs withoutWriteFence: the write fence holds the shared lock");
  }
  await manager.query(DATA_LOCK_STATEMENT, [lockKey(userId)]);
}

/** The shared lock: many writes of one user hold it at once; it waits only for an erasure or reset. */
export async function lockUserDataShared(manager: EntityManager, userId: string): Promise<void> {
  await manager.query(SHARED_DATA_LOCK_STATEMENT, [lockKey(userId)]);
}
