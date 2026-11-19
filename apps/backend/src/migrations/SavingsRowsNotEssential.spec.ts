import type { QueryRunner } from "typeorm";
import { describe, expect, it, vi } from "vitest";
import {
  SAVINGS_ROWS_NOT_ESSENTIAL_SQL,
  SavingsRowsNotEssential1795450000000,
} from "./SavingsRowsNotEssential1795450000000";

function runner() {
  const query = vi.fn(async () => []);
  return { query, runner: { query } as unknown as QueryRunner };
}

const sqlOf = (query: ReturnType<typeof vi.fn>) => query.mock.calls.map(([sql]) => String(sql));

describe("SavingsRowsNotEssential1795450000000", () => {
  it("up clears the flag on savings spending rows only, under the migration lock", async () => {
    const { query, runner: qr } = runner();
    await new SavingsRowsNotEssential1795450000000().up(qr);
    const sql = sqlOf(query);
    expect(sql[0]).toBe("SET LOCAL statement_timeout = 0");
    expect(sql).toContain("SELECT pg_advisory_xact_lock($1)");
    expect(sql[sql.length - 1]).toBe(SAVINGS_ROWS_NOT_ESSENTIAL_SQL);
    // The engine's savings test: category exactly "savings", income rows skipped.
    expect(SAVINGS_ROWS_NOT_ESSENTIAL_SQL).toContain(`"category" = 'savings'`);
    expect(SAVINGS_ROWS_NOT_ESSENTIAL_SQL).toContain(`"is_income" = false`);
    // Idempotent: only rows still marked are touched, so a second run changes nothing.
    expect(SAVINGS_ROWS_NOT_ESSENTIAL_SQL).toContain(`"is_essential" = true`);
    expect(SAVINGS_ROWS_NOT_ESSENTIAL_SQL).toMatch(
      /^UPDATE "budget_entries" SET "is_essential" = false WHERE /,
    );
  });

  it("down restores nothing: the cleared values were never chosen by anyone", async () => {
    const { query, runner: qr } = runner();
    await new SavingsRowsNotEssential1795450000000().down(qr);
    expect(query).not.toHaveBeenCalled();
  });
});
