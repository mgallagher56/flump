import { BadRequestException } from "@nestjs/common";
import type { DataSource, EntityManager } from "typeorm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ImportBatch } from "../../entities/import-batch.entity";
import { ImportsService } from "./imports.service";

// Unit tests over a stand-in manager: the database work is pinned by
// imports-batched-writes.integration.spec.ts. These pin which shared paths commit and revert use.

const recordAuditEvent = vi.hoisted(() => vi.fn(async () => undefined));
vi.mock("../../audit/audit-events", () => ({ recordAuditEvent }));

const newAccountFields = vi.hoisted(() => ({
  spy: undefined as unknown as ReturnType<typeof vi.fn>,
}));
vi.mock("../finance/account-intake.service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../finance/account-intake.service")>();
  newAccountFields.spy = vi.fn(actual.newAccountFields);
  return { ...actual, newAccountFields: newAccountFields.spy };
});

vi.mock("../snapshots/snapshot-write", () => ({ writeSnapshotRows: vi.fn(async () => []) }));

const batchRef = vi.hoisted(() => ({ current: undefined as unknown }));
vi.mock("./import-helpers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./import-helpers")>();
  return {
    ...actual,
    lockUser: vi.fn(async () => undefined),
    expireStale: vi.fn(async () => undefined),
    findOwned: vi.fn(async () => batchRef.current),
    resolveAccountMap: vi.fn(async () => ({ mappedIds: [], ownedById: new Map() })),
    readExisting: vi.fn(async () => new Map()),
  };
});

const OWNER_ID = ["user", "ai9"].join("-");
const BATCH_ID = "0b6f1c1e-2a3b-4c5d-8e9f-0a1b2c3d4e5f";
const NOW = new Date("2026-11-14T12:00:00Z");
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

const baseBatch = (overrides: Partial<ImportBatch>): ImportBatch =>
  ({
    id: BATCH_ID,
    userId: OWNER_ID,
    status: "staged",
    idempotencyKey: "k",
    expiresAt: new Date("2026-11-15T12:00:00Z"),
    counts: {
      rows: 1,
      staged: 1,
      new: null,
      overwrite: null,
      unchanged: null,
      skipped: null,
      errors: 0,
    },
    payload: { accounts: [], balances: [], chunkKeys: [] },
    revertData: null,
    createdAt: NOW,
    updatedAt: NOW,
    committedAt: null,
    revertedAt: null,
    ...overrides,
  }) as unknown as ImportBatch;

/** A manager whose `save` gives each new account an id, and whose `query` answers by SQL. */
const managerWith = (answer: (sql: string) => unknown) => {
  const saved: unknown[] = [];
  const m = {
    create: (_entity: unknown, plain: object) => ({ ...plain }),
    save: vi.fn(async (entityOrRow: unknown, rows?: unknown) => {
      if (Array.isArray(rows)) {
        saved.push(...rows);
        return rows.map((r, i) => ({ ...(r as object), id: uuid(i + 1) }));
      }
      return entityOrRow;
    }),
    query: vi.fn(async (sql: string) => answer(sql)),
  };
  const ds = {
    transaction: (work: (em: EntityManager) => unknown) => work(m as unknown as EntityManager),
    manager: m,
  } as unknown as DataSource;
  return { m, ds, saved };
};

