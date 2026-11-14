import { categorizeAccountType, isLiabilityCategory } from "./account-category.js";
import { projectAmortisedBalance } from "./mortgage.js";
import { countsTowardNetWorth, type NetWorthBasis } from "./net-worth-basis.js";
import { type NetWorthPoint, type SnapshotRow, selectNetWorthSeries } from "./snapshots.js";

/**
 * The monthly check-in's shared rules (R2-5): used by the web check-in, the backend's check of a
 * `calculated` value, and later the mobile app, so all three agree to the penny. Everything here
 * is pure and returns data: the steps, their order, the calculated figure, the answers, the
 * `PUT /snapshots/:month` payloads and the summary. Wording is the caller's job.
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

/* ------------------------------------------------------------------------------------------ */
/* Months                                                                                      */
/* ------------------------------------------------------------------------------------------ */

export function isCheckInMonth(value: unknown): value is CheckInMonth {
  return typeof value === "string" && CHECK_IN_MONTH_RE.test(value);
}

function monthToIndex(month: CheckInMonth): number {
  const m = CHECK_IN_MONTH_RE.exec(month);
  if (!m) throw new Error(`Not a month key: ${month}`);
  return Number(m[1]) * 12 + (Number(m[2]) - 1);
}

function indexToMonth(index: number): CheckInMonth {
  const year = Math.floor(index / 12);
  return `${year}-${String((index % 12) + 1).padStart(2, "0")}`;
}

/** `month` moved by `n` months ("2026-11" and -1 is "2026-10"). Throws on a bad key. */
export function addCheckInMonths(month: CheckInMonth, n: number): CheckInMonth {
  return indexToMonth(monthToIndex(month) + n);
}

/** Negative when `a` is before `b`, zero when equal, positive after. Throws on a bad key. */
export function compareCheckInMonths(a: CheckInMonth, b: CheckInMonth): number {
  return monthToIndex(a) - monthToIndex(b);
}

/* ------------------------------------------------------------------------------------------ */
/* Inputs and the history rows                                                                 */
/* ------------------------------------------------------------------------------------------ */

/** The account fields the snapshot feature reads. */
export interface SnapshotAccountInput {
  id?: string | null;
  name?: string | null;
  type?: string | null;
  /** The saved current balance (D22). Debts may be stored negative. */
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

/** The account fields the check-in reads (a superset of the snapshot input). */
export interface CheckInAccountInput extends SnapshotAccountInput {
  interestRate?: number | string | null;
  /** The regular monthly payment for a loan or mortgage. */
  monthlyContribution?: number | string | null;
  termMonths?: number | string | null;
  /** ISO date, for example "2026-03-31". */
  fixedRateEndDate?: string | null;
}

/** The `PUT /snapshots/:month` body. */
export interface SnapshotPayload {
  /** `source` (check-in only): a typed figure, a confirmed "No change" or a kept calculated one. */
  values: Array<{
    accountId: string;
    value: number;
    source?: "manual" | "confirmed" | "calculated";
  }>;
  complete?: boolean;
}

/** History rows in the engine's snapshot shape (ids lower-cased, rows without an id dropped). */
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

function rowMonth(r: { year?: unknown; month?: unknown }): CheckInMonth | null {
  const year = Number(r.year);
  const month = Number(r.month);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return null;
  return `${year}-${String(month).padStart(2, "0")}`;
}

/**
 * Net worth under the basis for every month from the first recorded month to `through`. In the
 * `through` month every account without a recorded row shows its saved balance (`account.balance`,
 * D22), so the last point equals the net worth on every other page.
 */
export function selectSavedNetWorthSeries(
  accounts: readonly SnapshotAccountInput[],
  details: readonly AccountDetailInput[],
  through: CheckInMonth,
  basis: NetWorthBasis,
): NetWorthPoint[] {
  const engineAccounts = (accounts ?? [])
    .filter((a) => a.id)
    .map((a) => ({ id: String(a.id).toLowerCase(), type: String(a.type ?? "other") }));
  const currentBalances = new Map<string, number>();
  for (const a of accounts ?? []) {
    const balance = toNumber(a.balance);
    if (a.id && balance !== null) currentBalances.set(String(a.id).toLowerCase(), balance);
  }
  return selectNetWorthSeries(engineAccounts, toSnapshotRows(details), basis, {
    through,
    currentBalances,
  });
}

/* ------------------------------------------------------------------------------------------ */
/* The back-fill list form (any month, one field per account)                                  */
/* ------------------------------------------------------------------------------------------ */

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
  /** Recorded, but the user's net worth basis leaves this kind of account out. */
  outsideNetWorth: boolean;
  isConnected: boolean;
  status: CheckInStatus;
  /** Latest month before (or equal to) the target month that has a recorded value. */
  lastRecordedMonth: CheckInMonth | null;
  /**
   * Prefill for the field, as the figure the user sees: liabilities as the amount owed (positive).
   * Null leaves the field empty.
   */
  prefill: number | null;
}

