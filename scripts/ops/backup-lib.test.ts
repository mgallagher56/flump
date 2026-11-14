// Unit tests for the scheduled backup and restore (no database, no tools).
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  backupBaseName,
  ConfigError,
  compareFingerprints,
  connTarget,
  countTableData,
  databaseName,
  fingerprintLines,
  latestBackup,
  parseBackupEnv,
  parseDestination,
  parseManifest,
  parseRecipients,
  parseRestoreEnv,
  redact,
  sameDatabase,
  type TableFingerprint,
  tableFingerprintSql,
  withoutPassword,
} from "./backup-lib";
import { parseRestoreArgs } from "./backup-restore";

// Built at runtime so secret scanners do not read a fixture as a real credential.
const FAKE_PW = ["not", "a", "real", "pw"].join("-");
const PROD = `postgres://prod_user:${FAKE_PW}@prod.example.com:5432/flump`;
const RECIPIENT = `age1${"q".repeat(58)}`;

function expectConfigError(fn: () => unknown, message: string, secret?: string) {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(ConfigError);
    expect((error as Error).message).toContain(message);
    if (secret) expect((error as Error).message).not.toContain(secret);
    return;
  }
  throw new Error("expected a ConfigError");
}

describe("parseDestination", () => {
  test("reads s3 bucket and prefix, and absolute file paths", () => {
    expect(parseDestination("s3://flump-backups/prod/daily/")).toEqual({
      kind: "s3",
      bucket: "flump-backups",
      prefix: "prod/daily",
    });
    expect(parseDestination("s3://flump-backups")).toEqual({
      kind: "s3",
      bucket: "flump-backups",
      prefix: "",
    });
    expect(parseDestination("file:///var/backups")).toEqual({ kind: "file", dir: "/var/backups" });
  });

  test("refuses missing, relative, traversal and unknown destinations", () => {
    expectConfigError(() => parseDestination(""), "BACKUP_DESTINATION is required");
    expectConfigError(() => parseDestination("file://relative/dir"), "absolute");
    expectConfigError(() => parseDestination("s3://bucket/../other"), "..");
    expectConfigError(() => parseDestination("s3://UPPER_case"), "bucket name");
    expectConfigError(() => parseDestination("https://example.com/x"), "s3:// or file://");
  });
});

describe("parseRecipients", () => {
  test("accepts one or more age keys, comma or space separated", () => {
    expect(parseRecipients(`${RECIPIENT}, ${RECIPIENT.replace("q", "p")}`)).toHaveLength(2);
  });

  test("refuses to run without encryption and rejects non-age keys", () => {
    expectConfigError(() => parseRecipients(undefined), "never written unencrypted");
    expectConfigError(() => parseRecipients("ssh-ed25519 AAAA"), "age public keys");
  });
});

describe("parseBackupEnv", () => {
  const base = { BACKUP_DESTINATION: "s3://flump-backups/prod", BACKUP_AGE_RECIPIENTS: RECIPIENT };

  test("prefers BACKUP_DATABASE_URL and falls back to DATABASE_URL", () => {
    expect(parseBackupEnv({ ...base, DATABASE_URL: PROD }).databaseUrl).toBe(PROD);
    const other = "postgres://u:p@other:5432/db";
    expect(
      parseBackupEnv({ ...base, DATABASE_URL: PROD, BACKUP_DATABASE_URL: other }).databaseUrl,
    ).toBe(other);
  });

  test("names the bad variable without echoing its value", () => {
    expectConfigError(() => parseBackupEnv(base), "DATABASE_URL is required");
    expectConfigError(
      () => parseBackupEnv({ ...base, DATABASE_URL: `mysql://u:${FAKE_PW}@h/db` }),
      "postgres:// URL",
      FAKE_PW,
    );
    expectConfigError(
      () => parseBackupEnv({ ...base, DATABASE_URL: PROD, BACKUP_HEARTBEAT_URL: "http://hc/x" }),
      "BACKUP_HEARTBEAT_URL must be an https:// URL",
    );
    expectConfigError(
      () => parseBackupEnv({ ...base, DATABASE_URL: PROD, BACKUP_LABEL: "../x" }),
      "BACKUP_LABEL",
    );
  });
});

