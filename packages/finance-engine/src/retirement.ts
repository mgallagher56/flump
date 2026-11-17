import {
  type AccountCategory,
  categorizeAccountType,
  isLiabilityCategory,
} from "./account-category.js";
import type { BudgetEntryItem } from "./ai-context-pack.js";
import type { AccountShareInput } from "./joint-share.js";
import { amortiseOneMonth, calculateMonthlyMortgagePayment } from "./mortgage.js";
import { DEFAULT_NET_WORTH_BASIS } from "./net-worth-basis.js";
import { budgetRowMonthly, SAVINGS_CATEGORY } from "./picture/selectors/budget-totals.js";
import { type SnapshotRow, selectNetWorthSeries } from "./snapshots.js";
import { getUkStatePensionRules, resolveUkTaxYear, roundPence } from "./uk-tax-year.js";

/**
 * Retirement plan model in today's prices (E33 Slices S0-S1).
 *
 * All figures are expressed in real terms (today's money) using the Fisher relation:
 *   realRate = (1 + nominalRate) / (1 + inflationRate) - 1
 *
 * Compliance (R1-R8):
 * - The target is always set by the person (typed or built from their own budget lines), never
 *   proposed from age, income or housing status.
 * - Output is purely descriptive (estimated yearly income, target yearly income, and their signed
 *   difference `estimated - target`), with no advice, grading or judgement language.
 */

export const DEFAULT_RETIREMENT_INFLATION_RATE = 0.02;

export const DEFAULT_RETIREMENT_GROWTH_CASES = {
  lower: 0.02,
  middle: 0.05,
  higher: 0.08,
} as const;

export const DEFAULT_REAL_RENT_GROWTH_RATE = 0;

export type RetirementGrowthCase = "lower" | "middle" | "higher";

export interface RetirementGrowthBand<T = number> {
  lower: T;
  middle: T;
  higher: T;
}

export interface RetirementAssumptionsInput {
  /**
   * Nominal annual growth rates for pensions and investments as decimals (0.02 = 2%).
   * Defaults to lower: 0.02, middle: 0.05, higher: 0.08.
   */
  growthRates?: Partial<RetirementGrowthBand<number>>;
  /**
   * Nominal annual interest rate for cash savings as a decimal (0.04 = 4%).
   * When omitted, each savings pot uses its own saved interest rate (or 0% nominal when unset).
   */
  cashSavingsNominalRate?: number;
  /**
   * Annual inflation rate as a decimal (0.02 = 2%). Defaults to 0.02.
   */
  inflationRate?: number;
  /**
   * Real annual rent growth rate as a decimal (0 = rent grows in line with inflation).
   * Defaults to 0.
   */
  realRentGrowthRate?: number;
}

export interface ResolvedRetirementAssumptions {
  growthRates: RetirementGrowthBand<number>;
  realGrowthRates: RetirementGrowthBand<number>;
  cashSavingsNominalRate: number | null;
  inflationRate: number;
  realRentGrowthRate: number;
}

/**
 * Converts a nominal annual rate and an annual inflation rate (both decimals, such as 0.05 and
 * 0.02) into the exact real annual rate: `(1 + nominalRate) / (1 + inflationRate) - 1`.
 */
export function calculateRealRate(
  nominalRate: number,
  inflationRate: number = DEFAULT_RETIREMENT_INFLATION_RATE,
): number {
  if (!Number.isFinite(nominalRate) || !Number.isFinite(inflationRate)) {
    throw new RangeError("Nominal and inflation rates must be finite numbers.");
  }
  if (1 + inflationRate <= 0) {
    throw new RangeError("Inflation rate must be greater than -100%.");
  }
  return (1 + nominalRate) / (1 + inflationRate) - 1;
}

export function resolveRetirementAssumptions(
  input: RetirementAssumptionsInput = {},
): ResolvedRetirementAssumptions {
  const inflationRate = input.inflationRate ?? DEFAULT_RETIREMENT_INFLATION_RATE;
  const lower = input.growthRates?.lower ?? DEFAULT_RETIREMENT_GROWTH_CASES.lower;
  const middle = input.growthRates?.middle ?? DEFAULT_RETIREMENT_GROWTH_CASES.middle;
  const higher = input.growthRates?.higher ?? DEFAULT_RETIREMENT_GROWTH_CASES.higher;
  const realRentGrowthRate = input.realRentGrowthRate ?? DEFAULT_REAL_RENT_GROWTH_RATE;
  const cashSavingsNominalRate =
    input.cashSavingsNominalRate !== undefined && Number.isFinite(input.cashSavingsNominalRate)
      ? input.cashSavingsNominalRate
      : null;

  return {
    growthRates: { lower, middle, higher },
    realGrowthRates: {
      lower: calculateRealRate(lower, inflationRate),
      middle: calculateRealRate(middle, inflationRate),
      higher: calculateRealRate(higher, inflationRate),
    },
    cashSavingsNominalRate,
    inflationRate,
    realRentGrowthRate,
  };
}

export interface RealPotProjectionInput {
  initialBalance: number;
  monthlyContribution?: number;
  nominalRate: number;
  inflationRate?: number;
  years: number;
}

export interface RealPotProjectionResult {
  initialBalance: number;
  monthlyContribution: number;
  years: number;
  nominalAnnualRate: number;
  inflationAnnualRate: number;
  realAnnualRate: number;
  totalContributions: number;
  endBalance: number;
  endBalanceRounded: number;
  realGrowth: number;
}

/**
 * Projects a single pot in today's prices over `years` with monthly contributions.
 * Uses the compound monthly rate equivalent to `realAnnualRate`, so zero-contribution projections
 * over whole years equal `initialBalance * (1 + realAnnualRate) ** years` (vector RV3).
 */
