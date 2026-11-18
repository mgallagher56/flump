import { calculateMortgagePayment } from "@flump/finance-engine";

/**
 * Monthly mortgage payment. Returns 0 when the balance, rate or (for repayment) term is
 * missing, so callers never render NaN or Infinity. The mortgage page keeps an unknown rate as 0,
 * so here a rate of 0 means "not entered" rather than a 0% mortgage.
 */
export function monthlyMortgagePayment(
  loanAmount: number,
  annualRatePct: number,
  termYears: number,
  type: "repayment" | "interest-only" = "repayment",
): number {
  if (!(annualRatePct > 0)) return 0;
  return calculateMortgagePayment(loanAmount, annualRatePct, termYears, type);
}
