/**
 * UK tax-year calendar: which tax year a date falls in, which years are
 * supported, and which year's rates "today" uses.
 *
 * Depends on types.ts only, so tax-rules.ts and uk-tax-year.ts can both import
 * it without importing each other. uk-tax-year.ts re-exports the public names.
 */

import {
  PROVISIONAL_UK_TAX_YEARS,
  SUPPORTED_UK_TAX_YEARS,
  type UkProvisionalTaxYear,
  type UkRatesYear,
  type UkTaxYear,
} from "./types.js";

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class UnsupportedUkTaxYearError extends Error {
  readonly year: string;
  /** Set when only one table is missing for an otherwise supported year. */
  readonly table?: string;

  constructor(year: string, table?: string) {
    super(
      table
        ? `No verified ${table} data for UK tax year "${year}".`
        : `Unsupported UK tax year "${year}". Supported years: ${SUPPORTED_UK_TAX_YEARS.join(", ")}.`,
    );
    this.name = "UnsupportedUkTaxYearError";
    this.year = year;
    this.table = table;
  }
}

// ---------------------------------------------------------------------------
// Year resolution (D8-a: year starts on 6 April, string based)
// ---------------------------------------------------------------------------

function yearLabel(startYear: number): string {
  return `${startYear}/${String((startYear + 1) % 100).padStart(2, "0")}`;
}

/**
 * Tax year containing an ISO date ("YYYY-MM-DD", optionally followed by a
 * time). Reads the date digits only: no Date parsing, no local time zone.
 * 5 April belongs to the year that ends that day; 6 April starts the next.
 * Returns the label even for years the engine does not support.
 */
export function getUkTaxYearForDate(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);
  if (!match) throw new RangeError(`Not an ISO date (YYYY-MM-DD): "${isoDate}"`);
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth) {
    throw new RangeError(`Not a valid calendar date: "${isoDate}"`);
  }
  const startsThisYear = month > 4 || (month === 4 && day >= 6);
  return yearLabel(startsThisYear ? year : year - 1);
}

const londonDate = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** The calendar date ("YYYY-MM-DD") in the UK at the given instant. */
export function getUkCalendarDate(now: Date): string {
  const parts = londonDate.formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function isSupportedUkTaxYear(year: string): year is UkTaxYear {
  return (SUPPORTED_UK_TAX_YEARS as readonly string[]).includes(year);
}

/** A year whose tables are held but which is not supported yet (2027/28: announced, not yet law). */
export function isProvisionalUkTaxYear(year: string): year is UkProvisionalTaxYear {
  return (PROVISIONAL_UK_TAX_YEARS as readonly string[]).includes(year);
}

export function isUkRatesYear(year: string): year is UkRatesYear {
  return isSupportedUkTaxYear(year) || isProvisionalUkTaxYear(year);
}

/** Current UK tax year (UK calendar date). Throws if the year is not supported. */
export function getCurrentUkTaxYear(now: Date = new Date()): UkTaxYear {
  const year = getUkTaxYearForDate(getUkCalendarDate(now));
  if (!isSupportedUkTaxYear(year)) throw new UnsupportedUkTaxYearError(year);
  return year;
}

/** Latest tax year the engine has rates for. */
export function getLatestSupportedUkTaxYear(): UkTaxYear {
  return SUPPORTED_UK_TAX_YEARS[SUPPORTED_UK_TAX_YEARS.length - 1] as UkTaxYear;
}

/** The tax year straight after the latest supported one (the first year the engine lacks). */
export function getFirstUnsupportedUkTaxYear(): string {
  const latest = getLatestSupportedUkTaxYear();
  return yearLabel(Number.parseInt(latest.slice(0, 4), 10) + 1);
}

/**
 * The ONE place that decides which rates "today" uses.
 *
 * `calendarYear` is the tax year the clock is in (may be unsupported). `ratesYear` is the
 * supported year whose rates are used. When the clock is past the latest supported year
 * `isFallback` is true and the UI must say so (TaxRatesStatusBanner). Before the earliest
 * supported year there is nothing sensible to fall back to, so it throws.
 */
export interface UkTaxYearContext {
  calendarYear: string;
  ratesYear: UkTaxYear;
  isFallback: boolean;
  reason?: "after-latest-supported";
  /**
   * "provisional" when the rates year is provisional (2027/28: some figures announced, not yet
   * law); the TaxRatesStatusBanner then says so. Absent otherwise.
   */
  kind?: "provisional";
}

export function getUkTaxYearContext(now: Date = new Date()): UkTaxYearContext {
  const calendarYear = getUkTaxYearForDate(getUkCalendarDate(now));
  if (isSupportedUkTaxYear(calendarYear)) {
    return isProvisionalUkTaxYear(calendarYear)
      ? { calendarYear, ratesYear: calendarYear, isFallback: false, kind: "provisional" }
      : { calendarYear, ratesYear: calendarYear, isFallback: false };
  }
  if (compareTaxYearLabels(calendarYear, getLatestSupportedUkTaxYear()) > 0) {
    return {
      calendarYear,
      ratesYear: getLatestSupportedUkTaxYear(),
      isFallback: true,
      reason: "after-latest-supported",
    };
  }
  throw new UnsupportedUkTaxYearError(calendarYear);
}

/**
 * The rates notice for a page that shows a chosen year (the Self Assessment page). Today's rates
 * year keeps today's context (with its fallback notice, if any). Another year is worked out at
 * its own rates: provisional when that year is provisional, else no notice.
 */
export function ratesContextForYear(year: string, today: UkTaxYearContext): UkTaxYearContext {
  if (year === today.ratesYear || !isSupportedUkTaxYear(year)) return today;
  return isProvisionalUkTaxYear(year)
    ? { calendarYear: year, ratesYear: year, isFallback: false, kind: "provisional" }
    : { calendarYear: year, ratesYear: year, isFallback: false };
}

export function compareTaxYearLabels(a: string, b: string): number {
  return Number.parseInt(a.slice(0, 4), 10) - Number.parseInt(b.slice(0, 4), 10);
}