export function projectRealPotBalance(input: RealPotProjectionInput): RealPotProjectionResult {
  const initialBalance = Math.max(
    0,
    Number.isFinite(input.initialBalance) ? input.initialBalance : 0,
  );
  const monthlyContribution = Math.max(
    0,
    Number.isFinite(input.monthlyContribution) ? (input.monthlyContribution ?? 0) : 0,
  );
  const years = Math.max(0, Number.isFinite(input.years) ? input.years : 0);
  const inflationAnnualRate = input.inflationRate ?? DEFAULT_RETIREMENT_INFLATION_RATE;
  const nominalAnnualRate = input.nominalRate;
  const realAnnualRate = calculateRealRate(nominalAnnualRate, inflationAnnualRate);

  const totalMonths = Math.round(years * 12);
  if (1 + realAnnualRate < 0) {
    throw new RangeError("Nominal rate cannot be less than -100%.");
  }
  const monthlyRealRate = 1 + realAnnualRate === 0 ? -1 : (1 + realAnnualRate) ** (1 / 12) - 1;

  let balance = initialBalance;
  let contributed = 0;

  if (monthlyContribution === 0 && Number.isInteger(years)) {
    balance = initialBalance * (1 + realAnnualRate) ** years;
  } else {
    for (let m = 0; m < totalMonths; m++) {
      balance = balance * (1 + monthlyRealRate) + monthlyContribution;
      contributed += monthlyContribution;
    }
  }

  const totalContributions = roundPence(contributed);
  const endBalance = roundPence(balance);
  const endBalanceRounded = Math.round(balance);
  const realGrowth = roundPence(balance - initialBalance - contributed);

  return {
    initialBalance: roundPence(initialBalance),
    monthlyContribution: roundPence(monthlyContribution),
    years,
    nominalAnnualRate,
    inflationAnnualRate,
    realAnnualRate,
    totalContributions,
    endBalance,
    endBalanceRounded,
    realGrowth,
  };
}

// ---------------------------------------------------------------------------
// Target (typed or built from non-housing budget lines)
// ---------------------------------------------------------------------------

export type BudgetLineRetirementStatus =
  | "continues"
  | "stops"
  | { kind: "changes"; monthlyAmount: number };

export interface RetirementBudgetTargetLine {
  id?: string;
  name?: string;
  category?: string;
  /** Monthly amount in pounds (used directly when set; otherwise `amount` and `frequency` are read). */
  monthlyAmount?: number;
  amount?: number;
  frequency?: BudgetEntryItem["frequency"];
  isIncome?: boolean;
  isHousing?: boolean;
  status: BudgetLineRetirementStatus;
}

export type RetirementTargetInput =
  | { kind: "typed"; yearlyAmount: number }
  | { kind: "budget"; lines: readonly RetirementBudgetTargetLine[] };

export interface RetirementTargetResult {
  source: "typed" | "budget";
  monthlyAmount: number;
  yearlyAmount: number;
  includedLineCount: number;
  excludedHousingLineCount: number;
}

const HOUSING_CATEGORIES = new Set(["housing", "rent", "mortgage"]);

export function isHousingBudgetLine(
  line: Pick<RetirementBudgetTargetLine, "category" | "isHousing">,
): boolean {
  if (line.isHousing === true) return true;
  if (!line.category) return false;
  return HOUSING_CATEGORIES.has(line.category.trim().toLowerCase());
}

function resolveLineMonthlyAmount(line: RetirementBudgetTargetLine): number {
  if (typeof line.monthlyAmount === "number" && Number.isFinite(line.monthlyAmount)) {
    return Math.max(0, line.monthlyAmount);
  }
  return Math.max(
    0,
    budgetRowMonthly({
      amount: line.amount ?? 0,
      frequency: line.frequency ?? "monthly",
    }),
  );
}

/**
 * Builds the yearly retirement spending target from saved budget lines (vector RV8).
 * Income rows, savings transfers, and housing rows are excluded because housing in retirement is
 * modelled on its own.
 */
export function calculateTargetFromBudgetLines(
  lines: readonly RetirementBudgetTargetLine[],
): RetirementTargetResult {
  let monthlyTotal = 0;
  let includedLineCount = 0;
  let excludedHousingLineCount = 0;

  for (const line of lines) {
    if (line.isIncome) continue;
    if (isHousingBudgetLine(line)) {
      excludedHousingLineCount++;
      continue;
    }
    if (line.category && line.category.trim().toLowerCase() === SAVINGS_CATEGORY) {
      continue;
    }

    if (line.status === "stops") {
      includedLineCount++;
      continue;
    }
    if (line.status === "continues") {
      monthlyTotal += resolveLineMonthlyAmount(line);
      includedLineCount++;
      continue;
    }
    if (typeof line.status === "object" && line.status !== null && line.status.kind === "changes") {
      const changed = Number(line.status.monthlyAmount);
      if (Number.isFinite(changed) && changed > 0) {
        monthlyTotal += changed;
      }
      includedLineCount++;
    }
  }

  const monthlyAmount = roundPence(monthlyTotal);
  const yearlyAmount = roundPence(monthlyTotal * 12);

  return {
    source: "budget",
    monthlyAmount,
    yearlyAmount,
    includedLineCount,
    excludedHousingLineCount,
  };
}

/**
 * Resolves the user's retirement target from either a direct yearly figure or budget lines.
 * Returns `null` when no target is provided (never invents a target from age or income, per R4).
 */
export function resolveRetirementTarget(
  target: RetirementTargetInput | number | null | undefined,
): RetirementTargetResult | null {
  if (target === null || target === undefined) return null;
  if (typeof target === "number") {
    if (!Number.isFinite(target) || target < 0) return null;
    const yearlyAmount = roundPence(target);
    return {
      source: "typed",
      monthlyAmount: roundPence(yearlyAmount / 12),
      yearlyAmount,
      includedLineCount: 0,
      excludedHousingLineCount: 0,
    };
  }
  if (target.kind === "typed") {
    if (!Number.isFinite(target.yearlyAmount) || target.yearlyAmount < 0) return null;
    const yearlyAmount = roundPence(target.yearlyAmount);
    return {
      source: "typed",
      monthlyAmount: roundPence(yearlyAmount / 12),
      yearlyAmount,
      includedLineCount: 0,
      excludedHousingLineCount: 0,
    };
  }
  return calculateTargetFromBudgetLines(target.lines);
}

// ---------------------------------------------------------------------------
// Housing in retirement (vectors RV4, RV5, RV6)
// ---------------------------------------------------------------------------

export type RetirementHousingKind =
  | "mortgage-ends-before-retirement"
  | "mortgage-continues"
  | "rent-for-life"
  | "own-outright"
  | "custom";

export interface RetirementMortgageDetailsInput {
  balanceGbp?: number | null;
  interestRateApr?: number | null;
  remainingTermMonths?: number | null;
  monthlyPaymentGbp?: number | null;
}

export type RetirementHousingOverride =
  | { kind: "own-outright" }
  | { kind: "rent-for-life"; monthlyRentGbp: number; realRentGrowthRate?: number }
  | { kind: "custom"; monthlyAmountGbp: number }
  | { kind: "mortgage-ends-before-retirement" }
  | {
      kind: "mortgage-continues";
      monthlyPaymentGbp: number;
      remainingYearsInRetirement: number;
    };

