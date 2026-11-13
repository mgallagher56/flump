/**
 * Europe/London calendar helpers for monthly snapshots (E30 D3). The product is UK-only, so the
 * month a balance belongs to is always the London calendar month, never the server's local one.
 */

const LONDON_PARTS = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export interface YearMonth {
  year: number;
  month: number;
}

/** The London calendar date of an instant, as YYYY-MM-DD. */
export function londonDate(now: Date = new Date()): string {
  const parts = Object.fromEntries(
    LONDON_PARTS.formatToParts(now).map((p) => [p.type, p.value]),
  ) as Record<string, string>;
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/** The London calendar month of an instant. */
export function londonYearMonth(now: Date = new Date()): YearMonth {
  const [year, month] = londonDate(now).split("-").map(Number) as [number, number];
  return { year, month };
}

const MONTH_KEY = /^(\d{4})-(0[1-9]|1[0-2])$/;

/** Parses "YYYY-MM"; null when malformed. */
export function parseMonthKey(key: string): YearMonth | null {
  const match = MONTH_KEY.exec(key);
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]) };
}

export function monthKey({ year, month }: YearMonth): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

/** Last calendar day of the month, as YYYY-MM-DD. */
export function lastDayOfMonth({ year, month }: YearMonth): string {
  const day = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${monthKey({ year, month })}-${String(day).padStart(2, "0")}`;
}

/** True when `date` (YYYY-MM-DD) is a real calendar date. */
export function isRealDate(date: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return false;
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const parsed = new Date(Date.UTC(y, m - 1, d));
  return (
    parsed.getUTCFullYear() === y && parsed.getUTCMonth() === m - 1 && parsed.getUTCDate() === d
  );
}

/** Compares two year-months: negative when a is earlier than b. */
export function compareYearMonth(a: YearMonth, b: YearMonth): number {
  return a.year * 12 + a.month - (b.year * 12 + b.month);
}
