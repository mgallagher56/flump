import {
  type AccountDetailInput,
  addCheckInMonths,
  compareCheckInMonths,
  isCheckInMonth,
  type NetWorthBasis,
  type NetWorthPoint,
  type SnapshotAccountInput,
  selectAccountDeltas,
  selectMonthDeltas,
  selectSavedNetWorthSeries,
  toSnapshotRows,
} from "@flump/finance-engine";
import { formatMonthTick } from "@repo/ui";

/**
 * Monthly snapshots (E30 PR2): the pure model behind the check-in sheet and the history page.
 * Everything here is saved data. Nothing is a scenario, and nothing writes until the user saves.
 * The check-in's pure rules (month keys, the list form's rows and payload) live in
 * `@flump/finance-engine` for the mobile app; they are re-exported here.
 */

export {
  type AccountDetailInput,
  buildCheckInRows,
  buildSnapshotPayload,
  type CheckInRow,
  type CheckInStatus,
  type SnapshotAccountInput,
  type SnapshotPayload,
  toSnapshotRows,
} from "@flump/finance-engine";

/** "YYYY-MM". */
export type MonthKey = string;

const MONTH_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;

export const isMonthKey: (value: unknown) => value is MonthKey = isCheckInMonth;

/** The Europe/London calendar month of `now`, matching the backend's month key (E30 D3). */
export function londonMonth(now: Date = new Date()): MonthKey {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  const year = parts.find((p) => p.type === "year")?.value ?? "1970";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  return `${year}-${month}`;
}

export const addMonths: (month: MonthKey, n: number) => MonthKey = addCheckInMonths;

export const compareMonths: (a: MonthKey, b: MonthKey) => number = compareCheckInMonths;

/** "November 2026". */
export function formatMonth(month: MonthKey): string {
  const m = MONTH_RE.exec(month);
  if (!m) return month;
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 1)));
}

/** "Nov 26" and "Sep 26" (never "Sept"), for chart axes (copy audit 4.3). */
export function formatMonthShort(month: MonthKey): string {
  if (!MONTH_RE.test(month)) return month;
  return formatMonthTick(month, "2-digit");
}

/**
 * The next check-in date: the 1st of the month after `current`. Reminder days arrive with PR3; until
 * then the next check-in is simply the start of next month.
 */
export function nextCheckInDate(current: MonthKey): string {
  const next = addMonths(current, 1);
  const m = MONTH_RE.exec(next);
  if (!m) return next;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 1)));
}

/** History length decides what the page can show (E30 PR2 empty states). */
export type HistoryStage = "none" | "single" | "pair" | "trend";

export interface AccountChange {
  accountId: string;
  name: string;
  isLiability: boolean;
  current: number;
  previous: number;
  change: number;
  carried: boolean;
  /** How this month's figure was given, when not typed: "calculated" or "confirmed" (R2-5). */
  currentSource?: "calculated" | "confirmed" | null;
}

export interface MonthChangeRow {
  month: MonthKey;
  previousMonth: MonthKey;
  netWorth: number;
  change: number;
  /** Every account value this month is carried forward from an earlier month. */
  allCarried: boolean;
  /** At least one account value this month is carried forward. */
  someCarried: boolean;
  /** Accounts first recorded this month, so part of the change is a new account. */
  addedAccounts: number;
}

export interface SnapshotHistory {
  stage: HistoryStage;
  series: NetWorthPoint[];
  /** Months that have at least one recorded (not carried) value. */
  recordedMonths: number;
  latest: NetWorthPoint | null;
  /** The latest month with a recorded value (a carried current month is skipped). */
  latestRecorded: NetWorthPoint | null;
  /** The recorded month before `latestRecorded`, compared against it. */
  previousRecorded: NetWorthPoint | null;
  /** Month-on-month rows, newest first. */
  monthChanges: MonthChangeRow[];
  /** Per-account change between the last two recorded months, empty with fewer than two. */
  accountChanges: AccountChange[];
  firstMonth: MonthKey | null;
}

/**
 * Builds the whole history view from saved data. The series runs to the current month, so a month
 * with no check-in yet shows as carried forward. In the current month every account without a
 * recorded row shows its saved balance (`account.balance`, D22), so the last point equals the net
 * worth on every other page; the month still counts as not recorded.
 */
