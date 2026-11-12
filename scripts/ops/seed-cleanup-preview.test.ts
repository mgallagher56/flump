import { afterAll, beforeAll, describe, expect, spyOn, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  RemoveSeededExampleData1794355400000,
  SEEDED_TAX_FINGERPRINTS,
} from "../../apps/backend/src/migrations/RemoveSeededExampleData1794355400000";
import { DB_TESTS_ENABLED, runInTransaction, runPsql, withClient } from "./db-test-support";
import { buildPreviewSql } from "./seed-cleanup-preview";
import {
  buildSyntheticDatabase,
  OWNER,
  SENTINEL_NAME,
  seedLikeFingerprints,
  tableCounts,
} from "./seed-fixtures";

const MIGRATION_SOURCE = readFileSync(
  resolve(
    import.meta.dir,
    "../../apps/backend/src/migrations/RemoveSeededExampleData1794355400000.ts",
  ),
  "utf8",
);
const ANSI = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, "g");
const squash = (text: string): string => text.replace(/\s+/g, " ").trim();

describe("seed-cleanup-preview (SQL generation)", () => {
  const sql = buildPreviewSql();

  test("has a count query per migration label", () => {
    for (const label of ["taxRecords|", "accounts|", "budgetEntries|", "mockIdentityRows|"]) {
      expect(sql).toContain(`SELECT '${label}`);
    }
    expect(sql).toContain("owner.taxRecords|");
    expect(sql).toContain("summary|taxRecords=");
  });

  test("is read-only: no mutating statements, wrapped in a READ ONLY transaction", () => {
    expect(sql).toContain("BEGIN READ ONLY;");
    expect(sql.trimEnd().endsWith("\\echo '== OK: preview complete'")).toBe(true);
    expect(sql.indexOf("ROLLBACK;")).toBeGreaterThan(sql.indexOf("BEGIN READ ONLY;"));
    expect(sql.indexOf("== OK: preview complete")).toBeGreaterThan(sql.indexOf("ROLLBACK;"));
    expect(sql).not.toMatch(/^\s*(DELETE|UPDATE|INSERT|DROP|TRUNCATE|ALTER)\b/im);
  });

  test("requires and validates the owner before any count runs", () => {
    expect(sql).not.toContain("owner overlap skipped");
    const guard = sql.indexOf("owner is required");
    expect(guard).toBeGreaterThan(-1);
    expect(guard).toBeLessThan(sql.indexOf("BEGIN READ ONLY;"));
    expect(sql).toContain("placeholder");
  });

  test("embeds the migration's fingerprints and predicates, none hardcoded here", () => {
    for (const fingerprint of SEEDED_TAX_FINGERPRINTS) expect(sql).toContain(fingerprint);
    const own = readFileSync(resolve(import.meta.dir, "seed-cleanup-preview.ts"), "utf8");
    expect(own).not.toMatch(/\b[0-9a-f]{32}\b/);
    expect(own).toContain("RemoveSeededExampleData1794355400000");
  });

  test("account and budget predicates are verbatim copies of the migration's WHERE clauses", () => {
    const whereClauses = [
      ...MIGRATION_SOURCE.matchAll(/WHERE a\."name" = s\."name"[\s\S]*?`/g),
    ].map((m) => m[0]);
    const budgetWhere = [
      ...MIGRATION_SOURCE.matchAll(/WHERE b\."is_default" = true[\s\S]*?`/g),
    ].map((m) => m[0]);
    expect(whereClauses).toHaveLength(1);
    expect(budgetWhere).toHaveLength(1);
    const text = squash(sql);
    expect(text).toContain(squash(whereClauses[0].slice(0, -1)));
    expect(text).toContain(squash(budgetWhere[0].slice(0, -1)));
  });

  test("rejects a malformed fingerprint instead of building SQL from it", () => {
    expect(() => buildPreviewSql({ taxFingerprints: ["x'; DROP TABLE accounts;--"] })).toThrow();
  });
});

