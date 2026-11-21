import { calculateLoanFromMonthlyPayment } from "./mortgage.js";
import {
  lookupMortgageRateBandForLtv,
  MORTGAGE_LTV_RATE_BANDS,
  type MortgageRateBand,
} from "./mortgage-rate-assumptions.js";

/** Default lower income multiple assumption (E39 section 10a, MA2). */
export const DEFAULT_INCOME_MULTIPLE_LOW = 4;

/** Default upper income multiple assumption (E39 section 10a, MA2). */
export const DEFAULT_INCOME_MULTIPLE_HIGH = 4.5;

const round2 = (n: number): number => Math.round(n * 100) / 100;
const round1 = (n: number): number => Math.round(n * 10) / 10;

function nonNegativeFinite(value: number | null | undefined): number {
  return Number.isFinite(value) && (value as number) > 0 ? (value as number) : 0;
}

export interface IncomeMultipleRangeInput {
  /** Primary applicant's yearly income before tax, in pounds. */
  primaryAnnualIncomeGbp: number;
  /** Optional second applicant's yearly income before tax, in pounds (typed, not stored; MA8). */
  secondAnnualIncomeGbp?: number | null;
  /** Lower multiple of combined yearly income; defaults to `DEFAULT_INCOME_MULTIPLE_LOW` (4). */
  lowMultiple?: number;
  /** Upper multiple of combined yearly income; defaults to `DEFAULT_INCOME_MULTIPLE_HIGH` (4.5). */
  highMultiple?: number;
  /** Optional deposit in pounds. */
  depositGbp?: number | null;
  /** Optional buying costs in pounds, deducted from `depositGbp` before computing property price. */
  buyingCostsGbp?: number | null;
}

export interface IncomeMultipleRangeResult {
  primaryAnnualIncomeGbp: number;
  secondAnnualIncomeGbp: number;
  combinedAnnualIncomeGbp: number;
  lowMultiple: number;
  highMultiple: number;
  lowLoanGbp: number;
  highLoanGbp: number;
  /** Deposit remaining for the property price after deducting `buyingCostsGbp` (floored at 0), or `null` when no deposit is provided. */
  netDepositGbp: number | null;
  lowPropertyPriceGbp: number | null;
  highPropertyPriceGbp: number | null;
  /** Loan to value at `lowLoanGbp` (one decimal place), or `null` when no positive net deposit is present. */
  lowLtvPct: number | null;
  /** Loan to value at `highLoanGbp` (one decimal place), or `null` when no positive net deposit is present. */
  highLtvPct: number | null;
}

/**
 * Estimates a mortgage borrowing range from yearly income before tax and an editable low/high
 * income multiple range (E39 section 4a & section 10a MA2). When `lowMultiple` and `highMultiple`
 * are passed in reverse order, they are normalised so `lowLoanGbp <= highLoanGbp`.
 */
export function calculateIncomeMultipleRange(
  input: IncomeMultipleRangeInput,
): IncomeMultipleRangeResult {
  const primaryAnnualIncomeGbp = round2(nonNegativeFinite(input.primaryAnnualIncomeGbp));
  const secondAnnualIncomeGbp = round2(nonNegativeFinite(input.secondAnnualIncomeGbp));
  const combinedAnnualIncomeGbp = round2(primaryAnnualIncomeGbp + secondAnnualIncomeGbp);

  const rawLow = Number.isFinite(input.lowMultiple)
    ? Math.max(0, input.lowMultiple as number)
    : DEFAULT_INCOME_MULTIPLE_LOW;
  const rawHigh = Number.isFinite(input.highMultiple)
    ? Math.max(0, input.highMultiple as number)
    : DEFAULT_INCOME_MULTIPLE_HIGH;

  const lowMultiple = Math.min(rawLow, rawHigh);
  const highMultiple = Math.max(rawLow, rawHigh);

  const lowLoanGbp = round2(combinedAnnualIncomeGbp * lowMultiple);
  const highLoanGbp = round2(combinedAnnualIncomeGbp * highMultiple);

  const hasDeposit = Number.isFinite(input.depositGbp) && (input.depositGbp as number) > 0;
  if (!hasDeposit) {
    return {
      primaryAnnualIncomeGbp,
      secondAnnualIncomeGbp,
      combinedAnnualIncomeGbp,
      lowMultiple,
      highMultiple,
      lowLoanGbp,
      highLoanGbp,
      netDepositGbp: null,
      lowPropertyPriceGbp: null,
      highPropertyPriceGbp: null,
      lowLtvPct: null,
      highLtvPct: null,
    };
  }

  const buyingCosts = nonNegativeFinite(input.buyingCostsGbp);
  const netDepositGbp = round2(Math.max(0, (input.depositGbp as number) - buyingCosts));
  if (!(netDepositGbp > 0)) {
    return {
      primaryAnnualIncomeGbp,
      secondAnnualIncomeGbp,
      combinedAnnualIncomeGbp,
      lowMultiple,
      highMultiple,
      lowLoanGbp,
      highLoanGbp,
      netDepositGbp: 0,
      lowPropertyPriceGbp: null,
      highPropertyPriceGbp: null,
      lowLtvPct: null,
      highLtvPct: null,
    };
  }

  const lowPropertyPriceGbp = round2(lowLoanGbp + netDepositGbp);
  const highPropertyPriceGbp = round2(highLoanGbp + netDepositGbp);
  const lowLtvPct = round1((lowLoanGbp / lowPropertyPriceGbp) * 100);
  const highLtvPct = round1((highLoanGbp / highPropertyPriceGbp) * 100);

  return {
    primaryAnnualIncomeGbp,
    secondAnnualIncomeGbp,
    combinedAnnualIncomeGbp,
    lowMultiple,
    highMultiple,
    lowLoanGbp,
    highLoanGbp,
    netDepositGbp,
    lowPropertyPriceGbp,
    highPropertyPriceGbp,
    lowLtvPct,
    highLtvPct,
  };
}

