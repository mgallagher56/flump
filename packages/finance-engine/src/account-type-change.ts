/**
 * Debt account types: stored as minus the amount owed. Must match the banking package's
 * STORED_NEGATIVE_ACCOUNT_TYPES (a backend test keeps the two in step).
 */
export const DEBT_ACCOUNT_TYPES = [
  "Mortgage",
  "Credit Card",
  "Loan",
  "Overdraft",
  "Student Loan",
] as const;

/** Asset types whose balance can go below zero: an overdrawn current account. */
export const OVERDRAWABLE_ACCOUNT_TYPES = ["Current"] as const;

const DEBT = new Set<string>(DEBT_ACCOUNT_TYPES);
const OVERDRAWABLE = new Set<string>(OVERDRAWABLE_ACCOUNT_TYPES);

/**
 * True when changing an account's type turns its stored amounts from negative to positive (CH-4).
 * The rule: a debt moving to an asset type that cannot be overdrawn (Saving, Investment, Pension,
 * Property, Owed) is money held, so it re-signs positive. A debt moving to a type that can be
 * overdrawn (Current) keeps its sign: an overdraft, card or loan balance moved to a current
 * account is an overdrawn current account. Debt to debt, any asset move, or no old type: false.
 */
export function typeChangeFlipsSign(
  previousType: string | null | undefined,
  newType: string | null | undefined,
): boolean {
  if (previousType == null || newType == null) return false;
  return DEBT.has(previousType) && !DEBT.has(newType) && !OVERDRAWABLE.has(newType);
}