/**
 * One row per account for the check-in of `month`. The prefill is the value already recorded for
 * that month, else the latest earlier recorded value, else (for the current month only) the
 * account's current balance. A month earlier than any record starts empty, so back-filling never
 * copies today's balance into the past.
 */
export function buildCheckInRows(
  accounts: readonly SnapshotAccountInput[],
  details: readonly AccountDetailInput[],
  month: CheckInMonth,
  current: CheckInMonth,
  basis: NetWorthBasis,
): CheckInRow[] {
  const rows = toSnapshotRows(details);
  const target = monthToIndex(month);
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
        const value = toNumber(r.value);
        if (!key || value === null) continue;
        const idx = monthToIndex(key);
        if (idx === target) atMonth = value;
        else if (idx < target && (!before || idx >= before.index)) before = { index: idx, value };
      }
      const isConnected = Boolean(a.connectionId);
      const lastRecordedMonth =
        atMonth !== null ? month : before ? indexToMonth(before.index) : null;
      let raw: number | null = atMonth ?? before?.value ?? null;
      if (raw === null && month === current) raw = toNumber(a.balance);
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
        outsideNetWorth: !countsTowardNetWorth(category, basis),
        isConnected,
        status,
        lastRecordedMonth,
        prefill: raw === null ? null : isLiability ? Math.abs(raw) : raw,
      };
    });
}

/**
 * The `PUT /snapshots/:month` body for the list form. Connected accounts are left to the bank
 * sync; an empty field is skipped (a partial save). Liabilities are sent as the amount owed: the
 * backend signs them by account type (E30 D18). `complete` marks the month's check-in done only
 * when this is the current month and no manual account was skipped.
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

/* ------------------------------------------------------------------------------------------ */
/* The account-by-account check-in                                                             */
/* ------------------------------------------------------------------------------------------ */

/** How a check-in figure was given. Stored as the snapshot row's `source`. */
export type CheckInSource = "manual" | "confirmed" | "calculated";

/** The calculated figure a step offers (see `calculateCheckInBalance`). */
export type CalculatedFigure = CalculatedBalance;

/** Why a calculated figure is worth checking against a statement. */
export type StatementPrompt =
  | { kind: "yearSinceTyped" }
  | { kind: "fixedRateEnded"; endedMonth: CheckInMonth };

/** One recorded month for one account, as the check-in reads it. */
export interface CheckInHistoryRow {
  month: CheckInMonth;
  /** As stored (debts may be negative). */
  value: number;
  source: string | null;
}

export interface CheckInStep {
  accountId: string;
  name: string;
  type: string;
  isLiability: boolean;
  /**
   * The figure "No change" repeats, as the user sees it (liabilities positive): the saved balance
   * (`account.balance`, the current balance under D22) when set, else the latest recorded value
   * before the month, else null.
   */
  lastValue: number | null;
  /** The latest month recorded before the check-in month, or null with no history. */
  lastMonth: CheckInMonth | null;
  /** Set for a loan or mortgage with everything needed to calculate (rate, payment, base). */
  calculated: CalculatedFigure | null;
  statementPrompt: StatementPrompt | null;
  /** Already recorded for the check-in month (a resumed check-in), as the user sees it. */
  recorded: { value: number; source: string | null } | null;
}

