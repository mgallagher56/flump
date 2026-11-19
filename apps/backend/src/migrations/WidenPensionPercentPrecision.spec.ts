import type { QueryRunner } from "typeorm";
import { describe, expect, it, vi } from "vitest";
import { WidenPensionPercentPrecision1795460000000 } from "./WidenPensionPercentPrecision1795460000000";

function runner() {
  const query = vi.fn(async () => []);
  return { query, runner: { query } as unknown as QueryRunner };
}

const sqlOf = (query: ReturnType<typeof vi.fn>) => query.mock.calls.map(([sql]) => String(sql));

describe("WidenPensionPercentPrecision1795460000000", () => {
  it("up widens both rates to four decimal places, under the migration lock", async () => {
    const { query, runner: qr } = runner();
    await new WidenPensionPercentPrecision1795460000000().up(qr);
    const sql = sqlOf(query);
    expect(sql[0]).toBe("SET LOCAL statement_timeout = 0");
    expect(sql).toContain("SELECT pg_advisory_xact_lock($1)");
    expect(sql.slice(-2)).toEqual([
      `ALTER TABLE "user_profiles" ALTER COLUMN "pension_percent" TYPE numeric(7,4)`,
      `ALTER TABLE "user_profiles" ALTER COLUMN "pension_employer_percent" TYPE numeric(7,4)`,
    ]);
  });

  it("down rounds both rates back to two decimal places", async () => {
    const { query, runner: qr } = runner();
    await new WidenPensionPercentPrecision1795460000000().down(qr);
    const sql = sqlOf(query);
    expect(sql).toContain("SELECT pg_advisory_xact_lock($1)");
    expect(sql.slice(-2)).toEqual([
      `ALTER TABLE "user_profiles" ALTER COLUMN "pension_percent" TYPE numeric(5,2) USING round("pension_percent", 2)`,
      `ALTER TABLE "user_profiles" ALTER COLUMN "pension_employer_percent" TYPE numeric(5,2) USING round("pension_employer_percent", 2)`,
    ]);
  });
});
