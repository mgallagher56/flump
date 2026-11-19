import type { PortfolioSnapshot } from "../../portfolio.js";

/** Saving and Investment accounts in total. Pounds, plain numbers (not a Figure). */
export interface SavingsTotals {
  /** Balances at the user's share, as the Savings page and net worth read them (SD-2). */
  balance: number;
  /** Monthly amounts saved into these accounts, at the user's share. */
  monthlyContributions: number;
  /** How many Saving and Investment accounts there are. */
  accountCount: number;
  /** Balance-weighted interest rate, or null when the balance is not above 0 (never a default). */
  weightedRate: number | null;
}

/** The stored account types the Savings page and the Dashboard list as savings. */
const SAVINGS_TYPES: ReadonlySet<string> = new Set(["Saving", "Investment"]);

/**
 * Totals over the stored "Saving" and "Investment" accounts, the same accounts the Savings page
 * and the Dashboard list.
 *
 * `monthlyContributions` sums the snapshot's resolved `monthlyContribution`, which is already
 * scaled by the account's share. That is the figure the Savings page shows
 * (`totalMonthlySavingAtShare`); the Dashboard summed the whole stored amount, which differs only
 * for a joint account. An account with no stored amount adds 0.
 */
export function selectSavingsTotals(snapshot: PortfolioSnapshot): SavingsTotals {
  const accounts = snapshot.getResolvedAccounts().filter((a) => SAVINGS_TYPES.has(a.rawType));
  const balance = accounts.reduce((sum, a) => sum + a.nominalBalance, 0);
  const monthlyContributions = accounts.reduce((sum, a) => sum + a.monthlyContribution, 0);
  return {
    balance,
    monthlyContributions,
    accountCount: accounts.length,
    // The Dashboard's rule: no balance means no rate, never a substituted default.
    weightedRate: balance > 0 ? snapshot.getWeightedSavingsRate(0) : null,
  };
}