/**
 * Order by how often a balance changes: day-to-day money first, slow-moving balances (pension,
 * property, mortgage, student loan) last. Unknown types go at the end, in saved order.
 */
export const CHECK_IN_TYPE_ORDER: readonly string[] = [
  "Current",
  "Saving",
  "Credit Card",
  "Overdraft",
  "Investment",
  "Owed",
  "Loan",
  "Pension",
  "Property",
  "Mortgage",
  "Student Loan",
];

/** One account's recorded months, oldest first. */
export function checkInHistoryFor(
  accountId: string,
  details: readonly AccountDetailInput[],
): CheckInHistoryRow[] {
  const id = accountId.toLowerCase();
  const rows: CheckInHistoryRow[] = [];
  for (const d of details ?? []) {
    if (String(d.accountId ?? d.account_id ?? "").toLowerCase() !== id) continue;
    const month = rowMonth(d);
    const value = toNumber(d.value);
    if (!month || value === null) continue;
    rows.push({ month, value, source: d.source ?? null });
  }
  return rows.sort((a, b) => compareCheckInMonths(a.month, b.month));
}

/** The fixed-rate end as a month key, or null. */
const fixedEndMonth = (iso: string | null | undefined): CheckInMonth | null => {
  const m = /^(\d{4})-(\d{2})/.exec(iso ?? "");
  return m ? `${m[1]}-${m[2]}` : null;
};

/**
 * The quiet "check against a statement" prompt on a calculated figure: when no figure has been
 * typed for a year, or a recorded fixed-rate end date has passed since the last typed figure.
 */
export function statementPromptFor(
  account: Pick<CheckInAccountInput, "fixedRateEndDate">,
  rows: readonly CheckInHistoryRow[],
  month: CheckInMonth,
): StatementPrompt | null {
  const typed = rows.filter((r) => r.source === "manual" || r.source === "onboarding");
  const lastTyped = typed.at(-1)?.month ?? null;
  const ended = fixedEndMonth(account.fixedRateEndDate);
  if (
    ended &&
    compareCheckInMonths(ended, month) < 0 &&
    (lastTyped === null || compareCheckInMonths(lastTyped, ended) <= 0)
  ) {
    return { kind: "fixedRateEnded", endedMonth: ended };
  }
  if (lastTyped === null || monthsBetween(lastTyped, month) >= 12) {
    return { kind: "yearSinceTyped" };
  }
  return null;
}

/** One step per manual account, ordered by how often it changes. Connected accounts are skipped. */
export function buildCheckInSteps(
  accounts: readonly CheckInAccountInput[],
  details: readonly AccountDetailInput[],
  month: CheckInMonth,
): CheckInStep[] {
  const rank = (type: string) => {
    const i = CHECK_IN_TYPE_ORDER.indexOf(type);
    return i === -1 ? CHECK_IN_TYPE_ORDER.length : i;
  };
  return (accounts ?? [])
    .map((account, index) => ({ account, index }))
    .filter(({ account }) => account.id && !account.connectionId)
    .sort(
      (a, b) =>
        rank(String(a.account.type ?? "")) - rank(String(b.account.type ?? "")) ||
        a.index - b.index,
    )
    .map(({ account }) => {
      const accountId = String(account.id).toLowerCase();
      const type = String(account.type ?? "other");
      // A student loan is stored as a negative amount owed like any other debt, so the check-in
      // shows and sends it as the positive amount owed (the backend signs it by type).
      const category = categorizeAccountType(type);
      const isLiability = isLiabilityCategory(category) || category === "studentLoans";
      const rows = checkInHistoryFor(accountId, details);
      const atMonth = rows.find((r) => r.month === month) ?? null;
      const before = rows.filter((r) => compareCheckInMonths(r.month, month) < 0).at(-1) ?? null;
      const shown = (v: number) => (isLiability ? Math.abs(v) : v);
      // No change repeats the saved balance (the current balance, D22), not the latest recorded
      // month: with no saved balance it falls back to the latest recorded figure.
      const saved = toNumber(account.balance);
      const lastValue = saved !== null ? shown(saved) : before ? shown(before.value) : null;
      // The calculated figure starts from the latest recorded figure, as the backend recomputes it.
      const calculated = calculateCheckInBalance({
        type: account.type,
        interestRate: account.interestRate,
        monthlyPayment: account.monthlyContribution,
        base: before ? { value: before.value, month: before.month } : null,
        month,
      });
      return {
        accountId,
        name: String(account.name ?? "Account"),
        type,
        isLiability,
        lastValue,
        lastMonth: before?.month ?? null,
        calculated,
        statementPrompt: calculated ? statementPromptFor(account, rows, month) : null,
        recorded: atMonth ? { value: shown(atMonth.value), source: atMonth.source } : null,
      };
    });
}

