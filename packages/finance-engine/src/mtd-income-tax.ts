import {
  getMonthsForTaxYear,
  getNextTaxYear,
  getRecordBucketMonth,
  getRecordValueForMonth,
  type RentalShares,
  rentalShareForRecord,
  type TaxRecordFields,
} from "./tax-calculator.js";
import { MTD_INCOME_TAX_SOURCES, type UkRuleSource } from "./uk-rule-sources.js";
import { getUkTaxYearForDate } from "./uk-tax-year.js";

/**
 * Making Tax Digital for Income Tax: who must use it, and from when (E28 slice A1).
 *
 * Rules home for the qualifying income thresholds and start dates. Regulation 27 of the Income
 * Tax (Digital Obligations) Regulations 2026 (SI 2026/336) sets the qualifying amount by the tax
 * year measured; regulation 23 measures the tax year two years before MTD starts, and a person is
 * outside only if their qualifying income "is not more than the qualifying amount" (regulations 22
 * and 23). So the test is strictly more than the figure: exactly £50,000 is not over.
 *
 * Qualifying income is gross: "the amount included in the return before any deductions"
 * (regulation 26), from self-employment and property. It is turnover, not profit, so expenses are
 * never subtracted here. Employment, a partner's profit share, dividends and pensions do not count.
 *
 * Not modelled: once in, a person stays in until three years in a row at or below the threshold
 * (regulation 24), exemptions, and a joint property share reported net (regulation 26(a)(ii)).
 * Flump gives guidance, not advice: callers say what the rules are and where to check, never that
 * someone is or is not mandated.
 *
 * Figures, dates and the strict comparison signed off by fable-decider, 2026-11-25, from
 * SI 2026/336 as made and the GOV.UK guidance (no signed vector hash exists).
 */

/** Date the sources were last read against these figures (ISO 8601). */
export const MTD_INCOME_TAX_SOURCES_CHECKED_ON = "2026-11-25";

/** Where a person checks whether the rules apply to them, and signs up. Both GOV.UK. */
export const MTD_INCOME_TAX_GOV_UK_LINKS = {
  check:
    "https://www.gov.uk/guidance/check-if-youre-eligible-for-making-tax-digital-for-income-tax",
  signUp: "https://www.gov.uk/guidance/sign-up-for-making-tax-digital-for-income-tax",
} as const;

/** The first tax year whose qualifying income the rules measure. */
export const MTD_FIRST_MEASURED_TAX_YEAR = "2024/25";

export interface MtdIncomeTaxThreshold {
  /** Tax year whose qualifying income is measured ("YYYY/YY"). */
  measuredTaxYear: string;
  /** Qualifying amount in pounds. Income must be more than this. */
  thresholdGbp: number;
  /** ISO date MTD starts for someone over the threshold: 6 April, two tax years after the measured year starts. */
  startDate: string;
  source: UkRuleSource;
}

const startYearOf = (taxYear: string): number => Number.parseInt(taxYear, 10);

/**
 * Regulation 27: £50,000 for 2024-25, £30,000 for 2025-26, and £20,000 for 2026-27 and any later
 * tax year. Returns null for a year before 2024/25 or a malformed year.
 */
export function mtdIncomeTaxThreshold(measuredTaxYear: string): MtdIncomeTaxThreshold | null {
  if (!/^\d{4}\/\d{2}$/.test(measuredTaxYear)) return null;
  const startYear = startYearOf(measuredTaxYear);
  if (startYear < startYearOf(MTD_FIRST_MEASURED_TAX_YEAR)) return null;
  const thresholdGbp = startYear === 2024 ? 50_000 : startYear === 2025 ? 30_000 : 20_000;
  return {
    measuredTaxYear,
    thresholdGbp,
    startDate: `${startYear + 2}-04-06`,
    source: MTD_INCOME_TAX_SOURCES.thresholds,
  };
}

/**
 * Gross qualifying income recorded for one tax year: every income record from self-employment
 * and property, before any expense. Not profit. Null when nothing of either kind is recorded for
 * that year, because Flump then lacks the figures. Property income counts only the person's share
 * (from `rentalShares`, as the estimate uses; 100% when left out).
 */
