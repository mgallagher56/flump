import { isSelfEmployedType, payeSalaryForTax } from "./paye-salary-for-tax.js";
import { isRecordActiveInTaxYear, type TaxRecordFields } from "./tax-calculator.js";

/**
 * The fact a Self Assessment estimate can be missing:
 * - `untaxedIncomeRecords`: no income outside PAYE in the year, so there is nothing to estimate;
 * - `annualSalary`: an employee with no saved salary (the salary
 *   decides the band the other income falls in);
 * - `selfEmploymentRecords`: a self-employed person with no self-employed income record in the
 *   year (their trading income decides the band the other income falls in).
 */
export type TaxEstimateMissingFact =
  | "untaxedIncomeRecords"
  | "annualSalary"
  | "selfEmploymentRecords";

export interface TaxEstimateFacts {
  /**
   * Either spelling: the profile's "employed" or "self-employed", or the baseline's "PAYE" or
   * "SELF_EMPLOYED". Anything else, or nothing, is neither.
   */
  employmentType?: string | null;
  /** The saved salary. null or undefined when never saved. */
  annualSalary?: number | null;
  /** Share of rental property owned, 0 to 100. null, undefined or out of range means 100. */
  propertyOwnershipShare?: number | null;
}

export type TaxEstimateInputs<R extends TaxRecordFields = TaxRecordFields> =
  | {
      status: "known";
      taxYear: string;
      /** The records active in the tax year. */
      records: R[];
      /** The PAYE pay to pass to calculateUKTax (payeSalaryForTax). */
      payeSalary: number;
      ownershipShare: number;
    }
  | { status: "unknown"; missing: TaxEstimateMissingFact[] };

/** The legacy PAYE salary category, which no longer replaces the saved salary (slice 6). */
export const LEGACY_PAYE_SALARY_CATEGORY = "paye_salary";

/** True for a legacy PAYE salary record (source "paye", category "paye_salary"). */
export function isLegacySalaryRecord(record: Pick<TaxRecordFields, "source" | "category">) {
  return record.source === "paye" && record.category === LEGACY_PAYE_SALARY_CATEGORY;
}

/** Records that carry income no employer has already taxed. ISA interest is tax-free. */
export function isUntaxedIncomeRecord(record: TaxRecordFields): boolean {
  if (record.type !== "income") return false;
  if (record.source === "rental" || record.source === "self-employed") return true;
  return (
    record.source === "savings" &&
    (record.category === "savings_interest" || record.category === "dividend_income")
  );
}

/**
 * True when the salary decides the estimate: an employee, or someone who has not said how they
 * are paid (an unanswered type could be either, so a missing salary is not read as none). "other"
 * (not working, retired) with no salary has no PAYE pay, so it is not one.
 */
function salaryDecidesEstimate(employmentType: string | null | undefined): boolean {
  return (
    employmentType === "employed" ||
    employmentType === "PAYE" ||
    employmentType === null ||
    employmentType === undefined ||
    employmentType === ""
  );
}

/**
 * The one rule for whether a Self Assessment estimate can be worked out, and what goes into
 * calculateUKTax when it can (SA-1, owner decision 15 option A). Every surface calls this: the
 * Dashboard selector, the Self Assessment page and its source pages, the MCP tax tool and the AI
 * context pack. When a fact the estimate depends on is not set, the answer is unknown and names
 * the missing fact; no figure is worked out from a stand-in £0.
 *
 * - No income outside PAYE active in the year: unknown (`untaxedIncomeRecords`).
 * - An employee, or someone whose employment type is not answered, with no saved salary (or 0)
 *   is unknown (`annualSalary`). A legacy PAYE salary record never stands in for it.
 * - A self-employed person with no self-employed income record in the year: unknown
 *   (`selfEmploymentRecords`), unless their saved salary is exactly 0.
 * - Otherwise known: the PAYE pay is payeSalaryForTax (never a self-employed person's salary).
 */
export function estimateInputsFor<R extends TaxRecordFields>(
  facts: TaxEstimateFacts,
  records: readonly R[] | null | undefined,
  taxYear: string,
): TaxEstimateInputs<R> {
  // A legacy PAYE salary record never stands in for the saved salary (slice 6): the profile
  // salary is the one salary figure. New records cannot be salary (the record form and the API
  // refuse it), and a migration copied the latest old one into an empty profile salary and
  // removed them all, so any that remain are left out here.
  const inYear = (records ?? []).filter(
    (r) => isRecordActiveInTaxYear(r, taxYear) && !isLegacySalaryRecord(r),
  );
  if (!inYear.some(isUntaxedIncomeRecord)) {
    return { status: "unknown", missing: ["untaxedIncomeRecords"] };
  }

  const saved = facts.annualSalary;
  const salary =
    saved !== null && saved !== undefined && Number.isFinite(Number(saved)) && Number(saved) > 0
      ? Number(saved)
      : null;
  if (salaryDecidesEstimate(facts.employmentType) && salary === null) {
    return { status: "unknown", missing: ["annualSalary"] };
  }
  const loggedTrading = inYear.some((r) => r.source === "self-employed" && r.type === "income");
  if (isSelfEmployedType(facts.employmentType) && !loggedTrading && saved !== 0) {
    return { status: "unknown", missing: ["selfEmploymentRecords"] };
  }

  const share = facts.propertyOwnershipShare;
  return {
    status: "known",
    taxYear,
    records: inYear,
    payeSalary: payeSalaryForTax({ employmentType: facts.employmentType, annualSalary: salary }),
    ownershipShare:
      share !== null && share !== undefined && share >= 0 && share <= 100 ? share : 100,
  };
}
