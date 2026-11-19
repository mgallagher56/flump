import type { QueryRunner } from "typeorm";
import { describe, expect, it, vi } from "vitest";
import {
  CLEAR_UNCHOSEN_SECTION_ORDER_SQL,
  ClearUnchosenSectionOrder1795500000000,
} from "./ClearUnchosenSectionOrder1795500000000";

/** A query runner whose migrations table records this migration or not. */
function runner(recorded: boolean) {
  const query = vi.fn(async (sql: string) => {
    if (sql.startsWith("SELECT 1 FROM")) return recorded ? [{ "?column?": 1 }] : [];
    if (sql === CLEAR_UNCHOSEN_SECTION_ORDER_SQL) return [{ cleared: 3 }];
    return [];
  });
  const qr = {
    query,
    hasTable: vi.fn(async () => true),
    connection: { options: {}, driver: { escape: (name: string) => `"${name}"` } },
  } as unknown as QueryRunner;
  return { query, qr };
}

const sqlOf = (query: ReturnType<typeof vi.fn>) => query.mock.calls.map(([sql]) => String(sql));

describe("ClearUnchosenSectionOrder1795500000000", () => {
  it("up takes the lock and a lock timeout, then clears every saved section order", async () => {
    const { query, qr } = runner(false);
    await new ClearUnchosenSectionOrder1795500000000().up(qr);
    const sql = sqlOf(query);
    expect(sql.slice(0, 4)).toEqual([
      "SET LOCAL statement_timeout = 0",
      "SET LOCAL lock_timeout = 0",
      "SELECT pg_advisory_xact_lock($1)",
      "SET LOCAL lock_timeout = '10s'",
    ]);
    expect(sql[sql.length - 1]).toBe(CLEAR_UNCHOSEN_SECTION_ORDER_SQL);
    // Only that one column, and only rows that still hold an order.
    expect(CLEAR_UNCHOSEN_SECTION_ORDER_SQL).toContain(
      `UPDATE "user_profiles" SET "dashboard_widget_order" = NULL`,
    );
    expect(CLEAR_UNCHOSEN_SECTION_ORDER_SQL).toContain(
      `WHERE "dashboard_widget_order" IS NOT NULL`,
    );
  });

  it("up changes nothing when another instance has already recorded it", async () => {
    const { query, qr } = runner(true);
    await new ClearUnchosenSectionOrder1795500000000().up(qr);
    expect(sqlOf(query)).not.toContain(CLEAR_UNCHOSEN_SECTION_ORDER_SQL);
  });

  it("down restores nothing: the cleared orders were never read or chosen", async () => {
    const { query, qr } = runner(false);
    await new ClearUnchosenSectionOrder1795500000000().down(qr);
    expect(query).not.toHaveBeenCalled();
  });
});