export interface BudgetLoanEstimateInput {
  /** Monthly mortgage payment in pounds. */
  monthlyPaymentGbp: number;
  /** Mortgage term in whole months. */
  termMonths: number;
  /**
   * User-chosen single annual interest rate in percent (including `0`). When provided, overrides
   * any rate band.
   */
  annualRatePct?: number | null;
  /**
   * Explicit low/high annual interest rate band in percent. When omitted and `annualRatePct` is
   * not set, the engine resolves the LTV default band from `depositGbp` (E39 section 10a, MA5).
   */
  rateBand?: { lowAnnualRatePct: number; highAnnualRatePct: number } | null;
  /** Optional deposit in pounds. */
  depositGbp?: number | null;
  /** Optional buying costs in pounds, deducted from `depositGbp`. */
  buyingCostsGbp?: number | null;
}

export interface BudgetLoanEstimateResult {
  monthlyPaymentGbp: number;
  termMonths: number;
  /** Deposit remaining after deducting `buyingCostsGbp`, or `null` when no deposit was given. */
  netDepositGbp: number | null;
  /** Lower annual interest rate used (remembered that the higher rate yields the lower loan). */
  lowAnnualRatePct: number | null;
  /** Higher annual interest rate used. Equals `lowAnnualRatePct` when a single rate is used. */
  highAnnualRatePct: number | null;
  /** Matched LTV default rate band when derived from the table, else `null`. */
  matchedRateBand: MortgageRateBand | null;
  /** Single loan estimate when a single rate is given, else `null`. */
  loanGbp: number | null;
  /** Lower loan estimate (computed at `highAnnualRatePct`), or `null` when no rate is known. */
  lowLoanGbp: number | null;
  /** Higher loan estimate (computed at `lowAnnualRatePct`), or `null` when no rate is known. */
  highLoanGbp: number | null;
  propertyPriceGbp: number | null;
  lowPropertyPriceGbp: number | null;
  highPropertyPriceGbp: number | null;
  ltvPct: number | null;
  lowLtvPct: number | null;
  highLtvPct: number | null;
}

/**
 * Resolves the default LTV rate band (`MORTGAGE_LTV_RATE_BANDS`) for a given monthly payment,
 * term and net deposit when the user has not typed a custom interest rate (E39 section 10a, MA5).
 * Because a lower LTV band has a lower interest rate (and therefore a slightly larger loan for the
 * same payment), bands are checked from lowest `maxLtvPct` upwards and the first band whose
 * high-loan LTV fits within `band.maxLtvPct` is chosen. Returns `null` when the deposit is not
 * large enough to keep LTV at or below 90%.
 */
function resolveLtvBandFromDeposit(
  monthlyPaymentGbp: number,
  termMonths: number,
  netDepositGbp: number,
): MortgageRateBand | null {
  for (const band of MORTGAGE_LTV_RATE_BANDS) {
    const highLoan = calculateLoanFromMonthlyPayment(
      monthlyPaymentGbp,
      band.lowAnnualRatePct,
      termMonths,
    );
    const price = highLoan + netDepositGbp;
    const ltvPct = (highLoan / price) * 100;
    if (ltvPct <= band.maxLtvPct) {
      return lookupMortgageRateBandForLtv(ltvPct);
    }
  }
  return null;
}

/**
 * Estimates the repayment loan size (or low/high loan range), property price and loan to value
 * from a monthly payment, term, and either a single rate, an explicit rate band, or the LTV
 * default rate table (E39 section 4a & section 10a MA5).
 */
