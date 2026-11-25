import "reflect-metadata";
import { GoneException, Logger, ServiceUnavailableException } from "@nestjs/common";
import { defer, lastValueFrom } from "rxjs";
import { DataSource, type DataSourceOptions } from "typeorm";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { typeOrmOptionsFromEnv } from "../../config/typeorm.options";
import { Account } from "../../entities/account.entity";
import { AccountDeletionTombstone } from "../../entities/account-deletion-tombstone.entity";
import { AccountDetail } from "../../entities/account-detail.entity";
import { BankConnection } from "../../entities/bank-connection.entity";
import { BudgetEntry } from "../../entities/budget-entry.entity";
import { UserProfile } from "../../entities/user-profile.entity";
import { InMemoryIdentityAdapter } from "../../identity/identity.adapter";
import { assertSafeTestDatabase } from "../../testing/assertSafeTestDatabase";
import { resolveDbTestMode } from "../../testing/dbTestMode";
import { discoverMigrations } from "../../testing/discoverMigrations";
import { emptyEntityTables } from "../../testing/emptyTables";
import { LoggingBankConsentRevoker } from "../banking/bank-consent-revoker";
import { UserProfileService } from "../profile/user-profile.service";
import { AccountDeletionService } from "./account-deletion.service";
import { AccountExportService } from "./account-export.service";
import { lockUserData } from "./user-data-lock";
import { UserDataWriteFence, UserDataWriteFenceInterceptor } from "./user-data-write-fence";

// Privacy finding F1 (.claude/skills/verify-account-erasure) on real Postgres: a request that passed
// the AuthGuard before the erasure's tombstone committed must not leave a row behind it. Drops the
// public schema: a throwaway database only.
//   TEST_DATABASE_URL=postgres://postgres:postgres@localhost:55432/flump_fence_test \
//     bunx vitest run src/modules/privacy/user-data-write-fence.integration.spec.ts
// Made-up ids, built at runtime.
const USER_A = ["fence", "person", "a"].join("-");
const USER_B = ["fence", "person", "b"].join("-");

