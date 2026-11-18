/**
 * Savings interest in pounds over the next 12 months, before tax, split into ISA and non-ISA.
 *
 * Replaces a blended "average rate" (owner testing, 18 Nov 2026): one percentage across ISA and
 * non-ISA savings hides that ISA interest is tax-free while other interest may be taxed, which
 * depends on the person's other income (Personal Savings Allowance and the starting rate for
 * savings). Tax on savings interest is not estimated here, so every figure is before tax.
 */
import { calculateCompoundInterestEarned } from "./forecast.js";
import { isIsaAccount } from "./joint-share.js";

export interface SavingsInterestAccount {
  type?: string | null;
  name?: string | null;
  accountSubtype?: string | null;
  balance: number | string | null | undefined;
  /** AER in percent; null or undefined when not set. */
  interestRate?: number | string | null;
  monthlyContribution?: number | string | null;
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
 * compounding monthly with each account's regular monthly saving (the same basis as each
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
    const interest = calculateCompoundInterestEarned(
      Math.max(0, toNumber(account.balance) ?? 0),
      rate,
      Math.max(0, toNumber(account.monthlyContribution) ?? 0),
      12,
    );
    accountsCounted += 1;
    if (isIsaAccount(account)) isa += interest;
    else outsideIsa += interest;
  }
  if (accountsCounted === 0) return null;
  return { total: isa + outsideIsa, isa, outsideIsa, accountsCounted, accountsWithoutRate };
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
