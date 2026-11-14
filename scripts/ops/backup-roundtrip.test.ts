// Automated restore test (BE-03): seed a database with the real migrations, the synthetic
// personas and a table of awkward types, back it up with backup-run.ts (encrypted), restore it
// with backup-restore.ts into an empty database, and prove every row count and checksum matches.
//
// Needs TEST_DATABASE_URL (a local throwaway database; a sibling `<name>_restore` database is
// created and dropped on the same server), pg_dump/pg_restore/psql at least as new as the server,
// and age + age-keygen. Skips when any is missing, unless REQUIRE_BACKUP_ROUNDTRIP=1 (the
// backup workflow, .github/workflows/backup.yml), which turns a missing tool into a failure.
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { SQL } from "bun";
import type { Client } from "pg";
import { discoverMigrations } from "../../apps/backend/src/testing/discoverMigrations";
import { fingerprintInTransaction, fingerprintLines } from "./backup-lib";
import {
  DB_TESTS_ENABLED,
  guardTestDatabase,
  resetSchema,
  runInTransaction,
  withClient,
} from "./db-test-support";
import { seedSynthetic } from "./seed-synthetic";
import { SYNTHETIC_PERSONAS } from "./synthetic-personas";

const HERE = import.meta.dir;
const BACKUP = resolve(HERE, "backup-run.ts");
const RESTORE = resolve(HERE, "backup-restore.ts");
const VERIFY_SQL = resolve(HERE, "verify-restore.sql");
const FINGERPRINT_SQL = resolve(HERE, "restore-fingerprint.sql");
const env: Record<string, string | undefined> = process.env;

function major(cmd: string): number {
  if (!Bun.which(cmd)) return 0;
  const out = Bun.spawnSync([cmd, "--version"]).stdout.toString();
  return Number(out.match(/(\d+)/)?.[1] ?? 0);
}

function missingTools(): string[] {
  const missing: string[] = [];
  for (const tool of ["pg_dump", "pg_restore", "psql"]) {
    if (major(tool) < 18) missing.push(`${tool} >= 18`);
  }
  for (const tool of ["age", "age-keygen"]) if (!Bun.which(tool)) missing.push(tool);
  return missing;
}

const missing = DB_TESTS_ENABLED ? missingTools() : [];
if (env.REQUIRE_BACKUP_ROUNDTRIP === "1" && (!DB_TESTS_ENABLED || missing.length > 0)) {
  throw new Error(
    `REQUIRE_BACKUP_ROUNDTRIP=1 but the roundtrip cannot run: ${
      DB_TESTS_ENABLED ? `missing ${missing.join(", ")}` : "TEST_DATABASE_URL is not set"
    }`,
  );
}
const ENABLED = DB_TESTS_ENABLED && missing.length === 0;

function withDatabase(url: string, name: string): string {
  const u = new URL(url);
  u.pathname = `/${name}`;
  return u.toString();
}

interface Proc {
  exitCode: number;
  stdout: string;
  stderr: string;
}

function spawn(argv: string[], extraEnv: Record<string, string>): Proc {
  const proc = Bun.spawnSync(argv, {
    env: { ...process.env, DATABASE_URL: "", ...extraEnv },
    stdout: "pipe",
    stderr: "pipe",
  });
  return {
    exitCode: proc.exitCode ?? 1,
    stdout: proc.stdout.toString(),
    stderr: proc.stderr.toString(),
  };
}

function psql(url: string, file: string, vars: string[] = []): Proc {
  return spawn(["psql", url, "-X", ...vars.flatMap((v) => ["-v", v]), "-f", file], {});
}