export interface RetirementHousingInput {
  currentAge: number;
  retirementAge: number;
  planToAge: number;
  /** Saved housing status from the user's profile. */
  housingStatus?: "renting" | "mortgage" | "own_outright" | "living_with_family" | null;
  /** Saved monthly rent or housing payment from the user's profile. */
  monthlyHousingCostGbp?: number | null;
  /** Saved mortgage account details when `housingStatus === "mortgage"`. */
  mortgage?: RetirementMortgageDetailsInput | null;
  /** Real annual rent growth rate (defaults to 0, meaning rent grows at inflation). */
  realRentGrowthRate?: number;
  /**
   * Annual inflation rate as a decimal (defaults to `DEFAULT_RETIREMENT_INFLATION_RATE`). A
   * mortgage payment is a fixed number of pounds, so it falls in today's prices at this rate.
   */
  inflationRate?: number;
  /** Optional explicit user override of the housing case in retirement. */
  override?: RetirementHousingOverride | null;
}

export interface RetirementHousingYearPoint {
  age: number;
  yearOfRetirement: number;
  annualCostGbp: number;
}

export interface RetirementHousingResult {
  kind: RetirementHousingKind;
  overridden: boolean;
  /** Monthly housing cost at the start of retirement in today's prices. */
  monthlyCostAtRetirementGbp: number;
  /** Annual housing cost in the first year of retirement in today's prices. */
  annualCostAtRetirementGbp: number;
  /** Average annual housing cost across the retirement span (`retirementAge` to `planToAge`). */
  averageAnnualCostGbp: number;
  /** Total housing cost across the retirement span in today's prices. */
  totalRetirementHousingCostGbp: number;
  /** Age at which mortgage payments end (for mortgage cases), or `null` when not applicable. */
  mortgageEndAge: number | null;
  /** Years of mortgage payments falling inside retirement (`0` when it ends before retirement). */
  mortgageYearsInRetirement: number;
  /** Year-by-year housing cost schedule from `retirementAge` to `planToAge - 1`. */
  yearlySchedule: RetirementHousingYearPoint[];
}

function resolveMortgageTermAndPayment(mortgage: RetirementMortgageDetailsInput): {
  monthlyPayment: number;
  remainingMonths: number;
} | null {
  const balance = Number(mortgage.balanceGbp ?? 0);
  const rateApr = Number(mortgage.interestRateApr ?? 0);
  const termMonths = Number(mortgage.remainingTermMonths ?? 0);
  const explicitPayment = Number(mortgage.monthlyPaymentGbp ?? 0);

  if (Number.isFinite(termMonths) && termMonths > 0) {
    const months = Math.round(termMonths);
    if (Number.isFinite(explicitPayment) && explicitPayment > 0) {
      return { monthlyPayment: roundPence(explicitPayment), remainingMonths: months };
    }
    if (Number.isFinite(balance) && balance > 0 && Number.isFinite(rateApr) && rateApr >= 0) {
      const payment = calculateMonthlyMortgagePayment(balance, rateApr, months);
      if (payment > 0) {
        return { monthlyPayment: payment, remainingMonths: months };
      }
    }
  }

  // If balance, rate, and monthly payment are given without termMonths, step amortiseOneMonth
  if (
    Number.isFinite(balance) &&
    balance > 0 &&
    Number.isFinite(explicitPayment) &&
    explicitPayment > 0 &&
    Number.isFinite(rateApr) &&
    rateApr >= 0
  ) {
    const monthlyRate = rateApr / 100 / 12;
    if (explicitPayment <= balance * monthlyRate) {
      return null;
    }
    let bal = balance;
    let months = 0;
    const maxMonths = 1200;
    while (bal > 0.01 && months < maxMonths) {
      months++;
      bal = amortiseOneMonth(bal, monthlyRate, explicitPayment).balanceGbp;
    }
    return { monthlyPayment: roundPence(explicitPayment), remainingMonths: months };
  }

  return null;
}

/**
 * Resolves housing costs in retirement from saved housing details or an explicit user override
 * (vectors RV4, RV5, RV6).
 */
