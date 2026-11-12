/**
 * Fails when the next UK tax year's rates are not in the engine in time (E22).
 * Exit: 0 ok, 1 fail, 3 warn. TAX_CALENDAR_NOW (ISO instant) overrides the clock for tests.
 * See docs/runbooks/tax-year-update.md.
 */
import { SUPPORTED_UK_TAX_YEARS } from "../packages/finance-engine/src/types";
import { getUkCalendarDate, getUkTaxYearForDate } from "../packages/finance-engine/src/uk-tax-year";
import { evaluateTaxYearCalendar, exitCodeFor } from "./lib/tax-year-calendar";

const now = process.env.TAX_CALENDAR_NOW ? new Date(process.env.TAX_CALENDAR_NOW) : new Date();
const ukDate = getUkCalendarDate(now);
const result = evaluateTaxYearCalendar(
  ukDate,
  getUkTaxYearForDate(ukDate),
  // Every supported year is a full table today. When a provisional table is added, mark it here.
  SUPPORTED_UK_TAX_YEARS.map((year) => ({ year, status: "confirmed" as const })),
);

const head = `Tax-year calendar guard (${ukDate}): ${result.level}`;
console.log(result.messages.length ? `${head}\n${result.messages.join("\n")}` : head);
process.exit(exitCodeFor(result.level));
