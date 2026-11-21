/**
 * Default new-loan mortgage rate assumptions by loan to value (E39 section 10a, MA5).
 *
 * One engine home for the LTV default rate table. The figures are the owner's reading of the UK
 * market in November 2026 (`asOf: "2026-11"`): 4.24% to 4.44% at 60% LTV or below, 4.49% to 4.94%
 * at 80% to 90% LTV, with linear 10% LTV steps in between and no default above 90% LTV.
 */

export const MORTGAGE_RATE_TABLE_AS_OF = "2026-11";

/** Number of calendar months after `asOf` before the rate table is flagged as stale (E39 MA5). */
export const MORTGAGE_RATE_STALE_AFTER_MONTHS = 6;

export interface MortgageRateBand {
  /** Inclusive upper loan-to-value bound in percent (for example 60, 70, 80, 90). */
  maxLtvPct: number;
  /** Lower assumed annual interest rate in percent. */
  lowAnnualRatePct: number;
  /** Higher assumed annual interest rate in percent. */
  highAnnualRatePct: number;
}

export const MORTGAGE_LTV_RATE_BANDS: readonly MortgageRateBand[] = [
  { maxLtvPct: 60, lowAnnualRatePct: 4.24, highAnnualRatePct: 4.44 },
  { maxLtvPct: 70, lowAnnualRatePct: 4.32, highAnnualRatePct: 4.61 },
  { maxLtvPct: 80, lowAnnualRatePct: 4.41, highAnnualRatePct: 4.77 },
  { maxLtvPct: 90, lowAnnualRatePct: 4.49, highAnnualRatePct: 4.94 },
];

/**
 * Looks up the default low/high annual interest rate assumption for a loan to value in percent
 * (`0 < ltvPct <= 90`). Returns `null` when `ltvPct` is missing, non-positive, not finite, or
 * above 90% (over 90% LTV has no default rate; the user types a rate).
 */
export function lookupMortgageRateBandForLtv(
  ltvPct: number | null | undefined,
): MortgageRateBand | null {
  if (!Number.isFinite(ltvPct) || !((ltvPct as number) > 0)) return null;
  for (const band of MORTGAGE_LTV_RATE_BANDS) {
    if ((ltvPct as number) <= band.maxLtvPct) return band;
  }
  return null;
}

const YEAR_MONTH_RE = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/;

function parseYearMonth(input: Date | string): { year: number; month: number } | null {
  if (input instanceof Date) {
    const time = input.getTime();
    if (!Number.isFinite(time)) return null;
    return { year: input.getUTCFullYear(), month: input.getUTCMonth() + 1 };
  }
  const trimmed = input.trim();
  const match = YEAR_MONTH_RE.exec(trimmed);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    if (month >= 1 && month <= 12) return { year, month };
    return null;
  }
  const parsed = new Date(trimmed);
  if (!Number.isFinite(parsed.getTime())) return null;
  return { year: parsed.getUTCFullYear(), month: parsed.getUTCMonth() + 1 };
}

/**
 * Returns `true` when `referenceDate` is more than 6 calendar months after `asOf` (defaults to
 * `MORTGAGE_RATE_TABLE_AS_OF`, `"2026-11"`), or when either date cannot be parsed (safe default:
 * treat an unreadable date as stale rather than silently fresh).
 */
export function isMortgageRateTableStale(
  referenceDate: Date | string,
  asOf: string = MORTGAGE_RATE_TABLE_AS_OF,
): boolean {
  const refYm = parseYearMonth(referenceDate);
  const asOfYm = parseYearMonth(asOf);
  if (!refYm || !asOfYm) return true;
  const elapsedMonths = (refYm.year - asOfYm.year) * 12 + (refYm.month - asOfYm.month);
  return elapsedMonths > MORTGAGE_RATE_STALE_AFTER_MONTHS;
}
