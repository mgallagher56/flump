import { categorizeAccountType, isBuyToLetAccount, pickHomeProperty } from "@flump/finance-engine";

interface AccountLike {
  id?: string | null;
  type?: string | null;
  name?: string | null;
  accountSubtype?: string | null;
  linkedAccountId?: string | null;
}

/**
 * The residential mortgage among a user's accounts: a Mortgage that is not buy to let (by its saved
 * kind first, `isBuyToLetAccount`), preferring the one linked to the home (`pickHomeProperty`).
 * With no link to the home, the first residential mortgage. Null when there is none, so a
 * buy-to-let mortgage's figures are never taken for the home's.
 */
export function pickResidentialMortgage<T extends AccountLike>(
  accounts: readonly T[] | null | undefined,
): T | null {
  if (!Array.isArray(accounts)) return null;
  const residential = accounts.filter(
    (a) => categorizeAccountType(a.type) === "mortgages" && !isBuyToLetAccount(a),
  );
  if (residential.length === 0) return null;
  const home = pickHomeProperty(accounts);
  const homeId = home.status === "one" ? home.account.id : null;
  const linked = homeId ? residential.find((a) => a.linkedAccountId === homeId) : undefined;
  return linked ?? residential[0] ?? null;
}
