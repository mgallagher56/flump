import { BankSyncOrchestrator } from "@flump/banking/server";

/**
 * The one sign rule for a stored balance or monthly value (E30): liabilities (Mortgage, Credit
 * Card, Loan, Overdraft) are stored negative, everything else keeps the sign it was given. Every
 * write path (connected sync, balance edits, check-in batch, snapshot PUT) uses this.
 */
export function storedBalance(accountType: string, value: number): number {
  return BankSyncOrchestrator.normalizeAccountBalance(accountType, value);
}
