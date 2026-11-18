import type { QueryRunner } from "typeorm";
import { describe, expect, it, vi } from "vitest";
import {
  AddBudgetEntryJointShare1795350000000,
  BUDGET_JOINT_DOWN_REFUSAL,
} from "./AddBudgetEntryJointShare1795350000000";

const BOTH = ["ownership", "share_percent"];

function runnerWith(found: boolean, columns: readonly string[] = BOTH) {
  const query = vi.fn(async (sql: string) => {
    if (sql.includes("information_schema.columns")) {
      return columns.map((column_name) => ({ column_name }));
    }
    if (sql.startsWith("SELECT EXISTS")) return [{ found }];
    return [];
  });
  return { query, runner: { query } as unknown as QueryRunner };
}

const sqls = (query: ReturnType<typeof vi.fn>) => query.mock.calls.map(([sql]) => String(sql));
const drops = (query: ReturnType<typeof vi.fn>) =>
  sqls(query).filter((sql) => sql.includes("DROP"));

describe("AddBudgetEntryJointShare1795350000000.up", () => {
  it("adds ownership (default sole) and a nullable share with both checks", async () => {
    const { query, runner } = runnerWith(false);

    await new AddBudgetEntryJointShare1795350000000().up(runner);

    const all = sqls(query).join("\n");
    expect(all).toContain(`"ownership" varchar NOT NULL DEFAULT 'sole'`);
    expect(all).toContain(`"share_percent" smallint`);
    expect(all).toContain(`CHECK ("ownership" IN ('sole', 'joint'))`);
    expect(all).toContain(`("share_percent" >= 1 AND "share_percent" <= 100)`);
    // Additive only: no existing row is rewritten.
    expect(all).not.toMatch(/UPDATE "budget_entries"/);
  });
});

describe("AddBudgetEntryJointShare1795350000000.down", () => {
  it("refuses while any entry is joint or has a share, and drops nothing", async () => {
    const { query, runner } = runnerWith(true);

    await expect(new AddBudgetEntryJointShare1795350000000().down(runner)).rejects.toThrow(
      BUDGET_JOINT_DOWN_REFUSAL,
    );
    expect(drops(query)).toHaveLength(0);
  });

  it("locks budget_entries ACCESS EXCLUSIVE, with a lock timeout, before the data check", async () => {
    const { query, runner } = runnerWith(false);

    await new AddBudgetEntryJointShare1795350000000().down(runner);

    const order = sqls(query);
    const timeout = order.indexOf("SET LOCAL lock_timeout = '10s'");
    const lock = order.indexOf(`LOCK TABLE "budget_entries" IN ACCESS EXCLUSIVE MODE`);
    const check = order.findIndex((sql) => sql.startsWith("SELECT EXISTS"));
    expect(timeout).toBeGreaterThanOrEqual(0);
    expect(lock).toBeGreaterThan(timeout);
    expect(check).toBeGreaterThan(lock);
  });

  it("drops the columns when every entry is sole", async () => {
    const { query, runner } = runnerWith(false);

    await new AddBudgetEntryJointShare1795350000000().down(runner);

    expect(drops(query)).toEqual(
      expect.arrayContaining([
        expect.stringContaining(`DROP COLUMN IF EXISTS "share_percent"`),
        expect.stringContaining(`DROP COLUMN IF EXISTS "ownership"`),
      ]),
    );
  });

  it("is a no-op when the columns are already gone", async () => {
    const { query, runner } = runnerWith(true, []);

    await new AddBudgetEntryJointShare1795350000000().down(runner);

    expect(drops(query)).toHaveLength(0);
    expect(sqls(query).some((sql) => sql.startsWith("LOCK TABLE"))).toBe(false);
  });
});
