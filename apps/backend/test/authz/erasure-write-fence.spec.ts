import "reflect-metadata";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { BudgetEntry } from "../../src/entities/budget-entry.entity";
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
 * passed the AuthGuard while an erasure of the same user was under way is refused with 410 once
 * the erasure has finished, and leaves no row. The unit-level twin is
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

  it("refuses a write racing a finishing erasure with 410 and leaves no row", async () => {
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

    // The racing request: no tombstone yet, so the AuthGuard lets it through. Its transaction
    // queues for the shared lock behind the erasure.
    const racing = h
      .call("post", "/budget-entries", h.tokens.a, { category: "food", name: "racer", amount: 1 })
      .then((res) => res);
    await lockWaiters(2);

    // The in-flight write ends: the erasure takes the lock, sweeps, commits the tombstone and
    // finishes; only then does the racing request get its lock and recheck the tombstone.
    releaseInFlight();
    await inFlight;
    // identity_pending: the harness has no WorkOS, so step (c) fails after the data is gone.
    await expect(erasure).resolves.toEqual({ status: "identity_pending" });
    const res = await racing;
    expect(res.status).toBe(410);
    expect(await budgetRows()).toBe(0);
  });
});