describe.skipIf(!ENABLED)("backup and restore roundtrip (real Postgres)", () => {
  let sourceUrl: string;
  let restoreUrl: string;
  let restoreDb: string;
  let databaseName: string;
  let originalComment: string | null = null;
  let work: string;
  let dest: string;
  let identity: string;
  let recipient: string;
  let migrationCount = 0;

  const backupEnv = () => ({
    BACKUP_DATABASE_URL: sourceUrl,
    BACKUP_DESTINATION: `file://${dest}`,
    BACKUP_AGE_RECIPIENTS: recipient,
    BACKUP_LABEL: "roundtrip",
  });
  const restoreEnv = (identityFile = identity) => ({
    BACKUP_DATABASE_URL: sourceUrl,
    RESTORE_DATABASE_URL: restoreUrl,
    BACKUP_DESTINATION: `file://${dest}`,
    BACKUP_AGE_IDENTITY_FILE: identityFile,
  });
  const restore = (args: string[], identityFile?: string) =>
    spawn(["bun", RESTORE, ...args, "--label", "roundtrip"], restoreEnv(identityFile));

  async function setComment(client: Client, comment: string | null) {
    await client.query(
      `COMMENT ON DATABASE "${databaseName.replaceAll('"', '""')}" IS ${
        comment === null ? "NULL" : `'${comment.replaceAll("'", "''")}'`
      }`,
    );
  }

  beforeAll(async () => {
    sourceUrl = guardTestDatabase();
    work = mkdtempSync(join(tmpdir(), "backup-roundtrip-"));
    dest = join(work, "dest");
    identity = join(work, "key.txt");
    const keygen = spawn(["age-keygen", "-o", identity], {});
    recipient = (keygen.stderr + keygen.stdout).match(/age1[0-9a-z]{58}/)?.[0] ?? "";
    expect(recipient).not.toBe("");

    await withClient(async (client) => {
      databaseName = (await client.query("SELECT current_database() AS d")).rows[0].d;
      originalComment =
        (
          await client.query(
            "SELECT shobj_description(oid, 'pg_database') AS c FROM pg_database WHERE datname = current_database()",
          )
        ).rows[0].c ?? null;

      // Source: the real schema, as TypeORM leaves it.
      await resetSchema(client);
      const migrations = await discoverMigrations();
      for (const Migration of migrations) {
        await runInTransaction(client, new (Migration as new () => never)());
      }
      await client.query(
        "CREATE TABLE migrations (id SERIAL PRIMARY KEY, timestamp bigint NOT NULL, name varchar NOT NULL)",
      );
      for (const m of migrations) {
        await client.query("INSERT INTO migrations (timestamp, name) VALUES ($1, $2)", [
          Number(m.name.slice(-13)),
          m.name,
        ]);
      }
      migrationCount = migrations.length;

      // Realistic rows: every synthetic persona (the seed insists on the staging marker).
      await setComment(client, "flump-staging");
      try {
        const keys = Object.keys(SYNTHETIC_PERSONAS) as Array<keyof typeof SYNTHETIC_PERSONAS>;
        const assignment = Object.fromEntries(
          keys.map((k, i) => [k, `user_SYNTHETIC${k}ROUNDTRIP0${i + 1}`]),
        );
        await seedSynthetic(client as never, assignment);
      } finally {
        await setComment(client, originalComment);
      }

      // Awkward types whose text form depends on session settings, plus NULLs and odd text.
      await client.query(`CREATE TABLE backup_fixture (
        id bigserial PRIMARY KEY, amount numeric(12,2), ratio double precision,
        at timestamptz, day date, span interval, doc jsonb, raw bytea, label text,
        tags text[], flag boolean, ref uuid)`);
      await client.query(`INSERT INTO backup_fixture
          (amount, ratio, at, day, span, doc, raw, label, tags, flag, ref)
        SELECT g * 1.37, g / 3.0, timestamptz '2026-03-29 00:30:00+00' + g * interval '17 minutes',
          date '2025-04-05' + g, g * interval '1 day 2 hours',
          jsonb_build_object('n', g, 'note', 'fünf £ "quoted"'),
          decode(md5(g::text), 'hex'),
          CASE WHEN g % 7 = 0 THEN NULL ELSE E'line one\\nline two \\u2014 ' || g END,
          ARRAY['a', g::text], g % 2 = 0, md5(g::text)::uuid
        FROM generate_series(1, 2500) AS g`);

      // Restore target: an empty sibling database on the same server.
      restoreDb = `${databaseName}_restore`;
      await client.query(`DROP DATABASE IF EXISTS "${restoreDb}" WITH (FORCE)`);
      await client.query(`CREATE DATABASE "${restoreDb}"`);
    });
    restoreUrl = withDatabase(sourceUrl, restoreDb);
  });

  afterAll(async () => {
    rmSync(work, { recursive: true, force: true });
    if (restoreDb) {
      await withClient(async (client) => {
        await client.query(`DROP DATABASE IF EXISTS "${restoreDb}" WITH (FORCE)`);
      });
    }
  });

  test("backup-run.ts writes only encrypted objects and never prints the URL", () => {
    const r = spawn(["bun", BACKUP], backupEnv());
    expect(r.stderr).toBe("");
    expect(r.exitCode).toBe(0);
    expect(r.stdout + r.stderr).not.toContain(sourceUrl);
    expect(r.stdout).toContain(`migrations: ${migrationCount}`);
    const files = readdirSync(dest).sort();
    expect(files).toHaveLength(2);
    expect(files[0]).toMatch(/^flump-roundtrip-\d{8}T\d{6}Z\.dump\.age$/);
    expect(files[1]).toMatch(/^flump-roundtrip-\d{8}T\d{6}Z\.manifest\.json\.age$/);
    for (const f of files) {
      expect(readFileSync(join(dest, f)).subarray(0, 21).toString()).toBe("age-encryption.org/v1");
    }
  });

  test("backup-restore.ts restores into an empty database and every table matches", () => {
    const r = restore(["--latest"]);
    expect(r.stderr).toBe("");
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain("RESULT|PASS");
    expect(r.stdout).toContain(`migrations: ${migrationCount} (backup had ${migrationCount})`);
    expect(r.stdout).not.toContain("MISMATCH");
    const tables = Number(r.stdout.match(/tables_checked: (\d+)/)?.[1]);
    expect(tables).toBeGreaterThanOrEqual(12);
    expect(Number(r.stdout.match(/rows_checked: (\d+)/)?.[1])).toBeGreaterThan(2500);
  });

  test("the restored database passes the migrations and sequence checks", () => {
    const r = psql(restoreUrl, VERIFY_SQL, [`expected_migrations=${migrationCount}`]);
    expect(r.stderr).toBe("");
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain("RESULT|PASS");
  });

  test("restore-fingerprint.sql gives identical output on source and restore, matching the TS fingerprint", async () => {
    const source = psql(sourceUrl, FINGERPRINT_SQL);
    const restored = psql(restoreUrl, FINGERPRINT_SQL);
    expect(source.exitCode).toBe(0);
    expect(restored.stdout).toBe(source.stdout);
    const sql = new SQL(sourceUrl, { max: 1 });
    try {
      const fp = await sql.begin("ISOLATION LEVEL REPEATABLE READ READ ONLY", (tx) =>
        fingerprintInTransaction(tx),
      );
      expect(source.stdout.trim().split("\n")).toEqual(fingerprintLines(fp));
    } finally {
      await sql.close();
    }
  });

  test("a changed or deleted row is caught by --verify-only and names the table", async () => {
    const sql = new SQL(restoreUrl, { max: 1 });
    try {
      await sql.unsafe("UPDATE backup_fixture SET amount = amount + 0.01 WHERE id = 42");
      let r = restore(["--latest", "--verify-only"]);
      expect(r.exitCode).toBe(1);
      expect(r.stdout).toContain("MISMATCH public.backup_fixture: same row count (2500)");
      expect(r.stdout).toContain("RESULT|FAIL");

      await sql.unsafe("DELETE FROM backup_fixture WHERE id = 42");
      r = restore(["--latest", "--verify-only"]);
      expect(r.exitCode).toBe(1);
      expect(r.stdout).toContain("MISMATCH public.backup_fixture: rows 2499, expected 2500");
    } finally {
      await sql.close();
    }
  });

  test("a non-empty target is refused unless it carries the marker and --replace names it", async () => {
    let r = restore(["--latest"]);
    expect(r.exitCode).toBe(2);
    expect(r.stderr).toContain("already has");
    expect(r.stderr).not.toContain("--confirm"); // never hands out the wipe command

    // No marker on the database: refused even with the right name.
    r = restore(["--latest", "--replace", "--confirm", restoreDb]);
    expect(r.exitCode).toBe(2);
    expect(r.stderr).toContain("flump-restore-target");

    const sql = new SQL(restoreUrl, { max: 1 });
    try {
      await sql.unsafe(`COMMENT ON DATABASE "${restoreDb}" IS 'flump-restore-target'`);
    } finally {
      await sql.close();
    }
    r = restore(["--latest", "--replace", "--confirm", "wrong_db"]);
    expect(r.exitCode).toBe(2);
    expect(r.stderr).toContain("--confirm with the target database name");
    r = restore(["--latest", "--replace", "--confirm", restoreDb]);
    expect(r.stderr).toBe("");
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain("RESULT|PASS");
  });

  test("the wrong age identity cannot decrypt, and the error names no secret", () => {
    const other = join(work, "other-key.txt");
    spawn(["age-keygen", "-o", other], {});
    const r = restore(["--latest", "--verify-only"], other);
    expect(r.exitCode).toBe(1);
    expect(r.stderr).toContain("could not decrypt");
    expect(r.stderr).not.toContain(restoreUrl);
  });
  test("a backup taken while the app writes still restores to an exact match", async () => {
    const db2 = `${databaseName}_restore2`;
    await withClient(async (client) => {
      await client.query(`DROP DATABASE IF EXISTS "${db2}" WITH (FORCE)`);
      await client.query(`CREATE DATABASE "${db2}"`);
    });
    const writer = new SQL(sourceUrl, { max: 1 });
    let writing = true;
    let written = 0;
    const loop = (async () => {
      while (writing) {
        await writer.unsafe(
          "INSERT INTO backup_fixture (amount, label) SELECT 1.23, 'concurrent' FROM generate_series(1, 20)",
        );
        written += 20;
      }
    })();
    try {
      const proc = Bun.spawn(["bun", BACKUP], {
        env: { ...process.env, DATABASE_URL: "", ...backupEnv(), BACKUP_LABEL: "concurrent" },
        stdout: "pipe",
        stderr: "pipe",
      });
      expect(await proc.exited).toBe(0);
    } finally {
      writing = false;
      await loop;
      await writer.close();
    }
    expect(written).toBeGreaterThan(0);

    const r = spawn(["bun", RESTORE, "--latest", "--label", "concurrent"], {
      ...restoreEnv(),
      RESTORE_DATABASE_URL: withDatabase(sourceUrl, db2),
    });
    await withClient(async (client) => {
      await client.query(`DROP DATABASE IF EXISTS "${db2}" WITH (FORCE)`);
    });
    expect(r.stderr).toBe("");
    expect(r.stdout).toContain("RESULT|PASS");
  }, 60_000);
});