describe.skipIf(!DB_TESTS_ENABLED)("seed-cleanup-preview (real Postgres)", () => {
  let fingerprints: string[] = [];
  let previewOut = "";
  let countsBefore: Record<string, number> = {};
  let countsAfter: Record<string, number> = {};
  let logged = "";
  let ownerPlainTaxRowsAfter = 0;
  let sentinelRowsAfter = 0;
  let previewDidNotChange = false;

  beforeAll(async () => {
    await withClient(async (client) => {
      await buildSyntheticDatabase(client);
      fingerprints = await seedLikeFingerprints(client);
      countsBefore = await tableCounts(client);

      const preview = buildPreviewSql({ taxFingerprints: fingerprints });
      previewOut = runPsql(preview, { owner: OWNER }).stdout;
      previewDidNotChange =
        JSON.stringify(await tableCounts(client)) === JSON.stringify(countsBefore);

      // Nest's Logger writes the migration's "Removed seeded example data" line to stdout.
      const originalWrite = process.stdout.write.bind(process.stdout);
      const spy = spyOn(process.stdout, "write").mockImplementation(((chunk: unknown) => {
        logged += String(chunk).replace(ANSI, "");
        return true;
      }) as typeof process.stdout.write);
      try {
        await runInTransaction(client, new RemoveSeededExampleData1794355400000(fingerprints));
      } finally {
        spy.mockRestore();
        process.stdout.write = originalWrite;
      }
      countsAfter = await tableCounts(client);
      ownerPlainTaxRowsAfter = (
        await client.query(
          `SELECT count(*)::int AS n FROM tax_records WHERE user_id = $1 AND name IN ('owner-plain-tax', $2)`,
          [OWNER, SENTINEL_NAME],
        )
      ).rows[0].n;
      sentinelRowsAfter = Number(
        (
          await client.query(
            `SELECT (SELECT count(*)::int FROM accounts WHERE name = $1) + (SELECT count(*) FROM budget_entries WHERE name = $1)
             + (SELECT count(*) FROM user_profiles WHERE display_name = $1) + (SELECT count(*) FROM mcp_tokens WHERE name = $1)
             + (SELECT count(*) FROM bank_connections WHERE institution_name = $1) AS n`,
            [SENTINEL_NAME],
          )
        ).rows[0].n,
      );
    });
  });

  afterAll(async () => {
    // Leave the throwaway database without the synthetic data.
    await withClient(async (client) => {
      await client.query("DROP SCHEMA public CASCADE");
      await client.query("CREATE SCHEMA public");
    });
  });

  const parse = (out: string, key: string): number => {
    const line = out.split("\n").find((l) => l.startsWith(`${key}|`));
    if (!line) throw new Error(`missing ${key} in preview output`);
    return Number(line.split("|")[1]);
  };
  const loggedCount = (label: string): number => {
    const match = logged.match(new RegExp(`${label}=(\\d+)`));
    if (!match) throw new Error(`missing ${label} in migration log`);
    return Number(match[1]);
  };

  test("the synthetic data actually exercises each delete", () => {
    expect(loggedCount("taxRecords")).toBeGreaterThan(0);
    expect(loggedCount("accounts")).toBeGreaterThan(0);
    expect(loggedCount("budgetEntries")).toBeGreaterThan(0);
    expect(loggedCount("mockIdentityRows")).toBeGreaterThan(0);
  });

  test("preview counts equal the migration's logged counts", () => {
    expect(parse(previewOut, "taxRecords")).toBe(loggedCount("taxRecords"));
    expect(parse(previewOut, "accounts")).toBe(loggedCount("accounts"));
    expect(parse(previewOut, "budgetEntries")).toBe(loggedCount("budgetEntries"));
    expect(parse(previewOut, "mockIdentityRows")).toBe(loggedCount("mockIdentityRows"));
    const summary = previewOut.split("\n").find((l) => l.startsWith("summary|"));
    expect(summary?.replace("summary|", "Removed seeded example data: ")).toBe(
      logged.match(/Removed seeded example data: .*/)?.[0],
    );
  });

  test("preview counts equal the actual row deltas", () => {
    const deleted = (table: string) => countsBefore[table] - countsAfter[table];
    expect(deleted("tax_records")).toBe(
      loggedCount("taxRecords") + parse(previewOut, "mockIdentityRows.tax_records"),
    );
    expect(deleted("accounts")).toBe(
      loggedCount("accounts") + parse(previewOut, "mockIdentityRows.accounts"),
    );
    expect(deleted("budget_entries")).toBe(
      loggedCount("budgetEntries") + parse(previewOut, "mockIdentityRows.budget_entries"),
    );
    for (const table of [
      "account_details",
      "transactions",
      "bank_connections",
      "mcp_tokens",
      "user_profiles",
    ]) {
      expect(deleted(table)).toBe(parse(previewOut, `mockIdentityRows.${table}`));
    }
  });

  test("owner overlap is reported, and the owner's non-matching rows are untouched", () => {
    expect(parse(previewOut, "owner.taxRecords")).toBe(1);
    expect(parse(previewOut, "owner.accounts")).toBe(1);
    expect(parse(previewOut, "owner.budgetEntries")).toBe(1);
    expect(ownerPlainTaxRowsAfter).toBe(2);
    expect(sentinelRowsAfter).toBeGreaterThanOrEqual(5);
  });

  test("a valid owner passes and the output ends with the OK marker", () => {
    expect(previewOut.trimEnd().split("\n").at(-1)).toBe("== OK: preview complete");
    expect(previewOut).toContain("summary|");
  });

  test("a missing owner aborts non-zero with a clear message and no counts", () => {
    const result = runPsql(buildPreviewSql({ taxFingerprints: fingerprints }));
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain("owner");
    expect(result.stdout).not.toContain("summary|");
    expect(result.stdout).not.toContain("== OK: preview complete");
  });

  test.each([
    "",
    "<WorkOS user id>",
    "your-user-id",
    "YOUR_ID",
    "owner",
    "user_xxx",
    "changeme",
    "TODO",
    "placeholder",
    "xxx",
    "user_mock",
    "dev_user_123",
  ])("owner %j is rejected non-zero with no counts", (owner) => {
    const result = runPsql(buildPreviewSql({ taxFingerprints: fingerprints }), { owner });
    expect(result.exitCode).not.toBe(0);
    expect(result.stdout).not.toContain("summary|");
    expect(result.stdout).not.toContain("== OK: preview complete");
  });

  test("the preview itself changed nothing and printed no row values", () => {
    expect(previewDidNotChange).toBe(true);
    expect(previewOut).not.toContain(SENTINEL_NAME);
    expect(previewOut).not.toContain(OWNER);
  });
});
