import { calculateUKTax, isRecordActiveInTaxYear, type TaxRecord } from "../../tax-calculator.js";
import type { UkTaxYear } from "../../types.js";
import { resolveUkTaxYear, UnsupportedUkTaxYearError } from "../../uk-tax-year.js";
import { type Figure, figureKnown, figureUnknown } from "../figure.js";
import type { ProfileFacts } from "../input.js";

export interface EstimatedTaxDue {
  /**
   * Self assessment estimate in whole pounds: income tax and Class 4 National Insurance on
   * income not taxed at source, on top of the tax PAYE already takes from the salary.
   */
  amount: number;
  taxYear: UkTaxYear;
  /** Income outside PAYE for the year (rental, self-employed, taxable savings, dividends). */
  untaxedIncome: number;
}

export interface SelectEstimatedTaxDueOptions {
  taxYear?: UkTaxYear;
}

export const ESTIMATED_TAX_EWNI_BANDS_NOTE =
  "Uses England, Wales and Northern Ireland income tax bands.";

/** Records that carry income no employer has already taxed. ISA interest is tax-free. */
function isUntaxedIncome(record: TaxRecord): boolean {
  if (record.type !== "income") return false;
  if (record.source === "rental" || record.source === "self-employed") return true;
  return (
    record.source === "savings" &&
    (record.category === "savings_interest" || record.category === "dividend_income")
  );
}

/**
 * Estimated tax due for the current tax year (C-11): what calculateUKTax encodes as
 * `netAdditionalTaxToPay`, the tax on income outside PAYE. Tax on the salary is assumed to be
 * deducted through PAYE, so a PAYE-only user has nothing to estimate (unknown, not £0).
 *
 * - Unknown (`untaxedIncomeRecords`) when no income record outside PAYE is active in the year.
 * - Unknown (`annualSalary`) for an employee with no saved salary and no logged salary record:
 *   the salary decides the band the other income falls in.
 * - Known £0 when there is such income but no tax on it (below the allowance, or a loss).
 * - A self-employed user's profile salary is their trading income, not PAYE pay, so it is not
 *   passed as a salary; their self-employed records carry that income.
 */
export function selectEstimatedTaxDue(
  facts: ProfileFacts,
  records: readonly TaxRecord[] | null | undefined,
  opts: SelectEstimatedTaxDueOptions = {},
): Figure<EstimatedTaxDue> {
  let taxYear: UkTaxYear;
  try {
    taxYear = resolveUkTaxYear(opts.taxYear);
  } catch (error) {
    if (error instanceof UnsupportedUkTaxYearError) return figureUnknown([], "unsupported-year");
    throw error;
  }

  const inYear = (records ?? []).filter((r) => isRecordActiveInTaxYear(r, taxYear));
  if (!inYear.some(isUntaxedIncome)) return figureUnknown(["untaxedIncomeRecords"], "not-set");

  const selfEmployed = facts.employmentType === "self-employed";
  const salary = facts.annualSalary !== null && facts.annualSalary > 0 ? facts.annualSalary : null;
  const loggedSalary = inYear.some((r) => r.source === "paye" && r.category === "paye_salary");
  if (facts.employmentType === "employed" && salary === null && !loggedSalary) {
    return figureUnknown(["annualSalary"], "not-set");
  }

  const share =
    facts.propertyOwnershipShare !== null &&
    facts.propertyOwnershipShare !== undefined &&
    facts.propertyOwnershipShare >= 0 &&
    facts.propertyOwnershipShare <= 100
      ? facts.propertyOwnershipShare
      : 100;

  const result = calculateUKTax(taxYear, inYear, selfEmployed ? 0 : (salary ?? 0), share);
  const untaxedIncome =
    result.rentalIncomeGrossShare +
    result.seIncomeGross +
    result.savingsInterestGross +
    result.dividendIncomeGross;

  const assumptions = facts.taxRegion === "SCOTLAND" ? [ESTIMATED_TAX_EWNI_BANDS_NOTE] : [];
  return figureKnown<EstimatedTaxDue>(
    {
      amount: Math.round(result.netAdditionalTaxToPay),
      taxYear,
      untaxedIncome: Math.round(untaxedIncome * 100) / 100,
    },
    assumptions.length > 0 ? "assumption" : "derived",
    assumptions,
  );
}
