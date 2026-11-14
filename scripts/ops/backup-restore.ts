#!/usr/bin/env bun
// backup-restore.ts: restore an encrypted backup written by backup-run.ts and prove it is
// complete. Runbook: docs/runbooks/backup-restore.md ("Restore drill").
//
//   bun scripts/ops/backup-restore.ts --latest
//   bun scripts/ops/backup-restore.ts --backup flump-prod-20261114T023000Z
//   bun scripts/ops/backup-restore.ts --latest --label pre-be05   # newest backup with that label
//   bun scripts/ops/backup-restore.ts --latest --verify-only     # compare only, restore nothing
//   bun scripts/ops/backup-restore.ts --latest --replace --confirm <target database name>
//
// Environment:
//   RESTORE_DATABASE_URL       database to restore INTO. Never printed. Must differ from
//                              BACKUP_DATABASE_URL and DATABASE_URL when those are set.
//   BACKUP_DESTINATION         where the backups are (s3://bucket/prefix or file:///dir)
//   BACKUP_AGE_IDENTITY_FILE   path to the age secret key file that decrypts them
//   S3_* / AWS_*               credentials for s3://
//   PG_RESTORE, AGE            tool command overrides
//
// Refuses (exit 2, nothing changed) when the target has any table, unless --replace is given
// with --confirm equal to the target database name AND the owner has set the target's database
// comment to 'flump-restore-target' by hand; --replace drops and recreates the public
// schema only, and refuses if any other schema holds tables.
//
// After pg_restore (one transaction, stop on first error) it fingerprints the target and
// compares every table's row count and checksum, and the migrations count, with the manifest
// taken in the same snapshot as the dump. Exit 0 and RESULT|PASS only when all match.
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SQL } from "bun";
import {
  ConfigError,
  cleanUpOnSignal,
  compareFingerprints,
  databaseName,
  dumpObject,
  errorTail,
  fingerprintInTransaction,
  formatDiff,
  isBaseName,
  LIST_TABLES_SQL,
  latestBackup,
  manifestObject,
  openStore,
  parseManifest,
  parseRestoreEnv,
  RESTORE_TARGET_MARKER,
  type RestoreConfig,
  run,
  sha256File,
  toolCommand,
  withoutPassword,
} from "./backup-lib";

export interface RestoreArgs {
  backup?: string;
  latest: boolean;
  label: string;
  verifyOnly: boolean;
  replace: boolean;
  confirm?: string;
}

export function parseRestoreArgs(argv: string[]): RestoreArgs {
  const args: RestoreArgs = { latest: false, label: "prod", verifyOnly: false, replace: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const value = () => {
      const v = argv[++i];
      if (!v || v.startsWith("--")) throw new ConfigError(`${a} needs a value`);
      return v;
    };
    if (a === "--backup") args.backup = value();
    else if (a === "--confirm") args.confirm = value();
    else if (a === "--latest") args.latest = true;
    else if (a === "--label") args.label = value();
    else if (a === "--verify-only") args.verifyOnly = true;
    else if (a === "--replace") args.replace = true;
    else throw new ConfigError(`unknown argument: ${a}`);
  }
  if (!/^[A-Za-z0-9_-]{1,40}$/.test(args.label)) {
    throw new ConfigError("--label may contain only letters, digits, - and _");
  }
  if (args.latest === Boolean(args.backup)) {
    throw new ConfigError("give exactly one of --latest or --backup <name>");
  }
  if (args.backup && !isBaseName(args.backup)) {
    throw new ConfigError("--backup must be a backup name like flump-prod-20261114T023000Z");
  }
  if (args.replace && args.verifyOnly)
    throw new ConfigError("--replace and --verify-only conflict");
  if (args.confirm && !args.replace) throw new ConfigError("--confirm is only used with --replace");
  return args;
}

class RefusedError extends Error {}

