import type { EntityManager } from "typeorm";

/**
 * Decision 8 option A (system audit slice 4; CH-2, L68): an account's balance today is its newest
 * recorded month. After any write or delete of history rows, this moves `accounts.balance` to the
 * value of the newest `account_details` row of each listed account, in the caller's transaction.
 *
 * - A write to the current month moves the balance, as before.
 * - A write to a past month moves it only when no newer month is recorded (correcting the latest
 *   month after it ends), and never when a newer month exists.
 * - An account with no history rows keeps its balance.
 *
 * A mortgage or loan with a rate and a regular payment is not projected here: the check-in works
 * its figure forward from this newest record ("Calculated", `calculateCheckInBalance`), which it
 * can only do while the balance equals that record.
 *
 * Only the caller's own accounts are written. The account rows are locked first, in id order, and
 * the newest record is read by the next statement, whose snapshot starts after the lock is held:
 * a concurrent write of a newer month either commits before that read (and is seen) or waits for
 * this transaction and then sets the balance itself, so the balance never lands on an older
 * month. Returns nothing.
 */
export async function syncBalancesToNewestRecord(
  manager: Pick<EntityManager, "query">,
  userId: string,
  accountIds: readonly string[],
): Promise<void> {
  const ids = [...new Set(accountIds)];
  if (ids.length === 0) return;
  await manager.query(
    `SELECT "id" FROM "accounts" WHERE "user_id" = $1 AND "id" = ANY($2::uuid[]) ORDER BY "id" FOR UPDATE`,
    [userId, ids],
  );
  await manager.query(
    `UPDATE "accounts" a
        SET "balance" = d."value", "updated_at" = now()
       FROM (SELECT DISTINCT ON ("account_id") "account_id", "value"
               FROM "account_details"
              WHERE "account_id" = ANY($2::uuid[])
              ORDER BY "account_id", "year" DESC, "month" DESC) d
      WHERE a."id" = d."account_id" AND a."user_id" = $1 AND a."balance" IS DISTINCT FROM d."value"`,
    [userId, ids],
  );
}
