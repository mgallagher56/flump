import type { QueryRunner } from "typeorm";
import { describe, expect, it, vi } from "vitest";
import {
  AddWellbeingAnswers1795740000000,
  WELLBEING_ANSWERS_DOWN_REFUSAL,
  WELLBEING_SWITCH_DOWN_REFUSAL,
} from "./AddWellbeingAnswers1795740000000";

function runnerWith(state: {
  tableExists: boolean;
  hasRows: boolean;
  columnExists: boolean;
  anyOff: boolean;
}) {
  const query = vi.fn(async (sql: string) => {
    if (sql.startsWith("SELECT to_regclass")) return [{ found: state.tableExists }];
    if (sql.includes("information_schema.columns")) return [{ found: state.columnExists }];
    if (sql.includes(`FROM "wellbeing_answers"`)) return [{ found: state.hasRows }];
    if (sql.includes(`"wellbeing_questions" = false`)) return [{ found: state.anyOff }];
    return [];
  });
  return { query, runner: { query } as unknown as QueryRunner };
}

const sqls = (query: ReturnType<typeof vi.fn>) => query.mock.calls.map(([sql]) => String(sql));
const drops = (query: ReturnType<typeof vi.fn>) =>
  sqls(query).filter((sql) => sql.includes("DROP"));
const present = { tableExists: true, columnExists: true };

describe("AddWellbeingAnswers1795740000000", () => {
  it("up waits at most 10 s for the user_profiles lock, set before the ALTER", async () => {
    const { query, runner } = runnerWith({ ...present, hasRows: false, anyOff: false });
    await new AddWellbeingAnswers1795740000000().up(runner);
    const order = sqls(query);
    const timeout = order.indexOf("SET LOCAL lock_timeout = '10s'");
    const alter = order.findIndex((sql) => sql.startsWith(`ALTER TABLE "user_profiles"`));
    expect(timeout).toBeGreaterThan(order.indexOf("SET LOCAL lock_timeout = 0"));
    expect(alter).toBeGreaterThan(timeout);
    expect(order[alter]).toContain(`"wellbeing_questions" boolean NOT NULL DEFAULT true`);
  });

  it("down refuses while any answer is stored, and drops nothing", async () => {
    const { query, runner } = runnerWith({ ...present, hasRows: true, anyOff: false });
    await expect(new AddWellbeingAnswers1795740000000().down(runner)).rejects.toThrow(
      WELLBEING_ANSWERS_DOWN_REFUSAL,
    );
    expect(drops(query)).toEqual([]);
  });

  it("down refuses while anyone has switched the questions off, and drops nothing", async () => {
    const { query, runner } = runnerWith({ ...present, hasRows: false, anyOff: true });
    await expect(new AddWellbeingAnswers1795740000000().down(runner)).rejects.toThrow(
      WELLBEING_SWITCH_DOWN_REFUSAL,
    );
    expect(drops(query)).toEqual([]);
  });

  it("down locks each table before its check, then drops the column and the table", async () => {
    const { query, runner } = runnerWith({ ...present, hasRows: false, anyOff: false });
    await new AddWellbeingAnswers1795740000000().down(runner);
    const order = sqls(query);
    const lockAnswers = order.indexOf(`LOCK TABLE "wellbeing_answers" IN ACCESS EXCLUSIVE MODE`);
    const checkAnswers = order.findIndex((sql) => sql.includes(`FROM "wellbeing_answers"`));
    const lockProfiles = order.indexOf(`LOCK TABLE "user_profiles" IN ACCESS EXCLUSIVE MODE`);
    const checkOff = order.findIndex((sql) => sql.includes(`"wellbeing_questions" = false`));
    expect(lockAnswers).toBeGreaterThan(order.indexOf("SET LOCAL lock_timeout = '10s'"));
    expect(checkAnswers).toBeGreaterThan(lockAnswers);
    expect(lockProfiles).toBeGreaterThan(checkAnswers);
    expect(checkOff).toBeGreaterThan(lockProfiles);
    expect(drops(query)).toEqual([
      `ALTER TABLE "user_profiles" DROP COLUMN IF EXISTS "wellbeing_questions"`,
      `DROP TABLE IF EXISTS "wellbeing_answers"`,
    ]);
  });

  it("down skips the checks for a table or column that is already gone", async () => {
    const { query, runner } = runnerWith({
      tableExists: false,
      columnExists: false,
      hasRows: true,
      anyOff: true,
    });
    await new AddWellbeingAnswers1795740000000().down(runner);
    expect(sqls(query).some((sql) => sql.startsWith("LOCK TABLE"))).toBe(false);
    expect(drops(query)).toHaveLength(2);
  });
});
