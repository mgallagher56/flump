import { salarySacrificeFromProfile } from "./picture/input.js";
import type { UserProfileData } from "./profile.js";
import { calculateEmployerNISavings } from "./uk-tax.js";
import {
  calculatePensionQualifyingEarnings,
  resolveUkTaxYear,
  UK_PENSION_QUALIFYING_EARNINGS,
} from "./uk-tax-year.js";

/**
 * Workplace pension contributions taken from salary (E33, decision RD6). Moved here from the
 * Pension page's old forecaster so the Retirement plan, its scenario and the MCP tools share one
 * calculation.
 */

/** Auto-enrolment qualifying earnings band, a year (lower and upper limits). */
export const UK_QUALIFYING_EARNINGS_LOWER = UK_PENSION_QUALIFYING_EARNINGS.lower;
export const UK_QUALIFYING_EARNINGS_UPPER = UK_PENSION_QUALIFYING_EARNINGS.upper;

export interface WorkplacePensionInput {
  annualSalary: number;
  /** Your contribution as a percentage of pensionable pay (5 means 5%). */
  employeePercent: number;
  /** Your employer's contribution as a percentage of pensionable pay. */
  employerPercent: number;
  isSalarySacrifice?: boolean;
  /** Salary sacrifice only: the employer adds the National Insurance it saves. */
  passEmployerNi?: boolean;
  /** Count only pay inside the qualifying earnings band instead of the whole salary. */
  useQualifyingEarnings?: boolean;
  taxYear?: string;
  /**
   * The rates the person has not set (owner decision 3, slice 6). A rate that is not set counts
   * as no contribution in the calculation (it is left out, never a stand-in 5% or 3%), and a
   * screen names it as not set. Absent or empty when both are set.
   */
  notSet?: WorkplacePensionRate[];
}

/** A workplace pension rate the person may not have set. */
export type WorkplacePensionRate = "pensionPercent" | "pensionEmployerPercent";

export interface WorkplacePensionContributions {
  pensionableSalary: number;
  monthlyEmployee: number;
  /** The employer's National Insurance saving passed on (salary sacrifice only). */
  monthlyEmployerNi: number;
  /** The employer's percentage plus any National Insurance passed on. */
  monthlyEmployer: number;
  monthlyTotal: number;
}

/** True when a stored rate is a number the person saved (a numeric string counts). */
const isSavedRate = (n: unknown): boolean =>
  n !== null && n !== undefined && n !== "" && Number.isFinite(Number(n)) && Number(n) >= 0;

const nonNegative = (n: unknown): number => {
  const value = Number(n);
  return Number.isFinite(value) && value > 0 ? value : 0;
};

export function calculateWorkplacePensionContributions(
  input: WorkplacePensionInput,
): WorkplacePensionContributions {
  const salary = nonNegative(input.annualSalary);
  const employeePercent = nonNegative(input.employeePercent);
  const employerPercent = nonNegative(input.employerPercent);

  const pensionableSalary = input.useQualifyingEarnings
    ? calculatePensionQualifyingEarnings(salary)
    : salary;

  const annualEmployee = pensionableSalary * (employeePercent / 100);
  const annualEmployerNi =
    input.isSalarySacrifice && input.passEmployerNi && annualEmployee > 0
      ? calculateEmployerNISavings(salary, annualEmployee, input.taxYear ?? resolveUkTaxYear())
      : 0;
  const monthlyEmployee = annualEmployee / 12;
  const monthlyEmployerNi = annualEmployerNi / 12;
  const monthlyEmployer = (pensionableSalary * (employerPercent / 100)) / 12 + monthlyEmployerNi;

  return {
    pensionableSalary,
    monthlyEmployee,
    monthlyEmployerNi,
    monthlyEmployer,
    monthlyTotal: monthlyEmployee + monthlyEmployer,
  };
}

/**
 * The saved workplace pension from a stored profile, or null when no salary is saved or the
 * saved employment type is self-employed or other (no workplace scheme). The rates are the stored
 * ones; a rate never saved is listed in `notSet` and counts as no contribution. A chosen 5% and
 * 3% is a choice like any other.
 */
export function workplacePensionFromProfile(
  profile: Partial<UserProfileData> | null | undefined,
): WorkplacePensionInput | null {
  const salary = nonNegative(profile?.annualSalary);
  if (salary <= 0) return null;
  if (profile?.employmentType === "self-employed" || profile?.employmentType === "other") {
    return null;
  }
  const isSalarySacrifice = salarySacrificeFromProfile(profile) === true;
  const notSet: WorkplacePensionRate[] = [];
  if (!isSavedRate(profile?.pensionPercent)) notSet.push("pensionPercent");
  if (!isSavedRate(profile?.pensionEmployerPercent)) notSet.push("pensionEmployerPercent");
  return {
    annualSalary: salary,
    employeePercent: nonNegative(profile?.pensionPercent),
    employerPercent: nonNegative(profile?.pensionEmployerPercent),
    isSalarySacrifice,
    passEmployerNi: isSalarySacrifice && profile?.isSalarySacrificeEmployerNi === true,
    ...(notSet.length > 0 ? { notSet } : {}),
  };
}

/**
 * Converting a pension contribution between "% of salary" and "£ a month". One form is stored
 * (the profile stores percentages); the other is worked out here, never stored beside it.
 */
export interface ContributionBasis {
  /** The saved yearly salary before tax, or null when none is saved. */
  annualSalary: number | null | undefined;
  /**
   * Take the percentage of pay inside the qualifying earnings band instead of the whole salary.
   * Default false: the saved profile rates apply to the whole salary.
   */
  useQualifyingEarnings?: boolean;
}

/** The pay a percentage is taken from, or null when no salary is saved. */
const pensionablePay = ({ annualSalary, useQualifyingEarnings }: ContributionBasis) => {
  const salary = Number(annualSalary);
  if (annualSalary == null || !Number.isFinite(salary) || salary <= 0) return null;
  return useQualifyingEarnings ? calculatePensionQualifyingEarnings(salary) : salary;
};

/**
 * The pounds a month a percentage contribution comes to, or null when the salary is not known
 * (never 0 or an invented figure). Not rounded.
 */
export function contributionMonthlyFromPercent(
  percent: number | null | undefined,
  basis: ContributionBasis,
): number | null {
  const pay = pensionablePay(basis);
  const rate = Number(percent);
  if (pay === null || percent == null || !Number.isFinite(rate) || rate < 0) return null;
  return (pay * rate) / 100 / 12;
}

/**
 * The percentage of salary a monthly amount comes to, rounded to four decimal places (what the
 * profile stores, numeric(7,4)), or null when the salary is not known: a pounds amount with no
 * salary is never turned into a percentage. Four places keep pounds to the penny on the way back
 * for ordinary salaries; screens show the percentage to at most two places.
 */
export function contributionPercentFromMonthly(
  monthly: number | null | undefined,
  basis: ContributionBasis,
): number | null {
  const pay = pensionablePay(basis);
  const amount = Number(monthly);
  // Under the qualifying earnings band no pay counts, so no percentage can be worked out.
  if (pay === null || pay <= 0 || monthly == null || !Number.isFinite(amount) || amount < 0) {
    return null;
  }
  return Math.round(((amount * 12) / pay) * 100 * 10_000) / 10_000;
}
