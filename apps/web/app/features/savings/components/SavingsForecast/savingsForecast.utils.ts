import { calculateMonthsToSavingsGoal, projectCompoundSavings } from "@flump/finance-engine";

/** Inflation taken off the rate when the estimate is shown in today's money. */
export const TODAYS_MONEY_INFLATION = 2.5;

/** Longest goal search, in months (50 years). */
export const GOAL_SEARCH_MONTHS = 600;

export interface SavingsProjectionInput {
  /** Today's total across the saved accounts. */
  starting: number;
  /** Paid in each month. */
  monthly: number;
  /** AER, in percent. */
  rate: number;
  years: number;
  /** Takes `TODAYS_MONEY_INFLATION` off the rate. */
  todaysMoney: boolean;
}

export interface SavingsProjectionPoint {
  /** 0 is today. */
  year: number;
  balance: number;
}

export interface SavingsProjection {
  points: SavingsProjectionPoint[];
  final: number;
  /** New money paid in over the period (the monthly amount times the months). */
  paidIn: number;
  /** Growth on top of the starting amount and the money paid in. Never below 0. */
  interest: number;
  /** The rate actually used, after any inflation adjustment. */
  effectiveRate: number;
  /** True when the balance never changes (nothing paid in and no growth): no chart is drawn. */
  flat: boolean;
}

const safe = (n: number): number => (Number.isFinite(n) && n > 0 ? n : 0);

export const effectiveRateOf = (rate: number, todaysMoney: boolean): number =>
  Math.max(0, safe(rate) - (todaysMoney ? TODAYS_MONEY_INFLATION : 0));

/** Monthly compounding at the AER over whole years, with the monthly amount added each month. */
export function projectSavings(input: SavingsProjectionInput): SavingsProjection {
  const effectiveRate = effectiveRateOf(input.rate, input.todaysMoney);
  const projection = projectCompoundSavings({
    starting: input.starting,
    monthly: input.monthly,
    annualRatePct: effectiveRate,
    years: input.years,
  });

  return {
    ...projection,
    effectiveRate,
  };
}

export type GoalResult =
  | { status: "reached" }
  | { status: "months"; months: number }
  | { status: "not-reached" };

/** Months until the balance first reaches `goal`, searching up to `GOAL_SEARCH_MONTHS`. */
export function monthsToGoal(input: {
  starting: number;
  monthly: number;
  effectiveRate: number;
  goal: number;
}): GoalResult {
  return calculateMonthsToSavingsGoal({
    starting: input.starting,
    monthly: input.monthly,
    annualRatePct: input.effectiveRate,
    goal: input.goal,
    maxMonths: GOAL_SEARCH_MONTHS,
  });
}

const countFormat = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });

const plural = (n: number, one: string, many: string): string =>
  `${countFormat.format(n)} ${n === 1 ? one : many}`;

/** Durations over 24 months read as years and months (plan P8): "3 years 4 months". */
export function formatDuration(totalMonths: number): string {
  const months = Math.max(0, Math.round(totalMonths));
  if (months < 24) return plural(months, "month", "months");
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return rest === 0
    ? plural(years, "year", "years")
    : `${plural(years, "year", "years")} ${plural(rest, "month", "months")}`;
}

export const formatYears = (years: number): string => plural(years, "year", "years");

const rateFormat = new Intl.NumberFormat("en-GB", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

/** A computed rate, to at most 1 decimal place like the rate slider (plan P8): "4%", "6.4%". */
export const formatRate = (rate: number): string => `${rateFormat.format(rate)}%`;
