import type { PortfolioSnapshot } from "../../portfolio.js";

export interface NetWorthTotals {
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  liquidCash: number;
  investments: number;
  pensions: number;
  /** Property account rows (the onboarding home estimate is one of them). */
  property: number;
  /**
   * Of `property`, the account rows labelled HOME_ESTIMATE_LABEL that onboarding seeds from the
   * user's own home estimate (D3), so pages can label it. Already inside `property`,
   * `totalAssets` and `netWorth`; never added on top. 0 when there is none.
   */
  homeEstimate: number;
  /** Income-contingent, so outside net worth and outside debt payoff (decision D-5-B). */
  studentLoans: number;
}

export interface DebtTotals {
  /** Cards, loans and overdrawn current accounts: the payoff set. */
  consumerDebt: number;
  mortgage: number;
  studentLoans: number;
  debtCount: number;
  monthlyMinimums: number;
  minimumsEstimated: boolean;
}

/**
 * The name onboarding gives the Property account it seeds from the user's home estimate, and the
 * label pages show beside it (owner decision D3, option a). That account is the single source of
 * the home's value: the profile never carries one into net worth.
 */
export const HOME_ESTIMATE_LABEL = "Home (your estimate)";

/** Property account rows that carry the onboarding home estimate. */
export function selectHomeEstimate(snapshot: PortfolioSnapshot): number {
  return snapshot
    .getAccountsByCategory("property")
    .filter((a) => a.name === HOME_ESTIMATE_LABEL)
    .reduce((sum, a) => sum + a.nominalBalance, 0);
}

/** Net worth and its parts, from account rows only. Never unknown: no accounts is a real £0. */
export function selectNetWorth(snapshot: PortfolioSnapshot): NetWorthTotals {
  return {
    netWorth: snapshot.getTotalNetWorth(),
    totalAssets: snapshot.getTotalAssets(),
    totalLiabilities: snapshot.getTotalLiabilities(),
    liquidCash: snapshot.getTotalLiquidCash(),
    investments: snapshot.getTotalInvestments(),
    pensions: snapshot.getTotalPensions(),
    property: snapshot.getTotalProperty(),
    homeEstimate: selectHomeEstimate(snapshot),
    studentLoans: snapshot.getTotalStudentLoans(),
  };
}

/** Debt totals. Consumer debt is the one "total debt" figure every page shows. */
export function selectDebtTotals(snapshot: PortfolioSnapshot): DebtTotals {
  const debts = snapshot.toDebtItems();
  return {
    consumerDebt: snapshot.getTotalConsumerDebt(),
    mortgage: snapshot.getTotalMortgageBalance(),
    studentLoans: snapshot.getTotalStudentLoans(),
    debtCount: debts.length,
    monthlyMinimums: Math.round(debts.reduce((s, d) => s + (d.minimumPayment ?? 0), 0) * 100) / 100,
    minimumsEstimated: debts.some((d) => d.minimumPaymentEstimated === true),
  };
}