describe("ImportsService", () => {
  beforeEach(() => {
    recordAuditEvent.mockClear();
    newAccountFields.spy?.mockClear();
  });

  describe("commit (AI-9)", () => {
    it("names the staged row and the rule when one account fails the account rules", async () => {
      // Row "m2" asks for a 900-month term; the form's rule allows 1 to 600. The whole commit
      // still stops, but the 400 now says which row and why, and saves nothing.
      batchRef.current = baseBatch({
        payload: {
          accounts: [
            { ref: "m1", name: "First mortgage", type: "Mortgage" },
            { ref: "m2", name: "Second mortgage", type: "Mortgage", details: { termMonths: 900 } },
          ],
          balances: [],
          chunkKeys: [],
        },
      });
      const { ds, saved } = managerWith(() => []);
      const err = await new ImportsService(ds).commit(OWNER_ID, BATCH_ID, {}, NOW).then(
        () => null,
        (e: unknown) => e as BadRequestException,
      );
      expect(err).toBeInstanceOf(BadRequestException);
      expect(err?.getStatus()).toBe(400);
      expect(err?.message).toBe(
        "Imported account in row m2: termMonths must be an integer between 1 and 600, or null",
      );
      expect(saved).toHaveLength(0);
    });

    it("builds each new account through the account form's create rules", async () => {
      batchRef.current = baseBatch({
        payload: {
          accounts: [
            {
              ref: "a",
              name: "Imported mortgage",
              type: "Mortgage",
              details: { interestRate: 4.2, termMonths: 300 },
            },
          ],
          balances: [{ accountRef: "a", month: "2026-10", value: 150000 }],
          chunkKeys: [],
        },
      });
      const { ds, saved } = managerWith(() => []);
      await new ImportsService(ds).commit(OWNER_ID, BATCH_ID, {}, NOW);

      expect(saved).toHaveLength(1);
      // The form's rules: a Mortgage is stored negative (150,000 owed is -150,000), held solely
      // with no share, in GBP, plus the staged details and the owner.
      expect(saved[0]).toMatchObject({
        userId: OWNER_ID,
        name: "Imported mortgage",
        type: "Mortgage",
        balance: -150000,
        currency: "GBP",
        isCurrent: true,
        ownership: "sole",
        sharePercent: null,
        interestRate: 4.2,
        termMonths: 300,
      });
      expect(newAccountFields.spy).toHaveBeenCalledTimes(1);
    });

    it("stores a debt negative and leaves an asset positive, both sole in GBP", async () => {
      batchRef.current = baseBatch({
        payload: {
          accounts: [
            { ref: "c", name: "Imported card", type: "Credit Card" },
            { ref: "s", name: "Imported saver", type: "Saving" },
          ],
          balances: [
            { accountRef: "c", month: "2026-10", value: 500 },
            { accountRef: "s", month: "2026-10", value: 1000 },
          ],
          chunkKeys: [],
        },
      });
      const { ds, saved } = managerWith(() => []);
      await new ImportsService(ds).commit(OWNER_ID, BATCH_ID, {}, NOW);

      // The sign rule: 500 owed on a card is stored as -500; 1,000 saved stays 1,000. The stage
      // schema carries no ownership, so every imported account is sole with no share.
      const byName = Object.fromEntries((saved as Array<{ name: string }>).map((a) => [a.name, a]));
      expect(byName["Imported card"]).toMatchObject({
        balance: -500,
        ownership: "sole",
        sharePercent: null,
        currency: "GBP",
      });
      expect(byName["Imported saver"]).toMatchObject({
        balance: 1000,
        ownership: "sole",
        sharePercent: null,
        currency: "GBP",
      });
      expect(newAccountFields.spy).toHaveBeenCalledTimes(2);
    });
  });

  describe("revert (AI-10)", () => {
    it("records an account.deleted audit event for each account it removes", async () => {
      batchRef.current = baseBatch({
        status: "committed",
        payload: { accounts: [], balances: [], chunkKeys: [] },
        revertData: {
          rows: [],
          createdAccountIds: [uuid(1), uuid(2), uuid(3)],
          balances: [],
          skippedManual: [],
        },
      });
      // The third account gained a row since the import, so it stays and is not recorded.
      const { ds, m } = managerWith((sql) =>
        /DELETE FROM "accounts"/.test(sql) ? [{ id: uuid(1) }, { id: uuid(2) }] : [],
      );
      await new ImportsService(ds).revert(OWNER_ID, BATCH_ID);

      expect(recordAuditEvent).toHaveBeenCalledTimes(2);
      for (const id of [uuid(1), uuid(2)]) {
        expect(recordAuditEvent).toHaveBeenCalledWith(m, {
          userId: OWNER_ID,
          action: "account.deleted",
          targetId: id,
        });
      }
    });

    it("records nothing when the batch created no accounts", async () => {
      batchRef.current = baseBatch({
        status: "committed",
        revertData: { rows: [], createdAccountIds: [], balances: [], skippedManual: [] },
      });
      const { ds } = managerWith(() => []);
      await new ImportsService(ds).revert(OWNER_ID, BATCH_ID);
      expect(recordAuditEvent).not.toHaveBeenCalled();
    });
  });
});
