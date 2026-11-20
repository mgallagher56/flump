import { Logger } from "@nestjs/common";
import type { QueryRunner } from "typeorm";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BUDGET_ENTRY_SHARE_BACKFILL_TABLE,
  BudgetEntryShareOneHome1795570000000,
} from "./BudgetEntryShareOneHome1795570000000";

/** A runner whose before-image table exists or not, and whose UPDATE reports `changed` rows. */
function runnerWith(tableExists: boolean, changed = 0) {
  const query = vi.fn(async (sql: string) => {
    if (sql.includes("information_schema.tables")) return tableExists ? [{ "?column?": 1 }] : [];
    if (sql.startsWith("WITH t AS")) return [[], changed];
    return [];
  });
  return { query, runner: { query } as unknown as QueryRunner };
}

const sqls = (query: ReturnType<typeof vi.fn>) => query.mock.calls.map(([sql]) => String(sql));
const indexOf = (all: string[], fragment: string) => all.findIndex((sql) => sql.includes(fragment));

afterEach(() => {
  vi.restoreAllMocks();
});

describe("BudgetEntryShareOneHome1795570000000.up", () => {
  it("writes the before-image, then sets the lines to sole with no share, then narrows the checks", async () => {
    const { query, runner } = runnerWith(false, 3);

    await new BudgetEntryShareOneHome1795570000000().up(runner);

    const all = sqls(query);
    const create = indexOf(all, `CREATE TABLE "${BUDGET_ENTRY_SHARE_BACKFILL_TABLE}"`);
    const update = indexOf(all, "WITH t AS");
    const check = indexOf(all, `ADD CONSTRAINT "CHK_budget_entries_share_percent"`);
    expect(create).toBeGreaterThan(indexOf(all, "SET LOCAL lock_timeout = '10s'"));
    expect(update).toBeGreaterThan(create);
    expect(check).toBeGreaterThan(update);
    // The before-image is written in the same statement, ahead of the UPDATE it records.
    const cte = all[update] ?? "";
    expect(cte.indexOf(`INSERT INTO "${BUDGET_ENTRY_SHARE_BACKFILL_TABLE}"`)).toBeLessThan(
      cte.indexOf(`UPDATE "budget_entries"`),
    );
    expect(cte).toContain(`SET "ownership" = 'sole', "share_percent" = NULL`);
    const joined = all.join("\n");
    expect(joined).toContain(`("share_percent" >= 1 AND "share_percent" <= 99)`);
    expect(joined).toContain(
      `"CHK_budget_entries_sole_no_share" CHECK ("ownership" = 'joint' OR "share_percent" IS NULL)`,
    );
    expect(joined).toContain(
      `"CHK_budget_entries_linked_no_share" CHECK ("link_kind" IS NULL OR "link_kind" = 'housing' OR ("ownership" = 'sole' AND "share_percent" IS NULL))`,
    );
    // The before-image holds no user id: the budget line's cascade ties it to its owner.
    expect(all[create]).not.toMatch(/user_id/);
  });

  it("logs a count only", async () => {
    const log = vi.spyOn(Logger.prototype, "log").mockImplementation(() => undefined);
    const { runner } = runnerWith(false, 4);

    await new BudgetEntryShareOneHome1795570000000().up(runner);

    expect(log).toHaveBeenCalledWith("Budget lines set to sole with no share: 4");
  });

  it("changes nothing on a second run, when the before-image table already exists", async () => {
    const { query, runner } = runnerWith(true);

    await new BudgetEntryShareOneHome1795570000000().up(runner);

    const all = sqls(query).join("\n");
    expect(all).not.toContain("UPDATE");
    expect(all).not.toContain("ALTER TABLE");
    expect(all).not.toContain("CREATE TABLE");
  });
});

describe("BudgetEntryShareOneHome1795570000000.down", () => {
  it("restores the old checks, puts back only lines still sole with no share, then drops the table", async () => {
    const { query, runner } = runnerWith(true);

    await new BudgetEntryShareOneHome1795570000000().down(runner);

    const all = sqls(query);
    expect(
      indexOf(all, `DROP CONSTRAINT IF EXISTS "CHK_budget_entries_linked_no_share"`),
    ).toBeGreaterThan(-1);
    expect(
      indexOf(all, `DROP CONSTRAINT IF EXISTS "CHK_budget_entries_sole_no_share"`),
    ).toBeGreaterThan(-1);
    const oldCheck = indexOf(all, `("share_percent" >= 1 AND "share_percent" <= 100)`);
    const restore = indexOf(all, `UPDATE "budget_entries"`);
    const drop = indexOf(all, `DROP TABLE "${BUDGET_ENTRY_SHARE_BACKFILL_TABLE}"`);
    expect(oldCheck).toBeGreaterThan(-1);
    expect(restore).toBeGreaterThan(oldCheck);
    expect(drop).toBeGreaterThan(restore);
    expect(all[restore]).toContain(`b."ownership" = 'sole' AND b."share_percent" IS NULL`);
  });

  it("is a no-op when the before-image table is gone", async () => {
    const { query, runner } = runnerWith(false);

    await new BudgetEntryShareOneHome1795570000000().down(runner);

    const all = sqls(query).join("\n");
    expect(all).not.toContain("UPDATE");
    expect(all).not.toContain("DROP");
  });
});
