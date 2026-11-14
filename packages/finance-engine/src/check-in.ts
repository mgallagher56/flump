import { projectAmortisedBalance } from "./mortgage.js";

/**
 * The monthly check-in's shared rules (R2-5): used by the web check-in, the backend's check of a
 * `calculated` value, and later the mobile app, so all three agree to the penny.
 */

/** "YYYY-MM". */
export type CheckInMonth = string;

/** Account types whose balance can be worked out from a rate and a regular payment. */
export const CALCULABLE_ACCOUNT_TYPES: readonly string[] = ["Mortgage", "Loan"];

const CHECK_IN_MONTH_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;

/** Whole months from `from` to `to` ("2026-09" to "2026-11" is 2), or NaN for a bad key. */
export function monthsBetween(from: CheckInMonth, to: CheckInMonth): number {
  const a = CHECK_IN_MONTH_RE.exec(from);
  const b = CHECK_IN_MONTH_RE.exec(to);
  if (!a || !b) return Number.NaN;
  return Number(b[1]) * 12 + Number(b[2]) - (Number(a[1]) * 12 + Number(a[2]));
}

export interface CalculatedBalanceInput {
  /** The stored account type, for example "Mortgage". */
  type: string | null | undefined;
  /** Yearly rate in percent. */
  interestRate: number | string | null | undefined;
  /** The regular monthly payment (the account's `monthlyContribution`). */
  monthlyPayment: number | string | null | undefined;
  /** The latest recorded figure before `month`, signed or not (the amount owed is used). */
  base: { value: number; month: CheckInMonth } | null;
  /** The month being checked in. */
  month: CheckInMonth;
}

export interface CalculatedBalance {
  /** The balance owed in `month`, as a positive amount rounded to the penny. */
  value: number;
  baseValue: number;
  baseMonth: CheckInMonth;
  interestRate: number;
  monthlyPayment: number;
}

const toNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

/**
 * The calculated balance for a loan or mortgage: the latest recorded figure, with one month of
 * interest and one regular payment for each month since (the engine's amortisation step). Null
 * when the type, the rate, the payment or a base figure is missing: the check-in never guesses.
 */
export function calculateCheckInBalance(input: CalculatedBalanceInput): CalculatedBalance | null {
  if (!CALCULABLE_ACCOUNT_TYPES.includes(String(input.type ?? ""))) return null;
  const rate = toNumber(input.interestRate);
  const payment = toNumber(input.monthlyPayment);
  if (rate === null || rate < 0 || payment === null || payment <= 0 || !input.base) return null;
  const months = monthsBetween(input.base.month, input.month);
  if (!Number.isFinite(months) || months < 1) return null;
  const baseValue = Math.abs(input.base.value);
  return {
    value: projectAmortisedBalance({
      balanceGbp: baseValue,
      interestRateApr: rate,
      monthlyPaymentGbp: payment,
      months,
    }),
    baseValue,
    baseMonth: input.base.month,
    interestRate: rate,
    monthlyPayment: payment,
  };
}
