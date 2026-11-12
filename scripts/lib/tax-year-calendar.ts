/**
 * Pure core of the tax-year calendar guard (E22).
 *
 * Lives in scripts/ (not in a Vitest package) on purpose: Turbo caches package
 * test results, so a date-dependent package test would replay a cached pass and
 * never fire. `bun test ./scripts` and the CI step both run uncached.
 */

export interface TaxYearCalendarEntry {
  year: string; // "2027/28"
  status: "confirmed" | "provisional";
  /** ISO date (YYYY-MM-DD) by which a provisional year must be confirmed. Default: 1 April of the year it starts. */
  confirmBy?: string;
}

export type CalendarLevel = "ok" | "warn" | "fail";

export interface CalendarResult {
  level: CalendarLevel;
  messages: string[];
}

function startYear(label: string): number {
  return Number.parseInt(label.slice(0, 4), 10);
}

export function taxYearLabel(start: number): string {
  return `${start}/${String((start + 1) % 100).padStart(2, "0")}`;
}

/**
 * @param ukDate today's UK calendar date, "YYYY-MM-DD"
 * @param currentYear tax year containing ukDate, e.g. "2026/27"
 */
export function evaluateTaxYearCalendar(
  ukDate: string,
  currentYear: string,
  registry: readonly TaxYearCalendarEntry[],
): CalendarResult {
  const messages: string[] = [];
  let level: CalendarLevel = "ok";
  const raise = (to: CalendarLevel, msg: string) => {
    messages.push(`${to.toUpperCase()}: ${msg}`);
    if (to === "fail" || (to === "warn" && level === "ok")) level = to;
  };

  const find = (y: string) => registry.find((e) => e.year === y);
  const nextStart = startYear(currentYear) + 1;
  const nextYear = taxYearLabel(nextStart);
  const [, mm, dd] = ukDate.split("-");
  const md = `${mm}-${dd}`;

  const current = find(currentYear);
  if (!current) {
    raise(
      "fail",
      `the current tax year ${currentYear} has no rates table. The app is using fallback rates.`,
    );
  } else if (current.status === "provisional") {
    const by = current.confirmBy ?? `${startYear(currentYear)}-04-01`;
    if (ukDate >= by) raise("fail", `${currentYear} is still provisional past ${by}.`);
  }

  // Window is 1 Dec .. 5 Apr of the current tax year (md >= 12-01 or md <= 04-05).
  const inRunUp = md >= "12-01" || md <= "04-05";
  if (inRunUp) {
    const next = find(nextYear);
    // Calendar months Mar/Apr/... of the current tax year are all >= 03-01 within the run-up.
    const failFromMarch = md >= "03-01" && md <= "04-05";
    if (!next) {
      if (failFromMarch) {
        raise(
          "fail",
          `${nextYear} rates table is missing and it starts on 6 April (from 1 March this fails).`,
        );
      } else {
        raise("warn", `${nextYear} rates table is missing (fails from 1 March).`);
      }
    } else if (next.status === "provisional") {
      const by = next.confirmBy ?? `${nextStart}-04-01`;
      const warnFrom = `${nextStart}-03-15`;
      if (ukDate >= by) raise("fail", `${nextYear} is still provisional on/after ${by}.`);
      else if (ukDate >= warnFrom)
        raise("warn", `${nextYear} is still provisional (must be confirmed by ${by}).`);
    }
  }
  return { level, messages };
}

export function exitCodeFor(level: CalendarLevel): 0 | 1 | 3 {
  return level === "ok" ? 0 : level === "fail" ? 1 : 3;
}
