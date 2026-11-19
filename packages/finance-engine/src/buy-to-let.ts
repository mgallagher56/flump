/**
 * A buy-to-let row by its name ("Buy to let", "Buy-to-let", "BTL"), the names the accounts page
 * and demo data save them with. The fallback for accounts without a chosen subtype: callers use
 * `isBuyToLetAccount`, which puts a chosen mortgage subtype first.
 */
export function isBuyToLetAccountName(name: string): boolean {
  return /\bbuy[\s-]*to[\s-]*let\b|\bbtl\b/i.test(name);
}

/**
 * True when an account is a buy-to-let property or mortgage. A chosen mortgage subtype decides it
 * (`btl_mortgage` yes, `residential_mortgage` no, whatever the name says); without one (property
 * rows, older mortgages) the name decides (`isBuyToLetAccountName`).
 */
export function isBuyToLetAccount(account: {
  name?: string | null;
  accountSubtype?: string | null;
}): boolean {
  if (account.accountSubtype === "btl_mortgage") return true;
  if (account.accountSubtype === "residential_mortgage") return false;
  return isBuyToLetAccountName(account.name ?? "");
}
