import {
  compareAvalancheAndSnowball,
  type DebtItem,
  isHighInterestDebt,
  type PortfolioSnapshot,
} from "@flump/finance-engine";

export interface DebtSummary {
  totalDebt: number;
  debtCount: number;
  highInterestCount: number;
  monthlyMinimumTotal: number;
  /** Month and year the debts clear on minimum payments, or null when that is not achievable. */
  debtFreeDate: string | null;
  debts: DebtItem[];
}

/**
 * Summarises consumer debt only (mortgages are excluded). Returns null when there is none.
 */
export function buildDebtSummary(snapshot: PortfolioSnapshot): DebtSummary | null {
  const debts = snapshot.toDebtItems();
  if (debts.length === 0) return null;

  const minimumOnly = compareAvalancheAndSnowball(debts, 0).minimumOnly;

  return {
    totalDebt: snapshot.getTotalConsumerDebt(),
    debtCount: debts.length,
    highInterestCount: debts.filter((d) => isHighInterestDebt(d)).length,
    monthlyMinimumTotal: debts.reduce((sum, d) => sum + (d.minimumPayment ?? 0), 0),
    debtFreeDate: minimumOnly.payoffAchievable ? minimumOnly.debtFreeDate : null,
    debts,
  };
}
