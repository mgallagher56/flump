import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { assertSafeTestDatabase } from "../../apps/backend/src/testing/assertSafeTestDatabase";
import {
  DB_TESTS_ENABLED,
  guardTestDatabase,
  TEST_DATABASE_URL,
  withClient,
} from "./db-test-support";
import { buildSyntheticDatabase, OWNER, tableCounts } from "./seed-fixtures";

const RESTORE = resolve(import.meta.dir, "restore-to-staging.sh");
const BACKUP = resolve(import.meta.dir, "backup-dump.sh");
const LIB = resolve(import.meta.dir, "lib-staging.sh");
const VERIFY_SQL = readFileSync(resolve(import.meta.dir, "verify-restore.sql"), "utf8");

const PROD = "postgres://prod_user:s3cretprod@prod.example.com:5432/flump";
const STAGING = "postgres://stg_user:s3cretstg@stg.example.com:5432/flump_staging";
const SECRETS = ["s3cretprod", "s3cretstg", "prod_user", "stg_user"];

const work = mkdtempSync(join(tmpdir(), "restore-to-staging-test-"));
afterAll(() => rmSync(work, { recursive: true, force: true }));

function stub(name: string, body: string): string {
  const path = join(work, name);
  writeFileSync(path, `#!/usr/bin/env bash\n${body}\n`);
  chmodSync(path, 0o755);
  return path;
}

// Stub psql: logs every call; answers the marker and object-count queries from STUB_* variables.
const stubPsql = stub(
  "psql-stub",
  `echo psql >> "$STUB_LOG"
case "$*" in
  *shobj_description*) [ "\${STUB_PSQL_FAIL:-0}" = 1 ] && exit 2; printf '%s\\n' "\${STUB_COMMENT-}"; exit 0 ;;
  *"FROM pg_class"*) echo "\${STUB_COUNT:-0}"; exit 0 ;;
esac
cat >/dev/null; echo "accounts|1"`,
);
const stubRestore = stub("pg-restore-stub", `echo pg_restore >> "$STUB_LOG"; cat >/dev/null`);

let counter = 0;
function run(args: string[], env: Record<string, string> = {}, stdin = "") {
  const log = join(work, `calls-${counter++}.log`);
  const proc = Bun.spawnSync(["bash", RESTORE, ...args], {
    env: {
      ...process.env,
      PGURL: PROD,
      STAGING_PGURL: STAGING,
      OWNER: "owner_x",
      PSQL: stubPsql,
      PG_RESTORE: stubRestore,
      STUB_LOG: log,
      STUB_COMMENT: "flump-staging",
      STUB_COUNT: "0",
      ...env,
    },
    stdin: new TextEncoder().encode(stdin),
    stdout: "pipe",
    stderr: "pipe",
  });
  const calls = existsSync(log) ? readFileSync(log, "utf8").split("\n").filter(Boolean) : [];
  return {
    exitCode: proc.exitCode,
    out: proc.stdout.toString() + proc.stderr.toString(),
    stderr: proc.stderr.toString(),
    calls,
  };
}

function expectRefusal(result: ReturnType<typeof run>, text: string) {
  expect(result.exitCode).toBe(2);
  expect(result.stderr).toContain(text);
  for (const secret of SECRETS) expect(result.out).not.toContain(secret);
  expect(result.calls).not.toContain("pg_restore");
}