/** The first step with nothing recorded this month: where a resumed check-in starts. */
export function resumeIndex(steps: readonly CheckInStep[]): number {
  const i = steps.findIndex((s) => s.recorded === null);
  return i === -1 ? steps.length : i;
}

/** An answer to one step. */
export type CheckInAnswer =
  | { kind: "update"; value: number }
  | { kind: "noChange" }
  | { kind: "keepCalculated" };

export interface CheckInValue {
  accountId: string;
  /** As the user sees it: liabilities positive (the backend signs by account type). */
  value: number;
  source: CheckInSource;
}

/**
 * The value an answer records, or null when it records nothing (No change with no earlier figure).
 * A typed figure equal to the calculated one is still the user's own figure (`manual`).
 */
export function answerValue(step: CheckInStep, answer: CheckInAnswer): CheckInValue | null {
  const round = (v: number) => Math.round(Math.abs(v) * 100) / 100;
  if (answer.kind === "update") {
    const v = step.isLiability ? round(answer.value) : Math.round(answer.value * 100) / 100;
    return { accountId: step.accountId, value: v, source: "manual" };
  }
  if (answer.kind === "keepCalculated" && step.calculated) {
    return { accountId: step.accountId, value: step.calculated.value, source: "calculated" };
  }
  if (step.lastValue === null) return null;
  return { accountId: step.accountId, value: step.lastValue, source: "confirmed" };
}

/** The default answer for "No change to the rest": calculated figures kept, the rest repeated. */
export function restAnswer(step: CheckInStep): CheckInAnswer {
  return step.calculated ? { kind: "keepCalculated" } : { kind: "noChange" };
}

/**
 * The `PUT /snapshots/:month` body for some answered values. `complete` is set once every step has
 * a value for the month (already recorded or in this save). `withSource` adds each value's source
 * once the backend accepts it.
 */
export function checkInPayload(
  steps: readonly CheckInStep[],
  values: readonly CheckInValue[],
  answeredIds: ReadonlySet<string>,
  options: { withSource: boolean },
): SnapshotPayload {
  const payload: SnapshotPayload = {
    values: values.map((v) =>
      options.withSource
        ? { accountId: v.accountId, value: v.value, source: v.source }
        : { accountId: v.accountId, value: v.value },
    ),
  };
  const done = steps.every(
    (s) =>
      s.recorded !== null ||
      answeredIds.has(s.accountId) ||
      values.some((v) => v.accountId === s.accountId),
  );
  if (done && values.length > 0) payload.complete = true;
  return payload;
}

/** The same payload with every `source` removed, for a backend that does not accept it yet. */
export function withoutSource(payload: SnapshotPayload): SnapshotPayload {
  return {
    ...payload,
    values: payload.values.map(({ accountId, value }) => ({ accountId, value })),
  };
}

/** True when the payload carries a `source` on any value. */
export function hasSource(payload: SnapshotPayload): boolean {
  return payload.values.some((v) => v.source !== undefined);
}

