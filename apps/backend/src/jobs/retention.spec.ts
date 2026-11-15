import { getMetadataArgsStorage } from "typeorm";
import { describe, expect, it } from "vitest";
import { ENTITIES } from "../config/typeorm.options";
import {
  describeRetentionReport,
  type Queryable,
  RETENTION_POLICIES,
  runRetentionPurge,
} from "./retention";

/** Tables whose expires_at is not a retention date, with the reason. */
const EXPIRES_AT_NOT_RETENTION: Record<string, string> = {
  bank_connections:
    "expires_at is the provider access token's expiry; the row lives until disconnect or erasure",
};

describe("retention policies (BE-06, D4)", () => {
  it("every entity table with an expires_at column has a policy", () => {
    const columns = getMetadataArgsStorage().columns;
    const tables = getMetadataArgsStorage()
      .tables.filter((t) => ENTITIES.includes(t.target as never))
      .filter((t) => columns.some((c) => c.target === t.target && c.options.name === "expires_at"))
      .map((t) => t.name);
    const covered = new Set([
      ...RETENTION_POLICIES.map((p) => p.table),
      ...Object.keys(EXPIRES_AT_NOT_RETENTION),
    ]);
    expect(tables.length).toBeGreaterThan(0);
    expect(tables.filter((t) => t && !covered.has(t))).toEqual([]);
  });

  it("names are unique and every policy says why", () => {
    const names = RETENTION_POLICIES.map((p) => p.name);
    expect(new Set(names).size).toBe(names.length);
    for (const p of RETENTION_POLICIES) {
      expect(p.reason.length).toBeGreaterThan(10);
      expect(p.where).toContain("$1");
    }
  });

  it("describes a report as names and counts only", () => {
    expect(
      describeRetentionReport({
        skipped: false,
        deleted: { audit_events: 3, import_batches: 0 },
        inactiveAccountsDue: 1,
      }),
    ).toEqual([
      "retention audit_events deleted=3",
      "retention import_batches deleted=0",
      "retention inactive_accounts_due=1",
    ]);
    expect(describeRetentionReport({ skipped: true, deleted: {}, inactiveAccountsDue: 0 })).toEqual(
      ["retention skipped: another run holds the lock"],
    );
  });
});

describe("retention and the audit_events delete guard (SEC-F)", () => {
  const NOW = new Date("2026-11-15T03:15:00Z");
  const audit = RETENTION_POLICIES.filter((p) => p.table === "audit_events");
  const other = RETENTION_POLICIES.filter((p) => p.table === "import_batches");

  /** Records each statement's first words; `failDelete` makes the DELETE throw. */
  function fakeDb(failDelete = false): { db: Queryable; calls: string[] } {
    const calls: string[] = [];
    const db: Queryable = {
      query: async (sql, params) => {
        const text = sql.trim();
        if (text.startsWith("WITH doomed")) {
          calls.push("DELETE");
          if (failDelete) throw new Error("delete refused");
          return [];
        }
        if (text.includes("set_config")) {
          calls.push(`set_config ${String(params?.[0])}=${String(params?.[1])}`);
          return [];
        }
        if (text.includes("pg_try_advisory_lock")) return [{ locked: true }];
        if (text.includes("to_regclass")) return [{ t: "x" }];
        if (text.includes("count(*)")) return [{ n: 0 }];
        if (text.includes("pg_advisory_unlock")) {
          calls.push("UNLOCK");
          return [];
        }
        calls.push(text);
        return [];
      },
    };
    return { db, calls };
  }

  it("only audit_events is marked for the guarded delete", () => {
    expect(RETENTION_POLICIES.filter((p) => p.guardedAuditDelete).map((p) => p.table)).toEqual([
      "audit_events",
    ]);
  });

  it("declares the retention reason inside a transaction around each audit_events batch", async () => {
    const { db, calls } = fakeDb();
    await runRetentionPurge(db, NOW, audit);
    expect(calls).toEqual([
      "BEGIN",
      "set_config flump.audit_delete=retention",
      "DELETE",
      "COMMIT",
      "UNLOCK",
    ]);
  });

  it("rolls back and rethrows when the audit_events delete fails, then releases the lock", async () => {
    const { db, calls } = fakeDb(true);
    await expect(runRetentionPurge(db, NOW, audit)).rejects.toThrow("delete refused");
    expect(calls).toEqual([
      "BEGIN",
      "set_config flump.audit_delete=retention",
      "DELETE",
      "ROLLBACK",
      "UNLOCK",
    ]);
  });

  it("other tables delete as before: no transaction and no reason", async () => {
    const { db, calls } = fakeDb();
    await runRetentionPurge(db, NOW, other);
    expect(calls).toEqual(["DELETE", "UNLOCK"]);
  });
});
