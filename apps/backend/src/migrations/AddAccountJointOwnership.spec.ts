import type { QueryRunner } from "typeorm";
import { describe, expect, it, vi } from "vitest";
import { AddAccountJointOwnership1795250000000 } from "./AddAccountJointOwnership1795250000000";

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

describe("AddAccountJointOwnership1795250000000.down", () => {
  it("refuses while any account is joint or has a set share, and drops nothing", async () => {
    const { query, runner } = runnerWith(true);

    await expect(new AddAccountJointOwnership1795250000000().down(runner)).rejects.toThrow(
      /joint ownership/,
    );
    expect(drops(query)).toHaveLength(0);
    const check = sqls(query).find((sql) => sql.startsWith("SELECT EXISTS"));
    expect(check).toContain(`"ownership" <> 'sole'`);
    expect(check).toContain(`"share_percent"`);
  });

  it("locks accounts ACCESS EXCLUSIVE, with a lock timeout, before the data check", async () => {
    const { query, runner } = runnerWith(false);

    await new AddAccountJointOwnership1795250000000().down(runner);

    const order = sqls(query);
    const timeout = order.indexOf("SET LOCAL lock_timeout = '10s'");
    const lock = order.indexOf(`LOCK TABLE "accounts" IN ACCESS EXCLUSIVE MODE`);
    const check = order.findIndex((sql) => sql.startsWith("SELECT EXISTS"));
    expect(timeout).toBeGreaterThanOrEqual(0);
    expect(lock).toBeGreaterThan(timeout);
    expect(check).toBeGreaterThan(lock);
  });

  it("drops the columns when every account is sole at the default share", async () => {
    const { query, runner } = runnerWith(false);

    await new AddAccountJointOwnership1795250000000().down(runner);

    expect(query).toHaveBeenCalledWith("SET LOCAL lock_timeout = 0");
    expect(drops(query)).toEqual(
      expect.arrayContaining([
        expect.stringContaining(`DROP COLUMN IF EXISTS "share_percent"`),
        expect.stringContaining(`DROP COLUMN IF EXISTS "ownership"`),
      ]),
    );
  });

  it("is a no-op when the columns are already gone", async () => {
    const { query, runner } = runnerWith(true, []);

    await new AddAccountJointOwnership1795250000000().down(runner);

    expect(drops(query)).toHaveLength(0);
    expect(sqls(query).some((sql) => sql.startsWith("SELECT EXISTS"))).toBe(false);
    expect(sqls(query).some((sql) => sql.startsWith("LOCK TABLE"))).toBe(false);
  });

  it("checks only the column still present when one is already gone", async () => {
    const { query, runner } = runnerWith(false, ["ownership"]);

    await new AddAccountJointOwnership1795250000000().down(runner);

    const check = sqls(query).find((sql) => sql.startsWith("SELECT EXISTS"));
    expect(check).toContain(`"ownership" <> 'sole'`);
    expect(check).not.toContain(`"share_percent"`);
  });
});
