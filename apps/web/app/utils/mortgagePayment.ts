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
  if (!(loanAmount > 0) || !(annualRatePct > 0)) return 0;
  const i = annualRatePct / 100 / 12;
  if (type === "interest-only") return loanAmount * i;
  if (!(termYears > 0)) return 0;
  const n = termYears * 12;
  const payment = (loanAmount * i * (1 + i) ** n) / ((1 + i) ** n - 1);
  return Number.isFinite(payment) ? payment : 0;
}
