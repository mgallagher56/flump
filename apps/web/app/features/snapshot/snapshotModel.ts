import {
  categorizeAccountType,
  isLiabilityCategory,
  type NetWorthPoint,
  type SnapshotRow,
  selectAccountDeltas,
  selectMonthDeltas,
  selectNetWorthSeries,
} from "@flump/finance-engine";

/**
 * Monthly snapshots (E30 PR2): the pure model behind the check-in sheet and the history page.
 * Everything here is saved data. Nothing is a scenario, and nothing writes until the user saves.
 */

/** "YYYY-MM". */
export type MonthKey = string;

const MONTH_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;

export function isMonthKey(value: unknown): value is MonthKey {
  return typeof value === "string" && MONTH_RE.test(value);
}

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

function toIndex(month: MonthKey): number {
  const m = MONTH_RE.exec(month);
  if (!m) throw new Error(`Not a month key: ${month}`);
  return Number(m[1]) * 12 + (Number(m[2]) - 1);
}

function fromIndex(index: number): MonthKey {
  const year = Math.floor(index / 12);
  return `${year}-${String((index % 12) + 1).padStart(2, "0")}`;
}

export function addMonths(month: MonthKey, n: number): MonthKey {
  return fromIndex(toIndex(month) + n);
}

export function compareMonths(a: MonthKey, b: MonthKey): number {
  return toIndex(a) - toIndex(b);
}

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

/** "Nov 26", for chart axes. */
export function formatMonthShort(month: MonthKey): string {
  const m = MONTH_RE.exec(month);
  if (!m) return month;
  return new Intl.DateTimeFormat("en-GB", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 1)));
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

/** The account fields the snapshot feature reads. */
export interface SnapshotAccountInput {
  id?: string | null;
  name?: string | null;
  type?: string | null;
  balance?: number | string | null;
  connectionId?: string | null;
}

/** A history row as the backend returns it (`GET /account-details`). */
export interface AccountDetailInput {
  accountId?: string | null;
  account_id?: string | null;
  year?: number | string | null;
  month?: number | string | null;
  value?: number | string | null;
  source?: string | null;
}

export function toSnapshotRows(details: readonly AccountDetailInput[]): SnapshotRow[] {
  const rows: SnapshotRow[] = [];
  for (const d of details ?? []) {
    const accountId = String(d.accountId ?? d.account_id ?? "").toLowerCase();
    if (!accountId) continue;
    rows.push({
      accountId,
      year: Number(d.year),
      month: Number(d.month),
      value: d.value ?? "",
    });
  }
  return rows;
}

function rowMonth(r: SnapshotRow): MonthKey | null {
  const year = Number(r.year);
  const month = Number(r.month);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return null;
  return `${year}-${String(month).padStart(2, "0")}`;
}

export type CheckInStatus =
  /** A connected account: the bank sync fills it in. */
  | "connected"
  /** A value is already recorded for this month. */
  | "recorded"
  /** Nothing recorded this month; `lastRecordedMonth` is the latest earlier month. */
  | "notUpdated"
  /** No value has ever been recorded. */
  | "noHistory";

export interface CheckInRow {
  accountId: string;
  name: string;
  type: string;
  isLiability: boolean;
  /** Student loans are recorded but sit outside net worth. */
  outsideNetWorth: boolean;
  isConnected: boolean;
  status: CheckInStatus;
  /** Latest month before (or equal to) the target month that has a recorded value. */
  lastRecordedMonth: MonthKey | null;
  /**
   * Prefill for the field, as the figure the user sees: liabilities as the amount owed (positive).
   * Null leaves the field empty.
   */
  prefill: number | null;
}

const asNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

/**
 * One row per account for the check-in of `month`. The prefill is the value already recorded for
 * that month, else the latest earlier recorded value, else (for the current month only) the
 * account's current balance. A month earlier than any record starts empty, so back-filling never
 * copies today's balance into the past.
 */
