import { calculateMortgagePayment } from "@flump/finance-engine";

/**
 * Monthly mortgage payment. Returns 0 when the balance, rate or (for repayment) term is
 * missing, so callers never render NaN or Infinity.
 */
export function monthlyMortgagePayment(
  loanAmount: number,
  annualRatePct: number,
  termYears: number,
  type: "repayment" | "interest-only" = "repayment",
): number {
  return calculateMortgagePayment(loanAmount, annualRatePct, termYears, type);
}
