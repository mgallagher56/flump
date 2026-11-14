import type { PortfolioSnapshot } from "../../portfolio.js";
import { type Figure, figureKnown, figureUnknown } from "../figure.js";
import type { MissingKey } from "../input.js";
import { type HomeFacts, hasPropertyAccount, selectHomeEstimate } from "./portfolio-totals.js";

export interface LoanToValue {
  /** Mortgage balance over home value, in percent, to one decimal place. */
  percent: number;
  homeValue: number;
  mortgageBalance: number;
  /** Where the home value came from: Property account rows, or the profile estimate. */
  homeValueSource: "account" | "estimate";
}

/**
 * Loan to value of the home, from saved figures only. The home value is the same one net worth
 * counts: Property account rows when any exist, otherwise the profile estimate (D3). Unknown,
 * never 0%, when either the home value or the mortgage balance is missing or 0.
 */
export function selectLoanToValue(
  snapshot: PortfolioSnapshot,
  facts?: HomeFacts | null,
): Figure<LoanToValue> {
  const fromAccounts = hasPropertyAccount(snapshot);
  const homeValue = fromAccounts
    ? snapshot.getTotalProperty()
    : selectHomeEstimate(snapshot, facts);
  const mortgageBalance = snapshot.getTotalMortgageBalance();

  const missing: MissingKey[] = [];
  if (!(homeValue > 0)) missing.push("homeValue");
  if (!(mortgageBalance > 0)) missing.push("mortgageBalance");
  if (missing.length > 0) return figureUnknown(missing, "not-set");

  return figureKnown<LoanToValue>({
    percent: Math.round((mortgageBalance / homeValue) * 1000) / 10,
    homeValue,
    mortgageBalance,
    homeValueSource: fromAccounts ? "account" : "estimate",
  });
}