describe.skipIf(resolveDbTestMode(process.env) === "skip")(
  "user-data write fence (real Postgres)",
  () => {
    let ds: DataSource;
    let deletion: AccountDeletionService;
    let fenceDeletion: AccountDeletionService;
    const savedNodeEnv = process.env.NODE_ENV;

    beforeAll(async () => {
      const url = process.env.TEST_DATABASE_URL as string;
      assertSafeTestDatabase(url, process.env);
      process.env.NODE_ENV = "test";
      const options = typeOrmOptionsFromEnv({ NODE_ENV: "test", DATABASE_URL: url });
      ds = new DataSource({
        ...(options as DataSourceOptions),
        migrations: await discoverMigrations(),
        synchronize: false,
        migrationsRun: false,
      });
      await ds.initialize();
      await ds.query("DROP SCHEMA public CASCADE");
      await ds.query("CREATE SCHEMA public");
      await ds.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
      await ds.runMigrations();
      // The fence reads tombstones through its own service, as another replica would: nothing it
      // knows comes from the erasing instance's in-process cache.
      fenceDeletion = new AccountDeletionService(
        ds,
        new InMemoryIdentityAdapter(),
        new LoggingBankConsentRevoker(),
      );
      new UserDataWriteFence(ds, fenceDeletion);
    }, 60_000);

    afterAll(async () => {
      process.env.NODE_ENV = savedNodeEnv;
      if (ds?.isInitialized) await ds.destroy();
    });

    beforeEach(async () => {
      await emptyEntityTables(ds);
      fenceDeletion.clearErasedCache();
      deletion = new AccountDeletionService(
        ds,
        new InMemoryIdentityAdapter(),
        new LoggingBankConsentRevoker(),
      );
      vi.spyOn(Logger.prototype, "log").mockImplementation(() => undefined);
      vi.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    /** Runs `handler` as a signed-in request of `userId` that has already passed the AuthGuard. */
    const asRequest = <T>(userId: string, handler: () => Promise<T>): Promise<T> => {
      const context = {
        getType: () => "http",
        switchToHttp: () => ({ getRequest: () => ({ user: { id: userId } }) }),
      };
      return lastValueFrom(
        new UserDataWriteFenceInterceptor().intercept(context as never, {
          handle: () => defer(handler),
        }),
      ) as Promise<T>;
    };

    const budgetLine = (userId: string, name: string) =>
      ds.getRepository(BudgetEntry).create({ userId, category: "food", name, amount: 1 });

    const budgetRows = (userId: string) => ds.getRepository(BudgetEntry).countBy({ userId });

    /** Resolves once a backend is waiting for an advisory lock (the erasure behind a write). */
    const advisoryLockWaiter = async () => {
      for (let i = 0; i < 200; i++) {
        const [row] = (await ds.query(
          `SELECT count(*)::int AS n FROM pg_locks
           WHERE locktype = 'advisory' AND NOT granted
             AND database = (SELECT oid FROM pg_database WHERE datname = current_database())`,
        )) as Array<{ n: number }>;
        if ((row?.n ?? 0) > 0) return;
        await new Promise((r) => setTimeout(r, 10));
      }
      throw new Error("nothing waited for the user-data lock");
    };

    it("refuses a write that lands after the erasure finished, and leaves no row (F1)", async () => {
      await ds.getRepository(BudgetEntry).save(budgetLine(USER_A, "before"));
      let erased!: () => void;
      const erasureDone = new Promise<void>((r) => {
        erased = r;
      });
      // The request passed the AuthGuard (no tombstone yet); its handler writes only after the
      // erasure, straggler sweep included, has returned "deleted".
      const request = asRequest(USER_A, async () => {
        await erasureDone;
        return ds.getRepository(BudgetEntry).save(budgetLine(USER_A, "straggler"));
      });
      await expect(deletion.deleteAccount(USER_A)).resolves.toEqual({ status: "deleted" });
      erased();
      await expect(request).rejects.toBeInstanceOf(GoneException);
      expect(await budgetRows(USER_A)).toBe(0);
    });

    it("makes the erasure wait for a write in flight, then sweeps that write", async () => {
      let inserted!: () => void;
      const insertDone = new Promise<void>((r) => {
        inserted = r;
      });
      let release!: () => void;
      const released = new Promise<void>((r) => {
        release = r;
      });
      const request = asRequest(USER_A, () =>
        ds.transaction(async (m) => {
          await m.save(budgetLine(USER_A, "in flight"));
          inserted();
          await released;
        }),
      );
      await insertDone;
      let erasureSettled = false;
      const erasure = deletion.deleteAccount(USER_A).finally(() => {
        erasureSettled = true;
      });
      await advisoryLockWaiter();
      expect(erasureSettled).toBe(false);
      release();
      await request;
      await expect(erasure).resolves.toEqual({ status: "deleted" });
      expect(await budgetRows(USER_A)).toBe(0);
    });

    it("lets a user's own writes run side by side, and another user's erasure never blocks them", async () => {
      let release!: () => void;
      const released = new Promise<void>((r) => {
        release = r;
      });
      let first!: () => void;
      const firstHolds = new Promise<void>((r) => {
        first = r;
      });
      const holding = asRequest(USER_A, () =>
        ds.transaction(async (m) => {
          await m.save(budgetLine(USER_A, "one"));
          first();
          await released;
        }),
      );
      await firstHolds;
      // Shared: a second write of the same user does not wait for the first.
      await asRequest(USER_A, () => ds.getRepository(BudgetEntry).save(budgetLine(USER_A, "two")));
      await expect(deletion.deleteAccount(USER_B)).resolves.toEqual({ status: "deleted" });
      release();
      await holding;
      expect(await budgetRows(USER_A)).toBe(2);
    });

    it("refuses an insert outside a transaction in a signed-in request", async () => {
      await expect(
        asRequest(USER_A, () =>
          ds.getRepository(BudgetEntry).insert({
            userId: USER_A,
            category: "food",
            name: "autocommit",
            amount: 1,
          }),
        ),
      ).rejects.toThrow(/outside a transaction/);
      expect(await budgetRows(USER_A)).toBe(0);
    });

    it("refuses an insert inside a WITH outside a transaction too", async () => {
      await expect(
        asRequest(USER_A, () =>
          ds.query(
            `WITH v AS (SELECT 1) INSERT INTO "budget_entries" ("user_id", "category", "name", "amount")
             SELECT $1, 'food', 'cte', 1 FROM v`,
            [USER_A],
          ),
        ),
      ).rejects.toThrow(/outside a transaction/);
      expect(await budgetRows(USER_A)).toBe(0);
    });

    it("refuses a write at once while the erasure waits, even one whose own request holds the lock", async () => {
      const gate = () => {
        let open!: () => void;
        const opened = new Promise<void>((r) => {
          open = r;
        });
        return { open, opened };
      };
      const firstHolds = gate();
      const erasureQueued = gate();
      const releaseFirst = gate();
      // One request: its first transaction holds the fence; the erasure (started outside the
      // request) queues behind it; then the same request opens a second transaction. Waiting there
      // would wait on itself.
      const request = asRequest(USER_A, async () => {
        const first = ds.transaction(async (m) => {
          await m.save(budgetLine(USER_A, "first"));
          firstHolds.open();
          await releaseFirst.opened;
        });
        await erasureQueued.opened;
        const started = Date.now();
        const second = await ds
          .getRepository(BudgetEntry)
          .save(budgetLine(USER_A, "second"))
          .then(
            () => "saved",
            (err: unknown) => err,
          );
        const waitedMs = Date.now() - started;
        releaseFirst.open();
        await first;
        return { second, waitedMs };
      });
      await firstHolds.opened;
      const erasure = deletion.deleteAccount(USER_A);
      await advisoryLockWaiter();
      erasureQueued.open();
      const { second, waitedMs } = await request;
      expect(second).toBeInstanceOf(ServiceUnavailableException);
      // Refused without waiting for a lock (the pool's lock_timeout is 5 s).
      expect(waitedMs).toBeLessThan(1_000);
      await expect(erasure).resolves.toEqual({ status: "deleted" });
      expect(await budgetRows(USER_A)).toBe(0);
    });

    it("refuses an update that sets a user column outside a transaction, and allows other updates", async () => {
      await ds.getRepository(BudgetEntry).save(budgetLine(USER_A, "moved?"));
      // Repository.update runs no transaction of its own.
      await expect(
        asRequest(USER_A, () =>
          ds.getRepository(BudgetEntry).update({ userId: USER_A }, { userId: USER_B }),
        ),
      ).rejects.toThrow(/Update of budget_entries\.user_id outside a transaction/);
      expect(await budgetRows(USER_A)).toBe(1);
      // A raw statement with an alias is caught too.
      await expect(
        asRequest(USER_A, () =>
          ds.query(
            `UPDATE budget_entries AS b SET name = 'x', "user_id" = $1 WHERE b.user_id = $2`,
            [USER_B, USER_A],
          ),
        ),
      ).rejects.toThrow(/outside a transaction/);
      // A subquery in a SET value, a WITH and a leading comment do not hide the user column.
      for (const sql of [
        `UPDATE budget_entries SET name = (SELECT 'x' FROM budget_entries LIMIT 1), "user_id" = $1 WHERE "user_id" = $2`,
        `WITH v AS (SELECT 1) UPDATE budget_entries SET "user_id" = $1 WHERE "user_id" = $2`,
        `/* moved */ UPDATE "public"."budget_entries" SET "user_id" = $1 WHERE "user_id" = $2`,
      ]) {
        await expect(asRequest(USER_A, () => ds.query(sql, [USER_B, USER_A]))).rejects.toThrow(
          /outside a transaction/,
        );
      }
      expect(await budgetRows(USER_A)).toBe(1);
      // Another column outside a transaction is allowed (an update cannot bring a row back).
      await asRequest(USER_A, () =>
        ds.getRepository(BudgetEntry).update({ userId: USER_A }, { name: "renamed" }),
      );
      // The user column inside a transaction is allowed: the transaction holds the fence.
      await asRequest(USER_A, () =>
        ds.transaction((m) =>
          m.getRepository(BudgetEntry).update({ userId: USER_A }, { userId: USER_B }),
        ),
      );
      expect(await budgetRows(USER_B)).toBe(1);
    });

    it("runs the erasure, its retry, the reset and the export inside a request without deadlock", async () => {
      await ds.getRepository(BudgetEntry).save(budgetLine(USER_B, "kept by reset? no"));
      const repo = <E extends object>(e: new () => E) => ds.getRepository(e);
      const profiles = new UserProfileService(
        repo(UserProfile),
        repo(Account),
        repo(AccountDetail),
        repo(BankConnection),
        new InMemoryIdentityAdapter(),
        ds,
        new LoggingBankConsentRevoker(),
        deletion,
      );
      await asRequest(USER_B, () => profiles.resetFinancialData(USER_B));
      expect(await budgetRows(USER_B)).toBe(0);
      const chunks: string[] = [];
      await asRequest(USER_B, () =>
        new AccountExportService(ds).writeExport(USER_B, async (c) => {
          chunks.push(c);
        }),
      );
      expect(chunks.join("")).toContain(USER_B);
      await expect(asRequest(USER_A, () => deletion.deleteAccount(USER_A))).resolves.toEqual({
        status: "deleted",
      });
      await expect(asRequest(USER_A, () => deletion.deleteAccount(USER_A))).resolves.toEqual({
        status: "deleted",
      });
    });

    it("refuses withoutWriteFence inside an open fenced transaction of the same request", async () => {
      await expect(
        asRequest(USER_A, () => ds.transaction(() => deletion.deleteAccount(USER_A))),
      ).rejects.toThrow(/open fenced transaction/);
      expect(await ds.getRepository(AccountDeletionTombstone).count()).toBe(0);
    });

    it("refuses the exclusive lockUserData inside the fence, which would deadlock", async () => {
      await expect(
        asRequest(USER_A, () => ds.transaction((m) => lockUserData(m, USER_A))),
      ).rejects.toThrow(/withoutWriteFence/);
    });
  },
);
