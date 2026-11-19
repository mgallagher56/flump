/** "YYYY-MM". */
export type MonthKey = string;

/**
 * The Europe/London calendar month of `now`, matching the backend's month key (E30 D3). The one
 * month helper for every page: the device's own clock is never used for "this month" (CH-8).
 */
export function londonMonth(now: Date = new Date()): MonthKey {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  const year = parts.find((p) => p.type === "year")?.value ?? "1970";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  return `${year}-${month}`;
}

/** The London month of `now` as numbers: month 1 to 12 and the year. */
export function londonMonthParts(now: Date = new Date()): { month: number; year: number } {
  const key = londonMonth(now);
  return { year: Number(key.slice(0, 4)), month: Number(key.slice(5, 7)) };
}
