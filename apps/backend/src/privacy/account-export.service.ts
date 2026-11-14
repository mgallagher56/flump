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
  "Your login (email address and password) is held by our sign-in provider, WorkOS, not in this file.",
];

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

  async writeExport(userId: string, write: ExportWriter, now: Date = new Date()): Promise<void> {
    const byKey = new Map<AccountExportKey, UserDataTable>(
      USER_DATA_REGISTRY.map((t) => [t.key, t]),
    );
    await this.dataSource.transaction("REPEATABLE READ", async (manager) => {
      await manager.query("SET TRANSACTION READ ONLY");
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
