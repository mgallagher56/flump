/**
 * Months of cover ("runway" in code) keeps nothing in the browser any more (E23). The saved
 * figure comes from the engine's financial picture; every calculator input, including which
 * accounts to count, is a session-only scenario input held in container memory.
 */

/** Session-only scenario inputs. Never written to storage and never read by a headline. */
export interface RunwayScenario {
  includedAccounts?: Record<string, boolean>;
  keptIncome: Record<string, boolean>;
  keptExpenses: Record<string, boolean>;
  severanceLump: number;
  extraMonthlyCut: number;
}

/** Key older versions used for a saved account preference. Only ever removed now. */
export const RUNWAY_STORAGE_KEY = "flump_runway_calculator_settings";

/** Removes the account preference older versions saved in this browser. */
export function clearRunwaySettings(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(RUNWAY_STORAGE_KEY);
  } catch {
    // Storage disabled: nothing to remove.
  }
}

/** Current and savings accounts: the cash the saved months-of-cover figure counts. */
export function isCashAccountType(type?: string): boolean {
  if (!type) return false;
  const t = type.toLowerCase().trim();
  return t === "current" || t === "saving" || t === "savings";
}
