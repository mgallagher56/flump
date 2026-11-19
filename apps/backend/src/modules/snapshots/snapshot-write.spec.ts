import type { EntityManager } from "typeorm";
import { describe, expect, it } from "vitest";
import { writeSnapshotRows } from "./snapshot-write";

/**
 * System audit slice 9 (DB-12 item 4, backend-2026-11 L13): a snapshot write moves every touched
 * account's balance in one UPDATE, however many rows and accounts it writes, never one per row.
 * Since slice 4 that statement is `syncBalancesToNewestRecord`; this test keeps it that way.
 */
describe("writeSnapshotRows balance update", () => {
  const A = "00000000-0000-4000-8000-00000000000a";
  const B = "00000000-0000-4000-8000-00000000000b";
  const C = "00000000-0000-4000-8000-00000000000c";

  it("issues one UPDATE of accounts for five rows across three accounts", async () => {
    const statements: string[] = [];
    const manager = {
      query: async (sql: string, params?: unknown[]) => {
        statements.push(sql);
        // The import insert returns every row it wrote.
        if (/INSERT INTO "account_details"/.test(sql) && params) {
          const [ids, years, months] = [params[3], params[4], params[5]] as [
            string[],
            number[],
            number[],
          ];
          return ids.map((id, i) => ({ account_id: id, year: years[i], month: months[i] }));
        }
        return [];
      },
    } as unknown as EntityManager;
    const row = (accountId: string, month: number) => ({
      accountId,
      year: 2026,
      month,
      value: 100,
      asOfDate: `2026-${String(month).padStart(2, "0")}-01`,
    });

    const written = await writeSnapshotRows(
      manager,
      "u1",
      [row(A, 9), row(A, 10), row(B, 10), row(C, 9), row(C, 10)],
      { source: "agent", importBatchId: null, current: { year: 2026, month: 10 } },
    );

    expect(written).toHaveLength(5);
    expect(statements.filter((s) => /^\s*UPDATE "accounts"/.test(s))).toHaveLength(1);
    // The lock that statement relies on is one statement too.
    expect(statements.filter((s) => /FOR UPDATE/.test(s))).toHaveLength(1);
  });

  it("issues one UPDATE of accounts for a typed (manual) write across accounts", async () => {
    const statements: string[] = [];
    let inserts = 0;
    const builder = {
      insert: () => builder,
      into: () => builder,
      values: () => builder,
      orUpdate: () => builder,
      execute: async () => {
        inserts += 1;
        return {};
      },
    };
    const manager = {
      createQueryBuilder: () => builder,
      query: async (sql: string) => {
        statements.push(sql);
        return [];
      },
    } as unknown as EntityManager;
    const written = await writeSnapshotRows(
      manager,
      "u1",
      [
        { accountId: A, year: 2026, month: 10, value: 1, asOfDate: "2026-10-01" },
        { accountId: B, year: 2026, month: 10, value: 2, asOfDate: "2026-10-01" },
        { accountId: C, year: 2026, month: 9, value: 3, asOfDate: "2026-09-01" },
      ],
      { source: "manual", importBatchId: null, current: { year: 2026, month: 10 } },
    );
    expect(written).toHaveLength(3);
    // One insert chunk, then the balance sync's lock and its one UPDATE.
    expect(inserts).toBe(1);
    expect(statements.filter((s) => /^\s*UPDATE "accounts"/.test(s))).toHaveLength(1);
    expect(statements.filter((s) => /FOR UPDATE/.test(s))).toHaveLength(1);
  });
});