export function resolveRetirementHousing(input: RetirementHousingInput): RetirementHousingResult {
  const currentAge = input.currentAge;
  const retirementAge = input.retirementAge;
  const planToAge = Math.max(retirementAge + 1, input.planToAge);
  const retirementYears = Math.max(1, Math.round(planToAge - retirementAge));
  const yearsUntilRetirement = Math.max(0, retirementAge - currentAge);
  const monthsUntilRetirement = Math.round(yearsUntilRetirement * 12);
  const defaultRealRentGrowth = input.realRentGrowthRate ?? DEFAULT_REAL_RENT_GROWTH_RATE;
  const inflationRate =
    typeof input.inflationRate === "number" &&
    Number.isFinite(input.inflationRate) &&
    input.inflationRate > -1
      ? input.inflationRate
      : DEFAULT_RETIREMENT_INFLATION_RATE;

  const buildZeroResult = (
    kind: "own-outright" | "mortgage-ends-before-retirement" | "custom",
    overridden: boolean,
    mortgageEndAge: number | null = null,
  ): RetirementHousingResult => ({
    kind,
    overridden,
    monthlyCostAtRetirementGbp: 0,
    annualCostAtRetirementGbp: 0,
    averageAnnualCostGbp: 0,
    totalRetirementHousingCostGbp: 0,
    mortgageEndAge,
    mortgageYearsInRetirement: 0,
    yearlySchedule: Array.from({ length: retirementYears }, (_, i) => ({
      age: retirementAge + i,
      yearOfRetirement: i + 1,
      annualCostGbp: 0,
    })),
  });

  const buildRentResult = (
    monthlyRent: number,
    realRentGrowthRate: number,
    overridden: boolean,
  ): RetirementHousingResult => {
    const baseMonthly = Math.max(0, monthlyRent);
    const yearlySchedule: RetirementHousingYearPoint[] = [];
    let totalCost = 0;

    for (let i = 0; i < retirementYears; i++) {
      const yearsFromNow = yearsUntilRetirement + i;
      const factor = (1 + realRentGrowthRate) ** yearsFromNow;
      const annualCost = roundPence(baseMonthly * 12 * factor);
      yearlySchedule.push({
        age: retirementAge + i,
        yearOfRetirement: i + 1,
        annualCostGbp: annualCost,
      });
      totalCost += annualCost;
    }

    const firstYearAnnual = yearlySchedule[0]?.annualCostGbp ?? roundPence(baseMonthly * 12);
    return {
      kind: "rent-for-life",
      overridden,
      monthlyCostAtRetirementGbp: roundPence(firstYearAnnual / 12),
      annualCostAtRetirementGbp: firstYearAnnual,
      averageAnnualCostGbp: roundPence(totalCost / retirementYears),
      totalRetirementHousingCostGbp: roundPence(totalCost),
      mortgageEndAge: null,
      mortgageYearsInRetirement: 0,
      yearlySchedule,
    };
  };

  const buildConstantCustomResult = (
    monthlyAmount: number,
    overridden: boolean,
  ): RetirementHousingResult => {
    const monthly = roundPence(Math.max(0, monthlyAmount));
    const annual = roundPence(monthly * 12);
    const yearlySchedule: RetirementHousingYearPoint[] = Array.from(
      { length: retirementYears },
      (_, i) => ({
        age: retirementAge + i,
        yearOfRetirement: i + 1,
        annualCostGbp: annual,
      }),
    );
    return {
      kind: "custom",
      overridden,
      monthlyCostAtRetirementGbp: monthly,
      annualCostAtRetirementGbp: annual,
      averageAnnualCostGbp: annual,
      totalRetirementHousingCostGbp: roundPence(annual * retirementYears),
      mortgageEndAge: null,
      mortgageYearsInRetirement: 0,
      yearlySchedule,
    };
  };

  const buildMortgageContinuesResult = (
    monthlyPayment: number,
    monthsInRetirement: number,
    mortgageEndAge: number,
    overridden: boolean,
  ): RetirementHousingResult => {
    // The payment is a fixed number of pounds, so in today's prices it falls with inflation:
    // retirement year i (0-based) costs payment × activeMonths ÷ (1 + inflation)^(yearsAway + i).
    const nominalMonthly = roundPence(Math.max(0, monthlyPayment));
    const deflator = (yearsAway: number) => (1 + inflationRate) ** yearsAway;
    const monthly = roundPence(nominalMonthly / deflator(yearsUntilRetirement));
    const yearlySchedule: RetirementHousingYearPoint[] = [];
    let totalCost = 0;

    for (let i = 0; i < retirementYears; i++) {
      const activeMonths = Math.max(0, Math.min(12, monthsInRetirement - i * 12));
      const annualCost = roundPence(
        (nominalMonthly * activeMonths) / deflator(yearsUntilRetirement + i),
      );
      yearlySchedule.push({
        age: retirementAge + i,
        yearOfRetirement: i + 1,
        annualCostGbp: annualCost,
      });
      totalCost += annualCost;
    }

    const firstYearAnnual = yearlySchedule[0]?.annualCostGbp ?? 0;
    return {
      kind: "mortgage-continues",
      overridden,
      monthlyCostAtRetirementGbp: monthsInRetirement > 0 ? monthly : 0,
      annualCostAtRetirementGbp: firstYearAnnual,
      averageAnnualCostGbp: roundPence(totalCost / retirementYears),
      totalRetirementHousingCostGbp: roundPence(totalCost),
      mortgageEndAge: Math.round(mortgageEndAge * 100) / 100,
      mortgageYearsInRetirement: Math.round((monthsInRetirement / 12) * 100) / 100,
      yearlySchedule,
    };
  };

  // 1. Explicit user override
  if (input.override) {
    const ov = input.override;
    if (ov.kind === "own-outright") {
      return buildZeroResult("own-outright", true);
    }
    if (ov.kind === "mortgage-ends-before-retirement") {
      return buildZeroResult("mortgage-ends-before-retirement", true, retirementAge);
    }
    if (ov.kind === "rent-for-life") {
      return buildRentResult(
        ov.monthlyRentGbp,
        ov.realRentGrowthRate ?? defaultRealRentGrowth,
        true,
      );
    }
    if (ov.kind === "custom") {
      return buildConstantCustomResult(ov.monthlyAmountGbp, true);
    }
    if (ov.kind === "mortgage-continues") {
      const monthsInRetirement = Math.max(0, Math.round(ov.remainingYearsInRetirement * 12));
      if (monthsInRetirement === 0) {
        return buildZeroResult("mortgage-ends-before-retirement", true, retirementAge);
      }
      return buildMortgageContinuesResult(
        ov.monthlyPaymentGbp,
        monthsInRetirement,
        retirementAge + monthsInRetirement / 12,
        true,
      );
    }
  }

  // 2. Derived from saved housing details
  const status = input.housingStatus ?? null;
  const savedMonthly = Math.max(0, Number(input.monthlyHousingCostGbp ?? 0) || 0);

  if (status === "own_outright") {
    return buildZeroResult("own-outright", false);
  }

  if (status === "renting") {
    return buildRentResult(savedMonthly, defaultRealRentGrowth, false);
  }

  if (status === "mortgage") {
    const resolvedMortgage = input.mortgage ? resolveMortgageTermAndPayment(input.mortgage) : null;
    if (resolvedMortgage) {
      const { monthlyPayment, remainingMonths } = resolvedMortgage;
      const mortgageEndAge = currentAge + remainingMonths / 12;
      if (remainingMonths <= monthsUntilRetirement) {
        return buildZeroResult("mortgage-ends-before-retirement", false, mortgageEndAge);
      }
      const monthsInRetirement = remainingMonths - monthsUntilRetirement;
      return buildMortgageContinuesResult(
        monthlyPayment,
        monthsInRetirement,
        mortgageEndAge,
        false,
      );
    }
    // If mortgage status is set without term details, fall back to saved monthly payment
    if (savedMonthly > 0) {
      return buildConstantCustomResult(savedMonthly, false);
    }
    return buildZeroResult("own-outright", false);
  }

  if (status === "living_with_family") {
    return buildConstantCustomResult(savedMonthly, false);
  }

  if (savedMonthly > 0) {
    return buildConstantCustomResult(savedMonthly, false);
  }

  return buildZeroResult("own-outright", false);
}

// ---------------------------------------------------------------------------
// State Pension (vectors RV1, RV2, RV7)
// ---------------------------------------------------------------------------

