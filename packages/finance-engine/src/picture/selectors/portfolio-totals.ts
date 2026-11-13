import type { PortfolioSnapshot } from "../../portfolio.js";

export interface NetWorthTotals {
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  liquidCash: number;
  investments: number;
  pensions: number;
  property: number;
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

/** Net worth and its parts. Never unknown: no accounts is a real £0. */
export function selectNetWorth(snapshot: PortfolioSnapshot): NetWorthTotals {
  return {
    netWorth: snapshot.getTotalNetWorth(),
    totalAssets: snapshot.getTotalAssets(),
    totalLiabilities: snapshot.getTotalLiabilities(),
    liquidCash: snapshot.getTotalLiquidCash(),
    investments: snapshot.getTotalInvestments(),
    pensions: snapshot.getTotalPensions(),
    property: snapshot.getTotalProperty(),
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
