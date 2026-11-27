import { categorizeAccountType } from "./account-category.js";
import { type AccountOwnership, type AccountShareInput, applyAccountShare } from "./joint-share.js";
import type { NetWorthLeftOut } from "./net-worth-basis.js";

/**
 * One account's figures as the accounts list, the account page and its chart show them (E12 S6).
 * Web and the mobile app both read them from here, so neither works the figures out itself. The
 * words around them ("Up £300 since", "Joint, 50%") stay with each app.
 *
 * Pure and clock-free: the current month comes in as a "YYYY-MM" key (the Europe/London month).
 * The inputs are loose plain objects, as the apps parse them from the API: numbers may arrive as
 * strings, and a recorded month's account id as `accountId` or `account_id`.
 */

/** The stored types shown as an amount owed: they are stored as minus the amount owed. */
export const OWED_ACCOUNT_TYPES: readonly string[] = [
  "Mortgage",
  "Loan",
  "Credit Card",
  "Overdraft",
  "Student Loan",
];

/**
 * Mortgages, loans, credit cards, overdrafts and student loans are shown as amounts owed. (A
 * student loan is still left out of net worth by default; that is `countsTowardNetWorth`.)
 */
export function isOwedAccountType(type?: string | null): boolean {
  return OWED_ACCOUNT_TYPES.includes(type ?? "");
}

/** A balance as shown: an amount owed is positive; anything else is unchanged. */
export function toShownBalance<T extends number | undefined>(
  type: string | null | undefined,
  balance: T,
): T {
  return balance !== undefined && isOwedAccountType(type) ? (Math.abs(balance) as T) : balance;
}

/** The account as the apps hold it. */
export interface AccountBalanceAccount {
  id?: string | null;
  name?: string | null;
  type?: string | null;
  accountSubtype?: string | null;
  balance?: number | string | null;
  ownership?: AccountOwnership | string | null;
  sharePercent?: number | string | null;
}

/** One recorded month of an account's balance. */
export interface AccountMonthRow {
  accountId?: string | null;
  account_id?: string | null;
  year?: number | string | null;
  month?: number | string | null;
  value?: number | string | null;
  source?: string | null;
}

/** The account page's hero: its figure, the month that figure is from, and the earliest month. */
export interface AccountHeroFigure {
  /** The figure shown: the shown balance, or the latest month up to now after a future-month row. */
  balance: number;
  /**
   * The same figure for the whole account, before any joint share (owner decision 9 A: the account's
   * own page says the whole beside the share). Equal to `balance` for an account held alone.
   */
  whole: number;
  /** The latest recorded month up to now, which dates the figure; null with no history. */
  month: { month: number; year: number; source?: string | null } | null;
  /** The earliest recorded month up to now, as shown, when it is not also the latest; else null. */
  earliest: { value: number; month: number; year: number } | null;
}

export interface AccountBalance {
  /** The user's share of the balance, an amount owed as positive. Undefined when none is known. */
  balance: number | undefined;
  /** Whole-number change against `previousMonth`, or null with no earlier month (or one of 0). */
  changePercent: number | null;
  /** True when the change is good news (what you own up, what you owe down) or there is none. */
  favourable: boolean;
  /** "YYYY-MM": the latest recorded month not in the future, or null. */
  latestMonth: string | null;
  /** "YYYY-MM": the latest recorded month before the current one, which the change is against. */
  previousMonth: string | null;
  /** The account page's hero. */
  hero: AccountHeroFigure;
}

/**
 * A recorded month with a month and year given as a string read as a number. A missing or null
 * one stays as it is: the comparisons below treat it as web always has (null compares as 0).
 */
interface MonthRow {
  accountId: string | null | undefined;
  month: number | null | undefined;
  year: number | null | undefined;
  value: number | string | null | undefined;
  source: string | null | undefined;
}

const fromString = (value: number | string | null | undefined): number | null | undefined =>
  typeof value === "string" ? Number(value) : value;

const toMonthRow = (detail: AccountMonthRow): MonthRow => ({
  accountId: detail.account_id || detail.accountId,
  month: fromString(detail.month),
  year: fromString(detail.year),
  value: detail.value,
  source: detail.source,
});

const byMonth = (a: MonthRow, b: MonthRow): number =>
  a.year === b.year ? (a.month ?? 0) - (b.month ?? 0) : (a.year ?? 0) - (b.year ?? 0);

const monthKey = (month: number, year: number): string =>
  `${year}-${String(month).padStart(2, "0")}`;

const keyOf = (row: MonthRow | undefined): string | null =>
  row?.month && row.year ? monthKey(row.month, row.year) : null;

const parseMonth = (currentMonth: string): { cy: number; cm: number } => ({
  cy: Number(currentMonth.slice(0, 4)),
  cm: Number(currentMonth.slice(5, 7)),
});