export interface RetirementStatePensionInput {
  /**
   * The State Pension age the user typed (decision RD10). There is no default: without it the
   * State Pension is left out of the plan.
   */
  statePensionAge?: number | null;
  /** User-entered annual State Pension forecast in pounds (from gov.uk). Takes precedence when set. */
  annualForecastGbp?: number | null;
  /** National Insurance qualifying years (0 to 35+). Used when `annualForecastGbp` is not set. */
  qualifyingYears?: number | null;
  /** Tax year for looking up the full new State Pension rate (defaults to current/latest supported). */
  taxYear?: string;
}

export interface RetirementStatePensionResult {
  source: "forecast" | "qualifying-years" | "none";
  taxYear: string;
  /** The age the user typed, or `null` when none was given. */
  statePensionAge: number | null;
  weeklyAmountGbp: number;
  annualAmountGbp: number;
  qualifyingYearsUsed: number | null;
}

/**
 * Resolves the annual and weekly State Pension in today's prices from either a user-typed
 * forecast or a count of qualifying years (`fullNewWeekly * 52 * min(max(years, 0), 35) / 35`
 * for 10+ qualifying years, £0 below 10 qualifying years).
 */
export function calculateRetirementStatePension(
  input: RetirementStatePensionInput = {},
): RetirementStatePensionResult {
  const taxYear = input.taxYear ?? resolveUkTaxYear();
  const rules = getUkStatePensionRules(taxYear);
  const statePensionAge =
    typeof input.statePensionAge === "number" &&
    Number.isFinite(input.statePensionAge) &&
    input.statePensionAge > 0
      ? input.statePensionAge
      : null;

  if (
    typeof input.annualForecastGbp === "number" &&
    Number.isFinite(input.annualForecastGbp) &&
    input.annualForecastGbp >= 0
  ) {
    const annualAmountGbp = roundPence(input.annualForecastGbp);
    return {
      source: "forecast",
      taxYear,
      statePensionAge,
      weeklyAmountGbp: roundPence(annualAmountGbp / 52),
      annualAmountGbp,
      qualifyingYearsUsed: null,
    };
  }

  if (typeof input.qualifyingYears === "number" && Number.isFinite(input.qualifyingYears)) {
    const clampedYears = Math.min(
      rules.qualifyingYearsForFull,
      Math.max(0, Math.floor(input.qualifyingYears)),
    );
    if (clampedYears < rules.minQualifyingYears) {
      return {
        source: "qualifying-years",
        taxYear,
        statePensionAge,
        weeklyAmountGbp: 0,
        annualAmountGbp: 0,
        qualifyingYearsUsed: clampedYears,
      };
    }
    const proportion = clampedYears / rules.qualifyingYearsForFull;
    const weeklyAmountGbp = roundPence(rules.fullNewWeekly * proportion);
    const annualAmountGbp = roundPence(rules.fullNewWeekly * 52 * proportion);
    return {
      source: "qualifying-years",
      taxYear,
      statePensionAge,
      weeklyAmountGbp,
      annualAmountGbp,
      qualifyingYearsUsed: clampedYears,
    };
  }

  return {
    source: "none",
    taxYear,
    statePensionAge,
    weeklyAmountGbp: 0,
    annualAmountGbp: 0,
    qualifyingYearsUsed: null,
  };
}

/**
 * Returns the State Pension income in a single year at `age` (vector RV7):
 * £0 before `statePensionAge`, and the full annual amount from `statePensionAge` onwards.
 */
export function statePensionAnnualAtAge(
  age: number,
  statePension: Pick<RetirementStatePensionResult, "statePensionAge" | "annualAmountGbp">,
): number {
  if (statePension.statePensionAge === null) return 0;
  return age >= statePension.statePensionAge ? statePension.annualAmountGbp : 0;
}

/**
 * True when the State Pension can go into a plan: the user typed both an age and an amount
 * source (a forecast or qualifying years). Until then the estimate leaves it out.
 */
export function isStatePensionIncluded(
  statePension: Pick<RetirementStatePensionResult, "statePensionAge" | "source">,
): boolean {
  return statePension.statePensionAge !== null && statePension.source !== "none";
}

// ---------------------------------------------------------------------------
// What counts towards retirement & pot accumulation / drawdown
// ---------------------------------------------------------------------------

export interface RetirementPotAccountInput {
  id?: string;
  name?: string;
  type?: string | null;
  balanceGbp: number;
  monthlyContributionGbp?: number | null;
  /** Saved annual interest rate in percent (for example 4.5 for 4.5% AER on cash savings). */
  interestRatePct?: number | null;
  /**
   * Explicit user choice for whether this account counts towards retirement.
   * When omitted, defaults by category: pensions, investments/ISAs, and savings count;
   * current accounts, property, and debts do not.
   */
  countsTowardsRetirement?: boolean | null;
  /** Joint ownership fields (E34), passed through to the monthly series so it can apply the share. */
  ownership?: AccountShareInput["ownership"];
  sharePercent?: AccountShareInput["sharePercent"];
}

/**
 * Default eligibility by account type/category (E33 Section 4):
 * pensions, investments (including ISAs) and savings count; current accounts, property and
 * debt/mortgage/student-loan accounts do not.
 */
export function defaultCountsTowardsRetirement(rawType?: string | null): boolean {
  const category: AccountCategory = categorizeAccountType(rawType);
  return category === "pensions" || category === "investments" || category === "savings";
}

export function doesAccountCountTowardsRetirement(
  account: Pick<RetirementPotAccountInput, "type" | "countsTowardsRetirement">,
): boolean {
  const category = categorizeAccountType(account.type);
  // Property never counts (decision RD8): selling or downsizing a home is a what-if only.
  if (category === "property") return false;
  if (typeof account.countsTowardsRetirement === "boolean") {
    if (isLiabilityCategory(category) || category === "studentLoans") return false;
    return account.countsTowardsRetirement;
  }
  return defaultCountsTowardsRetirement(account.type);
}

export interface RetirementPlanInput {
  currentAge: number;
  retirementAge: number;
  planToAge: number;
  accounts: readonly RetirementPotAccountInput[];
  /** Extra monthly pension contribution (for example workplace salary-based contribution not on an account row). */
  additionalMonthlyPensionContributionGbp?: number;
  /** Extra monthly savings/investment contribution not already attached to an account row. */
  additionalMonthlySavingsContributionGbp?: number;
  target?: RetirementTargetInput | number | null;
  housing?: Omit<
    RetirementHousingInput,
    "currentAge" | "retirementAge" | "planToAge" | "inflationRate"
  >;
  /**
   * The user's State Pension details. Left out of the plan unless both an age and an amount
   * source (forecast or qualifying years) are given.
   */
  statePension?: RetirementStatePensionInput | null;
  assumptions?: RetirementAssumptionsInput;
}

