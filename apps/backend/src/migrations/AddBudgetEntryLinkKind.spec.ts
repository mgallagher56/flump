import type { QueryRunner } from "typeorm";
import { describe, expect, it, vi } from "vitest";
import {
  AddBudgetEntryLinkKind1795440000000,
  LINK_KIND_CONSTRAINT,
  LINK_KIND_DOWN_REFUSAL,
  LINK_KIND_UNIQUE_INDEX,
} from "./AddBudgetEntryLinkKind1795440000000";

function runner(responses: Record<string, unknown> = {}) {
  const query = vi.fn(async (sql: string) => {
    for (const [match, result] of Object.entries(responses)) if (sql.includes(match)) return result;
    return [];
  });
  return { query, runner: { query } as unknown as QueryRunner };
}

const sqlOf = (query: ReturnType<typeof vi.fn>) => query.mock.calls.map(([sql]) => String(sql));

describe("AddBudgetEntryLinkKind1795440000000", () => {
  it("up adds a nullable link_kind with a CHECK, under the migration lock", async () => {
    const { query, runner: qr } = runner();
    await new AddBudgetEntryLinkKind1795440000000().up(qr);
    const sql = sqlOf(query);
    expect(sql[0]).toBe("SET LOCAL statement_timeout = 0");
    expect(sql).toContain(
      `ALTER TABLE "budget_entries" ADD COLUMN IF NOT EXISTS "link_kind" varchar(16)`,
    );
    const drop = sql.indexOf(
      `ALTER TABLE "budget_entries" DROP CONSTRAINT IF EXISTS "${LINK_KIND_CONSTRAINT}"`,
    );
    const add = sql.findIndex((s) => s.includes(`ADD CONSTRAINT "${LINK_KIND_CONSTRAINT}"`));
    expect(drop).toBeGreaterThan(0);
    expect(add).toBeGreaterThan(drop);
    expect(sql[add]).toContain(`'take_home', 'housing'`);
    const index = sql.indexOf(
      `CREATE UNIQUE INDEX IF NOT EXISTS "${LINK_KIND_UNIQUE_INDEX}" ON "budget_entries" ("user_id", "link_kind") WHERE "link_kind" IS NOT NULL`,
    );
    expect(index).toBeGreaterThan(add);
  });

  it("down is refused while a row is linked", async () => {
    const { query, runner: qr } = runner({
      information_schema: [{ column_name: "link_kind" }],
      "SELECT EXISTS": [{ found: true }],
    });
    await expect(new AddBudgetEntryLinkKind1795440000000().down(qr)).rejects.toThrow(
      LINK_KIND_DOWN_REFUSAL,
    );
    expect(sqlOf(query).some((s) => s.includes("DROP COLUMN") || s.includes("DROP INDEX"))).toBe(
      false,
    );
  });

  it("down drops the column when no row is linked", async () => {
    const { query, runner: qr } = runner({
      information_schema: [{ column_name: "link_kind" }],
      "SELECT EXISTS": [{ found: false }],
    });
    await new AddBudgetEntryLinkKind1795440000000().down(qr);
    const sql = sqlOf(query);
    const dropIndex = sql.indexOf(`DROP INDEX IF EXISTS "${LINK_KIND_UNIQUE_INDEX}"`);
    const dropColumn = sql.indexOf(
      `ALTER TABLE "budget_entries" DROP COLUMN IF EXISTS "link_kind"`,
    );
    expect(dropIndex).toBeGreaterThan(-1);
    expect(dropColumn).toBeGreaterThan(dropIndex);
  });
});
