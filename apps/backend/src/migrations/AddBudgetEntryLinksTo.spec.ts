import type { QueryRunner } from "typeorm";
import { describe, expect, it, vi } from "vitest";
import {
  AddBudgetEntryLinksTo1795440000000,
  LINKS_TO_CONSTRAINT,
  LINKS_TO_DOWN_REFUSAL,
} from "./AddBudgetEntryLinksTo1795440000000";

function runner(responses: Record<string, unknown> = {}) {
  const query = vi.fn(async (sql: string) => {
    for (const [match, result] of Object.entries(responses)) if (sql.includes(match)) return result;
    return [];
  });
  return { query, runner: { query } as unknown as QueryRunner };
}

const sqlOf = (query: ReturnType<typeof vi.fn>) => query.mock.calls.map(([sql]) => String(sql));

describe("AddBudgetEntryLinksTo1795440000000", () => {
  it("up adds a nullable links_to with a CHECK, under the migration lock", async () => {
    const { query, runner: qr } = runner();
    await new AddBudgetEntryLinksTo1795440000000().up(qr);
    const sql = sqlOf(query);
    expect(sql[0]).toBe("SET LOCAL statement_timeout = 0");
    expect(sql).toContain(
      `ALTER TABLE "budget_entries" ADD COLUMN IF NOT EXISTS "links_to" varchar(16)`,
    );
    const drop = sql.indexOf(
      `ALTER TABLE "budget_entries" DROP CONSTRAINT IF EXISTS "${LINKS_TO_CONSTRAINT}"`,
    );
    const add = sql.findIndex((s) => s.includes(`ADD CONSTRAINT "${LINKS_TO_CONSTRAINT}"`));
    expect(drop).toBeGreaterThan(0);
    expect(add).toBeGreaterThan(drop);
    expect(sql[add]).toContain(`'take-home', 'housing'`);
  });

  it("down is refused while a row is linked", async () => {
    const { query, runner: qr } = runner({
      information_schema: [{ column_name: "links_to" }],
      "SELECT EXISTS": [{ found: true }],
    });
    await expect(new AddBudgetEntryLinksTo1795440000000().down(qr)).rejects.toThrow(
      LINKS_TO_DOWN_REFUSAL,
    );
    expect(sqlOf(query).some((s) => s.includes("DROP COLUMN"))).toBe(false);
  });

  it("down drops the column when no row is linked", async () => {
    const { query, runner: qr } = runner({
      information_schema: [{ column_name: "links_to" }],
      "SELECT EXISTS": [{ found: false }],
    });
    await new AddBudgetEntryLinksTo1795440000000().down(qr);
    expect(sqlOf(query)).toContain(`ALTER TABLE "budget_entries" DROP COLUMN IF EXISTS "links_to"`);
  });
});