export interface RetirementYearProjectionPoint {
  age: number;
  yearOfRetirement: number;
  potDrawdownYearly: RetirementGrowthBand<number>;
  statePensionYearlyGbp: number;
  housingCostYearlyGbp: number;
  grossYearlyIncome: RetirementGrowthBand<number>;
  yearlyIncomeAfterHousing: RetirementGrowthBand<number>;
}

export interface RetirementPlanResult {
  currentAge: number;
  retirementAge: number;
  planToAge: number;
  yearsToRetirement: number;
  yearsInRetirement: number;
  assumptions: ResolvedRetirementAssumptions;
  /** Current total balance of accounts that count towards retirement. */
  currentCountedPotGbp: number;
  /** Projected total pot at `retirementAge` in today's prices for each growth case. */
  projectedPotAtRetirementGbp: RetirementGrowthBand<number>;
  /** Breakdown of projected pots at `retirementAge` by category group. */
  projectedPotByGroupGbp: {
    pensions: RetirementGrowthBand<number>;
    investments: RetirementGrowthBand<number>;
    savings: number;
  };
  /** Annual income from drawing down the pots evenly in real terms from `retirementAge` to `planToAge`. */
  annualPotIncomeGbp: RetirementGrowthBand<number>;
  /**
   * State Pension details and annual amount from `statePensionAge`, or `null` when it is left out
   * (no age or no amount source given).
   */
  statePension: RetirementStatePensionResult | null;
  /** Housing cost in retirement derived from saved details or override. */
  housing: RetirementHousingResult;
  /**
   * Estimated yearly income from `retirementAge` in today's prices for each growth case: the
   * income in the first year of retirement (pots, plus State Pension only when it has started by
   * then). Never an average across years.
   */
  estimatedYearlyIncomeGbp: RetirementGrowthBand<number>;
  /**
   * Yearly income from `retirementAge` until State Pension age (pots only), or `null` when the
   * State Pension is left out or retirement starts at or after State Pension age.
   */
  estimatedYearlyIncomeBeforeStatePensionAgeGbp: RetirementGrowthBand<number> | null;
  /**
   * Yearly income from State Pension age onwards (pots plus the full State Pension), or `null`
   * when the State Pension is left out.
   */
  estimatedYearlyIncomeFromStatePensionAgeGbp: RetirementGrowthBand<number> | null;
  /**
   * The user's own yearly target (including retirement housing costs when built from non-housing
   * budget lines, or the direct typed figure when typed). `null` when no target has been set.
   */
  targetYearlyIncome: number | null;
  /** Detailed target breakdown, or `null` when no target is set. */
  targetDetail: RetirementTargetResult | null;
  /**
   * Signed yearly difference (`estimatedYearlyIncomeGbp[case] - targetYearlyIncome`) for each
   * growth case, or `null` when no target has been set.
   */
  differenceYearly: RetirementGrowthBand<number> | null;
  /** `estimatedYearlyIncomeBeforeStatePensionAgeGbp - target`, or `null` when either is unset. */
  differenceBeforeStatePensionAgeYearly: RetirementGrowthBand<number> | null;
  /** `estimatedYearlyIncomeFromStatePensionAgeGbp - target`, or `null` when either is unset. */
  differenceFromStatePensionAgeYearly: RetirementGrowthBand<number> | null;
  /** Year-by-year retirement schedule from `retirementAge` to `planToAge - 1`. */
  yearlySchedule: RetirementYearProjectionPoint[];
  /** Neutral factual summary lines (R1 compliant: identical phrasing whether difference is positive or negative). */
  summary: {
    estimatedMiddleYearlyGbp: number;
    targetYearlyGbp: number | null;
    differenceMiddleYearlyGbp: number | null;
  };
}

/**
 * Calculates the constant real annual withdrawal that depletes `potGbp` evenly over `years`
 * at `realAnnualRate` (ordinary annuity: `P * r / (1 - (1 + r)^-N)`), falling back to
 * `potGbp / years` when `|realAnnualRate| < 1e-12` or `1 + realAnnualRate <= 0`.
 */
export function calculateEvenRealDrawdown(
  potGbp: number,
  realAnnualRate: number,
  years: number,
): number {
  if (!(potGbp > 0) || !(years > 0)) return 0;
  if (Math.abs(realAnnualRate) < 1e-12 || 1 + realAnnualRate <= 0) {
    return potGbp / years;
  }
  // 1 - (1 + r)^-N written with expm1 and log1p, so a rate very close to 0 keeps its precision.
  return (potGbp * realAnnualRate) / -Math.expm1(-years * Math.log1p(realAnnualRate));
}

/**
 * Projects eligible retirement pots in today's prices to `retirementAge`, then draws them down
 * evenly in real terms from `retirementAge` to `planToAge` alongside State Pension and retirement
 * housing costs.
 */
