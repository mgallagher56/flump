import {
  ACCOUNT_EXPORT_SCHEMA_VERSION,
  ACCOUNT_EXPORT_SECTIONS,
  type AccountExportKey,
} from "@flump/api-contract";
import { Injectable } from "@nestjs/common";
import { DataSource, type EntityManager, type FindOptionsOrder } from "typeorm";
import { USER_DATA_REGISTRY, type UserDataTable } from "./user-data-registry";

/** Plain-English notes written into every export. */
export const EXPORT_NOTES: readonly string[] = [
  "This file holds every record Flump stores about you, one section per table.",
  "Money is in pounds as a number; dates are YYYY-MM-DD; times are ISO 8601 in UTC.",
  "Left out on purpose: secrets (bank access and refresh tokens, AI connection token hashes), browser retry keys and keyed hashes that mean nothing outside Flump.",
  "Your login details, such as your email address, are held by our sign-in provider, WorkOS, and are not in this file.",
];

/** Overall time an export may take, client included, before it is aborted. */
export const EXPORT_DEADLINE_MS = 2 * 60_000;
/** One page query may take this long. */
export const EXPORT_STATEMENT_TIMEOUT_MS = 30_000;
/** The connection may sit idle in the export transaction (waiting on the client) this long. */
export const EXPORT_IDLE_IN_TRANSACTION_TIMEOUT_MS = 60_000;

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
    const byKey = new Map<AccountExportKey, UserDataTable>(
      USER_DATA_REGISTRY.map((t) => [t.key, t]),
    );
    // A slow (or stalled) client must not hold a pool connection inside an open transaction: every
    // write is raced against one overall deadline, and missing it aborts the export, which rolls
    // the transaction back and frees the connection. The caller then cuts the response.
    const deadline = Date.now() + deadlineMs;
    const write: ExportWriter = async (chunk) => {
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
    await this.dataSource.transaction("REPEATABLE READ", async (manager) => {
      await manager.query("SET TRANSACTION READ ONLY");
      // Server-side backstops, scoped to this transaction only.
      await manager.query(`SET LOCAL statement_timeout = ${EXPORT_STATEMENT_TIMEOUT_MS}`);
      await manager.query(
        `SET LOCAL idle_in_transaction_session_timeout = ${EXPORT_IDLE_IN_TRANSACTION_TIMEOUT_MS}`,
      );
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

  private async writeSection(
    manager: EntityManager,
    table: UserDataTable,
    userId: string,
    write: ExportWriter,
  ): Promise<void> {
    const { columns, orderBy, batchSize, shape } = table.export;
    const repo = manager.getRepository(table.entity);
    const select = Object.fromEntries(columns.map((c) => [c, true]));
    const order = Object.fromEntries(orderBy.map((c) => [c, "ASC"])) as FindOptionsOrder<never>;
    const project = (row: Record<string, unknown>) =>
      Object.fromEntries(columns.map((c) => [c, row[c] ?? null]));

    if (shape === "object") {
      const row = await repo.findOne({ where: { userId }, select, order });
      await write(row ? JSON.stringify(project(row)) : "null");
      return;
    }

    await write("[");
    let first = true;
    for (let skip = 0; ; skip += batchSize) {
      const rows = await repo.find({ where: { userId }, select, order, skip, take: batchSize });
      for (const row of rows) {
        await write(`${first ? "" : ","}${JSON.stringify(project(row))}`);
        first = false;
      }
      if (rows.length < batchSize) break;
    }
    await write("]");
  }
}