export function calculateBudgetLoanEstimate(
  input: BudgetLoanEstimateInput,
): BudgetLoanEstimateResult {
  const monthlyPaymentGbp = round2(nonNegativeFinite(input.monthlyPaymentGbp));
  const termMonths =
    Number.isFinite(input.termMonths) && input.termMonths > 0 ? Math.trunc(input.termMonths) : 0;

  const hasDeposit = Number.isFinite(input.depositGbp) && (input.depositGbp as number) > 0;
  const buyingCosts = nonNegativeFinite(input.buyingCostsGbp);
  const netDepositGbp = hasDeposit
    ? round2(Math.max(0, (input.depositGbp as number) - buyingCosts))
    : null;
  const positiveDeposit = netDepositGbp !== null && netDepositGbp > 0 ? netDepositGbp : null;

  const hasSingleRate =
    Number.isFinite(input.annualRatePct) && (input.annualRatePct as number) >= 0;

  let lowAnnualRatePct: number | null = null;
  let highAnnualRatePct: number | null = null;
  let matchedRateBand: MortgageRateBand | null = null;

  if (hasSingleRate) {
    lowAnnualRatePct = input.annualRatePct as number;
    highAnnualRatePct = input.annualRatePct as number;
  } else if (
    input.rateBand &&
    Number.isFinite(input.rateBand.lowAnnualRatePct) &&
    Number.isFinite(input.rateBand.highAnnualRatePct) &&
    input.rateBand.lowAnnualRatePct >= 0 &&
    input.rateBand.highAnnualRatePct >= 0
  ) {
    lowAnnualRatePct = Math.min(input.rateBand.lowAnnualRatePct, input.rateBand.highAnnualRatePct);
    highAnnualRatePct = Math.max(input.rateBand.lowAnnualRatePct, input.rateBand.highAnnualRatePct);
  } else if (positiveDeposit !== null) {
    matchedRateBand = resolveLtvBandFromDeposit(monthlyPaymentGbp, termMonths, positiveDeposit);
    if (matchedRateBand) {
      lowAnnualRatePct = matchedRateBand.lowAnnualRatePct;
      highAnnualRatePct = matchedRateBand.highAnnualRatePct;
    }
  }

  if (
    lowAnnualRatePct === null ||
    highAnnualRatePct === null ||
    !(monthlyPaymentGbp > 0) ||
    !(termMonths > 0)
  ) {
    return {
      monthlyPaymentGbp,
      termMonths,
      netDepositGbp,
      lowAnnualRatePct,
      highAnnualRatePct,
      matchedRateBand,
      loanGbp: null,
      lowLoanGbp: null,
      highLoanGbp: null,
      propertyPriceGbp: null,
      lowPropertyPriceGbp: null,
      highPropertyPriceGbp: null,
      ltvPct: null,
      lowLtvPct: null,
      highLtvPct: null,
    };
  }

  // At a fixed monthly payment, the higher interest rate produces the smaller loan and the lower
  // interest rate produces the larger loan.
  const lowLoanGbp = calculateLoanFromMonthlyPayment(
    monthlyPaymentGbp,
    highAnnualRatePct,
    termMonths,
  );
  const highLoanGbp = calculateLoanFromMonthlyPayment(
    monthlyPaymentGbp,
    lowAnnualRatePct,
    termMonths,
  );
  const isSingle = hasSingleRate || lowAnnualRatePct === highAnnualRatePct;
  const loanGbp = isSingle ? lowLoanGbp : null;

  const lowPropertyPriceGbp =
    positiveDeposit !== null ? round2(lowLoanGbp + positiveDeposit) : null;
  const highPropertyPriceGbp =
    positiveDeposit !== null ? round2(highLoanGbp + positiveDeposit) : null;
  const propertyPriceGbp = isSingle ? lowPropertyPriceGbp : null;

  const lowLtvPct =
    lowPropertyPriceGbp !== null ? round1((lowLoanGbp / lowPropertyPriceGbp) * 100) : null;
  const highLtvPct =
    highPropertyPriceGbp !== null ? round1((highLoanGbp / highPropertyPriceGbp) * 100) : null;
  const ltvPct = isSingle ? lowLtvPct : null;

  return {
    monthlyPaymentGbp,
    termMonths,
    netDepositGbp,
    lowAnnualRatePct,
    highAnnualRatePct,
    matchedRateBand,
    loanGbp,
    lowLoanGbp,
    highLoanGbp,
    propertyPriceGbp,
    lowPropertyPriceGbp,
    highPropertyPriceGbp,
    ltvPct,
    lowLtvPct,
    highLtvPct,
  };
}
