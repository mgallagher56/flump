import type { EntityManager } from "typeorm";
import { Account } from "../entities/account.entity";
import { AccountDetail } from "../entities/account-detail.entity";
import { compareYearMonth, type YearMonth } from "./london-date";

export interface SnapshotRowWrite {
  accountId: string;
  year: number;
  month: number;
  /** Already signed by account type (see storedBalance). */
  value: number;
  asOfDate: string;
}

export interface SnapshotWriteOptions {
  source: "manual" | "agent";
  importBatchId: string | null;
  current: YearMonth;
  /**
   * Import writes only (source `agent`): an existing row is replaced only when its source is
   * `agent` or its key is in this list (rows the user ticked). Decided by the database at write
   * time, so a manual or connected value inserted after the import read the table is never
   * overwritten. Rows held back this way are not returned.
   */
  forceOverwrite?: ReadonlyArray<{ accountId: string; year: number; month: number }>;
}

const CHUNK = 1000;

const byKey = (x: SnapshotRowWrite, y: SnapshotRowWrite) =>
  (x.accountId < y.accountId ? -1 : x.accountId > y.accountId ? 1 : 0) ||
  x.year - y.year ||
  x.month - y.month;

/**
 * The E30 upsert, shared by `PUT /snapshots/:month` (source `manual`) and the import commit
 * (source `agent`, stamped with the batch). Runs inside the caller's transaction: latest write
 * wins on (account_id, year, month), and a current-month value also moves the account balance.
 * Callers have already checked that every account belongs to `userId`. Returns the rows written.
 */
export async function writeSnapshotRows(
  manager: EntityManager,
  userId: string,
  rows: SnapshotRowWrite[],
  opts: SnapshotWriteOptions,
): Promise<SnapshotRowWrite[]> {
  if (rows.length === 0) return [];
  // Stable lock order for concurrent batches.
  const sorted = [...rows].sort(byKey);
  const written =
    opts.source === "agent"
      ? await writeProtected(manager, userId, sorted, opts)
      : await writeAll(manager, userId, sorted, opts);
  // The current month's value is the user's statement of "now", so the account's current balance
  // follows it. Back-dated or edited past months never touch it.
  for (const r of written) {
    if (compareYearMonth(r, opts.current) === 0) {
      await manager.update(Account, { id: r.accountId, userId }, { balance: r.value });
    }
  }
  return written;
}

async function writeAll(
  manager: EntityManager,
  userId: string,
  sorted: SnapshotRowWrite[],
  opts: SnapshotWriteOptions,
): Promise<SnapshotRowWrite[]> {
  const updatedAt = new Date();
  for (let i = 0; i < sorted.length; i += CHUNK) {
    await manager
      .createQueryBuilder()
      .insert()
      .into(AccountDetail)
      .values(
        sorted.slice(i, i + CHUNK).map((r) => ({
          accountId: r.accountId,
          userId,
          year: r.year,
          month: r.month,
          value: r.value,
          asOfDate: r.asOfDate,
          source: opts.source,
          importBatchId: opts.importBatchId,
          updatedAt,
        })),
      )
      .orUpdate(
        ["value", "as_of_date", "source", "import_batch_id", "updated_at"],
        ["account_id", "year", "month"],
      )
      .execute();
  }
  return sorted;
}

async function writeProtected(
  manager: EntityManager,
  userId: string,
  sorted: SnapshotRowWrite[],
  opts: SnapshotWriteOptions,
): Promise<SnapshotRowWrite[]> {
  const force = opts.forceOverwrite ?? [];
  const done = new Set<string>();
  for (let i = 0; i < sorted.length; i += CHUNK) {
    const chunk = sorted.slice(i, i + CHUNK);
    const returned: Array<{ account_id: string; year: number; month: number }> =
      await manager.query(
        `INSERT INTO "account_details"
           ("account_id", "user_id", "year", "month", "value", "as_of_date", "source",
            "import_batch_id", "updated_at")
         SELECT t.a, $1, t.y, t.m, t.v, t.d, $2, $3, now()
         FROM unnest($4::uuid[], $5::int[], $6::int[], $7::numeric[], $8::date[])
           AS t(a, y, m, v, d)
         ON CONFLICT ("account_id", "year", "month") DO UPDATE
           SET "value" = EXCLUDED."value", "as_of_date" = EXCLUDED."as_of_date",
               "source" = EXCLUDED."source", "import_batch_id" = EXCLUDED."import_batch_id",
               "updated_at" = now()
           WHERE "account_details"."source" = 'agent'
              OR ("account_details"."account_id", "account_details"."year", "account_details"."month")
                 IN (SELECT * FROM unnest($9::uuid[], $10::int[], $11::int[]))
         RETURNING "account_id", "year", "month"`,
        [
          userId,
          opts.source,
          opts.importBatchId,
          chunk.map((r) => r.accountId),
          chunk.map((r) => r.year),
          chunk.map((r) => r.month),
          chunk.map((r) => r.value),
          chunk.map((r) => r.asOfDate),
          force.map((f) => f.accountId),
          force.map((f) => f.year),
          force.map((f) => f.month),
        ],
      );
    for (const r of returned) done.add(`${r.account_id}|${r.year}|${r.month}`);
  }
  return sorted.filter((r) => done.has(`${r.accountId}|${r.year}|${r.month}`));
}
