import {
  type NetWorthBasis,
  type NetWorthLeftOut,
  resolveNetWorthScope,
} from "../../net-worth-basis.js";
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
  /**
   * Income-contingent, so never in debt payoff (decision D-5-B). Inside net worth and
   * `totalLiabilities` only when the basis counts student loans.
   */
  studentLoans: number;
  /** The basis these figures were computed under. */
  basis: NetWorthBasis;
  /** What the figure leaves out, in display order (see NetWorthLeftOut). */
  leftOut: NetWorthLeftOut[];
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

/** The scope of a snapshot's own accounts under the basis. */
export function resolveSnapshotNetWorthScope(snapshot: PortfolioSnapshot, basis: NetWorthBasis) {
  return resolveNetWorthScope(
    snapshot
      .getResolvedAccounts()
      .map((a) => ({ id: a.id, name: a.name, type: a.rawType, balance: a.nominalBalance })),
    basis,
  );
}

/**
 * Net worth and its parts under the user's basis, from account rows only. Never unknown: no
 * accounts is a real £0. The category parts (`property`, `studentLoans` and so on) are always the
 * full saved amounts, whatever the basis.
 */
export function selectNetWorth(snapshot: PortfolioSnapshot, basis: NetWorthBasis): NetWorthTotals {
  const scope = resolveSnapshotNetWorthScope(snapshot, basis);
  return {
    netWorth: snapshot.getTotalNetWorth(basis),
    totalAssets: snapshot.getTotalAssets(basis),
    totalLiabilities: snapshot.getTotalLiabilities(basis),
    liquidCash: snapshot.getTotalLiquidCash(),
    investments: snapshot.getTotalInvestments(),
    pensions: snapshot.getTotalPensions(),
    property: snapshot.getTotalProperty(),
    homeEstimate: selectHomeEstimate(snapshot),
    studentLoans: snapshot.getTotalStudentLoans(),
    basis: scope.basis,
    leftOut: scope.leftOut,
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
