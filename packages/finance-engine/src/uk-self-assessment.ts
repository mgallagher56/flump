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

// ---------------------------------------------------------------------------
// Recorded expenses compared with the trading or property allowance
// ---------------------------------------------------------------------------

/** GOV.UK guidance on the trading and property allowances (read 2026-11-18). */
export const TRADING_PROPERTY_ALLOWANCE_SOURCE_URL =
  "https://www.gov.uk/guidance/tax-free-allowances-on-property-and-trading-income";

/**
 * When the trading allowance cannot be used: partnership income, and a year with trading or
 * property income from your employer, your spouse's or civil partner's employer, or a company or
 * partnership you or a connected person owns, controls or is a partner in.
 */
export const TRADING_ALLOWANCE_EXCLUSIONS = ["partnership", "employer-or-connected"] as const;
export type TradingAllowanceExclusion = (typeof TRADING_ALLOWANCE_EXCLUSIONS)[number];

/**
 * When the property allowance cannot be used: with Rent a Room Scheme income from your own home,
 * or when the tax reduction for finance costs on residential property is claimed.
 */
export const PROPERTY_ALLOWANCE_EXCLUSIONS = ["rent-a-room", "finance-cost-relief"] as const;
export type PropertyAllowanceExclusion = (typeof PROPERTY_ALLOWANCE_EXCLUSIONS)[number];

export type AllowanceSource = "self-employed" | "rental";

export interface AllowanceComparisonInput {
  source: AllowanceSource;
  /** "YYYY/YY"; omitted means the year whose rates apply today. */
  taxYear?: string;
  /** Gross income for the year, before any expenses. For rental, the whole property's rent. */
  grossIncome: number;
  /** Expenses recorded for the year. For rental, excluding finance costs such as mortgage interest. */
  recordedExpenses: number;
  /** Rental only: finance costs (mortgage interest) recorded for the year, whole property. */
  financeCosts?: number;
  /** Rental only: the person's share of the property, 0 to 100. Default 100. */
  ownershipSharePct?: number;
}

export interface AllowanceComparison {
  source: AllowanceSource;
  taxYear: UkTaxYear;
  /** The allowance for the year (1,000 for every supported year). */
  allowance: number;
  /** The allowance that can be deducted: never more than the gross income. */
  usableAllowance: number;
  /** Gross income used for the comparison (the person's share for rental). */
  grossIncome: number;
  /** Recorded expenses used for the comparison (the person's share for rental, no finance costs). */
  recordedExpenses: number;
  /** Rental: the person's share of finance costs. Always 0 for self-employed. */
  financeCosts: number;
  /** The deduction when expenses are claimed: the recorded expenses. */
  expensesDeduction: number;
  /** The deduction when the allowance is claimed instead: the usable allowance. */
  allowanceDeduction: number;
  /** Which deduction is larger. */
  larger: "expenses" | "allowance" | "equal";
  /** Gross income above 0 and no more than the allowance: the allowance covers all of it. */
  withinFullRelief: boolean;
  /**
   * Rental: finance costs are left out of the expenses compared here. They earn a separate tax
   * reduction, which cannot be combined with the property allowance.
   */
  financeCostsExcluded: boolean;
  /** Who cannot use the allowance, as ids the caller turns into words. */
  exclusions: readonly (TradingAllowanceExclusion | PropertyAllowanceExclusion)[];
  sourceUrl: string;
}

/**
 * Sets the recorded expenses beside the trading or property allowance for one source and year.
 * The allowance is claimed instead of expenses, never on top of them; it is no more than the
 * gross income, so it cannot create a loss. This reports both deductions; it does not choose one.
 * For rental the estimate compares total tax instead (finance cost relief), so the larger
 * deduction here is not always the route the estimate uses.
 */
export function compareExpensesWithAllowance(input: AllowanceComparisonInput): AllowanceComparison {
  const taxYear = resolveUkTaxYear(input.taxYear);
  const { tradingAllowance, propertyAllowance } = getUkTaxYearRules(taxYear).selfAssessment;
  const rental = input.source === "rental";
  const share = rental ? Math.min(100, nonNeg(input.ownershipSharePct ?? 100)) / 100 : 1;

  const grossIncome = roundPence(nonNeg(input.grossIncome) * share);
  const recordedExpenses = roundPence(nonNeg(input.recordedExpenses) * share);
  const financeCosts = rental ? roundPence(nonNeg(input.financeCosts ?? 0) * share) : 0;
  const allowance = rental ? propertyAllowance : tradingAllowance;
  const usableAllowance = Math.min(allowance, grossIncome);

  const larger =
    usableAllowance > recordedExpenses
      ? "allowance"
      : usableAllowance < recordedExpenses
        ? "expenses"
        : "equal";

  return {
    source: input.source,
    taxYear,
    allowance,
    usableAllowance,
    grossIncome,
    recordedExpenses,
    financeCosts,
    expensesDeduction: recordedExpenses,
    allowanceDeduction: usableAllowance,
    larger,
    withinFullRelief: grossIncome > 0 && grossIncome <= allowance,
    financeCostsExcluded: financeCosts > 0,
    exclusions: rental ? PROPERTY_ALLOWANCE_EXCLUSIONS : TRADING_ALLOWANCE_EXCLUSIONS,
    sourceUrl: TRADING_PROPERTY_ALLOWANCE_SOURCE_URL,
  };
}
