export interface InvestmentSnapshotPoint {
  year: number;
  month: number;
  value: number;
}

export interface YearlyInvestmentReturn {
  year: number;
  /** Annualized percentage return for the year (e.g. 7.5 means 7.5% p.a.). */
  annualReturnPct: number;
  startValue: number;
  endValue: number;
  months: number;
}

export interface InvestmentReturnSummary {
  /** Overall annualized percentage return across all recorded snapshots, or null if < 2 points / non-positive start. */
  overallAnnualReturnPct: number | null;
  yearlyReturns: YearlyInvestmentReturn[];
  /** Total months spanned from the earliest to latest snapshot. */
  spanMonths: number;
}

function annualizedReturnPct(
  startValue: number,
  endValue: number,
  months: number,
  monthlyContribution: number,
): number | null {
  if (months < 1) return null;
  const contributions = monthlyContribution * months;
  const capitalBase = startValue + 0.5 * contributions;
  if (!(capitalBase > 0)) return null;
  const gain = endValue - startValue - contributions;
  const periodReturn = gain / capitalBase;
  const growthFactor = 1 + periodReturn;
  if (growthFactor <= 0) return -100;
  const annual = (growthFactor ** (12 / months) - 1) * 100;
  return Math.round(annual * 10) / 10;
}

/**
 * Computes actual year-by-year and overall annualized investment returns from monthly check-in
 * snapshots. Uses a Modified Dietz approximation when `monthlyContribution` is provided so
 * regular deposits are not mistaken for investment growth.
 */
export function computeInvestmentReturns(
  details: readonly InvestmentSnapshotPoint[],
  monthlyContribution = 0,
): InvestmentReturnSummary {
  const contrib =
    Number.isFinite(monthlyContribution) && monthlyContribution > 0 ? monthlyContribution : 0;

  // Deduplicate by (year, month) keeping the latest entry and sort chronologically.
  const byKey = new Map<number, InvestmentSnapshotPoint>();
  for (const d of details) {
    const year = Number(d.year);
    const month = Number(d.month);
    const value = Number(d.value);
    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) continue;
    if (!Number.isFinite(value)) continue;
    byKey.set(year * 12 + (month - 1), { year, month, value });
  }

  const sorted = [...byKey.entries()].sort((a, b) => a[0] - b[0]).map(([, point]) => point);

  if (sorted.length < 2) {
    return { overallAnnualReturnPct: null, yearlyReturns: [], spanMonths: 0 };
  }

  const first = sorted[0]!;
  const last = sorted[sorted.length - 1]!;
  const spanMonths = (last.year - first.year) * 12 + (last.month - first.month);
  const overallAnnualReturnPct = annualizedReturnPct(first.value, last.value, spanMonths, contrib);

  // Group points by year; for each year, measure from the last snapshot of the prior year (if any)
  // or the first snapshot of that year, to the last snapshot of that year.
  const years = [...new Set(sorted.map((p) => p.year))].sort((a, b) => a - b);
  const yearlyReturns: YearlyInvestmentReturn[] = [];

  for (const year of years) {
    const inYear = sorted.filter((p) => p.year === year);
    const prior = sorted.filter((p) => p.year < year).pop();
    const startPoint = prior ?? inYear[0]!;
    const endPoint = inYear[inYear.length - 1]!;
    const months = (endPoint.year - startPoint.year) * 12 + (endPoint.month - startPoint.month);
    const pct = annualizedReturnPct(startPoint.value, endPoint.value, months, contrib);
    if (pct !== null) {
      yearlyReturns.push({
        year,
        annualReturnPct: pct,
        startValue: startPoint.value,
        endValue: endPoint.value,
        months,
      });
    }
  }

  return {
    overallAnnualReturnPct,
    yearlyReturns,
    spanMonths,
  };
}