/**
 * The account page's hero (defect C(e)): after a future-dated import the saved balance holds the
 * import's figure, so the hero shows the latest month up to now instead, keeping the figure and its
 * date line on one month. It reads every row given, so pass this account's rows only.
 */
function heroFigure(
  type: string | null | undefined,
  shareInput: AccountShareInput,
  details: readonly AccountMonthRow[],
  shownBalance: number | undefined,
  shownWhole: number | undefined,
  cy: number,
  cm: number,
): AccountHeroFigure {
  const months = details.map((d) => ({
    month: Number(d.month),
    year: Number(d.year),
    value: d.value !== undefined && d.value !== null ? Number(d.value) : undefined,
    source: d.source,
  }));
  const dated = months.filter((d) => d.month >= 1 && d.year > 0);
  const hasFuture = dated.some((d) => d.year > cy || (d.year === cy && d.month > cm));
  const history = dated
    .filter((d) => d.year < cy || (d.year === cy && d.month <= cm))
    .sort((a, b) => a.year - b.year || a.month - b.month);
  const latest = history.at(-1);
  const first = history[0];
  const earliest =
    first?.value !== undefined &&
    latest &&
    (first.year !== latest.year || first.month !== latest.month)
      ? { value: toShownBalance(type, first.value), month: first.month, year: first.year }
      : null;
  const fromLatest = hasFuture && latest?.value !== undefined;
  const balance = fromLatest
    ? toShownBalance(type, applyAccountShare(latest.value as number, shareInput))
    : (shownBalance ?? 0);
  const whole = fromLatest ? toShownBalance(type, latest.value as number) : (shownWhole ?? 0);
  return {
    balance,
    whole,
    month: latest ? { month: latest.month, year: latest.year, source: latest.source } : null,
    earliest,
  };
}

/**
 * One account's figures (D22): the saved balance is the current balance. Recorded months are
 * history: they never replace the saved balance, and the latest one not in the future is used only
 * when no balance is saved. A joint account counts the user's share (`applyAccountShare`). The
 * change is against the latest recorded month before `currentMonth`.
 *
 * `detailsAreThisAccounts`: the caller passes only this account's recorded months (the account
 * page), so a row without an account id belongs to it. Otherwise a row without an id matches no
 * account, so one stray row never counts for every account.
 */
export function selectAccountBalance(
  account: AccountBalanceAccount,
  details: readonly AccountMonthRow[],
  currentMonth: string,
  options: { detailsAreThisAccounts?: boolean } = {},
): AccountBalance {
  const id = account.id ?? "";
  const type = account.type;
  const { cy, cm } = parseMonth(currentMonth);
  const history = details
    .map(toMonthRow)
    .filter((row) =>
      row.accountId ? !id || row.accountId === id : options.detailsAreThisAccounts === true,
    )
    // Not in the future. The casts keep JavaScript's comparison of a missing month or year.
    .filter(
      (row) => !((row.year as number) > cy || (row.year === cy && (row.month as number) > cm)),
    )
    .sort(byMonth);
  const latest = history.at(-1);
  const previous = history
    .filter((row) => (row.year as number) < cy || (row.year === cy && (row.month as number) < cm))
    .pop();

  const stored =
    account.balance !== undefined && account.balance !== null && account.balance !== ""
      ? Number(account.balance)
      : undefined;
  const rawUnscaled = stored ?? (latest?.value !== undefined ? Number(latest.value) : undefined);
  const shareInput = {
    name: account.name,
    type: account.type,
    accountSubtype: account.accountSubtype,
    ownership: account.ownership,
    sharePercent: account.sharePercent,
  };
  const balance =
    rawUnscaled !== undefined
      ? toShownBalance(type, applyAccountShare(rawUnscaled, shareInput))
      : undefined;
  const previousBalance =
    previous?.value !== undefined
      ? toShownBalance(type, applyAccountShare(Number(previous.value), shareInput))
      : undefined;

  // No earlier month, or one of 0, gives no percentage; no change is never bad news.
  let changePercent: number | null = null;
  let favourable = true;
  if (balance !== undefined && previousBalance) {
    changePercent = Math.round(((balance - previousBalance) / previousBalance) * 100);
    if (changePercent !== 0) {
      const isUp = balance >= previousBalance;
      favourable = isOwedAccountType(type) ? !isUp : isUp;
    }
  }

  return {
    balance,
    changePercent,
    favourable,
    latestMonth: keyOf(latest),
    previousMonth: keyOf(previous),
    hero: heroFigure(
      type,
      shareInput,
      details,
      balance,
      rawUnscaled !== undefined ? toShownBalance(type, rawUnscaled) : undefined,
      cy,
      cm,
    ),
  };
}

