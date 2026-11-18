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
    const add = sql.findIndex(
      (s) =>
        s.includes(`ADD CONSTRAINT "${CHECK_IN_DAY_CONSTRAINT}"`) &&
        s.includes("BETWEEN 1 AND 31") &&
        s.endsWith("NOT VALID"),
    );
    const validate = sql.indexOf(
      `ALTER TABLE "user_profiles" VALIDATE CONSTRAINT "${CHECK_IN_DAY_CONSTRAINT}"`,
    );
    expect(add).toBeGreaterThan(0);
    // Validated as a separate statement, after the constraint is added.
    expect(validate).toBeGreaterThan(add);
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
