import { categorizeAccountType, isLiabilityCategory } from "./account-category.js";
import { countsTowardNetWorth, type NetWorthBasis } from "./net-worth-basis.js";
import type { RawAccount } from "./portfolio.js";

/**
 * Monthly snapshot selectors (E30). Pure read-time functions over `account_details` rows:
 *
 * - Carry-forward is computed here, never stored: a month with no row for an account shows the
 *   account's last known value, flagged `carried`.
 * - Every change is **current minus previous**, whether the figure went up or down. Wording is
 *   the caller's job and must be the same in both directions (advice policy R1).
 * - Assets keep their real sign, liabilities (cards, loans, mortgages and, when the basis counts
 *   them, student loans) count as the absolute value, and accounts the net worth basis leaves out
 *   are excluded, matching `PortfolioSnapshot.getMonthlyHistory`.
 */

export interface SnapshotRow {
  accountId: string;
  year: number;
  month: number;
  value: number | string;
}

export type SnapshotAccount = Pick<RawAccount, "id" | "type">;

export interface SnapshotAccountValue {
  accountId: string;
  /**
   * The recorded value (or the last known value when `carried`). Assets keep their real sign;
   * liabilities are the amount owed as a positive number whatever sign was stored, so a change
   * is always "current minus previous" of what the figure shows.
   */
  value: number;
  isLiability: boolean;
  /** True when no row exists for this month and the value comes from an earlier month. */
  carried: boolean;
}

export interface NetWorthPoint {
  /** "YYYY-MM". */
  month: string;
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  accounts: SnapshotAccountValue[];
  /**
   * Accounts whose first recorded value is this month. Their whole value enters the series here,
   * so a change in this month is partly a new account, not growth; callers wording a delta
   * should account for it.
   */
  addedAccountIds: string[];
  /** No account has a recorded row this month: every figure is carried forward. */
  allCarried: boolean;
}

export interface MonthDelta {
  month: string;
  previousMonth: string;
  /** current minus previous. */
  netWorthChange: number;
  assetsChange: number;
  liabilitiesChange: number;
}

