import {
  ACCOUNT_EXPORT_SCHEMA_VERSION,
  ACCOUNT_EXPORT_SECTIONS,
  type AccountExportKey,
} from "@flump/api-contract";
import { decryptReceiptData, isEncryptedToken } from "@flump/banking/server";
import { Injectable } from "@nestjs/common";
import { DataSource, type EntityManager, type FindOptionsOrder } from "typeorm";
import { recordAuditEvent } from "../../audit/audit-events";
import { formatCsvRow } from "./csv-export";
import { USER_DATA_REGISTRY, type UserDataTable } from "./user-data-registry";

/** Plain-English notes written into every export. */
const EXPORT_NOTES: readonly string[] = [
  "This file holds every record Flump stores about you, one section per table.",
  "Money is in pounds as a number; dates are YYYY-MM-DD; times are ISO 8601 in UTC.",
  "Percentages are numbers where 5 means 5%. Pension contribution rates keep up to four decimal places, so a rate worked out from pounds a month is exact to the penny.",
  "Left out on purpose: secrets (bank access and refresh tokens, AI connection token hashes), browser retry keys and keyed hashes that mean nothing outside Flump.",
  "Your login details, such as your email address, are held by our sign-in provider, WorkOS, and are not in this file.",
];

/** Overall time an export may take, client included, before it is aborted. */
const EXPORT_DEADLINE_MS = 2 * 60_000;
/** One page query may take this long. */
const EXPORT_STATEMENT_TIMEOUT_MS = 30_000;
/** The connection may sit idle in the export transaction (waiting on the client) this long. */
const EXPORT_IDLE_IN_TRANSACTION_TIMEOUT_MS = 60_000;

export class ExportDeadlineError extends Error {
  constructor() {
    super("export deadline exceeded");
    this.name = "ExportDeadlineError";
  }
}

/** Receives each chunk of the document; resolves once the chunk may be followed by the next. */
export type ExportWriter = (chunk: string) => Promise<void>;

/** `YYYY-MM-DD` (UTC) for the download's file name. */
export function exportFileName(now: Date): string {
  return `flump-export-${now.toISOString().slice(0, 10)}.json`;
}

/** `YYYY-MM-DD` (UTC) for the CSV download's file name. */
export function csvExportFileName(now: Date, section?: AccountExportKey): string {
  const date = now.toISOString().slice(0, 10);
  return section ? `flump-export-${section}-${date}.csv` : `flump-export-${date}.csv`;
}

/** Type guard for an export section key from query parameters. */
export function isAccountExportKey(value: string): value is AccountExportKey {
  return Object.hasOwn(ACCOUNT_EXPORT_SECTIONS, value);
}

/**
 * Writes the caller's data export (BE-04, finding H9) as one JSON document, streamed: the envelope
 * first, then each table a page at a time, so no table is ever held in memory whole. Only the
 * caller's rows, and only each table's allow-listed columns (see the registry), are read.
 *
 * The reads run in one REPEATABLE READ, READ ONLY transaction, so the document is a consistent
 * snapshot even while the person keeps using the app.
 */
@Injectable()
export class AccountExportService {
  constructor(private readonly dataSource: DataSource) {}

  async writeExport(
    userId: string,
    rawWrite: ExportWriter,
    now: Date = new Date(),
    deadlineMs: number = EXPORT_DEADLINE_MS,
  ): Promise<void> {
    const byKey = this.registryByKey();
    const write = this.withDeadline(rawWrite, deadlineMs);
    await this.runReadOnlyExport(userId, async (manager) => {
      const head = {
        schemaVersion: ACCOUNT_EXPORT_SCHEMA_VERSION,
        exportedAt: now.toISOString(),
        userId,
        notes: EXPORT_NOTES,
      };
      // The envelope without its closing brace, then each section appended to it.
      await write(JSON.stringify(head).slice(0, -1));
      for (const key of Object.keys(ACCOUNT_EXPORT_SECTIONS) as AccountExportKey[]) {
        const table = byKey.get(key);
        if (!table) throw new Error(`export section ${key} has no registry table`);
        await write(`,${JSON.stringify(key)}:`);
        await this.writeSection(manager, table, userId, write);
      }
      await write("}");
    });
  }

  /**
   * Streams the caller's data export as RFC 4180 CSV with formula-injection protection. When
   * `section` is specified, writes a single table with its header row; when omitted, writes every
   * section in `ACCOUNT_EXPORT_SECTIONS` order. Writes the `user.exported` audit row before the
   * first byte.
   */
  async writeCsvExport(
    userId: string,
    rawWrite: ExportWriter,
    options: { section?: AccountExportKey; deadlineMs?: number } = {},
  ): Promise<void> {
    const byKey = this.registryByKey();
    const { section, deadlineMs = EXPORT_DEADLINE_MS } = options;
    if (section && !byKey.has(section)) {
      throw new Error(`export section ${section} has no registry table`);
    }
    const write = this.withDeadline(rawWrite, deadlineMs);
    await this.runReadOnlyExport(userId, async (manager) => {
      if (section) {
        const table = byKey.get(section);
        if (!table) throw new Error(`export section ${section} has no registry table`);
        await this.writeCsvSection(manager, table, userId, write);
        return;
      }
      const keys = Object.keys(ACCOUNT_EXPORT_SECTIONS) as AccountExportKey[];
      for (let i = 0; i < keys.length; i += 1) {
        const key = keys[i] as AccountExportKey;
        const table = byKey.get(key);
        if (!table) throw new Error(`export section ${key} has no registry table`);
        if (i > 0) await write("\r\n");
        await write(formatCsvRow(["section", key]));
        await this.writeCsvSection(manager, table, userId, write);
      }
    });
  }

