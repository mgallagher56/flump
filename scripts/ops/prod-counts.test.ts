import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { DB_TESTS_ENABLED, runPsql, withClient } from "./db-test-support";
import {
  buildSyntheticDatabase,
  OWNER,
  SENTINEL_NAME,
  SENTINEL_TOKEN,
  tableCounts,
} from "./seed-fixtures";

const SQL = readFileSync(resolve(import.meta.dir, "prod-counts.sql"), "utf8");

describe("prod-counts.sql (static)", () => {
  test("is read-only and contains no mutating statements", () => {
    expect(SQL).toContain("BEGIN READ ONLY;");
    expect(SQL.trimEnd().endsWith("ROLLBACK;")).toBe(true);
    const code = SQL.split("\n")
      .filter((line) => !line.trimStart().startsWith("--"))
      .join("\n");
    expect(code).not.toMatch(/^\s*(DELETE|UPDATE|INSERT|DROP|TRUNCATE|ALTER|CREATE)\b/im);
  });

  test("never selects token values or timestamps", () => {
    const code = SQL.split("\n")
      .filter((line) => !line.trimStart().startsWith("--") && !line.startsWith("\\echo"))
      .join("\n");
    // Token columns appear only as `<column> IS NOT NULL` filters.
    const uses = [...code.matchAll(/\b(access_token|refresh_token|token_hash)\b(?! IS NOT NULL)/g)];
    expect(uses).toHaveLength(0);
    expect(SQL).not.toMatch(/now\(\)|current_timestamp|clock_timestamp/i);
  });
});

describe.skipIf(!DB_TESTS_ENABLED)("prod-counts.sql (real Postgres)", () => {
  const run = () => runPsql(SQL, { owner: OWNER });

  beforeAll(async () => {
    await withClient(buildSyntheticDatabase);
  });

  afterAll(async () => {
    await withClient(async (client) => {
      await client.query("DROP SCHEMA public CASCADE");
      await client.query("CREATE SCHEMA public");
    });
  });

  test("prints per-table counts, token counts by status, mock and owner rows, migrations", async () => {
    const result = run();
    expect(result.exitCode).toBe(0);
    const lines = result.stdout.split("\n");
    const actual = await withClient(tableCounts);
    for (const [table, n] of Object.entries(actual)) expect(lines).toContain(`${table}|${n}`);

    // status|rows|with access_token|with refresh_token (owner rows plus one mock row)
    expect(lines).toContain("connected|2|2|1");
    expect(lines).toContain("error|1|0|1");
    expect(lines).toContain("disconnected|1|0|0");

    expect(lines).toContain("migrations_table|migrations");
    expect(lines).toContain("migrations_rows|1");
    expect(result.stdout).toContain("== rows owned by the owner");
    expect(result.stdout).toContain("== rows owned by the retired mock identities");
  });

  test("owner and mock sections count the right rows", () => {
    const out = run().stdout;
    const section = (title: string): string[] => {
      const after = out.split(title)[1] ?? "";
      return after.split("\n==")[0].split("\n").filter(Boolean).slice(0);
    };
    const owner = section("== rows owned by the owner (psql variable owner)");
    expect(owner).toContain("tax_records|3");
    expect(owner).toContain("accounts|2");
    expect(owner).toContain("bank_connections|3");
    const mock = section("== rows owned by the retired mock identities (user_mock, dev_user_123)");
    expect(mock).toContain("tax_records|2");
    expect(mock).toContain("account_details|2");
    expect(mock).toContain("user_profiles|1");
  });

  test("prints no row values: sentinels, tokens, owner id and timestamps never appear", () => {
    const out = run().stdout;
    for (const forbidden of [SENTINEL_NAME, SENTINEL_TOKEN, "mock-token", "mock-hash", OWNER]) {
      expect(out).not.toContain(forbidden);
    }
    expect(out).not.toMatch(/\d{4}-\d{2}-\d{2}/);
    // Every non-header line is `label|number` or a single known word.
    for (const line of out.split("\n").filter((l) => l && !l.startsWith("=="))) {
      expect(line).toMatch(/^[A-Za-z_]+\|(\d+|missing|migrations)(\|\d+)*$/);
    }
  });

  test("is deterministic: two runs on identical data are byte-identical", () => {
    expect(run().stdout).toBe(run().stdout);
  });

  test("fails clearly without the owner variable, and with an empty one", () => {
    const missing = runPsql(SQL);
    expect(missing.exitCode).not.toBe(0);
    expect(missing.stdout + missing.stderr).toContain("owner");
    const empty = runPsql(SQL, { owner: "" });
    expect(empty.exitCode).not.toBe(0);
  });

  test.each(["<WorkOS user id>", "your-id", "Owner", "user_xxx", "changeme", "user_mock"])(
    "rejects the placeholder owner %j",
    (owner) => {
      const result = runPsql(SQL, { owner });
      expect(result.exitCode).not.toBe(0);
      expect(result.stdout).not.toContain("per-table row counts");
    },
  );

  test("leaves the data unchanged", async () => {
    const before = await withClient(tableCounts);
    run();
    expect(await withClient(tableCounts)).toEqual(before);
  });

  test("reports missing tables and a missing migrations table instead of failing", async () => {
    await withClient(async (client) => {
      await client.query("DROP TABLE mcp_tokens");
      await client.query("DROP TABLE bank_connections");
      await client.query("DROP TABLE migrations");
    });
    const result = run();
    expect(result.exitCode).toBe(0);
    const lines = result.stdout.split("\n");
    expect(lines.filter((l) => l === "mcp_tokens|missing")).toHaveLength(3);
    expect(lines).toContain("bank_connections|missing");
    expect(lines).toContain("migrations_table|missing");
    expect(result.stdout).not.toContain("migrations_rows");
  });
});
