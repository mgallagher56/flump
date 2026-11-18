import {
  getTaxYearForRecordDate,
  isSupportedUkTaxYear,
  type TaxRecord,
} from "@flump/finance-engine";

/** The current tax year plus any year with records, limited to years the engine supports (E22). */
export const availableTaxYears = (records: TaxRecord[], currentTaxYear: string): string[] => {
  const fromRecords = records.map((r) => getTaxYearForRecordDate(r.date));
  const set = new Set<string>([currentTaxYear, ...fromRecords].filter(isSupportedUkTaxYear));
  return Array.from(set).sort();
};

/**
 * The year to show: the chosen one when it is on offer, else the current year, else the latest
 * year on offer.
 */
export const resolveSelectedTaxYear = (
  chosen: string | null,
  years: string[],
  currentTaxYear: string,
): string =>
  chosen && years.includes(chosen)
    ? chosen
    : years.includes(currentTaxYear)
      ? currentTaxYear
      : (years[years.length - 1] ?? currentTaxYear);
