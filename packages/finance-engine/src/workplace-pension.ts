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
}

export interface WorkplacePensionContributions {
  pensionableSalary: number;
  monthlyEmployee: number;
  /** The employer's National Insurance saving passed on (salary sacrifice only). */
  monthlyEmployerNi: number;
  /** The employer's percentage plus any National Insurance passed on. */
  monthlyEmployer: number;
  monthlyTotal: number;
}

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
 * The saved workplace pension from a stored profile, or null when no salary is saved. The rates
 * are the stored ones; a legacy salary sacrifice `true` the user never chose is read as not set
 * (`salarySacrificeFromProfile`).
 */
export function workplacePensionFromProfile(
  profile: Partial<UserProfileData> | null | undefined,
): WorkplacePensionInput | null {
  const salary = nonNegative(profile?.annualSalary);
  if (salary <= 0) return null;
  const isSalarySacrifice = salarySacrificeFromProfile(profile) === true;
  return {
    annualSalary: salary,
    employeePercent: nonNegative(profile?.pensionPercent),
    employerPercent: nonNegative(profile?.pensionEmployerPercent),
    isSalarySacrifice,
    passEmployerNi: isSalarySacrifice && profile?.isSalarySacrificeEmployerNi === true,
  };
}