export function calculateRetirementPlan(input: RetirementPlanInput): RetirementPlanResult {
  if (!Number.isInteger(input.currentAge) || input.currentAge < 0) {
    throw new RangeError("currentAge must be a non-negative integer.");
  }
  if (!Number.isInteger(input.retirementAge) || input.retirementAge < input.currentAge) {
    throw new RangeError("retirementAge must be an integer greater than or equal to currentAge.");
  }
  if (!Number.isInteger(input.planToAge) || input.planToAge <= input.retirementAge) {
    throw new RangeError("planToAge must be an integer greater than retirementAge.");
  }

  const currentAge = input.currentAge;
  const retirementAge = input.retirementAge;
  const planToAge = input.planToAge;
  const yearsToRetirement = Math.max(0, retirementAge - currentAge);
  const yearsInRetirement = Math.max(1, planToAge - retirementAge);

  const assumptions = resolveRetirementAssumptions(input.assumptions);
  const statePensionDetail = input.statePension
    ? calculateRetirementStatePension(input.statePension)
    : null;
  const statePension =
    statePensionDetail && isStatePensionIncluded(statePensionDetail) ? statePensionDetail : null;
  const housing = resolveRetirementHousing({
    currentAge,
    retirementAge,
    planToAge,
    housingStatus: input.housing?.housingStatus,
    monthlyHousingCostGbp: input.housing?.monthlyHousingCostGbp,
    mortgage: input.housing?.mortgage,
    realRentGrowthRate: input.housing?.realRentGrowthRate ?? assumptions.realRentGrowthRate,
    inflationRate: assumptions.inflationRate,
    override: input.housing?.override,
  });

  const targetDetail = resolveRetirementTarget(input.target);
  // When the target is built from non-housing budget lines, add the average annual retirement housing cost
  // so total retirement spending includes both non-housing lines and the retirement housing model.
  const targetYearlyIncome =
    targetDetail === null
      ? null
      : targetDetail.source === "budget"
        ? roundPence(targetDetail.yearlyAmount + housing.averageAnnualCostGbp)
        : targetDetail.yearlyAmount;

  let currentCountedPotGbp = 0;
  const pensionsAtRetirement: RetirementGrowthBand<number> = { lower: 0, middle: 0, higher: 0 };
  const investmentsAtRetirement: RetirementGrowthBand<number> = { lower: 0, middle: 0, higher: 0 };
  let savingsAtRetirement = 0;
  let savingsDrawdownAnnual = 0;

  const cases: readonly RetirementGrowthCase[] = ["lower", "middle", "higher"];

  for (const account of input.accounts) {
    if (!doesAccountCountTowardsRetirement(account)) continue;
    const balance = Math.max(0, Number(account.balanceGbp) || 0);
    const monthly = Math.max(0, Number(account.monthlyContributionGbp) || 0);
    currentCountedPotGbp += balance;

    const category = categorizeAccountType(account.type);
    if (category === "savings" || category === "cash") {
      const savedNominalRate =
        assumptions.cashSavingsNominalRate !== null
          ? assumptions.cashSavingsNominalRate
          : typeof account.interestRatePct === "number" && Number.isFinite(account.interestRatePct)
            ? account.interestRatePct / 100
            : 0;
      const projected = projectRealPotBalance({
        initialBalance: balance,
        monthlyContribution: monthly,
        nominalRate: savedNominalRate,
        inflationRate: assumptions.inflationRate,
        years: yearsToRetirement,
      });
      savingsAtRetirement += projected.endBalance;
      savingsDrawdownAnnual += calculateEvenRealDrawdown(
        projected.endBalance,
        projected.realAnnualRate,
        yearsInRetirement,
      );
    } else if (category === "pensions") {
      for (const c of cases) {
        const projected = projectRealPotBalance({
          initialBalance: balance,
          monthlyContribution: monthly,
          nominalRate: assumptions.growthRates[c],
          inflationRate: assumptions.inflationRate,
          years: yearsToRetirement,
        });
        pensionsAtRetirement[c] += projected.endBalance;
      }
    } else {
      for (const c of cases) {
        const projected = projectRealPotBalance({
          initialBalance: balance,
          monthlyContribution: monthly,
          nominalRate: assumptions.growthRates[c],
          inflationRate: assumptions.inflationRate,
          years: yearsToRetirement,
        });
        investmentsAtRetirement[c] += projected.endBalance;
      }
    }
  }

  const extraPensionMonthly = Math.max(
    0,
    Number(input.additionalMonthlyPensionContributionGbp) || 0,
  );
  if (extraPensionMonthly > 0) {
    for (const c of cases) {
      const projected = projectRealPotBalance({
        initialBalance: 0,
        monthlyContribution: extraPensionMonthly,
        nominalRate: assumptions.growthRates[c],
        inflationRate: assumptions.inflationRate,
        years: yearsToRetirement,
      });
      pensionsAtRetirement[c] += projected.endBalance;
    }
  }

  const extraSavingsMonthly = Math.max(
    0,
    Number(input.additionalMonthlySavingsContributionGbp) || 0,
  );
  if (extraSavingsMonthly > 0) {
    const cashNominal = assumptions.cashSavingsNominalRate ?? 0;
    const projected = projectRealPotBalance({
      initialBalance: 0,
      monthlyContribution: extraSavingsMonthly,
      nominalRate: cashNominal,
      inflationRate: assumptions.inflationRate,
      years: yearsToRetirement,
    });
    savingsAtRetirement += projected.endBalance;
    savingsDrawdownAnnual += calculateEvenRealDrawdown(
      projected.endBalance,
      projected.realAnnualRate,
      yearsInRetirement,
    );
  }

  const projectedPotByGroupGbp = {
    pensions: {
      lower: roundPence(pensionsAtRetirement.lower),
      middle: roundPence(pensionsAtRetirement.middle),
      higher: roundPence(pensionsAtRetirement.higher),
    },
    investments: {
      lower: roundPence(investmentsAtRetirement.lower),
      middle: roundPence(investmentsAtRetirement.middle),
      higher: roundPence(investmentsAtRetirement.higher),
    },
    savings: roundPence(savingsAtRetirement),
  };

  const projectedPotAtRetirementGbp: RetirementGrowthBand<number> = {
    lower: roundPence(
      projectedPotByGroupGbp.pensions.lower +
        projectedPotByGroupGbp.investments.lower +
        projectedPotByGroupGbp.savings,
    ),
    middle: roundPence(
      projectedPotByGroupGbp.pensions.middle +
        projectedPotByGroupGbp.investments.middle +
        projectedPotByGroupGbp.savings,
    ),
    higher: roundPence(
      projectedPotByGroupGbp.pensions.higher +
        projectedPotByGroupGbp.investments.higher +
        projectedPotByGroupGbp.savings,
    ),
  };

  // Annuity-style even real-terms drawdown from retirementAge to planToAge per pot group
  const annualPotIncomeGbp: RetirementGrowthBand<number> = {
    lower: roundPence(
      calculateEvenRealDrawdown(
        projectedPotByGroupGbp.pensions.lower + projectedPotByGroupGbp.investments.lower,
        assumptions.realGrowthRates.lower,
        yearsInRetirement,
      ) + savingsDrawdownAnnual,
    ),
    middle: roundPence(
      calculateEvenRealDrawdown(
        projectedPotByGroupGbp.pensions.middle + projectedPotByGroupGbp.investments.middle,
        assumptions.realGrowthRates.middle,
        yearsInRetirement,
      ) + savingsDrawdownAnnual,
    ),
    higher: roundPence(
      calculateEvenRealDrawdown(
        projectedPotByGroupGbp.pensions.higher + projectedPotByGroupGbp.investments.higher,
        assumptions.realGrowthRates.higher,
        yearsInRetirement,
      ) + savingsDrawdownAnnual,
    ),
  };

  const yearlySchedule: RetirementYearProjectionPoint[] = [];

  for (let i = 0; i < yearsInRetirement; i++) {
    const age = retirementAge + i;
    const spYearly = statePension ? statePensionAnnualAtAge(age, statePension) : 0;
    const housingYearly = housing.yearlySchedule[i]?.annualCostGbp ?? 0;

    const grossYearlyIncome: RetirementGrowthBand<number> = {
      lower: roundPence(annualPotIncomeGbp.lower + spYearly),
      middle: roundPence(annualPotIncomeGbp.middle + spYearly),
      higher: roundPence(annualPotIncomeGbp.higher + spYearly),
    };

    const yearlyIncomeAfterHousing: RetirementGrowthBand<number> = {
      lower: roundPence(grossYearlyIncome.lower - housingYearly),
      middle: roundPence(grossYearlyIncome.middle - housingYearly),
      higher: roundPence(grossYearlyIncome.higher - housingYearly),
    };

    yearlySchedule.push({
      age,
      yearOfRetirement: i + 1,
      potDrawdownYearly: annualPotIncomeGbp,
      statePensionYearlyGbp: spYearly,
      housingCostYearlyGbp: housingYearly,
      grossYearlyIncome,
      yearlyIncomeAfterHousing,
    });
  }

  const addToBand = (band: RetirementGrowthBand<number>, amount: number) => ({
    lower: roundPence(band.lower + amount),
    middle: roundPence(band.middle + amount),
    higher: roundPence(band.higher + amount),
  });

  const estimatedYearlyIncomeFromStatePensionAgeGbp = statePension
    ? addToBand(annualPotIncomeGbp, statePension.annualAmountGbp)
    : null;
  const statePensionStartsLater =
    statePension !== null &&
    statePension.statePensionAge !== null &&
    retirementAge < statePension.statePensionAge;
  const estimatedYearlyIncomeBeforeStatePensionAgeGbp = statePensionStartsLater
    ? addToBand(annualPotIncomeGbp, 0)
    : null;
  // The income in the first year of retirement, never an average across years.
  const estimatedYearlyIncomeGbp =
    estimatedYearlyIncomeBeforeStatePensionAgeGbp ??
    estimatedYearlyIncomeFromStatePensionAgeGbp ??
    addToBand(annualPotIncomeGbp, 0);

  const differenceFrom = (band: RetirementGrowthBand<number> | null) =>
    band === null || targetYearlyIncome === null ? null : addToBand(band, -targetYearlyIncome);
  const differenceYearly = differenceFrom(estimatedYearlyIncomeGbp);
  const differenceBeforeStatePensionAgeYearly = differenceFrom(
    estimatedYearlyIncomeBeforeStatePensionAgeGbp,
  );
  const differenceFromStatePensionAgeYearly = differenceFrom(
    estimatedYearlyIncomeFromStatePensionAgeGbp,
  );

  return {
    currentAge,
    retirementAge,
    planToAge,
    yearsToRetirement,
    yearsInRetirement,
    assumptions,
    currentCountedPotGbp: roundPence(currentCountedPotGbp),
    projectedPotAtRetirementGbp,
    projectedPotByGroupGbp,
    annualPotIncomeGbp,
    statePension,
    housing,
    estimatedYearlyIncomeGbp,
    estimatedYearlyIncomeBeforeStatePensionAgeGbp,
    estimatedYearlyIncomeFromStatePensionAgeGbp,
    targetYearlyIncome,
    targetDetail,
    differenceYearly,
    differenceBeforeStatePensionAgeYearly,
    differenceFromStatePensionAgeYearly,
    yearlySchedule,
    summary: {
      estimatedMiddleYearlyGbp: estimatedYearlyIncomeGbp.middle,
      targetYearlyGbp: targetYearlyIncome,
      differenceMiddleYearlyGbp: differenceYearly ? differenceYearly.middle : null,
    },
  };
}

