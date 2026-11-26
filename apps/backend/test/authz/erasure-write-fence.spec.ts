import "reflect-metadata";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { BudgetEntry } from "../../src/entities/budget-entry.entity";
import { WellbeingAnswer } from "../../src/entities/wellbeing-answer.entity";
import { AccountDeletionService } from "../../src/modules/privacy/account-deletion.service";
import { resolveDbTestMode } from "../../src/testing/dbTestMode";
import { type AuthzHarness, bootAuthzHarness, truncateAll, USER_A } from "./support";

// Migrations run on boot; see support.ts.
vi.mock("../../src/config/typeorm.options", async (importOriginal) =>
  (await import("./support.js")).withMigrations(await importOriginal()),
);

/**
 * Privacy finding F1 through the whole chain: the real AppModule (AuthGuard, the write-fence
 * interceptor, the budget service, TypeORM) on real Postgres, with nothing stubbed. A write that
 * passes the AuthGuard while an erasure of the same user is under way is refused (503), its retry
 * after the erasure is refused (410), and no row is left. The unit-level twin is
 * src/modules/privacy/user-data-write-fence.integration.spec.ts.
 */
const dbMode = resolveDbTestMode(process.env);

describe.skipIf(dbMode === "skip")("erasure write fence end to end (real Postgres)", () => {
  let h: AuthzHarness;

  beforeAll(async () => {
    h = await bootAuthzHarness();
  }, 60_000);

  afterAll(async () => {
    await h?.close();
  });

  beforeEach(async () => {
    await truncateAll(h.dataSource);
    await h.resetRateLimits();
    deletion().clearErasedCache();
  });

  const deletion = () => h.app.get(AccountDeletionService);
  const budgetRows = () => h.dataSource.getRepository(BudgetEntry).countBy({ userId: USER_A });
  const wellbeingRows = () =>
    h.dataSource.getRepository(WellbeingAnswer).countBy({ userId: USER_A });

  /** Holds A's shared user-data lock in a transaction, as a fenced write in flight does. */
  const holdUserDataLock = async () => {
    let release!: () => void;
    const released = new Promise<void>((r) => {
      release = r;
    });
    let holding!: () => void;
    const held = new Promise<void>((r) => {
      holding = r;
    });
    const done = h.dataSource.transaction(async (m) => {
      await m.query("SELECT pg_advisory_xact_lock_shared(hashtextextended($1, 0))", [
        `user-data:${USER_A}`,
      ]);
      holding();
      await released;
    });
    await held;
    return { release, done };
  };

  /** Resolves once `n` backends of this database wait for an advisory lock. */
  const lockWaiters = async (n: number) => {
    for (let i = 0; i < 500; i++) {
      const [row] = (await h.dataSource.query(
        `SELECT count(*)::int AS n FROM pg_locks
         WHERE locktype = 'advisory' AND NOT granted
           AND database = (SELECT oid FROM pg_database WHERE datname = current_database())`,
      )) as Array<{ n: number }>;
      if ((row?.n ?? 0) >= n) return;
      await new Promise((r) => setTimeout(r, 10));
    }
    throw new Error(`fewer than ${n} backends waited for the user-data lock`);
  };

  it("refuses a write racing an erasure, then its retry, and leaves no row", async () => {
    const before = await h.call("post", "/budget-entries", h.tokens.a, {
      category: "housing",
      name: "before",
      amount: 900,
    });
    expect(before.status).toBe(201);

    // A write of A's already in flight holds the shared user-data lock (as a fenced transaction
    // does), so the erasure queues for the exclusive lock in step (b).
    let releaseInFlight!: () => void;
    const inFlightReleased = new Promise<void>((r) => {
      releaseInFlight = r;
    });
    let holding!: () => void;
    const held = new Promise<void>((r) => {
      holding = r;
    });
    const inFlight = h.dataSource.transaction(async (m) => {
      await m.query("SELECT pg_advisory_xact_lock_shared(hashtextextended($1, 0))", [
        `user-data:${USER_A}`,
      ]);
      holding();
      await inFlightReleased;
    });
    await held;
    const erasure = deletion().deleteAccount(USER_A);
    await lockWaiters(1);

    // The racing request: no tombstone yet, so the AuthGuard lets it through. The erasure is
    // waiting for the lock, so the request's transaction is refused at once (503, try again)
    // instead of holding a connection while it waits, and nothing is written.
    const racing = await h.call("post", "/budget-entries", h.tokens.a, {
      category: "food",
      name: "racer",
      amount: 1,
    });
    expect(racing.status).toBe(503);
    expect(racing.body).toMatchObject({ code: "service_unavailable" });
    await lockWaiters(1);

    // The in-flight write ends: the erasure takes the lock, sweeps, commits the tombstone and
    // finishes. The client's retry then meets the tombstone at the AuthGuard (410).
    releaseInFlight();
    await inFlight;
    // identity_pending: the harness has no WorkOS, so step (c) fails after the data is gone.
    await expect(erasure).resolves.toEqual({ status: "identity_pending" });
    const retry = await h.call("post", "/budget-entries", h.tokens.a, {
      category: "food",
      name: "racer",
      amount: 1,
    });
    expect(retry.status).toBe(410);
    expect(await budgetRows()).toBe(0);
  });

  it("refuses a wellbeing answer racing an erasure, then its retry, and leaves no row (E35 W5)", async () => {
    // The route's insert runs in dataSource.transaction inside a signed-in request, so the
    // global fence (UserDataWriteFenceInterceptor and its subscriber) applies with no call of its own.
    const answer = { feeling: "more_worried", worseText: "Sample text for the race test." };
    const inFlight = await holdUserDataLock();
    const erasure = deletion().deleteAccount(USER_A);
    await lockWaiters(1);

    const racing = await h.call("post", "/snapshots/wellbeing-questions", h.tokens.a, answer);
    expect(racing.status).toBe(503);
    expect(racing.body).toMatchObject({ code: "service_unavailable" });

    inFlight.release();
    await inFlight.done;
    await expect(erasure).resolves.toEqual({ status: "identity_pending" });
    const retry = await h.call("post", "/snapshots/wellbeing-questions", h.tokens.a, answer);
    expect(retry.status).toBe(410);
    expect(await wellbeingRows()).toBe(0);
  });
});