describe("restore-to-staging.sh guard refusals (no database)", () => {
  test("prints usage without a dump", () => {
    const r = run([]);
    expect(r.exitCode).toBe(2);
    expect(r.stderr).toContain("usage:");
    expect(r.calls).toEqual([]);
  });

  test("refuses when STAGING_PGURL is missing, before any tool runs", () => {
    const r = run([import.meta.path], { STAGING_PGURL: "" });
    expectRefusal(r, "STAGING_PGURL is required");
    expect(r.calls).toEqual([]);
  });

  test("refuses when PGURL is missing, before any tool runs", () => {
    const r = run([import.meta.path], { PGURL: "" });
    expectRefusal(r, "PGURL is required");
    expect(r.calls).toEqual([]);
  });

  test("refuses when STAGING_PGURL equals PGURL", () => {
    const r = run([import.meta.path], { STAGING_PGURL: PROD });
    expectRefusal(r, "equals PGURL");
    expect(r.calls).toEqual([]);
  });

  test.each([
    ["other credentials", "postgres://x:s3cretstg@prod.example.com:5432/flump"],
    [
      "upper-case host and a query string",
      "postgres://x:s3cretstg@PROD.example.com:5432/flump?sslmode=require",
    ],
    ["default port", "postgres://x:s3cretstg@prod.example.com/flump"],
  ])("refuses the same host, port and database with %s", (_label, staging) => {
    const r = run([import.meta.path], { STAGING_PGURL: staging });
    expectRefusal(r, "same host, port and database");
    expect(r.calls).toEqual([]);
  });

  test("treats localhost and 127.0.0.1 as the same host", () => {
    const r = run([import.meta.path], {
      PGURL: "postgres://a:s3cretprod@localhost:5432/flump",
      STAGING_PGURL: "postgres://b:s3cretstg@127.0.0.1:5432/flump",
    });
    expectRefusal(r, "same host, port and database");
  });

  test("refuses a non-postgres URL", () => {
    const r = run([import.meta.path], { STAGING_PGURL: "mysql://u:s3cretstg@h/db" });
    expectRefusal(r, "not a postgres:// URL");
  });

  test("requires an owner id", () => {
    const r = run([import.meta.path], { OWNER: "" });
    expectRefusal(r, "owner id required");
  });

  test("rejects a missing dump file and an encrypted one", () => {
    expectRefusal(run(["--owner", "x", "/nonexistent/prod.dump"]), "dump file not found");
    const age = join(work, "x.dump.age");
    writeFileSync(age, "x");
    expectRefusal(run(["--owner", "x", age]), "decrypt the .age file first");
  });

  test("refuses when the database comment is not flump-staging", () => {
    for (const comment of ["flump-production", "", "flump-staging-2"]) {
      const r = run([import.meta.path], { STUB_COMMENT: comment });
      expectRefusal(r, "not 'flump-staging'");
      expect(r.calls).toEqual(["psql"]); // only the read-only marker query ran
    }
  });

  test("refuses when the marker cannot be read (cannot connect)", () => {
    const r = run([import.meta.path], { STUB_PSQL_FAIL: "1" });
    expectRefusal(r, "could not read the staging database comment");
  });

  test("refuses a non-empty public schema without --replace", () => {
    const r = run([import.meta.path], { STUB_COUNT: "9" });
    expectRefusal(r, "not empty");
    expect(r.stderr).toContain("--replace");
  });

  test.each(["", "yes\n", "restore-into-production\n"])(
    "--replace refuses without the typed confirmation (%j)",
    (typed) => {
      const r = run(["--replace", import.meta.path], { STUB_COUNT: "9" }, typed);
      expectRefusal(r, "confirmation not given");
      // Only read-only queries ran: marker and object count, never a DROP or a restore.
      expect(r.calls).toEqual(["psql", "psql"]);
    },
  );
});

describe("lib-staging.sh helpers (sourceable)", () => {
  const sh = (script: string, env: Record<string, string> = {}) => {
    const proc = Bun.spawnSync(["bash", "-c", `. "${LIB}"; ${script}`], {
      env: { ...process.env, PSQL: stubPsql, STUB_LOG: join(work, "lib.log"), ...env },
      stdout: "pipe",
      stderr: "pipe",
    });
    return {
      exitCode: proc.exitCode,
      stdout: proc.stdout.toString(),
      stderr: proc.stderr.toString(),
    };
  };

  test("assert_staging_marker passes only for exactly flump-staging", () => {
    expect(
      sh(`assert_staging_marker "${STAGING}"`, { STUB_COMMENT: "flump-staging" }).exitCode,
    ).toBe(0);
    const bad = sh(`assert_staging_marker "${STAGING}"`, { STUB_COMMENT: "flump-production" });
    expect(bad.exitCode).toBe(2);
    expect(bad.stderr + bad.stdout).not.toContain("s3cretstg");
    expect(sh(`assert_staging_marker ""`).exitCode).toBe(2);
  });

  test("conn_target strips credentials and normalises the host", () => {
    const r = sh(
      `conn_target "postgres://u:pw@LocalHost/db?x=1"; conn_target "postgres://u:p@w@h.example.com:6543/d"`,
    );
    expect(r.stdout.trim().split("\n")).toEqual(["127.0.0.1:5432/db", "h.example.com:6543/d"]);
  });
});

