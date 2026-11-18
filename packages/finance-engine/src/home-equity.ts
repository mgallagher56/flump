/**
 * Home equity: what a home is worth less what is still owed on its mortgage. The user types their
 * own estimate of the home's value and the mortgage balance; this works out the rest, so the web
 * holds no formula of its own.
 */
export interface HomeEquityInput {
  /** The user's own estimate of what the home is worth. */
  homeValue: number | null | undefined;
  /** What is still owed on the mortgage, as a positive amount. Missing means no mortgage (0). */
  mortgageBalance?: number | null;
  /** The user's share of a joint home, 1 to 100. `null` or missing means held solely (100). */
  sharePercent?: number | null;
}

export interface HomeEquity {
  /** The whole home's value less the whole amount owed. Negative when more is owed than it is worth. */
  whole: number;
  /** `whole` at the user's share (the same as `whole` when held solely). */
  yours: number;
}

const toPennies = (value: number): number => Math.round(value * 100) / 100;

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
  const shareRaw = input.sharePercent;
  const share =
    typeof shareRaw === "number" && Number.isFinite(shareRaw)
      ? Math.min(100, Math.max(0, shareRaw))
      : 100;
  const whole = toPennies(homeValue - owed);
  return { whole, yours: toPennies((whole * share) / 100) };
}
