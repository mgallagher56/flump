import type { UkTaxRegion, UkTaxYear } from "./types.js";
import {
  calculateIncomeTaxOnNonSavingsIncome,
  calculatePensionTaxFreePart,
  getUkTaxYearRules,
  roundPence,
} from "./uk-tax-year.js";

/**
 * Income tax in retirement (E33 S6, vectors RV10 to RV16 in `uk-retirement.vectors.ts`). Pure
 * functions over the one tax engine: the 25% tax-free share, the lump sum allowance and every
 * band come from `uk-tax-year.ts`. Only pension withdrawals and the State Pension are taxed here;
 * ISA, general investment and cash savings withdrawals are left untaxed (capital gains tax,
 * dividend tax and tax on savings interest are not modelled).
 */

/**
 * How pension money is taken:
 * - "ufpls": each withdrawal is an uncrystallised funds pension lump sum, 25% of it tax-free until
 *   the lump sum allowance is used, the rest taxed as income.
 * - "lumpSum": a tax-free lump sum at the retirement age (25% of the pot, at most the lump sum
 *   allowance), then the rest of the pot drawn down and fully taxed.
 */
export type RetirementWithdrawalMethod = "ufpls" | "lumpSum";

export const RETIREMENT_WITHDRAWAL_METHODS: readonly RetirementWithdrawalMethod[] = [
  "ufpls",
  "lumpSum",
];

/** The tax-free part of one uncrystallised funds pension lump sum, given the allowance left. */
export function ufplsTaxFreePart(withdrawalGbp: number, remainingAllowanceGbp: number): number {
  return calculatePensionTaxFreePart(withdrawalGbp, remainingAllowanceGbp);
}

/** The tax-free lump sum from a whole pension pot: 25% of it, at most the lump sum allowance. */
export function taxFreeLumpSum(potGbp: number, lumpSumAllowanceGbp: number): number {
  return calculatePensionTaxFreePart(potGbp, lumpSumAllowanceGbp);
}

export interface RetirementYearTaxInput {
  /** The taxable part of the year's pension withdrawals (after any tax-free part). */
  taxablePensionGbp: number;
  /** The year's State Pension. */
  statePensionGbp: number;
  taxYear: UkTaxYear;
  region: UkTaxRegion;
}

/**
 * Income tax for one retirement year on the taxable pension and the State Pension together, as
 * non-savings income before the personal allowance (`calculateIncomeTaxOnNonSavingsIncome`).
 */
export function retirementYearIncomeTax(input: RetirementYearTaxInput): number {
  const income = Math.max(0, input.taxablePensionGbp) + Math.max(0, input.statePensionGbp);
  return calculateIncomeTaxOnNonSavingsIncome(
    roundPence(income),
    getUkTaxYearRules(input.taxYear),
    input.region,
  );
}
