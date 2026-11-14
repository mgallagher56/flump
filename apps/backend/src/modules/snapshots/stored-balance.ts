import {
  isStoredNegativeAccountType,
  normalizeStoredBalance,
  STORED_NEGATIVE_ACCOUNT_TYPES,
} from "@flump/banking/server";

export { isStoredNegativeAccountType, STORED_NEGATIVE_ACCOUNT_TYPES };

/**
 * The one sign rule for a stored balance or monthly value (E30, BE-05): liabilities (Mortgage,
 * Credit Card, Loan, Overdraft, Student Loan) are stored negative, everything else keeps the sign
 * it was given. Every write path uses this: account creation, balance and type edits, the
 * check-in batch, snapshot PUT, the onboarding snapshot, staged import commit and revert, and
 * bank sync. The database backs it with a CHECK on `accounts` and a deferred trigger on
 * `account_details` (migration LiabilitySignRule1794358050000).
 */
export function storedBalance(accountType: string | null | undefined, value: number): number {
  return normalizeStoredBalance(accountType, value);
}

/** The two repository calls the re-sign needs (a TypeORM repository or the in-memory double). */
interface HistoryRepository {
  find(options: { where: { accountId: string } }): Promise<Array<{ value: number | string }>>;
  save(rows: Array<{ value: number | string }>): Promise<unknown>;
}

/**
 * When an account becomes a liability, its whole monthly history follows the sign rule too.
 * Run it before the account row itself is saved with the new type, in the same transaction
 * where there is one: the history is re-signed while the account is still the old type, so the
 * database check passes at every step even without a transaction. A liability that becomes an
 * asset keeps its values as they are (an asset keeps the sign it was given, so a former
 * overdraft stays an overdrawn current account); the user edits the balance if they meant
 * otherwise. Returns the number of history rows changed (a count, never a value).
 */
export async function resignHistoryForType(
  details: HistoryRepository,
  accountId: string,
  newType: string | null | undefined,
): Promise<number> {
  if (!isStoredNegativeAccountType(newType)) return 0;
  const rows = (await details.find({ where: { accountId } })) ?? [];
  const changed = rows.filter((r) => Number(r.value) > 0);
  for (const r of changed) r.value = storedBalance(newType, Number(r.value));
  if (changed.length > 0) await details.save(changed);
  return changed.length;
}