// ---------------------------------------------------------------------------------------------
// DB-backed: dump the CI test database, restore it into a SECOND test database marked
// flump-staging, and prove the guards and verify-restore.sql against real Postgres. Runs under
// REQUIRE_DB_TESTS (CI) or whenever TEST_DATABASE_URL is set.
//
// Tools: PSQL / PG_DUMP / PG_RESTORE from the environment if all are set (e.g. a `docker exec -i
// <container> psql` wrapper); otherwise the host client tools when they are at least as new as the
// server; otherwise `docker run --network host postgres:<server major>-alpine <tool>`.
// ---------------------------------------------------------------------------------------------
type Tools = { PSQL: string; PG_DUMP: string; PG_RESTORE: string };

function resolveTools(serverMajor: number): Tools {
  const env: Record<string, string | undefined> = process.env;
  if (env.PSQL && env.PG_DUMP && env.PG_RESTORE) {
    return { PSQL: env.PSQL, PG_DUMP: env.PG_DUMP, PG_RESTORE: env.PG_RESTORE };
  }
  const hostMajor = (tool: string): number => {
    if (!Bun.which(tool)) return 0;
    const out = Bun.spawnSync([tool, "--version"], { stdout: "pipe" }).stdout.toString();
    return Number(/(\d+)/.exec(out)?.[1] ?? 0);
  };
  if (["psql", "pg_dump", "pg_restore"].every((t) => hostMajor(t) >= serverMajor)) {
    return { PSQL: "psql", PG_DUMP: "pg_dump", PG_RESTORE: "pg_restore" };
  }
  const docker = `docker run --rm -i --network host postgres:${serverMajor}-alpine`;
  return {
    PSQL: `${docker} psql`,
    PG_DUMP: `${docker} pg_dump`,
    PG_RESTORE: `${docker} pg_restore`,
  };
}