export function buildCheckInRows(
  accounts: readonly SnapshotAccountInput[],
  details: readonly AccountDetailInput[],
  month: MonthKey,
  current: MonthKey,
): CheckInRow[] {
  const rows = toSnapshotRows(details);
  const target = toIndex(month);
  return (accounts ?? [])
    .filter((a) => a.id)
    .map((a) => {
      const accountId = String(a.id).toLowerCase();
      const type = String(a.type ?? "other");
      const category = categorizeAccountType(type);
      const isLiability = isLiabilityCategory(category);
      let atMonth: number | null = null;
      let before: { index: number; value: number } | null = null;
      for (const r of rows) {
        if (r.accountId !== accountId) continue;
        const key = rowMonth(r);
        const value = asNumber(r.value);
        if (!key || value === null) continue;
        const idx = toIndex(key);
        if (idx === target) atMonth = value;
        else if (idx < target && (!before || idx >= before.index)) before = { index: idx, value };
      }
      const isConnected = Boolean(a.connectionId);
      const lastRecordedMonth = atMonth !== null ? month : before ? fromIndex(before.index) : null;
      let raw: number | null = atMonth ?? before?.value ?? null;
      if (raw === null && month === current) raw = asNumber(a.balance);
      const status: CheckInStatus = isConnected
        ? "connected"
        : atMonth !== null
          ? "recorded"
          : before
            ? "notUpdated"
            : "noHistory";
      return {
        accountId,
        name: String(a.name ?? "Account"),
        type,
        isLiability,
        outsideNetWorth: category === "studentLoans",
        isConnected,
        status,
        lastRecordedMonth,
        prefill: raw === null ? null : isLiability ? Math.abs(raw) : raw,
      };
    });
}

export interface SnapshotPayload {
  values: Array<{ accountId: string; value: number }>;
  complete?: boolean;
}

/**
 * The `PUT /snapshots/:month` body. Connected accounts are left to the bank sync; an empty field
 * is skipped (a partial save). Liabilities are sent as the amount owed: the backend signs them by
 * account type (E30 D18). `complete` marks the month's check-in done only when this is the current
 * month and no manual account was skipped.
 */
export function buildSnapshotPayload(
  rows: readonly CheckInRow[],
  values: Readonly<Record<string, number | null | undefined>>,
  options: { isCurrentMonth: boolean },
): { payload: SnapshotPayload; saved: number; skipped: number } {
  const manual = rows.filter((r) => !r.isConnected);
  const out: SnapshotPayload["values"] = [];
  for (const r of manual) {
    const v = values[r.accountId];
    if (typeof v !== "number" || !Number.isFinite(v)) continue;
    const rounded = Math.round(v * 100) / 100;
    out.push({ accountId: r.accountId, value: r.isLiability ? Math.abs(rounded) : rounded });
  }
  const skipped = manual.length - out.length;
  const payload: SnapshotPayload = { values: out };
  if (options.isCurrentMonth && skipped === 0 && out.length > 0) payload.complete = true;
  return { payload, saved: out.length, skipped };
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
 * with no check-in yet shows as carried forward.
 */
export function buildSnapshotHistory(
  accounts: readonly SnapshotAccountInput[],
  details: readonly AccountDetailInput[],
  current: MonthKey,
): SnapshotHistory {
  const engineAccounts = (accounts ?? [])
    .filter((a) => a.id)
    .map((a) => ({ id: String(a.id).toLowerCase(), type: String(a.type ?? "other") }));
  const names = new Map(
    (accounts ?? []).filter((a) => a.id).map((a) => [String(a.id).toLowerCase(), a.name ?? ""]),
  );
  const series = selectNetWorthSeries(engineAccounts, toSnapshotRows(details), {
    through: current,
  });
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
  const accountChanges: AccountChange[] =
    latestRecorded && previousRecorded
      ? selectAccountDeltas(previousRecorded, latestRecorded).map((d) => {
          const a = latestRecorded.accounts.find((x) => x.accountId === d.accountId);
          return {
            accountId: d.accountId,
            name: String(names.get(d.accountId) || "Account"),
            isLiability: a?.isLiability ?? false,
            current: d.current,
            previous: d.previous,
            change: d.change,
            carried: a?.carried ?? false,
          };
        })
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
  let best: number | null = null;
  for (const r of toSnapshotRows(details)) {
    const key = rowMonth(r);
    if (!key) continue;
    const idx = toIndex(key);
    if (best === null || idx > best) best = idx;
  }
  return best === null ? null : fromIndex(best);
}
