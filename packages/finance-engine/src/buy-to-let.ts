/**
 * A buy-to-let row by its name ("Buy to let", "Buy-to-let", "BTL"), the names the accounts page
 * and demo data save them with. The fallback for accounts without a chosen subtype: callers use
 * `isBuyToLetAccount`, which puts a chosen mortgage subtype first.
 */
export function isBuyToLetAccountName(name: string): boolean {
  return /\bbuy[\s-]*to[\s-]*let\b|\bbtl\b/i.test(name);
}

/** The name a rental property gets when the user gives none (system audit slice 4). */
export const BUY_TO_LET_PROPERTY_LABEL = "Buy-to-let property";

/**
 * True when an account is a buy-to-let property or mortgage. A saved kind decides it, whatever
 * the name says: `btl_mortgage` and `rental` yes, `residential_mortgage` and `home` no (system
 * audit slice 4, L71). Only an account with no kind saved falls back to the name
 * (`isBuyToLetAccountName`).
 */
export function isBuyToLetAccount(account: {
  name?: string | null;
  accountSubtype?: string | null;
}): boolean {
  if (account.accountSubtype === "btl_mortgage" || account.accountSubtype === "rental") return true;
  if (account.accountSubtype === "residential_mortgage" || account.accountSubtype === "home") {
    return false;
  }
  return isBuyToLetAccountName(account.name ?? "");
}