describe("parseRestoreEnv", () => {
  const base = {
    BACKUP_DESTINATION: "file:///tmp/b",
    BACKUP_AGE_IDENTITY_FILE: "/tmp/key.txt",
  };

  test("refuses a target that is the production database, however the URL is spelt", () => {
    const sameHostDb = "postgresql://other_user:x@PROD.example.com/flump";
    for (const target of [PROD, sameHostDb]) {
      expectConfigError(
        () => parseRestoreEnv({ ...base, RESTORE_DATABASE_URL: target, DATABASE_URL: PROD }),
        "same database",
        FAKE_PW,
      );
      expectConfigError(
        () => parseRestoreEnv({ ...base, RESTORE_DATABASE_URL: target, BACKUP_DATABASE_URL: PROD }),
        "same database",
      );
    }
  });

  test("accepts a different database and requires the identity file", () => {
    const target = "postgres://postgres:x@localhost:55433/flump_drill";
    expect(
      parseRestoreEnv({ ...base, RESTORE_DATABASE_URL: target, DATABASE_URL: PROD }).targetUrl,
    ).toBe(target);
    expectConfigError(
      () => parseRestoreEnv({ BACKUP_DESTINATION: "file:///tmp/b", RESTORE_DATABASE_URL: target }),
      "BACKUP_AGE_IDENTITY_FILE is required",
    );
  });
});

describe("parseRestoreArgs", () => {
  test("needs exactly one of --latest and --backup", () => {
    expect(parseRestoreArgs(["--latest"]).latest).toBe(true);
    expect(parseRestoreArgs(["--backup", "flump-prod-20261114T023000Z"]).backup).toBe(
      "flump-prod-20261114T023000Z",
    );
    expectConfigError(() => parseRestoreArgs([]), "exactly one");
    expectConfigError(
      () => parseRestoreArgs(["--latest", "--backup", "flump-prod-20261114T023000Z"]),
      "exactly one",
    );
    expectConfigError(() => parseRestoreArgs(["--backup", "../../etc/passwd"]), "backup name");
  });

  test("--confirm only with --replace, and --replace never with --verify-only", () => {
    expectConfigError(
      () => parseRestoreArgs(["--latest", "--confirm", "x"]),
      "only used with --replace",
    );
    expectConfigError(
      () => parseRestoreArgs(["--latest", "--replace", "--verify-only"]),
      "conflict",
    );
    expectConfigError(() => parseRestoreArgs(["--latest", "--force"]), "unknown argument");
    expectConfigError(() => parseRestoreArgs(["--backup"]), "needs a value");
  });
});

describe("names and listings", () => {
  test("base names are UTC stamps", () => {
    expect(backupBaseName("prod", new Date("2026-11-14T02:30:05.123Z"))).toBe(
      "flump-prod-20261114T023005Z",
    );
  });

  test("latestBackup picks the newest backup that has both objects", () => {
    const names = [
      "flump-prod-20261112T023000Z.dump.age",
      "flump-prod-20261112T023000Z.manifest.json.age",
      "flump-prod-20261113T023000Z.dump.age",
      "flump-prod-20261113T023000Z.manifest.json.age",
      "flump-prod-20261114T023000Z.dump.age", // manifest missing: upload did not finish
      "flump-other-20261111T023000Z.manifest.json.age", // dump missing
      "notes.txt",
    ];
    expect(latestBackup(names)).toBe("flump-prod-20261113T023000Z");
    // A manual labelled backup in the same prefix is never picked by --latest for prod.
    const withManual = [
      ...names,
      "flump-pre-be05-20261115T090000Z.dump.age",
      "flump-pre-be05-20261115T090000Z.manifest.json.age",
    ];
    expect(latestBackup(withManual)).toBe("flump-prod-20261113T023000Z");
    expect(latestBackup(withManual, "pre-be05")).toBe("flump-pre-be05-20261115T090000Z");
    expect(latestBackup([])).toBeUndefined();
  });

  test("connTarget normalises host case and the default port", () => {
    expect(connTarget("postgres://a:b@DB.Example.com/flump")).toBe("db.example.com:5432/flump");
    expect(sameDatabase("postgres://a:b@h:5432/x", "postgresql://c:d@H/x")).toBe(true);
    expect(sameDatabase("postgres://a:b@h:5432/x", "postgres://a:b@h:5433/x")).toBe(false);
    expect(databaseName("postgres://a:b@h/flump_drill")).toBe("flump_drill");
  });

  test("sameDatabase fails closed on a URL it cannot read", () => {
    expect(sameDatabase("postgres://a:b@h/x", "postgres://[broken")).toBe(true);
  });

  test("withoutPassword moves the password out of argv into PGPASSWORD", () => {
    expect(withoutPassword(PROD)).toEqual({
      url: "postgres://prod_user@prod.example.com:5432/flump",
      env: { PGPASSWORD: FAKE_PW },
    });
    expect(withoutPassword(`postgres://u:${["x", "y"].join("%40")}@h/db`).env.PGPASSWORD).toBe(
      "x@y",
    );
    expect(withoutPassword("postgres://u@h/db")).toEqual({ url: "postgres://u@h/db", env: {} });
  });

  test("redact removes given secrets and any postgres URL", () => {
    const text = `connection to ${PROD} failed; password ${FAKE_PW}; also postgresql://x:y@z/w`;
    const out = redact(text, [FAKE_PW]);
    expect(out).not.toContain(FAKE_PW);
    expect(out).not.toContain("prod.example.com");
    expect(out).not.toContain("x:y@z");
  });

  test("countTableData counts pg_restore --list TABLE DATA lines", () => {
    expect(
      countTableData(
        "1; 0 0 TABLE public a x\n2; 0 0 TABLE DATA public a x\n3; 0 0 TABLE DATA public b x\n",
      ),
    ).toBe(2);
  });
});

