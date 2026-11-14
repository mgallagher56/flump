import { getMetadataArgsStorage } from "typeorm";
import { describe, expect, it } from "vitest";
import { ENTITIES } from "../config/typeorm.options";
import { describeRetentionReport, RETENTION_POLICIES } from "./retention";

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
