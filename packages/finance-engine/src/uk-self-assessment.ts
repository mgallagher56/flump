/**
 * Self Assessment rules that sit beside the income tax bands: the trading and property allowances
 * and the payments on account schedule. Every figure comes from `getUkTaxYearRules(year)`.
 *
 * Sources (read 2026-11-14):
 * - https://www.gov.uk/guidance/tax-free-allowances-on-property-and-trading-income
 * - https://www.gov.uk/understand-self-assessment-bill/payments-on-account
 *
 * These are estimates of what a return would show. The engine uses an allowance where it is at
 * least as large as the recorded costs, because a return can use either; it does not say which
 * a person should claim.
 */

import type { UkTaxYear } from "./types.js";
import {
  getUkTaxYearRules,
  resolveUkTaxYear,
  roundPence,
  type UkTaxYearRules,
} from "./uk-tax-year.js";

const nonNeg = (x: number): number => (Number.isFinite(x) ? Math.max(0, x) : 0);

export interface ProfitAfterAllowance {
  /** Taxable profit, never below 0. */
  profit: number;
  /** Allowance deducted in place of the recorded costs; 0 when the costs were deducted. */
  allowanceUsed: number;
}

/**
 * Income less the larger of the recorded costs and the allowance. The allowance is never more
 * than the income ("you can deduct up to 1,000, but not more than the amount of your income"), so
 * income at or under the allowance leaves no profit. Costs are not deducted on top of the allowance.
 */
function profitAfterAllowance(
  income: number,
  costs: number,
  allowance: number,
): ProfitAfterAllowance {
  const inc = nonNeg(income);
  const cost = nonNeg(costs);
  const usable = Math.min(nonNeg(allowance), inc);
  if (usable > 0 && usable >= cost) return { profit: inc - usable, allowanceUsed: usable };
  return { profit: Math.max(0, inc - cost), allowanceUsed: 0 };
}

/** Self-employed profit after the trading allowance or the recorded costs, whichever is larger. */
export function calculateTradingProfit(
  income: number,
  costs: number,
  rules: UkTaxYearRules,
): ProfitAfterAllowance {
  return profitAfterAllowance(income, costs, rules.selfAssessment.tradingAllowance);
}

/**
 * One person's property profit before finance costs, after the property allowance or the recorded
 * costs, whichever is larger. `income` and `costs` are that person's own share: each joint owner
 * has the allowance against their share of the rent. Finance costs are not an input: the allowance
 * cannot be used alongside finance cost relief, so the caller compares the two routes.
 */
export function calculatePropertyProfit(
  income: number,
  costs: number,
  rules: UkTaxYearRules,
): ProfitAfterAllowance {
  return profitAfterAllowance(income, costs, rules.selfAssessment.propertyAllowance);
}

export type PaymentsOnAccountReason = "due" | "bill-under-threshold" | "mostly-taken-at-source";

export interface SelfAssessmentPaymentsInput {
  /** The tax year the bill is for. */
  taxYear: string;
  /** Income Tax and Class 4 National Insurance still to pay for the year. */
  bill: number;
  /** Tax for the same year already taken at source, such as PAYE. */
  taxDeductedAtSource?: number;
}

export interface SelfAssessmentPayment {
  /** Due date, YYYY-MM-DD. */
  date: string;
  amount: number;
}

export interface SelfAssessmentPayments {
  taxYear: UkTaxYear;
  /** The bill for the year, assuming no payments on account were made towards it. */
  balancingPayment: number;
  paymentsOnAccountDue: boolean;
  reason: PaymentsOnAccountReason;
  /** Each of the two payments on account towards the next year: half the bill, or 0. */
  paymentOnAccount: number;
  /** 31 January after the tax year: the balancing payment plus the first payment on account. */
  january: SelfAssessmentPayment;
  /** 31 July after the tax year: the second payment on account. null when none is due. */
  july: SelfAssessmentPayment | null;
}

/**
 * What is due and when for one year's Self Assessment bill. Payments on account towards the next
 * year are due unless the bill is less than the threshold, or more than the set share of all the
 * tax owed for the year was already taken at source. It assumes no payments on account were made
 * towards this bill, which is the case in a first year.
 */
export function calculateSelfAssessmentPayments(
  input: SelfAssessmentPaymentsInput,
): SelfAssessmentPayments {
  const taxYear = resolveUkTaxYear(input.taxYear);
  const { paymentsOnAccountThreshold, paymentsOnAccountSourceShare } =
    getUkTaxYearRules(taxYear).selfAssessment;
  const bill = roundPence(nonNeg(input.bill));
  const atSource = nonNeg(input.taxDeductedAtSource ?? 0);
  const endYear = Number.parseInt(taxYear.slice(0, 4), 10) + 1;

  let reason: PaymentsOnAccountReason = "due";
  if (bill < paymentsOnAccountThreshold) reason = "bill-under-threshold";
  else if (atSource > paymentsOnAccountSourceShare * (atSource + bill)) {
    reason = "mostly-taken-at-source";
  }
  const due = reason === "due";
  const paymentOnAccount = due ? roundPence(bill / 2) : 0;

  return {
    taxYear,
    balancingPayment: bill,
    paymentsOnAccountDue: due,
    reason,
    paymentOnAccount,
    january: { date: `${endYear + 1}-01-31`, amount: roundPence(bill + paymentOnAccount) },
    july: due ? { date: `${endYear + 1}-07-31`, amount: paymentOnAccount } : null,
  };
}