describe("fingerprints", () => {
  const t = (table: string, rows: number, checksum = "1:2"): TableFingerprint => ({
    schema: "public",
    table,
    rows,
    checksum,
  });

  test("tableFingerprintSql quotes identifiers", () => {
    expect(tableFingerprintSql("public", 'we"ird')).toContain('FROM ONLY "public"."we""ird" AS t');
  });

  test("compareFingerprints reports missing, extra, row and checksum differences", () => {
    const expected = { migrations: 13, tables: [t("a", 1), t("b", 2), t("c", 3)] };
    const actual = { migrations: 12, tables: [t("a", 1), t("b", 5), t("c", 3, "9:9"), t("d", 0)] };
    const result = compareFingerprints(expected, {
      ...actual,
      tables: actual.tables.filter((x) => x.table !== "a"),
    });
    expect(result.ok).toBe(false);
    expect(result.migrationsMatch).toBe(false);
    expect(result.diffs.map((d) => `${d.table}:${d.problem}`)).toEqual([
      "public.a:missing",
      "public.b:rows",
      "public.c:checksum",
      "public.d:unexpected",
    ]);
    expect(compareFingerprints(expected, expected).ok).toBe(true);
  });

  test("fingerprintLines matches the restore-fingerprint.sql line format", () => {
    expect(fingerprintLines({ migrations: null, tables: [t("a", 1)] })).toEqual([
      "public.a|1|1:2",
      "migrations|none",
    ]);
  });

  test("the SQL file uses the same checksum expression and session settings as the library", () => {
    const sqlFile = readFileSync(resolve(import.meta.dir, "restore-fingerprint.sql"), "utf8");
    const libSql = tableFingerprintSql("s", "t");
    for (const part of [
      "('x' || substr(md5(t::text), 1, 15))::bit(60)::bigint",
      "('x' || substr(md5(t::text), 16, 15))::bit(60)::bigint",
    ]) {
      expect(sqlFile).toContain(part);
      expect(libSql).toContain(part);
    }
    for (const setting of [
      "TimeZone = 'UTC'",
      "DateStyle = 'ISO, YMD'",
      "extra_float_digits = 3",
      "bytea_output = 'hex'",
    ]) {
      expect(sqlFile).toContain(setting);
    }
  });

  test("parseManifest rejects unknown formats and damaged manifests", () => {
    const good = {
      format: 1,
      base: "flump-prod-20261114T023000Z",
      dumpSha256: "a".repeat(64),
      tables: [],
    };
    expect(parseManifest(JSON.stringify(good)).base).toBe(good.base);
    expect(() => parseManifest(JSON.stringify({ ...good, format: 2 }))).toThrow("format");
    expect(() => parseManifest(JSON.stringify({ ...good, dumpSha256: "x" }))).toThrow("sha256");
  });
});

describe("CLI refusals (no database, no tools)", () => {
  const cli = (script: string, args: string[], env: Record<string, string>) => {
    const proc = Bun.spawnSync(["bun", resolve(import.meta.dir, script), ...args], {
      env: { PATH: process.env.PATH ?? "", HOME: process.env.HOME ?? "", ...env },
      stdout: "pipe",
      stderr: "pipe",
    });
    return { exitCode: proc.exitCode, out: proc.stdout.toString() + proc.stderr.toString() };
  };

  test("backup-run.ts exits 2 without encryption keys and never prints the URL", () => {
    const r = cli("backup-run.ts", [], { DATABASE_URL: PROD, BACKUP_DESTINATION: "file:///tmp/x" });
    expect(r.exitCode).toBe(2);
    expect(r.out).toContain("BACKUP_AGE_RECIPIENTS is required");
    expect(r.out).not.toContain(FAKE_PW);
  });

  test("backup-restore.ts exits 2 when the target is production", () => {
    const r = cli("backup-restore.ts", ["--latest"], {
      DATABASE_URL: PROD,
      RESTORE_DATABASE_URL: PROD,
      BACKUP_DESTINATION: "file:///tmp/x",
      BACKUP_AGE_IDENTITY_FILE: "/tmp/k",
    });
    expect(r.exitCode).toBe(2);
    expect(r.out).toContain("same database");
    expect(r.out).not.toContain(FAKE_PW);
  });
});
