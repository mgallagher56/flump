// Shared pieces of the scheduled backup (backup-run.ts) and the restore (backup-restore.ts).
//
// No npm dependencies on purpose: the backup cron image (scripts/ops/backup.Dockerfile) carries
// only Bun, the Postgres 18 client tools and age. Bun's built-in SQL and S3 clients do the rest.
//
// Nothing here ever prints a connection string, a key or row data. Errors name the variable that
// is wrong, never its value.
import { createReadStream, mkdirSync, readdirSync, rmSync } from "node:fs";
import { copyFile } from "node:fs/promises";
import { join } from "node:path";
import { S3Client, type SQL } from "bun";

export const MANIFEST_FORMAT = 1;

export class ConfigError extends Error {
  override name = "ConfigError";
}

// ---------------------------------------------------------------------------------------------
// Environment

export type Destination =
  | { kind: "file"; dir: string }
  | { kind: "s3"; bucket: string; prefix: string };

export interface BackupConfig {
  databaseUrl: string;
  destination: Destination;
  ageRecipients: string[];
  label: string;
  heartbeatUrl?: string;
  heartbeatFailUrl?: string;
}

export interface RestoreConfig {
  targetUrl: string;
  destination: Destination;
  identityFile: string;
  /** Production URLs the target must never equal (BACKUP_DATABASE_URL, DATABASE_URL). */
  forbiddenUrls: string[];
}

type Env = Record<string, string | undefined>;

const POSTGRES_URL = /^postgres(ql)?:\/\//;
const AGE_RECIPIENT = /^age1[0-9a-z]{58}$/;
const LABEL = /^[A-Za-z0-9_-]{1,40}$/;

function required(env: Env, name: string): string {
  const value = env[name]?.trim();
  if (!value) throw new ConfigError(`${name} is required`);
  return value;
}

function postgresUrl(env: Env, name: string): string {
  const value = required(env, name);
  if (!POSTGRES_URL.test(value)) throw new ConfigError(`${name} must be a postgres:// URL`);
  return value;
}

function httpsUrl(env: Env, name: string): string | undefined {
  const value = env[name]?.trim();
  if (!value) return undefined;
  if (!value.startsWith("https://")) throw new ConfigError(`${name} must be an https:// URL`);
  return value;
}

/** `s3://bucket/optional/prefix` or `file:///absolute/dir`. */
export function parseDestination(raw: string | undefined): Destination {
  const value = raw?.trim();
  if (!value)
    throw new ConfigError("BACKUP_DESTINATION is required (s3://bucket/prefix or file:///dir)");
  if (value.startsWith("file://")) {
    const dir = value.slice("file://".length);
    if (!dir.startsWith("/"))
      throw new ConfigError("BACKUP_DESTINATION file:// path must be absolute");
    return { kind: "file", dir };
  }
  if (value.startsWith("s3://")) {
    const rest = value.slice("s3://".length);
    const slash = rest.indexOf("/");
    const bucket = slash === -1 ? rest : rest.slice(0, slash);
    const prefix = slash === -1 ? "" : rest.slice(slash + 1).replace(/^\/+|\/+$/g, "");
    if (!/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(bucket)) {
      throw new ConfigError("BACKUP_DESTINATION has an invalid bucket name");
    }
    if (prefix.includes(".."))
      throw new ConfigError("BACKUP_DESTINATION prefix may not contain ..");
    return { kind: "s3", bucket, prefix };
  }
  throw new ConfigError("BACKUP_DESTINATION must start with s3:// or file://");
}

export function parseRecipients(raw: string | undefined): string[] {
  const value = raw?.trim();
  if (!value) {
    throw new ConfigError(
      "BACKUP_AGE_RECIPIENTS is required: backups are never written unencrypted",
    );
  }
  const recipients = value.split(/[\s,]+/).filter(Boolean);
  for (const r of recipients) {
    if (!AGE_RECIPIENT.test(r)) {
      throw new ConfigError(
        "BACKUP_AGE_RECIPIENTS must be age public keys (age1...), comma separated",
      );
    }
  }
  return recipients;
}

