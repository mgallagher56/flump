import type { PortfolioSnapshot } from "../../portfolio.js";
import { type Figure, figureKnown, figureUnknown } from "../figure.js";
import type { MissingKey } from "../input.js";

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
 * Accounts carry no property-use field, so a buy-to-let row is known by its name only ("Buy to
 * let", "Buy-to-let", "BTL"), the names the accounts page and demo data save them with.
 */
export function isBuyToLetAccountName(name: string): boolean {
  return /\bbuy[\s-]*to[\s-]*let\b|\bbtl\b/i.test(name);
}

/**
 * Residential loan to value, from saved account rows only: residential mortgage balances over
 * residential Property account values (the onboarding home estimate is one of them). Buy-to-let
 * property and mortgages are left out. With `mortgageAccountId`, only that mortgage is measured.
 * Unknown, never 0%, when either side is missing or 0.
 */
export function selectLoanToValue(
  snapshot: PortfolioSnapshot,
  opts: SelectLoanToValueOptions = {},
): Figure<LoanToValue> {
  const residential = <T extends { name: string }>(rows: T[]) =>
    rows.filter((a) => !isBuyToLetAccountName(a.name));
  const homeValue = residential(snapshot.getAccountsByCategory("property")).reduce(
    (sum, a) => sum + a.nominalBalance,
    0,
  );
  const mortgages = residential(snapshot.getAccountsByCategory("mortgages")).filter(
    (a) => !opts.mortgageAccountId || a.id === opts.mortgageAccountId,
  );
  const mortgageBalance = mortgages.reduce((sum, a) => sum + a.nominalBalance, 0);

  const missing: MissingKey[] = [];
  if (!(homeValue > 0)) missing.push("homeValue");
  if (!(mortgageBalance > 0)) missing.push("mortgageBalance");
  if (missing.length > 0) return figureUnknown(missing, "not-set");

  return figureKnown<LoanToValue>({
    percent: Math.round((mortgageBalance / homeValue) * 1000) / 10,
    homeValue,
    mortgageBalance,
  });
}