/** One month on the account chart, oldest first. */
export interface AccountSeriesPoint {
  month: number;
  year: number;
  /** The balance as shown: an amount owed is positive. The whole balance, not a joint share. */
  value: number;
  /** How a recorded figure was given ("calculated", "confirmed", or typed). */
  source?: string | null;
  /** This month's saved balance, not recorded yet: the dashed end of the line. */
  carried?: true;
}

/**
 * The account chart's months: recorded months up to `currentMonth`, oldest first. With this month
 * not recorded yet, the saved balance (D22) is this month's point, marked carried. The values are
 * whole balances: no joint share is applied (as web has always drawn it).
 */
export function selectAccountBalanceSeries(
  account: Pick<AccountBalanceAccount, "type" | "balance">,
  details: readonly AccountMonthRow[],
  currentMonth: string,
): AccountSeriesPoint[] {
  const { cy, cm } = parseMonth(currentMonth);
  const type = account.type ?? undefined;
  const past = details
    .map((d) => ({
      month: Number(d.month),
      year: Number(d.year),
      value: toShownBalance(type, Number(d.value)),
      source: d.source,
    }))
    .filter((d) => !(d.year > cy || (d.year === cy && d.month > cm)))
    .sort((a, b) => (a.year !== b.year ? a.year - b.year : a.month - b.month));
  const hasCurrent = past.some((d) => d.year === cy && d.month === cm);
  const saved = account.balance;
  if (hasCurrent || saved === undefined || saved === null || past.length === 0) return past;
  return [
    ...past,
    { month: cm, year: cy, value: toShownBalance(type, Number(saved)), carried: true },
  ];
}

/**
 * The change from the first point to the last in whole pounds, so a few pence never reads as a
 * change. Null without two points. Never -0.
 */
export function selectSeriesChange(points: readonly { value: number }[]): number | null {
  const first = points[0];
  const last = points.at(-1);
  if (!first || !last || points.length < 2) return null;
  return Math.round(last.value - first.value) || 0;
}

/**
 * An account's change as its effect on net worth: the same as the change for what you own, the
 * sign flipped for a debt (a debt that falls raises net worth). Never -0.
 */
export function selectAccountChangeEffect(change: number, isLiability: boolean): number {
  return (isLiability ? -change : change) || 0;
}

/** Row order inside each accounts list group: by type. Unknown types sort last. */
export const ACCOUNT_TYPE_ORDER: readonly string[] = [
  "Current",
  "Saving",
  "Investment",
  "Pension",
  "Property",
  "Owed",
  "Mortgage",
  "Credit Card",
  "Loan",
  "Overdraft",
  "Student Loan",
];

/** True when the user's net worth choices leave an account of this type out. */
export function isLeftOutOfNetWorth(
  type: string | null | undefined,
  leftOut: readonly NetWorthLeftOut[],
): boolean {
  const category = categorizeAccountType(type);
  if (category === "property") return leftOut.includes("property");
  if (category === "mortgages") return leftOut.includes("mortgage");
  if (category === "studentLoans") return leftOut.includes("studentLoan");
  return false;
}

export interface AccountGroups<T> {
  /** What you own, counted in net worth. */
  own: T[];
  /** What you owe, counted in net worth, with an overdrawn account as the positive amount owed. */
  owe: T[];
  /** What the user's net worth choices leave out. */
  notCounted: T[];
}

const typeRank = (type: string | null | undefined): number => {
  const index = ACCOUNT_TYPE_ORDER.indexOf(type ?? "");
  return index === -1 ? ACCOUNT_TYPE_ORDER.length : index;
};

/**
 * The accounts list's groups, each in type order (stable, so rows of one type keep their order).
 * The engine counts an overdrawn account (one that is not a debt, below zero) as money owed, not as
 * a negative asset, so it sits under what you owe as the amount owed and each total adds up.
 * `rows` carry shown balances (`selectAccountBalance`).
 */
export function selectAccountGroups<T extends { type?: string | null; balance?: number | null }>(
  rows: readonly T[],
  leftOut: readonly NetWorthLeftOut[],
): AccountGroups<T> {
  const byType = (a: T, b: T) => typeRank(a.type) - typeRank(b.type);
  const counted = rows.filter((row) => !isLeftOutOfNetWorth(row.type, leftOut));
  const overdrawn = (row: T) => !isOwedAccountType(row.type) && (row.balance ?? 0) < 0;
  return {
    own: counted.filter((row) => !isOwedAccountType(row.type) && !overdrawn(row)).sort(byType),
    owe: counted
      .filter((row) => isOwedAccountType(row.type) || overdrawn(row))
      .map((row) => (overdrawn(row) ? { ...row, balance: Math.abs(row.balance ?? 0) } : row))
      .sort(byType),
    notCounted: rows.filter((row) => isLeftOutOfNetWorth(row.type, leftOut)).sort(byType),
  };
}
