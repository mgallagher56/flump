/**
 * The return an investment account actually made, estimated from the balances the person recorded
 * each month (owner item 10b). For accounts with no fixed rate: Stocks and Shares ISAs and general
 * investment accounts.
 *
 * ## Method: time-weighted, Modified Dietz per month
 *
 * Growth in a month is the change in balance less the money paid in. Each pair of consecutive
 * recorded months gives one monthly return by the Modified Dietz method, with the month's payment
 * assumed to arrive half way through the month (weight 0.5):
 *
 *     r = (end - start - paidIn) / (start + 0.5 * paidIn)
 *
 * Monthly returns are then chained geometrically: (1 + r1) * (1 + r2) * ... - 1. This is the
 * time-weighted return. It removes the effect of how much was paid in and when, so a large payment
 * just before a fall does not make the account look worse than the investments did, and a big
 * starting balance does not swamp later months. That is what "average interest" means to a
 * person: how the money in the account grew, whatever they added.
 *
 * ## Money paid in
 *
 * The monthly balance history does not record what was paid in each month. The caller passes the
 * account's regular monthly contribution setting, and it is assumed paid in every month measured.
 * A missing setting counts as nothing paid in.
 *
 * ## Gaps
 *
 * A return is worked out only between two months that are next to each other in the calendar.
 * Where a month is missing, the pair across the gap is skipped: no balance is invented and no
 * payments are assumed for months the person did not record. Chaining the measured months still
 * gives a time-weighted figure over the time measured. A pair whose starting value is zero or less
 * (start + 0.5 * paidIn <= 0) has no meaningful return and is skipped in the same way.
 *
 * ## Years and overall
 *
 * Each monthly return belongs to the calendar year of its later month (the December-to-January
 * return is January's, so it counts in the new year). A year's figure chains its months and is
 * not annualised: a year with 5 measured months gives the return over those 5 months, and says so
 * through `months`. Calendar years are used because they match the month ticks on the account
 * chart and how people talk about "each year".
 *
 * The overall figure chains every measured month. With 12 or more measured months it is
 * annualised, (1 + total) ^ (12 / months) - 1; with fewer it is the return over the months
 * measured and is not annualised, because stretching a few months into a yearly rate overstates
 * what is known.
 *
 * ## Minimum
 *
 * At least `MIN_RECORDED_RETURN_MONTHS` (3) months in a row are needed, which is two monthly
 * returns. Below that the result is `{ status: "not-enough-history" }`.
 *
 * Negative returns are returned as negative numbers. Returns are fractions (0.01 is 1%), unrounded.
 * Pure: no clock, no formatting.
 */

/** One recorded month's balance. `month` is 1 to 12. */
export interface RecordedBalance {
  year: number;
  month: number;
  value: number;
}

export interface RecordedReturnInput {
  /** Recorded months in any order. A month given twice keeps the last one given. */
  balances: readonly RecordedBalance[];
  /** The account's regular monthly contribution setting, assumed paid in every month. */
  monthlyContribution?: number | null;
}

/** One calendar year's return over the months measured in it. */
export interface RecordedYearReturn {
  year: number;
  /** Monthly returns measured in the year (1 to 12). */
  months: number;
  /** Chained return over those months, not annualised (0.01 is 1%). */
  return: number;
}

export type RecordedReturnResult =
  | { status: "not-enough-history"; minimumMonths: number }
  | {
      status: "ok";
      /** Oldest first. */
      years: RecordedYearReturn[];
      overall: {
        /** Monthly returns measured in all. */
        months: number;
        /** True when `return` is a yearly rate (12 or more months measured). */
        annualised: boolean;
        /** Annualised rate, or the return over `months` when fewer than 12. */
        return: number;
      };
      /** The monthly payment assumed in every month measured. */
      monthlyContribution: number;
    };

/** Fewest months in a row of balances for an estimate: two monthly returns. */
export const MIN_RECORDED_RETURN_MONTHS = 3;

/** Months measured before the overall figure is given as a yearly rate. */
const ANNUALISE_FROM_MONTHS = 12;

const MID_MONTH_WEIGHT = 0.5;

const monthIndex = (b: { year: number; month: number }): number => b.year * 12 + (b.month - 1);

/** The Modified Dietz return for one month, or null when the starting value is not positive. */
export function modifiedDietzMonth(start: number, end: number, paidIn: number): number | null {
  const base = start + MID_MONTH_WEIGHT * paidIn;
  if (!(base > 0)) return null;
  return (end - start - paidIn) / base;
}

const chain = (returns: readonly number[]): number =>
  returns.reduce((growth, r) => growth * (1 + r), 1) - 1;

export function estimateRecordedReturn(input: RecordedReturnInput): RecordedReturnResult {
  const paidIn =
    typeof input.monthlyContribution === "number" && Number.isFinite(input.monthlyContribution)
      ? Math.max(0, input.monthlyContribution)
      : 0;

  const byMonth = new Map<number, RecordedBalance>();
  for (const b of input.balances) {
    if (
      !Number.isInteger(b.year) ||
      !Number.isInteger(b.month) ||
      b.month < 1 ||
      b.month > 12 ||
      !Number.isFinite(b.value)
    ) {
      continue;
    }
    byMonth.set(monthIndex(b), b);
  }
  const ordered = [...byMonth.entries()].sort(([a], [b]) => a - b);

  const monthly: { year: number; r: number }[] = [];
  let run = 1;
  let longestRun = ordered.length > 0 ? 1 : 0;
  for (let i = 1; i < ordered.length; i++) {
    const [prevKey, prev] = ordered[i - 1] as [number, RecordedBalance];
    const [key, cur] = ordered[i] as [number, RecordedBalance];
    const r = key - prevKey === 1 ? modifiedDietzMonth(prev.value, cur.value, paidIn) : null;
    if (r === null) {
      run = 1;
      continue;
    }
    monthly.push({ year: cur.year, r });
    run += 1;
    longestRun = Math.max(longestRun, run);
  }

  if (longestRun < MIN_RECORDED_RETURN_MONTHS) {
    return { status: "not-enough-history", minimumMonths: MIN_RECORDED_RETURN_MONTHS };
  }

  const yearMap = new Map<number, number[]>();
  for (const { year, r } of monthly) {
    const list = yearMap.get(year) ?? [];
    list.push(r);
    yearMap.set(year, list);
  }
  const years = [...yearMap.entries()]
    .sort(([a], [b]) => a - b)
    .map(([year, rs]) => ({ year, months: rs.length, return: chain(rs) }));

  const months = monthly.length;
  const total = chain(monthly.map((m) => m.r));
  const annualised = months >= ANNUALISE_FROM_MONTHS;
  return {
    status: "ok",
    years,
    overall: {
      months,
      annualised,
      return: annualised ? Math.max(0, 1 + total) ** (ANNUALISE_FROM_MONTHS / months) - 1 : total,
    },
    monthlyContribution: paidIn,
  };
}
