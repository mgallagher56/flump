import { interestOverNext12MonthsAtAer } from "@flump/finance-engine";

/**
 * Interest earned over the next 12 months at the account's AER, with a regular monthly saving
 * added at the end of each month. The same calculation as the savings page headline, so the
 * per-account figure and the headline agree.
 */
export function calculateOneYearCompoundInterest(
  balance: number,
  rate: number,
  monthly: number,
): number {
  return interestOverNext12MonthsAtAer(balance, rate, monthly);
}
