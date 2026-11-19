import { isSelfEmployedType, payeSalaryForTax } from "./paye-salary-for-tax.js";
import { isRecordActiveInTaxYear, type TaxRecordFields } from "./tax-calculator.js";

/**
 * The fact a Self Assessment estimate can be missing:
 * - `untaxedIncomeRecords`: no income outside PAYE in the year, so there is nothing to estimate;
 * - `annualSalary`: an employee with no saved salary and no logged salary record (the salary
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

/** Records that carry income no employer has already taxed. ISA interest is tax-free. */
export function isUntaxedIncomeRecord(record: TaxRecordFields): boolean {
  if (record.type !== "income") return false;
  if (record.source === "rental" || record.source === "self-employed") return true;
  return (
    record.source === "savings" &&
    (record.category === "savings_interest" || record.category === "dividend_income")
  );
}

function isEmployedType(employmentType: string | null | undefined): boolean {
  return employmentType === "employed" || employmentType === "PAYE";
}

/**
 * The one rule for whether a Self Assessment estimate can be worked out, and what goes into
 * calculateUKTax when it can (SA-1, owner decision 15 option A). Every surface calls this: the
 * Dashboard selector, the Self Assessment page and its source pages, the MCP tax tool and the AI
 * context pack. When a fact the estimate depends on is not set, the answer is unknown and names
 * the missing fact; no figure is worked out from a stand-in £0.
 *
 * - No income outside PAYE active in the year: unknown (`untaxedIncomeRecords`).
 * - An employee with no saved salary (or 0) and no logged PAYE salary record: unknown
 *   (`annualSalary`).
 * - A self-employed person with no self-employed income record in the year: unknown
 *   (`selfEmploymentRecords`), unless their saved salary is exactly 0.
 * - Otherwise known: the PAYE pay is payeSalaryForTax (never a self-employed person's salary).
 */
export function estimateInputsFor<R extends TaxRecordFields>(
  facts: TaxEstimateFacts,
  records: readonly R[] | null | undefined,
  taxYear: string,
): TaxEstimateInputs<R> {
  const inYear = (records ?? []).filter((r) => isRecordActiveInTaxYear(r, taxYear));
  if (!inYear.some(isUntaxedIncomeRecord)) {
    return { status: "unknown", missing: ["untaxedIncomeRecords"] };
  }

  const saved = facts.annualSalary;
  const salary =
    saved !== null && saved !== undefined && Number.isFinite(Number(saved)) && Number(saved) > 0
      ? Number(saved)
      : null;
  const loggedSalary = inYear.some((r) => r.source === "paye" && r.category === "paye_salary");
  if (isEmployedType(facts.employmentType) && salary === null && !loggedSalary) {
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
