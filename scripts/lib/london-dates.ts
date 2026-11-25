/**
 * Flump's dates are UK dates: a month, a "today" or a tax year is read on the Europe/London clock,
 * never the device's or the server's. Three fixes on main came from this (9add200d3, 87cb47e23,
 * 3a96cff2f), the last one a second copy of the London formatter. The one home is
 * `getUkCalendarDate` in packages/finance-engine/src/uk-tax-year.ts (exported from
 * @repo/finance-engine); apps/web/app/utils/londonMonth.ts builds the month key on it.
 */

export const LONDON_DATE_HOME = "packages/finance-engine/src/uk-tax-year.ts";

const PATTERNS: RegExp[] = [
  // Calendar fields on the local clock.
  /\.get(?:Month|FullYear|Date)\(\)/g,
  // The UTC date taken as today's date.
  /\.toISOString\(\)\.(?:slice\(0, ?(?:7|10)\)|split\(["']T["']\))/g,
  // A date formatted in the device's zone (no timeZone in the call).
  /\.toLocaleDateString\((?![^)]*timeZone)/g,
  // Another copy of the London formatter.
  /timeZone: *["']Europe\/London["']/g,
];

/** How many local-clock date reads or London formatter copies a source file holds. */
export function countLocalDateReads(source: string, file = ""): number {
  return PATTERNS.reduce((n, pattern, i) => {
    if (i === PATTERNS.length - 1 && file === LONDON_DATE_HOME) return n;
    return n + (source.match(pattern)?.length ?? 0);
  }, 0);
}