export async function runRestore(
  cfg: RestoreConfig,
  args: RestoreArgs,
  env: Record<string, string | undefined>,
  log: (line: string) => void = console.log,
): Promise<boolean> {
  const pgRestore = toolCommand(env, "PG_RESTORE", "pg_restore");
  const age = toolCommand(env, "AGE", "age");
  const secrets = [cfg.targetUrl, ...cfg.forbiddenUrls];
  const store = openStore(cfg.destination);
  const targetDb = databaseName(cfg.targetUrl);

  const base = args.backup ?? latestBackup(await store.list(), args.label);
  if (!base) {
    throw new RefusedError(`no complete '${args.label}' backup found in ${store.describe()}`);
  }
  log(`restore: backup ${base} from ${store.describe()}`);

  const work = mkdtempSync(join(tmpdir(), "flump-restore-"));
  const releaseSignals = cleanUpOnSignal(work);
  const conn = withoutPassword(cfg.targetUrl);
  const sql = new SQL(cfg.targetUrl, { max: 1 });
  let replaced = false;
  try {
    const dumpPath = join(work, `${base}.dump`);
    const manifestPath = join(work, `${base}.manifest.json`);
    for (const [object, plain] of [
      [manifestObject(base), manifestPath],
      [dumpObject(base), dumpPath],
    ] as const) {
      await store.get(object, `${plain}.age`);
      const dec = await run([...age, "-d", "-i", cfg.identityFile, "-o", plain, `${plain}.age`], {
        secrets,
      });
      if (dec.exitCode !== 0) {
        throw new Error(
          `age could not decrypt ${object} (wrong identity file?)\n${errorTail(dec.stderr)}`,
        );
      }
    }
    const manifest = parseManifest(readFileSync(manifestPath, "utf8"));
    if (manifest.base !== base) throw new Error("manifest belongs to a different backup");
    if ((await sha256File(dumpPath)) !== manifest.dumpSha256) {
      throw new Error("dump checksum does not match the manifest: the file is damaged");
    }
    log(`restore: dump checksum ok (${manifest.dumpBytes} bytes, taken ${manifest.createdAt})`);

    if (!args.verifyOnly) {
      const tables = (await sql.unsafe(LIST_TABLES_SQL)) as Array<{
        schema: string;
        table: string;
      }>;
      if (tables.length > 0) {
        if (!args.replace) {
          throw new RefusedError(
            `the target database already has ${tables.length} tables; restore into an empty database (backup-restore.md section 3)`,
          );
        }
        // The marker is set by the owner by hand on a database they mean to wipe; no script
        // sets it, and production never carries it.
        const [{ comment }] = await sql.unsafe(
          "SELECT shobj_description(oid, 'pg_database') AS comment FROM pg_database WHERE datname = current_database()",
        );
        if (comment !== RESTORE_TARGET_MARKER) {
          throw new RefusedError(
            `--replace needs the target database's comment to be '${RESTORE_TARGET_MARKER}' (set it yourself: COMMENT ON DATABASE <name> IS '${RESTORE_TARGET_MARKER}')`,
          );
        }
        if (args.confirm !== targetDb) {
          throw new RefusedError("--replace needs --confirm with the target database name");
        }
        if (tables.some((t) => t.schema !== "public")) {
          throw new RefusedError(
            "the target has tables outside the public schema; refusing to replace",
          );
        }
        log(`restore: --replace: dropping and recreating schema public in ${targetDb}`);
        await sql.unsafe("DROP SCHEMA public CASCADE");
        await sql.unsafe("CREATE SCHEMA public");
        replaced = true;
      }

      const started = Date.now();
      const restored = await run(
        [
          ...pgRestore,
          "--no-owner",
          "--no-privileges",
          "--exit-on-error",
          "--single-transaction",
          "--dbname",
          conn.url,
          dumpPath,
        ],
        { secrets, env: conn.env },
      );
      if (restored.exitCode !== 0) {
        const state = replaced
          ? "the restore was rolled back, and --replace had already emptied schema public"
          : "nothing was committed";
        throw new Error(`pg_restore failed (${state})\n${errorTail(restored.stderr, 3)}`);
      }
      log(`restore_seconds: ${Math.round((Date.now() - started) / 1000)}`);
    }

    const actual = await sql.begin("ISOLATION LEVEL REPEATABLE READ READ ONLY", (tx) =>
      fingerprintInTransaction(tx),
    );
    const result = compareFingerprints(manifest, actual);
    log(`tables_checked: ${manifest.tables.length}`);
    log(`rows_checked: ${manifest.tables.reduce((n, t) => n + t.rows, 0)}`);
    log(`migrations: ${actual.migrations ?? "none"} (backup had ${manifest.migrations ?? "none"})`);
    for (const d of result.diffs) log(`MISMATCH ${formatDiff(d)}`);
    log(`RESULT|${result.ok ? "PASS" : "FAIL"}`);
    return result.ok;
  } finally {
    releaseSignals();
    await sql.close();
    rmSync(work, { recursive: true, force: true });
  }
}

async function main(): Promise<number> {
  let cfg: RestoreConfig;
  let args: RestoreArgs;
  try {
    args = parseRestoreArgs(process.argv.slice(2));
    cfg = parseRestoreEnv(process.env);
  } catch (error) {
    if (error instanceof ConfigError) {
      console.error(`ERROR: ${error.message}`);
      return 2;
    }
    throw error;
  }
  try {
    return (await runRestore(cfg, args, process.env)) ? 0 : 1;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const safe = [cfg.targetUrl, ...cfg.forbiddenUrls].reduce(
      (m, s) => m.split(s).join("[redacted]"),
      message,
    );
    if (error instanceof RefusedError) {
      console.error(`ERROR: refusing: ${safe}`);
      return 2;
    }
    console.error(`ERROR: restore failed: ${safe}`);
    return 1;
  }
}

if (import.meta.main) process.exit(await main());
