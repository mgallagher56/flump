import type { QueryRunner } from "typeorm";
import { describe, expect, it, vi } from "vitest";
import {
  AddInvoicingTables1795600000000,
  INVOICING_DOWN_REFUSAL,
} from "./AddInvoicingTables1795600000000";

function runnerWith(state: { tablesExist: boolean; hasRows: boolean }) {
  const query = vi.fn(async (sql: string) => {
    if (sql.includes("to_regclass")) {
      return [
        {
          settings: state.tablesExist,
          entries: state.tablesExist,
          invoices: state.tablesExist,
        },
      ];
    }
    if (sql.includes("EXISTS (SELECT 1 FROM")) {
      return [{ found: state.hasRows }];
    }
    return [];
  });
  return { query, runner: { query } as unknown as QueryRunner };
}

const drops = (query: ReturnType<typeof vi.fn>) =>
  query.mock.calls.filter(([sql]) => String(sql).includes("DROP"));

describe("AddInvoicingTables1795600000000", () => {
  it("up() creates invoicing_settings, invoices, work_log_entries and their indexes", async () => {
    const { query, runner } = runnerWith({ tablesExist: false, hasRows: false });

    await new AddInvoicingTables1795600000000().up(runner);

    const sqls = query.mock.calls.map(([sql]) => String(sql));
    expect(sqls.some((s) => s.includes('CREATE TABLE IF NOT EXISTS "invoicing_settings"'))).toBe(
      true,
    );
    expect(sqls.some((s) => s.includes('CREATE TABLE IF NOT EXISTS "invoices"'))).toBe(true);
    expect(sqls.some((s) => s.includes('CREATE TABLE IF NOT EXISTS "work_log_entries"'))).toBe(
      true,
    );
    expect(
      sqls.some((s) => s.includes('CREATE UNIQUE INDEX IF NOT EXISTS "UQ_invoices_user_number"')),
    ).toBe(true);
  });

  it("down() refuses while any invoicing row is saved, and drops nothing", async () => {
    const { query, runner } = runnerWith({ tablesExist: true, hasRows: true });

    await expect(new AddInvoicingTables1795600000000().down(runner)).rejects.toThrow(
      INVOICING_DOWN_REFUSAL,
    );
    expect(drops(query)).toHaveLength(0);
  });

  it("down() drops all three tables when empty after locking ACCESS EXCLUSIVE", async () => {
    const { query, runner } = runnerWith({ tablesExist: true, hasRows: false });

    await new AddInvoicingTables1795600000000().down(runner);

    const order = query.mock.calls.map(([sql]) => String(sql));
    const timeout = order.indexOf("SET LOCAL lock_timeout = '10s'");
    const lock = order.indexOf(
      `LOCK TABLE "work_log_entries", "invoices", "invoicing_settings" IN ACCESS EXCLUSIVE MODE`,
    );
    const check = order.findIndex((sql) => sql.includes("EXISTS (SELECT 1 FROM"));
    expect(timeout).toBeGreaterThanOrEqual(0);
    expect(lock).toBeGreaterThan(timeout);
    expect(check).toBeGreaterThan(lock);
    expect(drops(query).map(([sql]) => sql)).toEqual(
      expect.arrayContaining([
        expect.stringContaining(`DROP TABLE IF EXISTS "work_log_entries"`),
        expect.stringContaining(`DROP TABLE IF EXISTS "invoices"`),
        expect.stringContaining(`DROP TABLE IF EXISTS "invoicing_settings"`),
      ]),
    );
  });

  it("down() does not lock or query rows if tables are already gone", async () => {
    const { query, runner } = runnerWith({ tablesExist: false, hasRows: true });

    await new AddInvoicingTables1795600000000().down(runner);

    expect(query.mock.calls.some(([sql]) => String(sql).includes("EXISTS (SELECT 1 FROM"))).toBe(
      false,
    );
  });
});