  private registryByKey(): Map<AccountExportKey, UserDataTable> {
    return new Map<AccountExportKey, UserDataTable>(USER_DATA_REGISTRY.map((t) => [t.key, t]));
  }

  private withDeadline(rawWrite: ExportWriter, deadlineMs: number): ExportWriter {
    // A slow (or stalled) client must not hold a pool connection inside an open transaction: every
    // write is raced against one overall deadline, and missing it aborts the export, which rolls
    // the transaction back and frees the connection. The caller then cuts the response.
    const deadline = Date.now() + deadlineMs;
    return async (chunk) => {
      const left = deadline - Date.now();
      if (left <= 0) throw new ExportDeadlineError();
      let timer: NodeJS.Timeout | undefined;
      try {
        await Promise.race([
          rawWrite(chunk),
          new Promise<never>((_, reject) => {
            timer = setTimeout(() => reject(new ExportDeadlineError()), left);
          }),
        ]);
      } finally {
        clearTimeout(timer);
      }
    };
  }

  private async runReadOnlyExport(
    userId: string,
    fn: (manager: EntityManager) => Promise<void>,
  ): Promise<void> {
    // N3: the audit row is written BEFORE the first byte of the export, on its own connection (the
    // export transaction below is read only). If the insert fails, this throws before anything has
    // been written to the response, so the caller answers with the standard error. So an export is
    // never delivered without a record. The reverse can happen: a record may exist for an export
    // that then failed mid-stream.
    await recordAuditEvent(this.dataSource.manager, { userId, action: "user.exported" });
    await this.dataSource.transaction("REPEATABLE READ", async (manager) => {
      await manager.query("SET TRANSACTION READ ONLY");
      // Server-side backstops, scoped to this transaction only.
      await manager.query(`SET LOCAL statement_timeout = ${EXPORT_STATEMENT_TIMEOUT_MS}`);
      await manager.query(
        `SET LOCAL idle_in_transaction_session_timeout = ${EXPORT_IDLE_IN_TRANSACTION_TIMEOUT_MS}`,
      );
      await fn(manager);
    });
  }

  /**
   * Reads the caller's rows of one table, a page at a time, and hands each one to `onRow` already
   * shaped by `exportRow` (the single place JSON and CSV get their values from). An `object` table
   * yields at most one row.
   */
  private async forEachExportRow(
    manager: EntityManager,
    table: UserDataTable,
    userId: string,
    onRow: (row: Record<string, unknown>) => Promise<void>,
  ): Promise<void> {
    const { columns, orderBy, batchSize, shape } = table.export;
    const repo = manager.getRepository(table.entity);
    const select = Object.fromEntries(columns.map((c) => [c, true]));
    const order = Object.fromEntries(orderBy.map((c) => [c, "ASC"])) as FindOptionsOrder<never>;

    if (shape === "object") {
      const row = await repo.findOne({ where: { userId }, select, order });
      if (row) await onRow(exportRow(table, row as Record<string, unknown>));
      return;
    }

    for (let skip = 0; ; skip += batchSize) {
      const rows = await repo.find({ where: { userId }, select, order, skip, take: batchSize });
      for (const row of rows) await onRow(exportRow(table, row as Record<string, unknown>));
      if (rows.length < batchSize) break;
    }
  }

  private async writeSection(
    manager: EntityManager,
    table: UserDataTable,
    userId: string,
    write: ExportWriter,
  ): Promise<void> {
    if (table.export.shape === "object") {
      let found = false;
      await this.forEachExportRow(manager, table, userId, async (row) => {
        found = true;
        await write(JSON.stringify(row));
      });
      if (!found) await write("null");
      return;
    }

    await write("[");
    let first = true;
    await this.forEachExportRow(manager, table, userId, async (row) => {
      await write(`${first ? "" : ","}${JSON.stringify(row)}`);
      first = false;
    });
    await write("]");
  }

  private async writeCsvSection(
    manager: EntityManager,
    table: UserDataTable,
    userId: string,
    write: ExportWriter,
  ): Promise<void> {
    const { columns } = table.export;
    await write(formatCsvRow(columns));
    await this.forEachExportRow(manager, table, userId, async (row) => {
      await write(formatCsvRow(columns.map((c) => row[c])));
    });
  }
}

/**
 * One export row: the table's allow-listed columns in order, missing values as null, and a tax
 * record's encrypted receipt decrypted (SEC-D, L4) so neither the JSON nor the CSV ever carries
 * the ciphertext envelope.
 */
function exportRow(table: UserDataTable, row: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    table.export.columns.map((c) => {
      const val = row[c];
      if (
        table.key === "taxRecords" &&
        c === "receiptData" &&
        typeof val === "string" &&
        isEncryptedToken(val) &&
        typeof row.id === "string"
      ) {
        return [c, decryptReceiptData(val, row.id)];
      }
      // A budget line linked to a saved fact stores no amount of its own: its stored 0 is never
      // a figure, so the export says so with null. The fact itself is in the profile section.
      if (table.key === "budgetEntries" && c === "amount" && row.linkKind) return [c, null];
      return [c, val ?? null];
    }),
  );
}