/** What a step holds for the month: this check-in's answer, else what was already recorded. */
export interface StepFigure {
  value: number;
  source: CheckInSource | null;
  /** Answered in this check-in (not recorded before it opened). */
  fromSession: boolean;
}

const KNOWN_SOURCES = new Set<string>(["manual", "confirmed", "calculated"]);

export function stepFigure(
  step: CheckInStep,
  answer: CheckInValue | null | undefined,
): StepFigure | null {
  if (answer) return { value: answer.value, source: answer.source, fromSession: true };
  if (!step.recorded) return null;
  const source = step.recorded.source;
  return {
    value: step.recorded.value,
    source: source && KNOWN_SOURCES.has(source) ? (source as CheckInSource) : null,
    fromSession: false,
  };
}

export type DoneKind = "updated" | "noChange" | "calculated";

const samePence = (a: number, b: number) => Math.round(a * 100) === Math.round(b * 100);

/**
 * How a done step reads. An answer from this check-in reads by its source. A figure recorded
 * before (whose source may not be stored yet) reads as No change when it repeats `lastValue`.
 */
export function doneKind(step: CheckInStep, figure: StepFigure): DoneKind {
  if (figure.source === "calculated") return "calculated";
  if (figure.source === "confirmed") return "noChange";
  if (figure.fromSession) return "updated";
  return step.lastValue !== null && samePence(figure.value, step.lastValue)
    ? "noChange"
    : "updated";
}

export interface CheckInChange {
  accountId: string;
  name: string;
  /** As the user sees it: debts positive. */
  value: number;
  calculated: boolean;
}

export interface CheckInSummary {
  /** Accounts whose figure differs from `lastValue`, in check-in order. */
  changed: CheckInChange[];
  /** Net worth for the check-in month under the user's basis, from the saved values. */
  netWorth: number | null;
  /** Change on the month before, or null with nothing to compare. */
  change: number | null;
  previousMonth: CheckInMonth;
}

/**
 * The end-of-check-in summary: what changed, and net worth against last month under the user's
 * basis. The answers are merged into the saved history the way the backend stores them (debts
 * negative), so the figure matches the history page once it reloads.
 */
export function buildCheckInSummary(
  steps: readonly CheckInStep[],
  answers: Readonly<Record<string, CheckInValue>>,
  accounts: readonly SnapshotAccountInput[],
  details: readonly AccountDetailInput[],
  month: CheckInMonth,
  basis: NetWorthBasis,
): CheckInSummary {
  const changed: CheckInChange[] = [];
  for (const step of steps) {
    const figure = stepFigure(step, answers[step.accountId]);
    if (!figure) continue;
    if (step.lastValue !== null && samePence(figure.value, step.lastValue)) continue;
    changed.push({
      accountId: step.accountId,
      name: step.name,
      value: figure.value,
      calculated: figure.source === "calculated",
    });
  }
  const [year, monthNum] = month.split("-").map(Number) as [number, number];
  const answered = new Set(Object.keys(answers));
  const owed = new Map(steps.map((s) => [s.accountId, s.isLiability]));
  const merged: AccountDetailInput[] = [
    ...(details ?? []).filter((d) => {
      const id = String(d.accountId ?? d.account_id ?? "").toLowerCase();
      return !(answered.has(id) && Number(d.year) === year && Number(d.month) === monthNum);
    }),
    ...Object.values(answers).map((a) => ({
      accountId: a.accountId,
      year,
      month: monthNum,
      value: owed.get(a.accountId) ? -Math.abs(a.value) : a.value,
    })),
  ];
  const series = selectSavedNetWorthSeries(accounts, merged, month, basis);
  const previousMonth = addCheckInMonths(month, -1);
  const now = series.find((p) => p.month === month) ?? null;
  const before = series.find((p) => p.month === previousMonth) ?? null;
  return {
    changed,
    netWorth: now ? now.netWorth : null,
    change: now && before ? now.netWorth - before.netWorth : null,
    previousMonth,
  };
}
