import { AsyncLocalStorage } from "node:async_hooks";
import type { EntityManager } from "typeorm";

/** The statement that serialises a user's reset and erasure. Exported so tests can match it. */
export const DATA_LOCK_STATEMENT = "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))";

/** Sets lockUserData's own lock and statement limits for the transaction. Exported for tests. */
export const DATA_LOCK_WAIT_STATEMENT =
  "SELECT set_config('lock_timeout', $1, true), set_config('statement_timeout', $2, true)";

/** Puts both limits back to the connection's own values (the pool's). Exported for tests. */
export const DATA_LOCK_WAIT_RESET_STATEMENT = `SELECT set_config(name, reset_val, true) FROM pg_settings
     WHERE name IN ('lock_timeout', 'statement_timeout')`;

/** The shared form of the same lock, taken by every write of a signed-in request (the write fence). */
const SHARED_DATA_LOCK_STATEMENT = "SELECT pg_advisory_xact_lock_shared(hashtextextended($1, 0))";

// Namespaced like the other per-user locks (`terms:`, `imports:`).
const lockKey = (userId: string) => `user-data:${userId}`;

/**
 * Whose request the current code runs for. Set by UserDataWriteFenceInterceptor around every
 * signed-in request; `exempt` inside withoutWriteFence. Outside a request (jobs, boot, tests that
 * call services directly) there is no store and the fence does nothing.
 */
/** `held`: transactions of this request that hold the fence right now. */
export type FencedRequest = { userId: string; held: number };
type FenceContext = FencedRequest | { exempt: true };
const fenceContext = new AsyncLocalStorage<FenceContext>();

/** Runs `fn` as part of a signed-in request of `userId`: its transactions take the write fence. */
export function runAsUserRequest<T>(userId: string, fn: () => T): T {
  return fenceContext.run({ userId, held: 0 }, fn);
}

/**
 * Runs `fn` without the write fence. Only for code that takes the exclusive lockUserData itself and
 * checks the tombstone inside it (the erasure and the reset), or that cannot write (the export's
 * read-only transaction).
 */
export function withoutWriteFence<T>(fn: () => T): T {
  // Inside an open fenced transaction of the same request, the exclusive lock taken here would wait
  // for that transaction's shared lock, which waits for this code: refuse instead of deadlocking.
  if ((fencedRequest()?.held ?? 0) > 0) {
    throw new Error("withoutWriteFence inside an open fenced transaction of the same request");
  }
  return fenceContext.run({ exempt: true }, fn);
}

/** The signed-in request whose writes must take the fence here, or null when there is none. */
export function fencedRequest(): FencedRequest | null {
  const store = fenceContext.getStore();
  return store && "userId" in store ? store : null;
}

/**
 * Takes the transaction-scoped advisory lock on one user's data. The financial-data reset and
 * the account erasure both take it as their first statement, so they never interleave: a reset
 * that starts while an erasure is running waits for it to commit, then sees the tombstone and
 * refuses, rather than recreating a profile row the erasure has just deleted. Every write of a
 * signed-in request takes the shared form (UserDataWriteFence), so the erasure also waits for
 * writes in flight and a write that waited sees the tombstone. The lock is released when the
 * transaction ends.
 *
 * `waitMs` is a test seam; callers leave the default.
 */
export async function lockUserData(
  manager: EntityManager,
  userId: string,
  waitMs: number = USER_DATA_LOCK_WAIT_MS,
): Promise<void> {
  // A transaction that already holds the shared lock would deadlock against another one asking
  // for the exclusive lock (each waits for the other's shared lock). Callers run withoutWriteFence.
  if (fencedRequest() !== null) {
    throw new Error("lockUserData needs withoutWriteFence: the write fence holds the shared lock");
  }
  // Transaction-local (is_local = true), so they end with the transaction even if the lock fails.
  // The statement limit sits above the lock limit, or the wait would end as a statement timeout.
  await manager.query(DATA_LOCK_WAIT_STATEMENT, [
    String(waitMs),
    String(waitMs + LOCK_STATEMENT_HEADROOM_MS),
  ]);
  await manager.query(DATA_LOCK_STATEMENT, [lockKey(userId)]);
  // Back to the pool's limits (the connection's reset values) for the rest of the transaction.
  await manager.query(DATA_LOCK_WAIT_RESET_STATEMENT);
}

/**
 * How long the erasure and the reset wait for lockUserData: 30 s, not the pool's 5 s lock_timeout.
 * What they wait for is the user's own fenced transactions (the shared lock) or the other one of
 * the pair. Each statement of those is capped at the pool's statement_timeout (10 s) and each idle
 * gap at idle_in_transaction_session_timeout (30 s), but a transaction of several statements, a
 * large import say, can hold the lock past 5 s, and the erasure then failed for no fault of the
 * person's. 30 s covers that common case. It does not cover a stuck transaction: one that is idle
 * after a long statement can hold the lock about 40 s, and one that keeps doing a little has no
 * overall cap; the erasure then fails as before, and the person can try again. The cost of
 * waiting: the user's new writes are refused with 503 meanwhile (UserDataWriteFence tries the
 * shared lock without waiting, so they hold no connection), which is acceptable while a person
 * is erasing or resetting their data.
 */
export const USER_DATA_LOCK_WAIT_MS = 30_000;

/** How far the statement limit sits above the lock wait while the lock is taken. */
const LOCK_STATEMENT_HEADROOM_MS = 5_000;

/** The shared lock: many writes of one user hold it at once; it waits only for an erasure or reset. */
export async function lockUserDataShared(manager: EntityManager, userId: string): Promise<void> {
  await manager.query(SHARED_DATA_LOCK_STATEMENT, [lockKey(userId)]);
}

/**
 * The shared lock without waiting: false while an erasure or reset holds the exclusive lock or waits
 * for it (Postgres refuses a shared request that conflicts with a queued exclusive one too). Shared
 * holders never block each other, so a user's own writes always get it at once.
 */
export async function tryLockUserDataShared(
  manager: EntityManager,
  userId: string,
): Promise<boolean> {
  const [row] = (await manager.query(
    `SELECT pg_try_advisory_xact_lock_shared(hashtextextended($1, 0)) AS "locked"`,
    [lockKey(userId)],
  )) as Array<{ locked: boolean }>;
  return row?.locked === true;
}
