import type { QueryRunner } from "typeorm";
import { describe, expect, it, vi } from "vitest";
import { AddRetirementPlan1795260000000 } from "./AddRetirementPlan1795260000000";

function runnerWith(state: { tableExists: boolean; hasRows: boolean }) {
  const query = vi.fn(async (sql: string) => {
    if (sql.startsWith("SELECT to_regclass")) return [{ found: state.tableExists }];
    if (sql.startsWith("SELECT EXISTS")) return [{ found: state.hasRows }];
    return [];
  });
  return { query, runner: { query } as unknown as QueryRunner };
}

const drops = (query: ReturnType<typeof vi.fn>) =>
  query.mock.calls.filter(([sql]) => String(sql).includes("DROP"));

describe("AddRetirementPlan1795260000000.down", () => {
  it("refuses while any retirement plan is saved, and drops nothing", async () => {
    const { query, runner } = runnerWith({ tableExists: true, hasRows: true });

    await expect(new AddRetirementPlan1795260000000().down(runner)).rejects.toThrow(
      /retirement_plans contains saved plans/,
    );
    expect(drops(query)).toHaveLength(0);
  });

  it("drops the table when it is empty", async () => {
    const { query, runner } = runnerWith({ tableExists: true, hasRows: false });

    await new AddRetirementPlan1795260000000().down(runner);

    expect(query).toHaveBeenCalledWith("SET LOCAL lock_timeout = 0");
    expect(drops(query).map(([sql]) => sql)).toEqual(
      expect.arrayContaining([expect.stringContaining(`DROP TABLE IF EXISTS "retirement_plans"`)]),
    );
  });

  it("locks the table ACCESS EXCLUSIVE, with a lock timeout, before the row check", async () => {
    const { query, runner } = runnerWith({ tableExists: true, hasRows: false });

    await new AddRetirementPlan1795260000000().down(runner);

    const order = query.mock.calls.map(([sql]) => String(sql));
    const timeout = order.indexOf("SET LOCAL lock_timeout = '10s'");
    const lock = order.indexOf(`LOCK TABLE "retirement_plans" IN ACCESS EXCLUSIVE MODE`);
    const check = order.findIndex((sql) => sql.startsWith("SELECT EXISTS"));
    expect(timeout).toBeGreaterThanOrEqual(0);
    expect(lock).toBeGreaterThan(timeout);
    expect(check).toBeGreaterThan(lock);
  });

  it("does not query a table that is already gone", async () => {
    const { query, runner } = runnerWith({ tableExists: false, hasRows: true });

    await new AddRetirementPlan1795260000000().down(runner);

    expect(query.mock.calls.some(([sql]) => String(sql).startsWith("SELECT EXISTS"))).toBe(false);
  });
});
