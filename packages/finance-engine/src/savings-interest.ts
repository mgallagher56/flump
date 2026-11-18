/**
 * Savings interest in pounds over the next 12 months, before tax, split into ISA and non-ISA.
 *
 * Replaces a blended "average rate" (owner testing, 18 Nov 2026): one percentage across ISA and
 * non-ISA savings hides that ISA interest is tax-free while other interest may be taxed, which
 * depends on the person's other income (Personal Savings Allowance and the starting rate for
 * savings). Tax on savings interest is not estimated here, so every figure is before tax.
 */
import { type AccountOwnership, applyAccountShare, isIsaAccount } from "./joint-share.js";

/**
 * The monthly rate that compounds to the given AER over 12 months: (1 + AER/100)^(1/12) − 1,
 * as a fraction. 0 for a rate of 0 or less, or one that is not a number.
 */
export function monthlyRateFromAer(aerPct: number): number {
  if (!Number.isFinite(aerPct) || aerPct <= 0) return 0;
  return (1 + aerPct / 100) ** (1 / 12) - 1;
}

/**
 * Interest on one account over the next 12 months at its AER, before tax.
 *
 * The stored rate is an AER (annual equivalent rate), which already includes compounding, so the
 * monthly rate is r = (1 + AER/100)^(1/12) − 1: twelve months at r give exactly the AER. The
 * regular monthly saving is added at the end of each month. Interest is the end balance less
 * the starting balance and the 12 payments. A negative balance or saving counts as 0, and a rate
 * that is 0 or less, or not a number, gives 0.
 */
export function interestOverNext12MonthsAtAer(
  balance: number,
  aerPct: number,
  monthly: number,
): number {
  if (!Number.isFinite(aerPct) || aerPct <= 0) return 0;
  const start = Number.isFinite(balance) && balance > 0 ? balance : 0;
  const saving = Number.isFinite(monthly) && monthly > 0 ? monthly : 0;
  const r = monthlyRateFromAer(aerPct);
  let end = start;
  for (let month = 0; month < 12; month++) {
    end = end * (1 + r) + saving;
  }
  return Math.max(0, end - start - 12 * saving);
}

export interface SavingsInterestAccount {
  type?: string | null;
  name?: string | null;
  accountSubtype?: string | null;
  /**
   * The balance already at the user's share (for a joint account, their part of it, as
   * `PortfolioSnapshot` gives it in `nominalBalance`). It is not scaled again here.
   */
  balance: number | string | null | undefined;
  /** AER in percent; null or undefined when not set. */
  interestRate?: number | string | null;
  /**
   * The whole monthly saving into the account, as stored. The user's share of it is applied
   * here from `ownership` and `sharePercent`, so it is on the same basis as `balance`.
   */
  monthlyContribution?: number | string | null;
  ownership?: AccountOwnership | string | null;
  sharePercent?: number | string | null;
}

export interface SavingsInterestEstimate {
  /** Interest from all counted accounts over 12 months, before tax, in pounds. */
  total: number;
  /** The part from ISAs (tax-free). */
  isa: number;
  /** The part from savings outside an ISA (before tax). */
  outsideIsa: number;
  /** Savings accounts with a rate that were counted. */
  accountsCounted: number;
  /** Savings accounts left out because no rate is set: never counted as 0%. */
  accountsWithoutRate: number;
}

const toNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

/** Cash savings only: an Investment's return is not interest and can go down as well as up. */
const isCashSavings = (account: SavingsInterestAccount): boolean => account.type === "Saving";

/**
 * Interest over the next 12 months across the cash savings accounts that store a rate,
 * at each account's AER with its regular monthly saving (the same basis as each
 * account's own "interest over 12 months"). Null when no cash savings account has a rate.
 */
export function estimateSavingsInterestNext12Months(
  accounts: readonly SavingsInterestAccount[],
): SavingsInterestEstimate | null {
  let isa = 0;
  let outsideIsa = 0;
  let accountsCounted = 0;
  let accountsWithoutRate = 0;
  for (const account of accounts) {
    if (!isCashSavings(account)) continue;
    const rate = toNumber(account.interestRate);
    if (rate === null) {
      accountsWithoutRate += 1;
      continue;
    }
    const interest = interestOverNext12MonthsAtAer(
      toNumber(account.balance) ?? 0,
      rate,
      applyAccountShare(toNumber(account.monthlyContribution) ?? 0, account),
    );
    accountsCounted += 1;
    if (isIsaAccount(account)) isa += interest;
    else outsideIsa += interest;
  }
  if (accountsCounted === 0) return null;
  return { total: isa + outsideIsa, isa, outsideIsa, accountsCounted, accountsWithoutRate };
}

/**
 * The user's share of what goes into these accounts each month: each stored monthly saving
 * scaled by the account's share (a joint account counts at the user's part, a sole one in full).
 * Null when no account stores a monthly saving, so "not set" is never shown as £0.
 */
export function totalMonthlySavingAtShare(
  accounts: readonly SavingsInterestAccount[],
): number | null {
  let total = 0;
  let stored = 0;
  for (const account of accounts) {
    const monthly = toNumber(account.monthlyContribution);
    if (monthly === null) continue;
    stored += 1;
    total += applyAccountShare(monthly, account);
  }
  return stored === 0 ? null : total;
}

/**
 * Rate weighted by balance over the accounts that store one (a simple mean when those balances
 * are all 0), or null when none does. Used only to seed a what-if forecast, never as a headline.
 */
export function balanceWeightedRate(accounts: readonly SavingsInterestAccount[]): number | null {
  const rated = accounts
    .map((a) => ({
      rate: toNumber(a.interestRate),
      balance: Math.max(0, toNumber(a.balance) ?? 0),
    }))
    .filter((a): a is { rate: number; balance: number } => a.rate !== null);
  if (rated.length === 0) return null;
  const totalBalance = rated.reduce((sum, a) => sum + a.balance, 0);
  if (totalBalance > 0) {
    return rated.reduce((sum, a) => sum + a.balance * a.rate, 0) / totalBalance;
  }
  return rated.reduce((sum, a) => sum + a.rate, 0) / rated.length;
}
