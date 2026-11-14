#!/usr/bin/env bun
// backup-run.ts: scheduled, encrypted logical backup of the Flump database.
//
// Runs on a laptop or as the command of a Railway cron service (scripts/ops/backup.Dockerfile,
// scripts/ops/backup.railway.json). Runbook: docs/runbooks/backup-restore.md.
//
//   bun scripts/ops/backup-run.ts
//
// Environment:
//   BACKUP_DATABASE_URL     database to back up (falls back to DATABASE_URL). Never printed.
//   BACKUP_DESTINATION      s3://bucket/prefix or file:///absolute/dir
//   BACKUP_AGE_RECIPIENTS   age public keys (age1...), comma separated. Required: nothing is
//                           ever uploaded unencrypted.
//   BACKUP_LABEL            name label (default prod)
//   BACKUP_HEARTBEAT_URL    optional https URL pinged (GET) after a successful upload: the
//                           dead-man switch. A missed ping is the alert.
//   BACKUP_HEARTBEAT_FAIL_URL  optional https URL pinged (POST, error summary) on failure
//   S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_ENDPOINT, S3_REGION  for s3:// (or AWS_*)
//   PG_DUMP, PG_RESTORE, AGE   tool command overrides (default pg_dump, pg_restore, age)
//
// What it does, in one REPEATABLE READ READ ONLY transaction on the source:
//   1. exports the transaction's snapshot,
//   2. fingerprints every table (row count + order-independent checksum) and counts migrations,
//   3. runs pg_dump --snapshot=<that snapshot>, so the dump and the fingerprint see exactly the
//      same data,
// then checks the dump with pg_restore --list, encrypts dump and manifest with age, uploads the
// dump first and the manifest last (a manifest means a complete backup), and pings the heartbeat.
//
// Exit 0 success, 1 failure, 2 configuration error. Prints counts, sizes and object names only.
import { mkdtempSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SQL } from "bun";
import {
  type BackupConfig,
  backupBaseName,
  ConfigError,
  cleanUpOnSignal,
  countTableData,
  dumpObject,
  errorTail,
  fingerprintInTransaction,
  MANIFEST_FORMAT,
  type Manifest,
  manifestObject,
  openStore,
  parseBackupEnv,
  ping,
  redact,
  run,
  sha256File,
  toolCommand,
  withoutPassword,
} from "./backup-lib";

class StepError extends Error {}

