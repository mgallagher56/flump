/**
 * The salary a Self Assessment estimate passes to calculateUKTax as PAYE pay (SA-1).
 *
 * This is the one rule every surface uses: the Dashboard estimate, the Self Assessment page and
 * the MCP tax tool. A self-employed person's profile salary is their trading income, not pay an
 * employer has already taxed, so it is never passed as PAYE pay; their self-employed tax records
 * carry that income. An unknown salary (null, missing or not a positive number) counts as none.
 *
 * Owner decision 15 (what the salary field means for a self-employed person) is open. This keeps
 * the treatment the Dashboard selector already used, and adds no new rule.
 */
export interface PayeSalaryForTaxInput {
  /**
   * The profile's employment type ("self-employed") or the baseline's employment status
   * ("SELF_EMPLOYED"). Anything else, or nothing, reads as not self-employed.
   */
  employmentType?: string | null;
  annualSalary?: number | null;
}

/** True when either spelling of the employment type says self-employed. */
export function isSelfEmployedType(employmentType: string | null | undefined): boolean {
  return employmentType === "self-employed" || employmentType === "SELF_EMPLOYED";
}

export function payeSalaryForTax({ employmentType, annualSalary }: PayeSalaryForTaxInput): number {
  if (isSelfEmployedType(employmentType)) return 0;
  const salary = Number(annualSalary);
  return annualSalary !== null &&
    annualSalary !== undefined &&
    Number.isFinite(salary) &&
    salary > 0
    ? salary
    : 0;
}
