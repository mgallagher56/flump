import type { Repository } from "typeorm";
import type { Account } from "../entities/account.entity";
import type { AccountDetail } from "../entities/account-detail.entity";

export interface ConnectedSnapshotWrite {
  accountId: string;
  userId: string;
  year: number;
  month: number;
  /** Already signed by account type (liabilities negative). */
  value: number;
  /** YYYY-MM-DD, from the same clock reading as year and month. */
  asOfDate: string;
}

/**
 * E30 D7, atomically: record a connected value for the month and move the account's balance to it,
 * unless the user entered that month's value by hand (`source = 'manual'`) or committed it from an
 * import (`source = 'agent'`, E17 re-plan section 7: sticky against bank sync), in which case
 * neither changes. One SQL statement, so a manual write landing at any moment cannot be overwritten by a
 * sync that read an older state. Returns true when the value was written.
 *
 * Test doubles without raw SQL fall back to a read-then-write with the same rule.
 */
export async function writeConnectedSnapshot(
  details: Repository<AccountDetail>,
  accounts: Repository<Account>,
  w: ConnectedSnapshotWrite,
): Promise<boolean> {
  if (typeof details.query === "function") {
    const rows: unknown[] = await details.query(
      `WITH d AS (
         INSERT INTO "account_details"
           ("account_id", "user_id", "year", "month", "value", "as_of_date", "source", "updated_at")
         VALUES ($1, $2, $3, $4, $5, $6, 'connected', now())
         ON CONFLICT ("account_id", "year", "month") DO UPDATE
           SET "value" = EXCLUDED."value", "as_of_date" = EXCLUDED."as_of_date",
               "source" = 'connected', "import_batch_id" = NULL, "updated_at" = now()
           WHERE "account_details"."source" NOT IN ('manual', 'agent')
         RETURNING 1
       )
       UPDATE "accounts" SET "balance" = $5
       WHERE "id" = $1 AND "user_id" = $2 AND EXISTS (SELECT 1 FROM d)
       RETURNING 1`,
      [w.accountId, w.userId, w.year, w.month, w.value, w.asOfDate],
    );
    // A DML RETURNING through Repository.query yields [rows, count] on some drivers.
    const flat = Array.isArray(rows[0]) ? (rows[0] as unknown[]) : rows;
    return flat.length > 0;
  }

  const existing = details.findOne
    ? await details.findOne({ where: { accountId: w.accountId, year: w.year, month: w.month } })
    : null;
  if (existing?.source === "manual" || existing?.source === "agent") return false;
  await details.upsert(
    {
      accountId: w.accountId,
      userId: w.userId,
      year: w.year,
      month: w.month,
      value: w.value,
      asOfDate: w.asOfDate,
      source: "connected",
      importBatchId: null,
    },
    ["accountId", "year", "month"],
  );
  await accounts.update?.({ id: w.accountId }, { balance: w.value });
  return true;
}
