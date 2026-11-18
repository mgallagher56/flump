import type { QueryRunner } from "typeorm";
import { describe, expect, it, vi } from "vitest";
import {
  AddProfileCheckInDay1795400000000,
  CHECK_IN_DAY_CONSTRAINT,
} from "./AddProfileCheckInDay1795400000000";

function runner() {
  const query = vi.fn(async () => []);
  return { query, runner: { query } as unknown as QueryRunner };
}

const sqlOf = (query: ReturnType<typeof vi.fn>) => query.mock.calls.map(([sql]) => String(sql));

describe("AddProfileCheckInDay1795400000000", () => {
  it("up adds a nullable smallint with a 1 to 31 CHECK, under the migration lock", async () => {
    const { query, runner: qr } = runner();
    await new AddProfileCheckInDay1795400000000().up(qr);
    const sql = sqlOf(query);
    expect(sql[0]).toBe("SET LOCAL statement_timeout = 0");
    expect(sql).toContain(
      'ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "check_in_day" smallint',
    );
    const drop = sql.indexOf(
      `ALTER TABLE "user_profiles" DROP CONSTRAINT IF EXISTS "${CHECK_IN_DAY_CONSTRAINT}"`,
    );
    const add = sql.indexOf(
      `ALTER TABLE "user_profiles" ADD CONSTRAINT "${CHECK_IN_DAY_CONSTRAINT}" CHECK ("check_in_day" BETWEEN 1 AND 31)`,
    );
    // Dropped first so a re-run does not fail on an existing constraint, then added validated.
    expect(drop).toBeGreaterThan(0);
    expect(add).toBeGreaterThan(drop);
    expect(sql.some((s) => s.includes("NOT VALID") || s.includes("VALIDATE CONSTRAINT"))).toBe(
      false,
    );
  });

  it("down drops the constraint before the column", async () => {
    const { query, runner: qr } = runner();
    await new AddProfileCheckInDay1795400000000().down(qr);
    const sql = sqlOf(query);
    const constraint = sql.findIndex((s) =>
      s.includes(`DROP CONSTRAINT IF EXISTS "${CHECK_IN_DAY_CONSTRAINT}"`),
    );
    const column = sql.indexOf('ALTER TABLE "user_profiles" DROP COLUMN IF EXISTS "check_in_day"');
    expect(constraint).toBeGreaterThan(0);
    expect(column).toBeGreaterThan(constraint);
  });
});
