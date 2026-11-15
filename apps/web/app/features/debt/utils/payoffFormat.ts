/**
 * Plain-English payoff durations and figures for the debt page (copy guide 4.3): under 24 months
 * reads as months ("18 months"), from 24 months as years and months ("3 years 4 months").
 */
export const formatPayoffDuration = (totalMonths: number): string => {
  const months = Math.max(0, Math.round(Number.isFinite(totalMonths) ? totalMonths : 0));
  const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"}`;
  if (months < 24) return plural(months, "month");
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return rest === 0 ? plural(years, "year") : `${plural(years, "year")} ${plural(rest, "month")}`;
};

/** Interest in the first 12 months of a payoff schedule (the "interest this year" estimate). */
export const interestInFirstYear = (
  schedule: ReadonlyArray<{ month: number; totalInterestPaidThisMonth: number }>,
): number =>
  schedule
    .filter((m) => m.month >= 1 && m.month <= 12)
    .reduce((sum, m) => sum + m.totalInterestPaidThisMonth, 0);
