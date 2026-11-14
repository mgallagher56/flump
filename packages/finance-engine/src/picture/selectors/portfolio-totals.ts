import type { PortfolioSnapshot } from "../../portfolio.js";
import type { ProfileFacts } from "../input.js";

export interface NetWorthTotals {
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  liquidCash: number;
  investments: number;
  pensions: number;
  /** Property account rows. */
  property: number;
  /** The profile home estimate, labelled "Home (your estimate)"; 0 when not counted. */
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

/** The label pages show beside `homeEstimate` (owner decision D3, option a). */
export const HOME_ESTIMATE_LABEL = "Home (your estimate)";

/** The profile facts net worth reads: the home estimate and whether the user rents. */
export type HomeFacts = Pick<ProfileFacts, "homeValue" | "housingStatus">;

/** True when any account row holds a property, whatever its balance. */
export function hasPropertyAccount(snapshot: PortfolioSnapshot): boolean {
  return snapshot.getResolvedAccounts().some((a) => a.category === "property");
}

/**
 * The home estimate counted in net worth, in pounds (0 when not counted). Owner decision D3 (a):
 * the user's own estimate counts at 100%. To count the home at most once:
 * - a Property account row always wins: when one exists the profile estimate is not added
 *   (the account is the home, entered on the accounts page or seeded by onboarding);
 * - a renter's estimate is not counted (it can be left over from an earlier answer);
 * - an estimate of 0 or less, or none, adds nothing.
 */
export function selectHomeEstimate(snapshot: PortfolioSnapshot, facts?: HomeFacts | null): number {
  const value = facts?.homeValue ?? null;
  if (value === null || !(value > 0)) return 0;
  if (facts?.housingStatus === "renting") return 0;
  if (hasPropertyAccount(snapshot)) return 0;
  return value;
}

/**
 * Net worth and its parts. Never unknown: no accounts is a real £0. `homeEstimate` is the
 * profile home estimate (see selectHomeEstimate), counted in `totalAssets` and `netWorth` and
 * kept apart from `property` (account rows) so pages can label it.
 */
export function selectNetWorth(
  snapshot: PortfolioSnapshot,
  facts?: HomeFacts | null,
): NetWorthTotals {
  const homeEstimate = selectHomeEstimate(snapshot, facts);
  return {
    netWorth: snapshot.getTotalNetWorth() + homeEstimate,
    totalAssets: snapshot.getTotalAssets() + homeEstimate,
    totalLiabilities: snapshot.getTotalLiabilities(),
    liquidCash: snapshot.getTotalLiquidCash(),
    investments: snapshot.getTotalInvestments(),
    pensions: snapshot.getTotalPensions(),
    property: snapshot.getTotalProperty(),
    homeEstimate,
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
