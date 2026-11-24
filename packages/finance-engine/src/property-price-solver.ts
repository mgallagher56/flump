import {
  calculatePropertyTransactionTax,
  type PropertyTransactionTaxResult,
  type UkPropertyTaxJurisdiction,
} from "./uk-property-transaction-tax.js";

/**
 * Property price solver (E39 S1c, section 10a MA7).
 *
 * Works out the property price a loan and a deposit reach once other buying costs and the
 * estimated property transaction tax (SDLT, LBTT or LTT) are taken off the deposit. The price
 * depends on the tax and the tax on the price, so the price is solved for rather than added up.
 *
 * The answer is the largest price P, in whole pence and at least the loan, with
 *
 *     P + tax(P) + otherBuyingCosts <= loan + deposit
 *
 * where tax(P) is `calculatePropertyTransactionTax` exactly as signed (SDLT total floored to whole
 * pounds, LBTT and LTT in pence). No band, rate or rounding rule lives here.
 *
 * Why it is exact and always ends:
 * - Every quantity is a whole number of pence, so the search space is a finite set of integers.
 * - tax(P) never falls as P rises: each band's slice rises with P, rounding and flooring keep
 *   order, and the one jump (SDLT first-time buyer relief ending above £500,000) is upward. So
 *   P + tax(P) rises strictly with P, and the prices that fit form one unbroken run from the loan
 *   up to the answer.
 * - Bisection keeps `low` fitting and `high` not fitting, and halves the whole-pence gap between
 *   them each step. It stops when the gap is one penny, after at most ceil(log2(gap)) steps (47
 *   at the £1 trillion input limit). `low` is then the largest fitting price.
 * - Where no whole-pence price meets the budget exactly (a floored SDLT total, or the jump at
 *   £500,000), the answer is the largest price that fits, and `unspentGbp` says what is left.
 */

/** Inputs above this, in pounds, are refused so every pence figure stays an exact whole number. */
export const PROPERTY_PRICE_SOLVER_MAX_GBP = 1_000_000_000_000;

/** The answers the property transaction tax needs: where the property is and who is buying. */
export interface PropertyPriceTaxAnswers {
  /** Where the property is. */
  jurisdiction: UkPropertyTaxJurisdiction;
  /** Whether every buyer is a first-time buyer buying their main home. */
  isFirstTimeBuyer?: boolean;
}

export interface PropertyPriceSolverInput extends PropertyPriceTaxAnswers {
  /** Loan in pounds. Must be finite and not negative. */
  loanGbp: number;
  /** Deposit in pounds, before any buying costs. Must be finite and not negative. */
  depositGbp: number;
  /** Other buying costs in pounds, taken off the deposit. Missing means none. */
  otherBuyingCostsGbp?: number | null;
}

export interface PropertyPriceSolved {
  status: "solved";
  /** Largest price in pounds (whole pence) the loan and deposit reach after costs and tax. */
  propertyPriceGbp: number;
  loanGbp: number;
  depositGbp: number;
  otherBuyingCostsGbp: number;
  /** The signed tax engine's result at `propertyPriceGbp`. */
  propertyTax: PropertyTransactionTaxResult;
  /** Part of the deposit that goes into the price: `propertyPriceGbp - loanGbp`. */
  depositTowardsPriceGbp: number;
  /** Deposit left over, never negative: loan + deposit - costs - price - tax. */
  unspentGbp: number;
  /** Bisection steps taken. */
  steps: number;
}

export interface PropertyPriceDepositShort {
  status: "deposit-short";
  loanGbp: number;
  depositGbp: number;
  otherBuyingCostsGbp: number;
  /** The signed tax engine's result at a price equal to the loan. */
  propertyTaxAtLoan: PropertyTransactionTaxResult;
  /** How much more deposit a price equal to the loan would need: costs + tax - deposit. */
  shortfallGbp: number;
}

export interface PropertyPriceInvalidInput {
  status: "invalid-input";
  /** Which input could not be used. */
  field: "loanGbp" | "depositGbp" | "otherBuyingCostsGbp";
}

export type PropertyPriceSolution =
  | PropertyPriceSolved
  | PropertyPriceDepositShort
  | PropertyPriceInvalidInput;

const MAX_PENCE = PROPERTY_PRICE_SOLVER_MAX_GBP * 100;

/** Whole pence for a usable amount, or null when it is not finite, negative or over the limit. */
function toPence(value: number): number | null {
  if (!Number.isFinite(value) || value < 0) return null;
  const pence = Math.round(value * 100);
  return pence <= MAX_PENCE ? pence : null;
}

/**
 * Solves the property price for a loan and deposit after other buying costs and the estimated
 * property transaction tax (SDLT, LBTT or LTT). See the file comment for why it is exact and ends.
 */
export function solvePropertyPrice(input: PropertyPriceSolverInput): PropertyPriceSolution {
  const loanPence = toPence(input.loanGbp);
  if (loanPence === null) return { status: "invalid-input", field: "loanGbp" };
  const depositPence = toPence(input.depositGbp);
  if (depositPence === null) return { status: "invalid-input", field: "depositGbp" };
  const costsPence =
    input.otherBuyingCostsGbp === null || input.otherBuyingCostsGbp === undefined
      ? 0
      : toPence(input.otherBuyingCostsGbp);
  if (costsPence === null) return { status: "invalid-input", field: "otherBuyingCostsGbp" };

  const isFirstTimeBuyer = Boolean(input.isFirstTimeBuyer);
  const taxAt = (pricePence: number): PropertyTransactionTaxResult =>
    calculatePropertyTransactionTax({
      propertyPriceGbp: pricePence / 100,
      jurisdiction: input.jurisdiction,
      isFirstTimeBuyer,
    });
  const taxPence = (result: PropertyTransactionTaxResult): number =>
    Math.round(result.taxGbp * 100);

  // Price plus tax may not pass this: what the loan and deposit leave after other costs.
  const budgetPence = loanPence + depositPence - costsPence;
  const fits = (pricePence: number): boolean =>
    pricePence + taxPence(taxAt(pricePence)) <= budgetPence;

  const loanGbp = loanPence / 100;
  const depositGbp = depositPence / 100;
  const otherBuyingCostsGbp = costsPence / 100;

  if (!fits(loanPence)) {
    const propertyTaxAtLoan = taxAt(loanPence);
    return {
      status: "deposit-short",
      loanGbp,
      depositGbp,
      otherBuyingCostsGbp,
      propertyTaxAtLoan,
      shortfallGbp: (costsPence + taxPence(propertyTaxAtLoan) - depositPence) / 100,
    };
  }

  // Invariant: `low` fits and `high` does not. `high` starts one penny above the budget, which
  // cannot fit because tax is never negative.
  let low = loanPence;
  let high = budgetPence + 1;
  let steps = 0;
  while (high - low > 1) {
    const mid = low + Math.floor((high - low) / 2);
    if (fits(mid)) low = mid;
    else high = mid;
    steps++;
  }

  const propertyTax = taxAt(low);
  return {
    status: "solved",
    propertyPriceGbp: low / 100,
    loanGbp,
    depositGbp,
    otherBuyingCostsGbp,
    propertyTax,
    depositTowardsPriceGbp: (low - loanPence) / 100,
    unspentGbp: (budgetPence - low - taxPence(propertyTax)) / 100,
    steps,
  };
}
