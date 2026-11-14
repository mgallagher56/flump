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

const CHUNK = 1000;

/**
 * The E30 upsert, shared by `PUT /snapshots/:month` (source `manual`) and the import commit
 * (source `agent`, stamped with the batch). Runs inside the caller's transaction: latest write
 * wins on (account_id, year, month), and a current-month value also moves the account balance.
 * Callers have already checked that every account belongs to `userId`.
 */
export async function writeSnapshotRows(
  manager: EntityManager,
  userId: string,
  rows: SnapshotRowWrite[],
  opts: { source: "manual" | "agent"; importBatchId: string | null; current: YearMonth },
): Promise<void> {
  if (rows.length === 0) return;
  // Stable lock order for concurrent batches.
  const sorted = [...rows].sort(
    (x, y) =>
      (x.accountId < y.accountId ? -1 : x.accountId > y.accountId ? 1 : 0) ||
      x.year - y.year ||
      x.month - y.month,
  );
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
  // The current month's value is the user's statement of "now", so the account's current balance
  // follows it. Back-dated or edited past months never touch it.
  for (const r of sorted) {
    if (compareYearMonth(r, opts.current) === 0) {
      await manager.update(Account, { id: r.accountId, userId }, { balance: r.value });
    }
  }
}
