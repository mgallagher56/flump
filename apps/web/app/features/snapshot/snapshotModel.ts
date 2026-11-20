import {
  type AccountDetailInput,
  addCheckInMonths,
  type CheckInScheduleInput,
  compareCheckInMonths,
  isCheckInMonth,
  type NetWorthBasis,
  type NetWorthPoint,
  nextCheckInDate as nextCheckInDay,
  type SnapshotAccountInput,
  selectAccountDeltas,
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
  type SnapshotAccountInput,
  type SnapshotPayload,
} from "@flump/finance-engine";

import type { MonthKey } from "~/utils/londonMonth";

export { londonMonth, type MonthKey } from "~/utils/londonMonth";

const MONTH_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;

const isMonthKey: (value: unknown) => value is MonthKey = isCheckInMonth;

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
function formatMonthShort(month: MonthKey): string {
  if (!MONTH_RE.test(month)) return month;
  return formatMonthTick(month, "2-digit");
}

/** Today's Europe/London calendar date, "YYYY-MM-DD" (the check-in day rules compare it). */
export function londonDate(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: string, fallback: string) =>
    parts.find((p) => p.type === type)?.value ?? fallback;
  return `${part("year", "1970")}-${part("month", "01")}-${part("day", "01")}`;
}

/** Today's London date when it falls in `month`, otherwise that month's 1st (a stable default). */
export function londonDateIn(month: MonthKey, now: Date = new Date()): string {
  const today = londonDate(now);
  return today.startsWith(`${month}-`) ? today : `${month}-01`;
}

/**
 * The next check-in date on the user's chosen check-in day (UX Batch E), as "28 November 2026".
 * The rule (this month's date while it is ahead and unrecorded, otherwise next month's, with days
 * past a month's end on its last day) lives in `@flump/finance-engine`.
 */
export function nextCheckInDate(input: CheckInScheduleInput): string {
  const date = nextCheckInDay(input);
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1)));
}

/** History length decides what the page can show (E30 PR2 empty states). */
type HistoryStage = "none" | "single" | "pair" | "trend";

export interface AccountChange {
  accountId: string;
  name: string;
  isLiability: boolean;
  current: number;
  previous: number;
  /** Current minus previous, in the account's own terms: a debt that grows is a positive change. */
  change: number;
  /** The change's effect on net worth: the same as `change`, with the sign flipped for a debt. */
  effect: number;
  carried: boolean;
  /** How this month's figure was given, when not typed: "calculated" or "confirmed" (R2-5). */
  currentSource?: "calculated" | "confirmed" | null;
}

/**
 * The history label for how a figure was given: "Calculated", or "Confirmed" for a figure kept with
 * the check-in's No change. Not "No change": a confirmed figure repeats the saved balance, which can
 * differ from last month's record, so it can sit beside a non-zero change.
 */
export function historySourceLabel(
  source: AccountChange["currentSource"],
): "Calculated" | "Confirmed" | undefined {
  if (source === "calculated") return "Calculated";
  if (source === "confirmed") return "Confirmed";
  return undefined;
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
  const latest = series.at(-1) ?? null;
  const recorded = series.filter((p) => !p.allCarried);
  const latestRecorded = recorded.at(-1) ?? null;
  const previousRecorded = recorded.at(-2) ?? null;
  // Sorted by group, name, then id: the engine returns rows in account-id order, and ids are random,
  // so without this the table order changed from one user (and one test run) to the next.
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
              // `|| 0` so an unchanged debt never reads as -0.
              effect: (a?.isLiability ? -d.change : d.change) || 0,
              carried: a?.carried ?? false,
              currentSource: a?.carried ? null : sourceAt(d.accountId, latestRecorded.month),
            };
          })
          // What you own first, then what you owe, each by name: the Accounts page grouping.
          .sort(
            (x, y) =>
              Number(x.isLiability) - Number(y.isLiability) ||
              x.name.localeCompare(y.name, "en-GB") ||
              x.accountId.localeCompare(y.accountId),
          )
      : [];
  return {
    stage,
    series,
    recordedMonths,
    latest,
    latestRecorded,
    previousRecorded,
    accountChanges,
    firstMonth: series[0]?.month ?? null,
  };
}

/**
 * Chart points: a solid `recorded` line through months with a recorded value, and a dashed
 * `carried` line that bridges every carried month to its recorded neighbours. `netWorth` is the
 * plotted value (an account's balance on the account page).
 */
export interface HistoryChartPoint {
  month: MonthKey;
  label: string;
  netWorth: number;
  recorded: number | null;
  carried: number | null;
}

/** One month on a line chart: its value, and whether it is carried (not recorded). */
export interface LinePointInput {
  month: MonthKey;
  value: number;
  carried: boolean;
}

/** Line chart points for any monthly series, net worth or one account's balance. */
export function toLinePoints(rows: readonly LinePointInput[]): HistoryChartPoint[] {
  return rows.map((p, i) => {
    const prevCarried = i > 0 && rows[i - 1]?.carried === true;
    const nextCarried = i < rows.length - 1 && rows[i + 1]?.carried === true;
    return {
      month: p.month,
      label: formatMonthShort(p.month),
      netWorth: p.value,
      recorded: p.carried ? null : p.value,
      carried: p.carried || prevCarried || nextCarried ? p.value : null,
    };
  });
}

export function toChartPoints(series: readonly NetWorthPoint[]): HistoryChartPoint[] {
  return toLinePoints(
    series.map((p) => ({ month: p.month, value: p.netWorth, carried: p.allCarried })),
  );
}

/**
 * The chart's takeaway, worded the same up or down (advice policy R1): "Up £15,000 since May
 * 2026.", "Down £1,200 since May 2026." or "No change since May 2026." Empty without two points.
 */
export function changeSinceSentence(
  points: readonly { month: MonthKey; value: number }[],
  format: (value: number) => string,
): string {
  const first = points[0];
  const last = points.at(-1);
  if (!first || !last || points.length < 2) return "";
  // Whole pounds, so a few pence never reads as "Up £0".
  const diff = Math.round(last.value - first.value);
  const since = `since ${formatMonth(first.month)}.`;
  if (diff === 0) return `No change ${since}`;
  return `${diff > 0 ? "Up" : "Down"} ${format(Math.abs(diff))} ${since}`;
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