export function parseBackupEnv(env: Env): BackupConfig {
  const databaseUrl = env.BACKUP_DATABASE_URL?.trim()
    ? postgresUrl(env, "BACKUP_DATABASE_URL")
    : postgresUrl(env, "DATABASE_URL");
  const label = env.BACKUP_LABEL?.trim() || "prod";
  if (!LABEL.test(label))
    throw new ConfigError("BACKUP_LABEL may contain only letters, digits, - and _");
  return {
    databaseUrl,
    destination: parseDestination(env.BACKUP_DESTINATION),
    ageRecipients: parseRecipients(env.BACKUP_AGE_RECIPIENTS),
    label,
    heartbeatUrl: httpsUrl(env, "BACKUP_HEARTBEAT_URL"),
    heartbeatFailUrl: httpsUrl(env, "BACKUP_HEARTBEAT_FAIL_URL"),
  };
}

export function parseRestoreEnv(env: Env): RestoreConfig {
  const targetUrl = postgresUrl(env, "RESTORE_DATABASE_URL");
  const forbiddenUrls = ["BACKUP_DATABASE_URL", "DATABASE_URL"]
    .map((name) => env[name]?.trim())
    .filter((v): v is string => Boolean(v));
  for (const other of forbiddenUrls) {
    if (sameDatabase(targetUrl, other)) {
      throw new ConfigError(
        "RESTORE_DATABASE_URL names the same database as BACKUP_DATABASE_URL or DATABASE_URL; refusing",
      );
    }
  }
  return {
    targetUrl,
    destination: parseDestination(env.BACKUP_DESTINATION),
    identityFile: required(env, "BACKUP_AGE_IDENTITY_FILE"),
    forbiddenUrls,
  };
}

