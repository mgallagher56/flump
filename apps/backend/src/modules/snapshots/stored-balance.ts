import {
  isStoredNegativeAccountType,
  normalizeStoredBalance,
  STORED_NEGATIVE_ACCOUNT_TYPES,
} from "@flump/banking/server";
import { typeChangeFlipsSign } from "@flump/finance-engine";

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
 * True when a type change turns a debt into an asset whose amounts go positive (CH-4). The rule
 * lives in the engine (`typeChangeFlipsSign`) so the edit dialog can warn before it happens: a
 * debt moving to an asset that cannot be overdrawn (Saving, Investment and so on) flips; a debt
 * moving to Current keeps its sign, as an overdrawn current account.
 */
export function debtBecomesAsset(
  previousType: string | null | undefined,
  newType: string | null | undefined,
): boolean {
  return typeChangeFlipsSign(previousType, newType);
}

/**
 * When an account moves between a liability and an asset type, its whole monthly history follows
 * the sign rule too. Becoming a liability, positive months go negative. Becoming an asset from a
 * liability (`previousType` given) that cannot be overdrawn, negative months go positive: the edit form re-posts today's
 * balance as the positive amount, so past months must match it (CH-4). Without `previousType`
 * (bank sync), a move to an asset leaves the values as they are. Run it before the account row
 * itself is saved with the new type, in the same transaction where there is one: the database
 * trigger on history is deferred to commit, so either direction passes. Returns the number of
 * history rows changed (a count, never a value).
 */
export async function resignHistoryForType(
  details: HistoryRepository,
  accountId: string,
  newType: string | null | undefined,
  previousType?: string | null,
): Promise<number> {
  const toLiability = isStoredNegativeAccountType(newType);
  const toAssetFromLiability = !toLiability && debtBecomesAsset(previousType, newType);
  if (!toLiability && !toAssetFromLiability) return 0;
  const rows = (await details.find({ where: { accountId } })) ?? [];
  const changed = rows.filter((r) => (toLiability ? Number(r.value) > 0 : Number(r.value) < 0));
  for (const r of changed) {
    r.value = toLiability ? storedBalance(newType, Number(r.value)) : -Number(r.value);
  }
  if (changed.length > 0) await details.save(changed);
  return changed.length;
}
