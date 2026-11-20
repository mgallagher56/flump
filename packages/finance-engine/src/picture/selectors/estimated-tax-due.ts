import {
  incomeOutsidePaye,
  type RentalShareAccount,
  type TaxRecord,
} from "../../tax-calculator.js";
import { calculateEstimatedTax, estimateInputsFor } from "../../tax-estimate-inputs.js";
import type { UkTaxYear } from "../../types.js";
import { resolveUkTaxYear, UnsupportedUkTaxYearError } from "../../uk-tax-year.js";
import { type Figure, figureKnown, figureRefused, figureUnknown } from "../figure.js";
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
  /** The accounts, for the share of each rental property and buy-to-let mortgage (decision 6). */
  accounts?: readonly RentalShareAccount[];
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
 * - Unknown (`selfEmploymentRecords`) for a self-employed user with no self-employed income
 *   record in the year, unless their saved income is 0: the profile figure may be turnover
 *   rather than profit, and the trading income decides the band the other income falls in.
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

  // The one rule every Self Assessment surface uses (estimateInputsFor).
  const inputs = estimateInputsFor({ ...facts, accounts: opts.accounts ?? [] }, records, taxYear);
  if (inputs.status === "refused") return figureRefused(inputs.refusal);
  if (inputs.status !== "known") return figureUnknown(inputs.missing, "not-set");
  const result = calculateEstimatedTax(inputs);
  const untaxedIncome = incomeOutsidePaye(result).income;

  // Scottish taxpayers are worked out on Scottish bands (decision 7), so no region assumption.
  return figureKnown<EstimatedTaxDue>(
    {
      amount: Math.round(result.netAdditionalTaxToPay),
      taxYear,
      untaxedIncome: Math.round(untaxedIncome * 100) / 100,
    },
    "derived",
    [],
  );
}