/** host:port/database of a postgres URL, lower-cased host, default port 5432. */
export function connTarget(url: string): string {
  const u = new URL(url.replace(/^postgres(ql)?:/, "http:"));
  const db = decodeURIComponent(u.pathname.replace(/^\//, ""));
  return `${u.hostname.toLowerCase()}:${u.port || "5432"}/${db}`;
}

export function sameDatabase(a: string, b: string): boolean {
  if (a === b) return true;
  try {
    return connTarget(a) === connTarget(b);
  } catch {
    // Fail closed: a URL we cannot read is treated as possibly the same database.
    return true;
  }
}

/** Database comment the owner sets on a database that --replace may wipe (never set by a script). */
export const RESTORE_TARGET_MARKER = "flump-restore-target";

/**
 * Splits the password out of a postgres URL so it reaches the tools through PGPASSWORD in the
 * child's environment instead of argv, where `ps` would show it to other local users.
 */
export function withoutPassword(url: string): { url: string; env: Record<string, string> } {
  const m = url.match(/^(postgres(?:ql)?:\/\/)([^@/?#]*)@(.*)$/);
  if (!m) return { url, env: {} };
  const [, scheme, auth, rest] = m;
  const colon = auth.indexOf(":");
  if (colon === -1) return { url, env: {} };
  return {
    url: `${scheme}${auth.slice(0, colon)}@${rest}`,
    env: { PGPASSWORD: decodeURIComponent(auth.slice(colon + 1)) },
  };
}

export function databaseName(url: string): string {
  return connTarget(url).split("/").slice(1).join("/");
}

/** Removes every secret from text before it reaches a terminal or log. */
export function redact(text: string, secrets: Array<string | undefined>): string {
  let out = text;
  for (const s of secrets) if (s) out = out.split(s).join("[redacted]");
  return out.replace(/postgres(ql)?:\/\/[^\s'"]+/g, "postgres://[redacted]");
}

// ---------------------------------------------------------------------------------------------
// Names

export function backupBaseName(label: string, at: Date): string {
  const stamp = at
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
  return `flump-${label}-${stamp}`;
}

const BASE_NAME = /^flump-[A-Za-z0-9_-]+-\d{8}T\d{6}Z$/;

export function isBaseName(name: string): boolean {
  return BASE_NAME.test(name);
}

export const dumpObject = (base: string) => `${base}.dump.age`;
export const manifestObject = (base: string) => `${base}.manifest.json.age`;

/** Newest complete backup: one whose manifest exists (the manifest is uploaded last). */
export function latestBackup(objectNames: string[], label = "prod"): string | undefined {
  const names = new Set(objectNames);
  return objectNames
    .filter((n) => n.endsWith(".manifest.json.age"))
    .map((n) => n.slice(0, -".manifest.json.age".length))
    .filter((base) => isBaseName(base) && names.has(dumpObject(base)))
    .filter((base) => base.slice("flump-".length, -17) === label)
    .sort((a, b) => a.slice(-16).localeCompare(b.slice(-16)))
    .at(-1);
}

// ---------------------------------------------------------------------------------------------
// Fingerprints: per-table row count plus an order-independent checksum of every row's text.
//
// The checksum is two sums of 60-bit slices of md5(row::text), so row order does not matter and
// no large string is built. The session settings below pin the text form of dates, times,
// floats and bytea so the same data gives the same checksum on any server.

export const FINGERPRINT_SETTINGS = [
  "SET LOCAL TimeZone = 'UTC'",
  "SET LOCAL DateStyle = 'ISO, YMD'",
  "SET LOCAL IntervalStyle = 'postgres'",
  "SET LOCAL extra_float_digits = 3",
  "SET LOCAL bytea_output = 'hex'",
  "SET LOCAL lc_monetary = 'C'",
  // Every name below is schema-qualified, so reg* types print fully qualified.
  "SET LOCAL search_path = pg_catalog",
  // Error, as pg_dump does, rather than silently count only the rows a policy lets us see.
  "SET LOCAL row_security = off",
] as const;

export const LIST_TABLES_SQL = `SELECT n.nspname AS schema, c.relname AS table
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind IN ('r', 'p') AND n.nspname NOT IN ('pg_catalog', 'information_schema')
  AND n.nspname NOT LIKE 'pg\\_%'
ORDER BY 1, 2`;

export function quoteIdent(name: string): string {
  return `"${name.replaceAll('"', '""')}"`;
}

export function tableFingerprintSql(schema: string, table: string): string {
  const rel = `${quoteIdent(schema)}.${quoteIdent(table)}`;
  return `SELECT count(*)::text AS rows,
  coalesce(sum(('x' || substr(md5(t::text), 1, 15))::bit(60)::bigint), 0)::text || ':' ||
  coalesce(sum(('x' || substr(md5(t::text), 16, 15))::bit(60)::bigint), 0)::text AS checksum
FROM ONLY ${rel} AS t`;
}

export interface TableFingerprint {
  schema: string;
  table: string;
  rows: number;
  checksum: string;
}

export interface DatabaseFingerprint {
  serverVersion: string;
  migrations: number | null;
  tables: TableFingerprint[];
}

/** Runs inside a transaction the caller opened (REPEATABLE READ for a consistent view). */
export async function fingerprintInTransaction(tx: SQL): Promise<DatabaseFingerprint> {
  for (const stmt of FINGERPRINT_SETTINGS) await tx.unsafe(stmt);
  const [{ server_version: serverVersion }] = await tx.unsafe("SHOW server_version");
  const list = (await tx.unsafe(LIST_TABLES_SQL)) as Array<{ schema: string; table: string }>;
  const tables: TableFingerprint[] = [];
  for (const { schema, table } of list) {
    const [row] = await tx.unsafe(tableFingerprintSql(schema, table));
    tables.push({ schema, table, rows: Number(row.rows), checksum: String(row.checksum) });
  }
  let migrations: number | null = null;
  if (list.some((t) => t.schema === "public" && t.table === "migrations")) {
    const [row] = await tx.unsafe("SELECT count(*)::int AS n FROM public.migrations");
    migrations = Number(row.n);
  }
  return { serverVersion: String(serverVersion), migrations, tables };
}

/** Same lines restore-fingerprint.sql prints, so a manifest can be diffed against psql output. */
export function fingerprintLines(fp: Pick<DatabaseFingerprint, "tables" | "migrations">): string[] {
  return [
    ...fp.tables.map((t) => `${t.schema}.${t.table}|${t.rows}|${t.checksum}`),
    `migrations|${fp.migrations ?? "none"}`,
  ];
}

export interface FingerprintDiff {
  table: string;
  problem: "missing" | "unexpected" | "rows" | "checksum";
  expectedRows?: number;
  actualRows?: number;
}

export function compareFingerprints(
  expected: Pick<DatabaseFingerprint, "tables" | "migrations">,
  actual: Pick<DatabaseFingerprint, "tables" | "migrations">,
): { ok: boolean; diffs: FingerprintDiff[]; migrationsMatch: boolean } {
  const key = (t: TableFingerprint) => `${t.schema}.${t.table}`;
  const actualByKey = new Map(actual.tables.map((t) => [key(t), t]));
  const expectedKeys = new Set(expected.tables.map(key));
  const diffs: FingerprintDiff[] = [];
  for (const e of expected.tables) {
    const a = actualByKey.get(key(e));
    if (!a) diffs.push({ table: key(e), problem: "missing", expectedRows: e.rows });
    else if (a.rows !== e.rows)
      diffs.push({ table: key(e), problem: "rows", expectedRows: e.rows, actualRows: a.rows });
    else if (a.checksum !== e.checksum)
      diffs.push({ table: key(e), problem: "checksum", expectedRows: e.rows, actualRows: a.rows });
  }
  for (const a of actual.tables) {
    if (!expectedKeys.has(key(a)))
      diffs.push({ table: key(a), problem: "unexpected", actualRows: a.rows });
  }
  const migrationsMatch = expected.migrations === actual.migrations;
  return { ok: diffs.length === 0 && migrationsMatch, diffs, migrationsMatch };
}

export function formatDiff(d: FingerprintDiff): string {
  switch (d.problem) {
    case "missing":
      return `${d.table}: missing after restore (expected ${d.expectedRows} rows)`;
    case "unexpected":
      return `${d.table}: present after restore but not in the backup (${d.actualRows} rows)`;
    case "rows":
      return `${d.table}: rows ${d.actualRows}, expected ${d.expectedRows}`;
    case "checksum":
      return `${d.table}: same row count (${d.actualRows}) but the checksum differs`;
  }
}

// ---------------------------------------------------------------------------------------------
// Manifest

export interface Manifest extends DatabaseFingerprint {
  format: typeof MANIFEST_FORMAT;
  label: string;
  base: string;
  createdAt: string;
  dumpSha256: string;
  dumpBytes: number;
  tableDataEntries: number;
}

export function parseManifest(text: string): Manifest {
  const m = JSON.parse(text) as Partial<Manifest>;
  if (m.format !== MANIFEST_FORMAT)
    throw new Error(`unsupported manifest format: ${String(m.format)}`);
  if (!m.base || !isBaseName(m.base)) throw new Error("manifest has no valid base name");
  if (!/^[0-9a-f]{64}$/.test(m.dumpSha256 ?? "")) throw new Error("manifest has no dump sha256");
  if (!Array.isArray(m.tables)) throw new Error("manifest has no tables");
  return m as Manifest;
}

// ---------------------------------------------------------------------------------------------
// Storage

export interface Store {
  put(name: string, fromPath: string): Promise<void>;
  get(name: string, toPath: string): Promise<void>;
  list(): Promise<string[]>;
  describe(): string;
}

export function openStore(dest: Destination): Store {
  if (dest.kind === "file") {
    return {
      async put(name, fromPath) {
        mkdirSync(dest.dir, { recursive: true, mode: 0o700 });
        await copyFile(fromPath, join(dest.dir, name));
      },
      async get(name, toPath) {
        await copyFile(join(dest.dir, name), toPath);
      },
      async list() {
        try {
          return readdirSync(dest.dir);
        } catch {
          return [];
        }
      },
      describe: () => `file://${dest.dir}`,
    };
  }
  // Credentials come from S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY / S3_ENDPOINT / S3_REGION (or
  // the AWS_* equivalents), which Bun's client reads itself.
  const client = new S3Client({ bucket: dest.bucket });
  const key = (name: string) => (dest.prefix ? `${dest.prefix}/${name}` : name);
  return {
    async put(name, fromPath) {
      await client.write(key(name), Bun.file(fromPath));
    },
    async get(name, toPath) {
      await Bun.write(toPath, client.file(key(name)));
    },
    async list() {
      const names: string[] = [];
      let startAfter: string | undefined;
      for (;;) {
        const page = await client.list({
          prefix: dest.prefix ? `${dest.prefix}/` : undefined,
          startAfter,
          maxKeys: 1000,
        });
        const contents = page.contents ?? [];
        for (const obj of contents)
          names.push(obj.key.slice(dest.prefix ? dest.prefix.length + 1 : 0));
        if (!page.isTruncated || contents.length === 0) break;
        startAfter = contents.at(-1)?.key;
      }
      return names;
    },
    describe: () => `s3://${dest.bucket}${dest.prefix ? `/${dest.prefix}` : ""}`,
  };
}

// ---------------------------------------------------------------------------------------------
// Processes and files

/** Splits a tool override such as PG_DUMP="docker exec -i pg pg_dump" into argv. */
export function toolCommand(env: Env, name: string, fallback: string): string[] {
  return (env[name]?.trim() || fallback).split(/\s+/).filter(Boolean);
}

export interface RunResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export async function run(
  argv: string[],
  opts: {
    stdoutPath?: string;
    stdinPath?: string;
    secrets?: Array<string | undefined>;
    env?: Record<string, string>;
  } = {},
): Promise<RunResult> {
  const proc = Bun.spawn(argv, {
    env: { ...process.env, ...opts.env },
    stdin: opts.stdinPath ? Bun.file(opts.stdinPath) : "ignore",
    stdout: opts.stdoutPath ? Bun.file(opts.stdoutPath) : "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    opts.stdoutPath ? Promise.resolve("") : new Response(proc.stdout as ReadableStream).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  return {
    exitCode,
    stdout,
    stderr: redact(stderr, [...(opts.secrets ?? []), ...Object.values(opts.env ?? {})]),
  };
}

/** Removes the work directory (it can hold a plaintext dump) on Ctrl-C or a container stop. */
export function cleanUpOnSignal(dir: string): () => void {
  const handler = (signal: NodeJS.Signals) => {
    rmSync(dir, { recursive: true, force: true });
    process.exit(signal === "SIGINT" ? 130 : 143);
  };
  process.on("SIGINT", handler);
  process.on("SIGTERM", handler);
  return () => {
    process.off("SIGINT", handler);
    process.off("SIGTERM", handler);
  };
}

/** Last few stderr lines, already redacted, without row context from pg_restore. */
export function errorTail(stderr: string, lines = 6): string {
  return stderr
    .split("\n")
    .filter((l) => l.trim() && !/^(DETAIL|CONTEXT|LINE \d+):/.test(l.trim()))
    .slice(-lines)
    .map((l) => `  ${l}`)
    .join("\n");
}

export async function sha256File(path: string): Promise<string> {
  const hasher = new Bun.CryptoHasher("sha256");
  for await (const chunk of createReadStream(path)) hasher.update(chunk as Uint8Array);
  return hasher.digest("hex");
}

/** Counts `TABLE DATA` entries in `pg_restore --list` output. */
export function countTableData(listing: string): number {
  return listing.split("\n").filter((l) => / TABLE DATA /.test(l)).length;
}

export async function ping(url: string | undefined, body?: string): Promise<boolean> {
  if (!url) return true;
  try {
    const res = await fetch(url, {
      method: body ? "POST" : "GET",
      body,
      signal: AbortSignal.timeout(10_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
