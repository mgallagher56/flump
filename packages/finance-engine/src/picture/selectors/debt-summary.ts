import { calculateDebtSchedule, normalizeDebtItem } from "../../debt-payoff.js";
import { isHighInterestDebt } from "../../health-score.js";
import type { PortfolioSnapshot } from "../../portfolio.js";
import type { DebtItem } from "../../types.js";

export interface DebtSummary {
  totalDebt: number;
  debtCount: number;
  highInterestCount: number;
  monthlyMinimumTotal: number;
  /** True when any minimum payment is an estimate rather than a stored figure. */
  monthlyMinimumEstimated: boolean;
  /** Month and year the debts clear on minimum payments, or null when that is not achievable. */
  debtFreeDate: string | null;
  /** Interest paid on the same minimum-only schedule, or null whenever the date is null. */
  totalInterest: number | null;
  debts: DebtItem[];
}

/**
 * Consumer debt only (mortgages and student loans are left out), on minimum payments alone:
 * the avalanche order with no extra payment, the schedule the Debt page and the Dashboard show.
 * Returns null when there is no consumer debt.
 *
 * No date (and no interest) when any APR is unknown, since an unset APR is modelled as 0% and
 * would give an optimistic date, or when minimum payments never clear the debt.
 */
export function selectDebtSummary(
  snapshot: PortfolioSnapshot,
  asOf: Date = new Date(),
): DebtSummary | null {
  const debts = snapshot.toDebtItems();
  const totalDebt = snapshot.getTotalConsumerDebt();
  if (debts.length === 0 || totalDebt <= 0) return null;

  const aprUnknown = debts.some((d) => d.aprKnown === false);
  const minimumOnly = calculateDebtSchedule(
    debts.map((d) => normalizeDebtItem(d)),
    0,
    "AVALANCHE",
    { referenceDate: asOf },
  );
  const debtFreeDate =
    !aprUnknown && minimumOnly.payoffAchievable ? minimumOnly.debtFreeDate : null;

  return {
    totalDebt,
    debtCount: debts.length,
    highInterestCount: debts.filter((d) => isHighInterestDebt(d)).length,
    monthlyMinimumTotal: debts.reduce((sum, d) => sum + (d.minimumPayment ?? 0), 0),
    monthlyMinimumEstimated: debts.some((d) => d.minimumPaymentEstimated === true),
    debtFreeDate,
    totalInterest: debtFreeDate === null ? null : minimumOnly.totalInterestPaidGbp,
    debts,
  };
}
