export interface FutureValueInput {
  /** Current balance in pounds. */
  balance: number;
  /** Paid in at the end of every month, in pounds. */
  monthlyContribution: number;
  /** Nominal annual rate as a percentage (4.5 means 4.5%), compounded monthly. */
  annualRatePct: number;
  years: number;
}

export interface FutureValueResult {
  projectedTotal: number;
  /** Growth beyond the money paid in. Never negative. */
  interestEarned: number;
}

/**
 * Compound growth of a balance with level monthly contributions:
 * FV = P(1 + r)^n + PMT((1 + r)^n - 1) / r, with r the monthly rate and n the number of months.
 *
 * TODO(E4 T15b): replace this local helper with the finance-engine projection once it exists, so
 * the dashboard and the savings forecaster share one set of assumptions.
 */
export const futureValue = ({
  balance,
  monthlyContribution,
  annualRatePct,
  years,
}: FutureValueInput): FutureValueResult => {
  const months = years * 12;
  const monthlyRate = annualRatePct / 100 / 12;
  const paidIn = monthlyContribution * months;
  const projectedTotal =
    monthlyRate > 0
      ? balance * (1 + monthlyRate) ** months +
        monthlyContribution * (((1 + monthlyRate) ** months - 1) / monthlyRate)
      : balance + paidIn;
  return { projectedTotal, interestEarned: Math.max(0, projectedTotal - balance - paidIn) };
};
