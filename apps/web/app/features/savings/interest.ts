import { calculateCompoundInterestEarned } from "@flump/finance-engine";

/** Interest earned over the next 12 months, compounding monthly with a regular monthly saving. */
export function calculateOneYearCompoundInterest(
  balance: number,
  rate: number,
  monthly: number,
): number {
  return calculateCompoundInterestEarned(balance, rate, monthly, 12);
}
