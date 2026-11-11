import {
  calculateDebtSchedule,
  type DebtItem,
  isHighInterestDebt,
  normalizeDebtItem,
  type PortfolioSnapshot,
} from "@flump/finance-engine";

export interface DebtSummary {
  totalDebt: number;
  debtCount: number;
  highInterestCount: number;
  monthlyMinimumTotal: number;
  /** True when any minimum payment is an estimate rather than a stored figure. */
  monthlyMinimumEstimated: boolean;
  /** Month and year the debts clear on minimum payments, or null when that is not achievable. */
  debtFreeDate: string | null;
  debts: DebtItem[];
}

/**
 * Summarises consumer debt only (mortgages are excluded). Returns null when there is none.
 */
export function buildDebtSummary(
  snapshot: PortfolioSnapshot,
  now: Date = new Date(),
): DebtSummary | null {
  const debts = snapshot.toDebtItems();
  const totalDebt = snapshot.getTotalConsumerDebt();
  if (debts.length === 0 || totalDebt <= 0) return null;

  // An unset APR is modelled as 0%, which would invent an optimistic date: report none instead.
  const aprUnknown = debts.some((d) => d.aprKnown === false);
  const minimumOnly = calculateDebtSchedule(
    debts.map((d) => normalizeDebtItem(d)),
    0,
    "AVALANCHE",
    { referenceDate: now },
  );

  return {
    totalDebt,
    debtCount: debts.length,
    highInterestCount: debts.filter((d) => isHighInterestDebt(d)).length,
    monthlyMinimumTotal: debts.reduce((sum, d) => sum + (d.minimumPayment ?? 0), 0),
    monthlyMinimumEstimated: debts.some((d) => d.minimumPaymentEstimated === true),
    debtFreeDate: !aprUnknown && minimumOnly.payoffAchievable ? minimumOnly.debtFreeDate : null,
    debts,
  };
}