describe.skipIf(!DB_TESTS_ENABLED)("backup-dump + restore-to-staging (real Postgres)", () => {
  let tools: Tools;
  let sourceUrl = "";
  let stagingUrl = "";
  let stagingDb = "";
  let outDir = "";
  let dump = "";
  let counts = "";

  const pg = async (url: string) => {
    const { Client } = (await import("../../apps/backend/node_modules/pg")) as {
      Client: new (config: { connectionString: string }) => import("pg").Client;
    };
    const client = new Client({ connectionString: url });
    await client.connect();
    return client;
  };
  const staging = async <T>(fn: (c: import("pg").Client) => Promise<T>): Promise<T> => {
    const client = await pg(stagingUrl);
    try {
      return await fn(client);
    } finally {
      await client.end();
    }
  };
  const restore = (args: string[], stdin = "", env: Record<string, string> = {}) => {
    const proc = Bun.spawnSync(
      [
        "bash",
        RESTORE,
        "--owner",
        OWNER,
        "--expected-migrations",
        "1",
        "--out-dir",
        outDir,
        ...args,
      ],
      {
        env: { ...process.env, ...tools, PGURL: sourceUrl, STAGING_PGURL: stagingUrl, ...env },
        stdin: new TextEncoder().encode(stdin),
        stdout: "pipe",
        stderr: "pipe",
      },
    );
    return {
      exitCode: proc.exitCode,
      out: proc.stdout.toString() + proc.stderr.toString(),
    };
  };
  const stagingPsql = (sql: string, vars: Record<string, string> = {}) => {
    const varArgs = Object.entries(vars).flatMap(([k, v]) => ["-v", `${k}=${v}`]);
    const proc = Bun.spawnSync(
      [...tools.PSQL.split(/\s+/), stagingUrl, "-X", ...varArgs, "-f", "-"],
      {
        stdin: new TextEncoder().encode(sql),
        stdout: "pipe",
        stderr: "pipe",
      },
    );
    return { exitCode: proc.exitCode, out: proc.stdout.toString() + proc.stderr.toString() };
  };

  beforeAll(async () => {
    sourceUrl = guardTestDatabase();
    const serverVersion = await withClient(async (c) => {
      const r = await c.query("SHOW server_version_num");
      return Number(r.rows[0].server_version_num);
    });
    tools = resolveTools(Math.floor(serverVersion / 10000));

    const source = new URL(sourceUrl);
    stagingDb = `${decodeURIComponent(source.pathname.replace(/^\//, ""))}_restore`;
    const target = new URL(sourceUrl);
    target.pathname = `/${stagingDb}`;
    stagingUrl = target.toString();
    assertSafeTestDatabase(stagingUrl, process.env); // local and "test" in the name, or throw

    await withClient(async (c) => {
      await buildSyntheticDatabase(c);
      await c.query(`DROP DATABASE IF EXISTS "${stagingDb}" WITH (FORCE)`);
      await c.query(`CREATE DATABASE "${stagingDb}"`);
      await c.query(`COMMENT ON DATABASE "${stagingDb}" IS 'flump-staging'`);
    });

    outDir = mkdtempSync(join(tmpdir(), "restore-staging-db-"));
  }, 60_000);

  afterAll(async () => {
    if (!TEST_DATABASE_URL) return;
    await withClient(async (c) => {
      await c.query(`DROP DATABASE IF EXISTS "${stagingDb}" WITH (FORCE)`);
      await c.query("DROP SCHEMA public CASCADE");
      await c.query("CREATE SCHEMA public");
    });
    rmSync(outDir, { recursive: true, force: true });
  }, 60_000);

  test("backup-dump.sh writes a dump, schema, checksum and before-counts without printing PGURL", async () => {
    const proc = Bun.spawnSync(
      ["bash", BACKUP, "--out-dir", join(outDir, "backups"), "--owner", OWNER],
      {
        env: { ...process.env, ...tools, PGURL: sourceUrl },
        stdout: "pipe",
        stderr: "pipe",
      },
    );
    const out = proc.stdout.toString() + proc.stderr.toString();
    expect(proc.exitCode).toBe(0);
    expect(out).not.toContain(new URL(sourceUrl).password);
    expect(out).not.toContain(sourceUrl);
    const value = (key: string) => new RegExp(`^${key}: (.+)$`, "m").exec(out)?.[1] ?? "";
    dump = value("dump_file");
    counts = value("counts_file");
    expect(existsSync(dump)).toBe(true);
    expect(existsSync(counts)).toBe(true);
    expect(existsSync(value("sha256_file"))).toBe(true);
    const tables = await withClient(async (c) => {
      const r = await c.query(
        "SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'",
      );
      return r.rows[0].n as number;
    });
    expect(Number(value("table_data_entries"))).toBe(tables);
  });

  test("restores into an empty staging database; counts diff is clean and verify passes", async () => {
    const r = restore(["--before-counts", counts, dump]);
    expect(r.out).toContain("restore_seconds:");
    expect(r.out).toContain("counts_diff: clean");
    expect(r.out).toContain("verify_restore: PASS");
    expect(r.exitCode).toBe(0);
    expect(r.out).not.toContain(new URL(stagingUrl).password);
    expect(r.out).not.toContain(stagingUrl);
    const expected = await withClient(tableCounts);
    const actual = await staging(tableCounts);
    expect(actual).toEqual(expected);
    expect(readFileSync(join(outDir, "staging-verify.txt"), "utf8")).toContain("RESULT|PASS");
  });

  test("a second restore refuses (public is not empty) and changes nothing", async () => {
    const before = await staging(tableCounts);
    const r = restore([dump]);
    expect(r.exitCode).toBe(2);
    expect(r.out).toContain("not empty");
    expect(await staging(tableCounts)).toEqual(before);
  });

  test("--replace with the wrong confirmation refuses and keeps the data", async () => {
    const before = await staging(tableCounts);
    const r = restore(["--replace", dump], "nope\n");
    expect(r.exitCode).toBe(2);
    expect(r.out).toContain("confirmation not given");
    expect(await staging(tableCounts)).toEqual(before);
  });

  test("--replace with the typed confirmation drops public and restores again", async () => {
    await staging((c) => c.query("CREATE TABLE leftover_from_before (x int)"));
    const r = restore(["--replace", "--before-counts", counts, dump], "restore-into-staging\n");
    expect(r.exitCode).toBe(0);
    expect(r.out).toContain("counts_diff: clean");
    expect(await staging(tableCounts)).toEqual(await withClient(tableCounts));
    const leftover = await staging((c) =>
      c.query("SELECT to_regclass('public.leftover_from_before') AS t"),
    );
    expect(leftover.rows[0].t).toBeNull();
  });

  test("a wrong expected migration count fails verify-restore and the run", () => {
    const bad = restore(["--replace", dump], "restore-into-staging\n", {});
    expect(bad.exitCode).toBe(0); // sanity: the default test expectation (1) passes
    const wrong = Bun.spawnSync(
      [
        "bash",
        RESTORE,
        "--owner",
        OWNER,
        "--expected-migrations",
        "9",
        "--out-dir",
        outDir,
        "--replace",
        dump,
      ],
      {
        env: { ...process.env, ...tools, PGURL: sourceUrl, STAGING_PGURL: stagingUrl },
        stdin: new TextEncoder().encode("restore-into-staging\n"),
        stdout: "pipe",
        stderr: "pipe",
      },
    );
    expect(wrong.exitCode).toBe(1);
    expect(wrong.stdout.toString()).toContain("verify_restore: FAIL");
    expect(readFileSync(join(outDir, "staging-verify.txt"), "utf8")).toContain("RESULT|FAIL");
  });

  test("verify-restore.sql flags a sequence that is behind max(id), and a missing table", async () => {
    const ok = restore(["--replace", dump], "restore-into-staging\n");
    expect(ok.exitCode).toBe(0);
    const pass = stagingPsql(VERIFY_SQL, { expected_migrations: "1" });
    expect(pass.exitCode).toBe(0);
    expect(pass.out).toContain("RESULT|PASS");
    expect(pass.out).toMatch(/sequences_checked\|[1-9]/);
    expect(pass.out).toContain("sequences_behind|0");

    await staging(async (c) => {
      await c.query("SELECT setval(pg_get_serial_sequence('account_details', 'id'), 1, false)");
    });
    const behind = stagingPsql(VERIFY_SQL, { expected_migrations: "1" });
    expect(behind.exitCode).not.toBe(0);
    expect(behind.out).toContain("RESULT|FAIL");

    await staging(async (c) => {
      await c.query("DROP TABLE mcp_tokens CASCADE");
    });
    const missing = stagingPsql(VERIFY_SQL, { expected_migrations: "1" });
    expect(missing.exitCode).not.toBe(0);
    expect(missing.out).toContain("mcp_tokens|missing");
  });

  test("verify-restore.sql is read-only and needs expected_migrations", () => {
    const code = VERIFY_SQL.split("\n")
      .filter((line) => !line.trimStart().startsWith("--"))
      .join("\n");
    expect(code).toContain("BEGIN READ ONLY;");
    expect(VERIFY_SQL.trimEnd().endsWith("ROLLBACK;")).toBe(true);
    expect(code).not.toMatch(/^\s*(DELETE|UPDATE|INSERT|DROP|TRUNCATE|ALTER|CREATE)\b/im);
    const missing = stagingPsql(VERIFY_SQL);
    expect(missing.exitCode).not.toBe(0);
    expect(missing.out).toContain("expected_migrations");
  });

  test("restore refuses once the marker is changed to flump-production", async () => {
    expect(restore(["--replace", dump], "restore-into-staging\n").exitCode).toBe(0);
    await withClient((c) => c.query(`COMMENT ON DATABASE "${stagingDb}" IS 'flump-production'`));
    const before = await staging(tableCounts);
    const r = restore(["--replace", dump], "restore-into-staging\n");
    expect(r.exitCode).toBe(2);
    expect(r.out).toContain("not 'flump-staging'");
    expect(await staging(tableCounts)).toEqual(before);
    await withClient((c) => c.query(`COMMENT ON DATABASE "${stagingDb}" IS 'flump-staging'`));
  });
});

// The static contract of the scripts: they never trace commands (which would print URLs).
describe("script hygiene", () => {
  test.each([RESTORE, BACKUP, LIB])("%s never enables xtrace", (file) => {
    expect(readFileSync(file, "utf8")).not.toMatch(/set -[a-z]*x|set -o xtrace/);
  });
});