export interface AccountDelta {
  accountId: string;
  /** current minus previous of the amount shown (a falling mortgage balance is negative). */
  change: number;
  current: number;
  previous: number;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

function key(year: number, month: number): number {
  return year * 12 + (month - 1);
}

export function snapshotMonthLabel(index: number): string {
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;
  return `${year}-${String(month).padStart(2, "0")}`;
}

function parseMonth(value: string): number | null {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(value);
  return match ? key(Number(match[1]), Number(match[2])) : null;
}

export interface SelectNetWorthSeriesOptions {
  /** "YYYY-MM": extend the series to this month (usually the current month). */
  through?: string;
  /**
   * Saved current balances (`account.balance`) by account id. In the `through` month, every
   * counted account without a row that month shows its saved balance instead of a carried value,
   * including accounts with no history, so the last point equals the picture's net worth. The
   * month's `allCarried` still says whether any row was recorded. Ignored when `through` is not
   * after the last recorded month or unset.
   */
  currentBalances?: ReadonlyMap<string, number>;
}

function isNetWorthLiability(category: ReturnType<typeof categorizeAccountType>): boolean {
  return isLiabilityCategory(category) || category === "studentLoans";
}

/**
 * Net worth under the basis for every month from the first recorded month to `through`
 * (default: the last recorded month, so asking for the current month extends the series).
 * Duplicate rows for one account and month: the last one in the input wins. Rows with an invalid
 * year, month or value are skipped; accounts not in `accounts` or left out by the basis are
 * ignored.
 */
export function selectNetWorthSeries(
  accounts: readonly SnapshotAccount[],
  rows: readonly SnapshotRow[],
  basis: NetWorthBasis,
  options: SelectNetWorthSeriesOptions = {},
): NetWorthPoint[] {
  const types = new Map<string, string>();
  for (const a of accounts) {
    if (!a.id) continue;
    const type = String(a.type ?? "other");
    if (countsTowardNetWorth(categorizeAccountType(type), basis)) types.set(String(a.id), type);
  }

  // account -> month index -> value
  const byAccount = new Map<string, Map<number, number>>();
  let first = Number.POSITIVE_INFINITY;
  let last = Number.NEGATIVE_INFINITY;
  for (const r of rows) {
    const id = String(r.accountId ?? "");
    if (!types.has(id)) continue;
    const year = Number(r.year);
    const month = Number(r.month);
    const value = Number(r.value);
    if (!Number.isInteger(year) || year < 1900 || year > 2200) continue;
    if (!Number.isInteger(month) || month < 1 || month > 12) continue;
    if (r.value === null || r.value === undefined || r.value === "" || !Number.isFinite(value)) {
      continue;
    }
    const idx = key(year, month);
    const m = byAccount.get(id) ?? new Map<number, number>();
    m.set(idx, value);
    byAccount.set(id, m);
    if (idx < first) first = idx;
    if (idx > last) last = idx;
  }
  if (!Number.isFinite(first)) return [];

  const through = options.through === undefined ? null : parseMonth(options.through);
  const end = through !== null && through > last ? through : last;
  const balancesAt = through !== null && through >= last ? through : null;

  const idSet = new Set(byAccount.keys());
  const current = new Map<string, number>();
  if (balancesAt !== null && options.currentBalances) {
    for (const [rawId, balance] of options.currentBalances) {
      const id = String(rawId);
      if (!types.has(id) || !Number.isFinite(balance)) continue;
      current.set(id, balance);
      idSet.add(id);
    }
  }
  const ids = [...idSet].sort();
  const points: NetWorthPoint[] = [];
  const known = new Map<string, number>();
  for (let idx = first; idx <= end; idx++) {
    let assets = 0;
    let liabilities = 0;
    let anyRecorded = false;
    const values: SnapshotAccountValue[] = [];
    const added: string[] = [];
    for (const id of ids) {
      const recorded = byAccount.get(id)?.get(idx);
      if (recorded !== undefined) {
        if (!known.has(id)) added.push(id);
        known.set(id, recorded);
        anyRecorded = true;
      } else if (idx === balancesAt && current.has(id)) {
        if (!known.has(id)) added.push(id);
        known.set(id, current.get(id)!);
      }
      const value = known.get(id);
      if (value === undefined) continue;
      const liability = isNetWorthLiability(categorizeAccountType(types.get(id)));
      values.push({
        accountId: id,
        value: liability ? Math.abs(value) : value,
        isLiability: liability,
        carried: recorded === undefined,
      });
      if (liability) {
        liabilities += Math.abs(value);
      } else if (value >= 0) {
        assets += value;
      } else {
        liabilities += -value;
      }
    }
    points.push({
      month: snapshotMonthLabel(idx),
      netWorth: round2(assets - liabilities),
      totalAssets: round2(assets),
      totalLiabilities: round2(liabilities),
      accounts: values,
      addedAccountIds: idx === first ? [] : added,
      allCarried: !anyRecorded,
    });
  }
  return points;
}

/** Month-on-month change for each consecutive pair of points: current minus previous. */
export function selectMonthDeltas(series: readonly NetWorthPoint[]): MonthDelta[] {
  const deltas: MonthDelta[] = [];
  for (let i = 1; i < series.length; i++) {
    const prev = series[i - 1]!;
    const cur = series[i]!;
    deltas.push({
      month: cur.month,
      previousMonth: prev.month,
      netWorthChange: round2(cur.netWorth - prev.netWorth),
      assetsChange: round2(cur.totalAssets - prev.totalAssets),
      liabilitiesChange: round2(cur.totalLiabilities - prev.totalLiabilities),
    });
  }
  return deltas;
}

/** Per-account change between two points (current minus previous), for accounts in both. */
export function selectAccountDeltas(
  previous: NetWorthPoint,
  current: NetWorthPoint,
): AccountDelta[] {
  const before = new Map(previous.accounts.map((a) => [a.accountId, a.value]));
  const out: AccountDelta[] = [];
  for (const a of current.accounts) {
    const prev = before.get(a.accountId);
    if (prev === undefined) continue;
    out.push({
      accountId: a.accountId,
      change: round2(a.value - prev),
      current: a.value,
      previous: prev,
    });
  }
  return out;
}
