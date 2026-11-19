import { isBuyToLetAccount } from "../../buy-to-let.js";
import { pickHomeProperty } from "../../home-equity.js";
import type { PortfolioSnapshot } from "../../portfolio.js";
import { type Figure, figureKnown, figureUnknown } from "../figure.js";
import type { MissingKey } from "../input.js";

// The buy-to-let rule moved to buy-to-let.ts (so home-equity.ts can use it without a cycle).
export { isBuyToLetAccount, isBuyToLetAccountName } from "../../buy-to-let.js";

export interface LoanToValue {
  /** Residential mortgage balance over residential property value, in percent, to 1 dp. */
  percent: number;
  homeValue: number;
  mortgageBalance: number;
}

export interface SelectLoanToValueOptions {
  /** One residential mortgage account to measure instead of all of them (the mortgage page). */
  mortgageAccountId?: string | null;
}

/**
 * Residential loan to value, from saved account rows only: residential mortgage balances over the
 * home's value (`pickHomeProperty`; the onboarding home estimate is one). Buy-to-let property and
 * mortgages are left out. With `mortgageAccountId`, only that mortgage is measured. Unknown, never
 * 0%, when either side is missing or 0, and unknown with reason "ambiguous-home" when more than
 * one property could be the home.
 */
export function selectLoanToValue(
  snapshot: PortfolioSnapshot,
  opts: SelectLoanToValueOptions = {},
): Figure<LoanToValue> {
  const withSubtype = <T extends { id: string; name: string; rawType: string }>(rows: T[]) =>
    rows.map((a) => ({ ...a, type: a.rawType, accountSubtype: snapshot.getAccountSubtype(a.id) }));
  const home = pickHomeProperty(withSubtype(snapshot.getAccountsByCategory("property")));
  const homeValue = home.status === "one" ? home.account.nominalBalance : 0;
  const mortgages = withSubtype(snapshot.getAccountsByCategory("mortgages")).filter(
    (a) => !isBuyToLetAccount(a) && (!opts.mortgageAccountId || a.id === opts.mortgageAccountId),
  );
  const mortgageBalance = mortgages.reduce((sum, a) => sum + a.nominalBalance, 0);

  const missing: MissingKey[] = [];
  if (!(homeValue > 0)) missing.push("homeValue");
  if (!(mortgageBalance > 0)) missing.push("mortgageBalance");
  // Two or more properties that could each be the home: no way to tell which, so left out.
  if (home.status === "ambiguous") return figureUnknown(missing, "ambiguous-home");
  if (missing.length > 0) return figureUnknown(missing, "not-set");

  return figureKnown<LoanToValue>({
    percent: Math.round((mortgageBalance / homeValue) * 1000) / 10,
    homeValue,
    mortgageBalance,
  });
}