export function mtdQualifyingIncomeForTaxYear(
  records: readonly TaxRecordFields[],
  taxYear: string,
  rentalShares?: RentalShares,
  /** Last calendar month ("YYYY-MM") to count. Left out, the whole year counts. */
  throughMonth?: string,
): number | null {
  const months = getMonthsForTaxYear(taxYear).filter(
    (month) => throughMonth === undefined || month <= throughMonth,
  );
  let total = 0;
  let found = false;
  for (const record of records) {
    if (record.type !== "income") continue;
    if (record.source !== "self-employed" && record.source !== "rental") continue;
    let yearly = 0;
    for (const month of months) yearly += getRecordValueForMonth(record, month);
    if (yearly <= 0) continue;
    found = true;
    const share =
      record.source === "rental" ? rentalShareForRecord(record, rentalShares, 100) : 100;
    total += yearly * (share / 100);
  }
  return found ? total : null;
}

export type MtdQualifyingIncomeStatus = "over" | "notOver" | "unknown";

export interface MtdQualifyingIncomeCheck {
  status: MtdQualifyingIncomeStatus;
  threshold: MtdIncomeTaxThreshold;
  /** Gross qualifying income recorded for the measured year, or null when none is recorded. */
  recordedQualifyingIncomeGbp: number | null;
}

/**
 * Whether the recorded gross qualifying income for one measured year is more than its threshold.
 * "unknown" when nothing is recorded for that year, or when the year has not ended at `asOf` and
 * the total so far is not over (more income may still come). In a running year only months up to
 * `asOf` count, so a monthly record's later months never make it "over". "notOver" only for a finished year.
 * Returns null for a year the rules do not measure.
 */
export function checkMtdQualifyingIncome(
  records: readonly TaxRecordFields[],
  measuredTaxYear: string,
  asOf: string,
  rentalShares?: RentalShares,
): MtdQualifyingIncomeCheck | null {
  const threshold = mtdIncomeTaxThreshold(measuredTaxYear);
  if (!threshold) return null;
  const yearEnded = startYearOf(getUkTaxYearForDate(asOf)) > startYearOf(measuredTaxYear);
  // In a year still running, only months up to today count: a monthly record's later months
  // have not happened, so they are not income the user has recorded yet.
  const income = mtdQualifyingIncomeForTaxYear(
    records,
    measuredTaxYear,
    rentalShares,
    yearEnded ? undefined : getRecordBucketMonth(asOf),
  );
  const status: MtdQualifyingIncomeStatus =
    income === null
      ? "unknown"
      : income > threshold.thresholdGbp
        ? "over"
        : yearEnded
          ? "notOver"
          : "unknown";
  return { status, threshold, recordedQualifyingIncomeGbp: income };
}

export interface MtdIncomeTaxPositionInput {
  records: readonly TaxRecordFields[];
  employmentType?: "employed" | "self-employed" | "other" | null;
  /** Today, as an ISO date (YYYY-MM-DD). */
  asOf: string;
  /** Ownership shares of rental records, from `rentalSharesFromAccounts`. */
  rentalShares?: RentalShares;
}

/**
 * What the Self Assessment and Invoicing notice shows.
 * - "over": recorded income for a measured year is more than its threshold. `check` is the
 *   earliest such year, so its start date is the first one the rules would apply.
 * - "unknown": the user is self-employed or records self-employed or property income, and no
 *   measured year is over, but at least one lacks figures or has not ended. A general line only.
 * - "none": not self-employed and no self-employed or property records.
 * The current tax year has not ended, so for anyone in the audience it is at least "unknown".
 */
export type MtdIncomeTaxPosition =
  | { kind: "over"; check: MtdQualifyingIncomeCheck }
  | { kind: "unknown" }
  | { kind: "none" };

export function mtdIncomeTaxPosition(input: MtdIncomeTaxPositionInput): MtdIncomeTaxPosition {
  const { records, employmentType, asOf, rentalShares } = input;
  const currentYear = getUkTaxYearForDate(asOf);
  for (
    let year = MTD_FIRST_MEASURED_TAX_YEAR;
    startYearOf(year) <= startYearOf(currentYear);
    year = getNextTaxYear(year)
  ) {
    const check = checkMtdQualifyingIncome(records, year, asOf, rentalShares);
    if (check?.status === "over") return { kind: "over", check };
  }
  const inAudience =
    employmentType === "self-employed" ||
    records.some((r) => r.source === "self-employed" || r.source === "rental");
  return inAudience ? { kind: "unknown" } : { kind: "none" };
}