export async function runBackup(
  cfg: BackupConfig,
  env: Record<string, string | undefined>,
  log: (line: string) => void = console.log,
): Promise<Manifest> {
  const pgDump = toolCommand(env, "PG_DUMP", "pg_dump");
  const pgRestore = toolCommand(env, "PG_RESTORE", "pg_restore");
  const age = toolCommand(env, "AGE", "age");
  const secrets = [cfg.databaseUrl];

  const work = mkdtempSync(join(tmpdir(), "flump-backup-"));
  const releaseSignals = cleanUpOnSignal(work);
  const conn = withoutPassword(cfg.databaseUrl);
  try {
    const started = Date.now();
    const base = backupBaseName(cfg.label, new Date());
    const dumpPath = join(work, `${base}.dump`);
    const manifestPath = join(work, `${base}.manifest.json`);

    const sql = new SQL(cfg.databaseUrl, { max: 1 });
    let plainTables = 0;
    let fingerprint: Awaited<ReturnType<typeof fingerprintInTransaction>>;
    try {
      fingerprint = await sql.begin("ISOLATION LEVEL REPEATABLE READ READ ONLY", async (tx) => {
        const [{ snapshot }] = await tx.unsafe("SELECT pg_export_snapshot() AS snapshot");
        const fp = await fingerprintInTransaction(tx);
        // Partitioned parents (relkind p) hold no rows of their own and get no TABLE DATA entry.
        const [{ n }] = await tx.unsafe(
          "SELECT count(*)::int AS n FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace s ON s.oid = c.relnamespace WHERE c.relkind = 'r' AND s.nspname NOT IN ('pg_catalog', 'information_schema') AND s.nspname NOT LIKE 'pg\\_%'",
        );
        plainTables = Number(n);
        log(`backup: fingerprinted ${fp.tables.length} tables; dumping ${base}`);
        const dump = await run(
          [...pgDump, "--format=custom", "--no-owner", `--snapshot=${snapshot}`, conn.url],
          { stdoutPath: dumpPath, secrets, env: conn.env },
        );
        if (dump.exitCode !== 0) throw new StepError(`pg_dump failed\n${errorTail(dump.stderr)}`);
        return fp;
      });
    } finally {
      await sql.close();
    }

    const listing = await run([...pgRestore, "--list", dumpPath], { secrets });
    if (listing.exitCode !== 0) {
      throw new StepError(
        `pg_restore --list could not read the dump\n${errorTail(listing.stderr)}`,
      );
    }
    const tableDataEntries = countTableData(listing.stdout);
    if (tableDataEntries < plainTables) {
      throw new StepError(
        `the dump has ${tableDataEntries} TABLE DATA entries for ${plainTables} tables`,
      );
    }

    const manifest: Manifest = {
      format: MANIFEST_FORMAT,
      label: cfg.label,
      base,
      createdAt: new Date(started).toISOString(),
      dumpSha256: await sha256File(dumpPath),
      dumpBytes: statSync(dumpPath).size,
      tableDataEntries,
      ...fingerprint,
    };
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });

    const recipientArgs = cfg.ageRecipients.flatMap((r) => ["-r", r]);
    for (const path of [dumpPath, manifestPath]) {
      const enc = await run([...age, ...recipientArgs, "-o", `${path}.age`, path], { secrets });
      if (enc.exitCode !== 0)
        throw new StepError(`age encryption failed\n${errorTail(enc.stderr)}`);
    }

    const store = openStore(cfg.destination);
    await store.put(dumpObject(base), `${dumpPath}.age`);
    await store.put(manifestObject(base), `${manifestPath}.age`);

    const totalRows = fingerprint.tables.reduce((n, t) => n + t.rows, 0);
    log(`backup: uploaded ${dumpObject(base)} and ${manifestObject(base)} to ${store.describe()}`);
    log(`dump_bytes: ${manifest.dumpBytes}`);
    log(`encrypted_bytes: ${statSync(`${dumpPath}.age`).size}`);
    log(`tables: ${fingerprint.tables.length}`);
    log(`total_rows: ${totalRows}`);
    log(`table_data_entries: ${tableDataEntries}`);
    log(`migrations: ${fingerprint.migrations ?? "none"}`);
    log(`seconds: ${Math.round((Date.now() - started) / 1000)}`);
    return manifest;
  } finally {
    releaseSignals();
    rmSync(work, { recursive: true, force: true });
  }
}

async function main(): Promise<number> {
  let cfg: BackupConfig;
  try {
    cfg = parseBackupEnv(process.env);
  } catch (error) {
    if (error instanceof ConfigError) {
      console.error(`ERROR: ${error.message}`);
      const failUrl = process.env.BACKUP_HEARTBEAT_FAIL_URL?.trim();
      if (failUrl?.startsWith("https://")) await ping(failUrl, `config: ${error.message}`);
      return 2;
    }
    throw error;
  }
  try {
    await runBackup(cfg, process.env);
  } catch (error) {
    const message = redact(error instanceof Error ? error.message : String(error), [
      cfg.databaseUrl,
    ]);
    console.error(`ERROR: backup failed: ${message}`);
    await ping(cfg.heartbeatFailUrl, `backup failed: ${message.split("\n")[0]}`);
    return 1;
  }
  if (!(await ping(cfg.heartbeatUrl))) {
    // The backup is safe; the monitor will alert on the missed ping, which is the right outcome.
    console.error("WARN: backup succeeded but the heartbeat ping failed");
  }
  return 0;
}

if (import.meta.main) process.exit(await main());