// ---------------------------------------------------------------------------
// Monthly counted-pots tracking series (vector RV9)
// ---------------------------------------------------------------------------

export interface RetirementCountedPoint {
  /** "YYYY-MM". */
  month: string;
  /** Sum of accounts that count towards retirement for this month. */
  totalCountedGbp: number;
  /** True when at least one counted account value in this month is carried forward from an earlier month. */
  hasCarriedForward: boolean;
  /** True when every counted account value in this month is carried forward. */
  allCarried: boolean;
  /** Per-account values for this month, flagging carried-forward values. */
  accounts: Array<{
    accountId: string;
    value: number;
    carried: boolean;
  }>;
  /** Change from the previous month (`current - previous`), or `null` for the first month. */
  changeFromPreviousGbp: number | null;
}

/**
 * Selects the monthly series of accounts that count towards retirement (E33 Section 5, vector RV9).
 * Carried-forward months are computed at read time and flagged (`carried: true`), never stored.
 */
export function selectRetirementCountedSeries(
  accounts: readonly (RetirementPotAccountInput & { id: string })[],
  rows: readonly SnapshotRow[],
  options: { through?: string; currentBalances?: ReadonlyMap<string, number> } = {},
): RetirementCountedPoint[] {
  const countedAccounts = accounts
    .filter((a) => Boolean(a.id) && doesAccountCountTowardsRetirement(a))
    .map((a) => ({
      id: String(a.id),
      type: String(a.type ?? "Pension"),
      // The name too, so the share resolves as it does for the balance (an ISA cannot be joint).
      ...(a.name !== undefined ? { name: a.name } : {}),
      ...(a.ownership !== undefined ? { ownership: a.ownership } : {}),
      ...(a.sharePercent !== undefined ? { sharePercent: a.sharePercent } : {}),
    }));

  if (countedAccounts.length === 0) return [];

  const points = selectNetWorthSeries(countedAccounts, rows, DEFAULT_NET_WORTH_BASIS, options);

  return points.map((pt, idx) => {
    const prev = idx > 0 ? points[idx - 1] : undefined;
    const totalCountedGbp = roundPence(pt.netWorth);
    const prevTotal = prev !== undefined ? roundPence(prev.netWorth) : null;
    const accountEntries = pt.accounts.map((a) => ({
      accountId: a.accountId,
      value: a.value,
      carried: a.carried,
    }));

    return {
      month: pt.month,
      totalCountedGbp,
      hasCarriedForward: accountEntries.some((a) => a.carried),
      allCarried: pt.allCarried,
      accounts: accountEntries,
      changeFromPreviousGbp: prevTotal !== null ? roundPence(totalCountedGbp - prevTotal) : null,
    };
  });
}
