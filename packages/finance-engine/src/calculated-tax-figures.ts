/**
 * "Calculated" figures the Self Assessment page offers for the user to confirm into a tax record
 * (owner decision 5, audit slice 7), and the buy-to-let yield the Mortgage page shows. Each is an
 * estimate; the user stays in charge of what goes on their return.
 */
import { monthlyRateFromAer } from "./savings-interest.js";
import { getMonthsForTaxYear } from "./tax-calculator.js";

/** One recorded month of an account's balance (account history, Europe/London month). */
export interface MonthlyBalance {
  year: number;
  /** 1 to 12. */
  month: number;
  /** As stored: a liability is negative. Only the size is used. */
  value: number | string;
}

export interface CalculatedTaxFigure {
  /** Pounds, to the penny. */
  amount: number;
  /** Months of the tax year counted: months before the first recorded balance are left out. */
  monthsCounted: number;
}

const monthKey = (year: number, month: number) => year * 12 + (month - 1);
const roundPence = (value: number) => Math.round(value * 100) / 100;

/**
 * The balance used for each month of the tax year: that month's record, else the latest earlier
 * record (a skipped check-in, or a month still to come). null before the first record: the
 * account was not held, or not yet recorded, so the month is not counted.
 */
function balancesForTaxYear(
  taxYear: string,
  balances: readonly MonthlyBalance[],
): (number | null)[] {
  const recorded = balances
    .map((b) => ({ key: monthKey(b.year, b.month), value: Math.abs(Number(b.value)) }))
    .filter((b) => Number.isFinite(b.value))
    .sort((a, b) => a.key - b.key);
  return getMonthsForTaxYear(taxYear).map((yyyymm) => {
    const key = monthKey(Number(yyyymm.slice(0, 4)), Number(yyyymm.slice(5, 7)));
    let latest: number | null = null;
    for (const b of recorded) {
      if (b.key > key) break;
      latest = b.value;
    }
    return latest;
  });
}

function sumInterest(monthly: (number | null)[], monthlyRate: number): CalculatedTaxFigure | null {
  const held = monthly.filter((b): b is number => b !== null);
  if (held.length === 0) return null;
  const amount = held.reduce((total, balance) => total + balance * monthlyRate, 0);
  return { amount: roundPence(amount), monthsCounted: held.length };
}

/**
 * Mortgage interest for one tax year: each month's recorded balance x the yearly rate / 12, the
 * monthly rule the check-in's calculated balance uses (mortgage.ts `amortiseOneMonth`). Only the
 * interest counts, never capital repaid (ITTOIA 2005 s.272B(5)). The whole loan's interest: the
 * engine applies the person's share of the loan. null with no rate or no recorded balance.
 *
 * Limits the page states: it is an estimate; borrowing used for anything other than the let
 * property does not count (s.272B(2)), which a balance cannot show; a rate change during the year
 * is not seen, as only the account's current rate is stored.
 */
export function calculatedMortgageInterest(input: {
  taxYear: string;
  ratePct: number | string | null | undefined;
  balances: readonly MonthlyBalance[];
}): CalculatedTaxFigure | null {
  const rate = Number(input.ratePct);
  if (input.ratePct === null || input.ratePct === undefined || !Number.isFinite(rate) || rate < 0) {
    return null;
  }
  return sumInterest(balancesForTaxYear(input.taxYear, input.balances), rate / 100 / 12);
}

/**
 * Taxable savings interest for one tax year on one account: each month's balance x the monthly
 * rate that compounds to the AER (`monthlyRateFromAer`), at the person's share of the account.
 * ISA interest is tax-free, so callers do not offer this for ISAs. Interest is taxed in the year
 * it is paid or credited (ITTOIA 2005 s.370; HMRC SAIM2440), so an account that pays once a year
 * can be taxed in a different year from this estimate. null with no rate or no balance.
 */
export function calculatedSavingsInterest(input: {
  taxYear: string;
  aerPct: number | string | null | undefined;
  balances: readonly MonthlyBalance[];
  /** The person's share of the account, 0 to 100. */
  sharePercent: number;
}): CalculatedTaxFigure | null {
  const aer = Number(input.aerPct);
  if (input.aerPct === null || input.aerPct === undefined || !Number.isFinite(aer) || aer < 0) {
    return null;
  }
  const share = Math.min(100, Math.max(0, input.sharePercent)) / 100;
  return sumInterest(
    balancesForTaxYear(input.taxYear, input.balances),
    monthlyRateFromAer(aer) * share,
  );
}

/**
 * Gross rental yield, in per cent: the rent recorded for the year (the whole property's, before
 * any share) over the property's value. null when either is missing or 0.
 */
export function grossRentalYieldPct(input: {
  rentForYear: number;
  propertyValue: number;
}): number | null {
  const value = Math.abs(input.propertyValue);
  if (!(input.rentForYear > 0) || !(value > 0)) return null;
  return (input.rentForYear / value) * 100;
}
