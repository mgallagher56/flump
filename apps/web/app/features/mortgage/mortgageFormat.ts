import { formatMonthTick } from "@repo/ui";

/**
 * Mortgage page formatting (en-GB). The web app does not depend on `@flump/format`, so these
 * mirror its helpers: durations as "18 years 2 months" (copy guide 4.3), rates as entered, and
 * month-year dates through `formatMonthTick`, which never writes "Sept".
 */

const plural = (n: number, unit: string): string => `${n} ${unit}${n === 1 ? "" : "s"}`;

/** A number of months as "18 years 2 months", dropping a zero part; zero reads "0 months". */
export const formatDuration = (months: number): string => {
  const total = Math.max(0, Math.round(months));
  const years = Math.floor(total / 12);
  const rest = total % 12;
  const parts: string[] = [];
  if (years > 0) parts.push(plural(years, "year"));
  if (rest > 0 || years === 0) parts.push(plural(rest, "month"));
  return parts.join(" ");
};

/** Years (possibly fractional, from a stored term in months) as "18 years 2 months". */
export const formatYearsLeft = (years: number): string => formatDuration(years * 12);

/** Fraction digits that show a rate as entered: 4 -> 0, 4.5 -> 1, 4.25 -> 2 (at most 2). */
export const rateFractionDigits = (rate: number): number => {
  const hundredths = Math.round(Math.abs(rate) * 100);
  if (hundredths % 100 === 0) return 0;
  return hundredths % 10 === 0 ? 1 : 2;
};

const rateFormat = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 });

/** A rate as entered, with the percent sign: "4.5%". */
export const formatRate = (rate: number): string => `${rateFormat.format(rate)}%`;

/** "Jan 2045" for a stored ISO date ("2045-01-01"), or `null` when it cannot be read. */
export const formatIsoMonthYear = (iso: string): string | null => {
  const text = formatMonthTick(iso.slice(0, 10), "numeric");
  return text === "" ? null : text;
};
