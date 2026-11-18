/**
 * Home equity: what a home is worth less what is still owed on its mortgage. The user types their
 * own estimate of the home's value and the mortgage balance; this works out the rest, so the web
 * holds no formula of its own.
 */
export interface HomeEquityInput {
  /** The user's own estimate of what the whole home is worth. */
  homeValue: number | null | undefined;
  /** The user's share of the home, 1 to 100. `null` or missing means held solely (100). */
  homeSharePercent?: number | null;
  /** What is still owed on the whole mortgage, as a positive amount. Missing means no mortgage (0). */
  mortgageBalance?: number | null;
  /** The user's share of the mortgage, 1 to 100. `null` or missing means held solely (100). */
  mortgageSharePercent?: number | null;
}

export interface HomeEquity {
  /** The whole home's value less the whole amount owed. Negative when more is owed than it is worth. */
  whole: number;
  /**
   * The user's share of the home's value less the user's share of the mortgage, each at its own
   * share, the same way net worth counts them. Equals `whole` when both are held solely.
   */
  yours: number;
}

const toPennies = (value: number): number => Math.round(value * 100) / 100;

const toShare = (raw: number | null | undefined): number =>
  typeof raw === "number" && Number.isFinite(raw) ? Math.min(100, Math.max(0, raw)) : 100;

/**
 * Equity in a home, or `null` when no value above 0 is known (never a made-up 0). Negative equity
 * is returned as a negative number, not hidden or floored.
 */
export function estimateHomeEquity(input: HomeEquityInput): HomeEquity | null {
  const { homeValue } = input;
  if (typeof homeValue !== "number" || !Number.isFinite(homeValue) || !(homeValue > 0)) {
    return null;
  }
  const owedRaw = input.mortgageBalance;
  const owed =
    typeof owedRaw === "number" && Number.isFinite(owedRaw) ? Math.max(0, Math.abs(owedRaw)) : 0;
  const homeShare = toShare(input.homeSharePercent);
  const mortgageShare = toShare(input.mortgageSharePercent);
  return {
    whole: toPennies(homeValue - owed),
    yours: toPennies((homeValue * homeShare) / 100 - (owed * mortgageShare) / 100),
  };
}