export function buildSnapshotHistory(
  accounts: readonly SnapshotAccountInput[],
  details: readonly AccountDetailInput[],
  current: MonthKey,
  basis: NetWorthBasis,
): SnapshotHistory {
  const names = new Map(
    (accounts ?? []).filter((a) => a.id).map((a) => [String(a.id).toLowerCase(), a.name ?? ""]),
  );
  const series = selectSavedNetWorthSeries(accounts, details, current, basis);
  const recordedMonths = series.filter((p) => !p.allCarried).length;
  const stage: HistoryStage =
    recordedMonths === 0
      ? "none"
      : recordedMonths === 1
        ? "single"
        : recordedMonths === 2
          ? "pair"
          : "trend";
  const deltas = selectMonthDeltas(series);
  const monthChanges: MonthChangeRow[] = deltas
    .flatMap((d, i) => {
      const point = series[i + 1];
      if (!point) return [];
      return {
        month: d.month,
        previousMonth: d.previousMonth,
        netWorth: point.netWorth,
        change: d.netWorthChange,
        allCarried: point.allCarried,
        someCarried: point.accounts.some((a) => a.carried),
        addedAccounts: point.addedAccountIds.length,
      };
    })
    .reverse();
  const latest = series.at(-1) ?? null;
  const recorded = series.filter((p) => !p.allCarried);
  const latestRecorded = recorded.at(-1) ?? null;
  const previousRecorded = recorded.at(-2) ?? null;
  // Sorted by name, then id: the engine returns rows in account-id order, and ids are random, so
  // without this the table order changed from one user (and one test run) to the next.
  const sourceAt = (accountId: string, month: MonthKey): AccountChange["currentSource"] => {
    const [y, m] = month.split("-").map(Number);
    const row = (details ?? []).find(
      (d) =>
        String(d.accountId ?? d.account_id ?? "").toLowerCase() === accountId &&
        Number(d.year) === y &&
        Number(d.month) === m,
    );
    return row?.source === "calculated" || row?.source === "confirmed" ? row.source : null;
  };
  const accountChanges: AccountChange[] =
    latestRecorded && previousRecorded
      ? selectAccountDeltas(previousRecorded, latestRecorded)
          .map((d) => {
            const a = latestRecorded.accounts.find((x) => x.accountId === d.accountId);
            return {
              accountId: d.accountId,
              name: String(names.get(d.accountId) || "Account"),
              isLiability: a?.isLiability ?? false,
              current: d.current,
              previous: d.previous,
              change: d.change,
              carried: a?.carried ?? false,
              currentSource: a?.carried ? null : sourceAt(d.accountId, latestRecorded.month),
            };
          })
          .sort(
            (x, y) =>
              x.name.localeCompare(y.name, "en-GB") || x.accountId.localeCompare(y.accountId),
          )
      : [];
  return {
    stage,
    series,
    recordedMonths,
    latest,
    latestRecorded,
    previousRecorded,
    monthChanges,
    accountChanges,
    firstMonth: series[0]?.month ?? null,
  };
}

/**
 * Chart points: a solid `recorded` line through months with a recorded value, and a dashed
 * `carried` line that bridges every carried month to its recorded neighbours.
 */
export interface HistoryChartPoint {
  month: MonthKey;
  label: string;
  netWorth: number;
  recorded: number | null;
  carried: number | null;
}

export function toChartPoints(series: readonly NetWorthPoint[]): HistoryChartPoint[] {
  return series.map((p, i) => {
    const prevCarried = i > 0 && series[i - 1]?.allCarried === true;
    const nextCarried = i < series.length - 1 && series[i + 1]?.allCarried === true;
    return {
      month: p.month,
      label: formatMonthShort(p.month),
      netWorth: p.netWorth,
      recorded: p.allCarried ? null : p.netWorth,
      carried: p.allCarried || prevCarried || nextCarried ? p.netWorth : null,
    };
  });
}

/**
 * A projection from a single snapshot: net worth plus the saved monthly surplus for the next
 * `months` months. Illustrative only; returns [] when the surplus is unknown.
 */
export function projectFromSnapshot(
  start: { month: MonthKey; netWorth: number },
  monthlySurplus: number | null,
  months = 6,
): Array<{ month: MonthKey; label: string; projected: number }> {
  if (monthlySurplus === null || !Number.isFinite(monthlySurplus)) return [];
  return Array.from({ length: months + 1 }, (_, i) => {
    const month = addMonths(start.month, i);
    return {
      month,
      label: formatMonthShort(month),
      projected: Math.round((start.netWorth + monthlySurplus * i) * 100) / 100,
    };
  });
}

/** Neutral count: "1 month of history", "14 months of history". */
export function historyCountLabel(recordedMonths: number): string {
  return `${recordedMonths} ${recordedMonths === 1 ? "month" : "months"} of history`;
}

/** The latest month with a recorded value, or null. */
export function latestRecordedMonth(details: readonly AccountDetailInput[]): MonthKey | null {
  let best: MonthKey | null = null;
  for (const r of toSnapshotRows(details)) {
    const year = Number(r.year);
    const month = Number(r.month);
    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) continue;
    const key = `${year}-${String(month).padStart(2, "0")}`;
    if (best === null || compareMonths(key, best) > 0) best = key;
  }
  return best;
}
