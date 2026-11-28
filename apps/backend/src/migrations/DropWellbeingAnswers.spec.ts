import type { QueryRunner } from "typeorm";
import { describe, expect, it, vi } from "vitest";
import { DropWellbeingAnswers1795760000000 } from "./DropWellbeingAnswers1795760000000";

function runner() {
  const query = vi.fn(async () => []);
  return { query, runner: { query } as unknown as QueryRunner };
}
const sqls = (query: ReturnType<typeof vi.fn>) =>
  query.mock.calls.map(([sql]) => String(sql).replace(/\s+/g, " ").trim());

describe("DropWellbeingAnswers1795760000000", () => {
  it("up drops the table and the switch column, after a 10 s lock timeout, and nothing else", async () => {
    const { query, runner: r } = runner();
    await new DropWellbeingAnswers1795760000000().up(r);
    const order = sqls(query);
    const timeout = order.indexOf("SET LOCAL lock_timeout = '10s'");
    expect(timeout).toBeGreaterThan(order.indexOf("SET LOCAL lock_timeout = 0"));
    expect(order.slice(timeout + 1)).toEqual([
      `DROP TABLE IF EXISTS "wellbeing_answers"`,
      `ALTER TABLE "user_profiles" DROP COLUMN IF EXISTS "wellbeing_questions"`,
    ]);
  });

  it("down recreates the empty table and the column as the add migration made them, dropping nothing", async () => {
    const { query, runner: r } = runner();
    await new DropWellbeingAnswers1795760000000().down(r);
    const order = sqls(query);
    expect(order.some((sql) => sql.includes("DROP"))).toBe(false);
    expect(order.some((sql) => sql.startsWith("INSERT"))).toBe(false);
    const create = order.find((sql) =>
      sql.startsWith(`CREATE TABLE IF NOT EXISTS "wellbeing_answers"`),
    );
    expect(create).toContain(
      `CONSTRAINT "PK_wellbeing_answers" PRIMARY KEY ("user_id", "quarter")`,
    );
    expect(create).toContain(`CONSTRAINT "CHK_wellbeing_answers_feeling"`);
    const timeout = order.indexOf("SET LOCAL lock_timeout = '10s'");
    const alter = order.findIndex((sql) => sql.startsWith(`ALTER TABLE "user_profiles"`));
    expect(alter).toBeGreaterThan(timeout);
    expect(order[alter]).toBe(
      `ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "wellbeing_questions" boolean NOT NULL DEFAULT true`,
    );
  });
});
