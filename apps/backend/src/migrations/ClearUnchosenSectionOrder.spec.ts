import type { QueryRunner } from "typeorm";
import { describe, expect, it, vi } from "vitest";
import {
  CLEAR_UNCHOSEN_SECTION_ORDER_SQL,
  ClearUnchosenSectionOrder1795500000000,
} from "./ClearUnchosenSectionOrder1795500000000";

function runner() {
  const query = vi.fn(async () => []);
  return { query, runner: { query } as unknown as QueryRunner };
}

const sqlOf = (query: ReturnType<typeof vi.fn>) => query.mock.calls.map(([sql]) => String(sql));

describe("ClearUnchosenSectionOrder1795500000000", () => {
  it("up clears every saved section order, under the migration lock", async () => {
    const { query, runner: qr } = runner();
    await new ClearUnchosenSectionOrder1795500000000().up(qr);
    const sql = sqlOf(query);
    expect(sql[0]).toBe("SET LOCAL statement_timeout = 0");
    expect(sql).toContain("SELECT pg_advisory_xact_lock($1)");
    expect(sql[sql.length - 1]).toBe(CLEAR_UNCHOSEN_SECTION_ORDER_SQL);
    // Only that one column; idempotent because rows already NULL are skipped.
    expect(CLEAR_UNCHOSEN_SECTION_ORDER_SQL).toBe(
      `UPDATE "user_profiles" SET "dashboard_widget_order" = NULL WHERE "dashboard_widget_order" IS NOT NULL`,
    );
  });

  it("down restores nothing: the cleared orders were never chosen by anyone", async () => {
    const { query, runner: qr } = runner();
    await new ClearUnchosenSectionOrder1795500000000().down(qr);
    expect(query).not.toHaveBeenCalled();
  });
});
