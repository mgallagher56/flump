import {
  categorizeAccountType,
  isLiabilityCategory,
  projectAmortisedBalance,
} from "@flump/finance-engine";
import {
  type AccountDetailInput,
  compareMonths,
  formatMonth,
  type MonthKey,
  type SnapshotAccountInput,
  type SnapshotPayload,
} from "./snapshotModel";

/**
 * The account-by-account monthly check-in (R2-5, owner-approved design). Pure: the steps, their
 * order, the calculated figure for loans with a known rate and payment, and the payloads. Every
 * write goes through the existing `PUT /snapshots/:month` upsert.
 */

/** How a check-in figure was given. Stored as the snapshot row's `source`. */
export type CheckInSource = "manual" | "confirmed" | "calculated";

/** The account fields the check-in reads (a superset of the snapshot input). */
export interface CheckInAccountInput extends SnapshotAccountInput {
  interestRate?: number | string | null;
  /** The regular monthly payment for a loan or mortgage. */
  monthlyContribution?: number | string | null;
  termMonths?: number | string | null;
  /** ISO date, for example "2026-03-31". */
  fixedRateEndDate?: string | null;
}

export interface CalculatedFigure {
  /** The balance owed now, as a positive amount. */
  value: number;
  /** The figure it starts from, and the month it was recorded. */
  baseValue: number;
  baseMonth: MonthKey;
  interestRate: number;
  monthlyPayment: number;
}

export type StatementPrompt =
  | { kind: "yearSinceTyped" }
  | { kind: "fixedRateEnded"; endedMonth: MonthKey };

export interface CheckInStep {
  accountId: string;
  name: string;
  type: string;
  isLiability: boolean;
  /** Last month's figure as the user sees it (liabilities positive), or null with no history. */
  lastValue: number | null;
  /** The month `lastValue` was recorded. */
  lastMonth: MonthKey | null;
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

const CALCULABLE_TYPES = new Set(["Mortgage", "Loan"]);

const MONTH_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;

const monthIndex = (month: MonthKey): number => {
  const m = MONTH_RE.exec(month);
  return m ? Number(m[1]) * 12 + Number(m[2]) - 1 : Number.NaN;
};

const asNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

interface Row {
  month: MonthKey;
  value: number;
  source: string | null;
}

const rowsFor = (accountId: string, details: readonly AccountDetailInput[]): Row[] => {
  const rows: Row[] = [];
  for (const d of details ?? []) {
    const id = String(d.accountId ?? d.account_id ?? "").toLowerCase();
    if (id !== accountId) continue;
    const year = Number(d.year);
    const month = Number(d.month);
    const value = asNumber(d.value);
    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) continue;
    if (value === null) continue;
    rows.push({
      month: `${year}-${String(month).padStart(2, "0")}`,
      value,
      source: d.source ?? null,
    });
  }
  return rows.sort((a, b) => compareMonths(a.month, b.month));
};

/** The fixed-rate end as a month key, or null. */
const fixedEndMonth = (iso: string | null | undefined): MonthKey | null => {
  const m = /^(\d{4})-(\d{2})/.exec(iso ?? "");
  return m ? `${m[1]}-${m[2]}` : null;
};

/**
 * The calculated balance for a loan or mortgage: the latest recorded figure before `month`, with
 * one month of interest and one regular payment for each month since (the engine's amortisation).
 * Null when the rate, the payment or a base figure is missing: the check-in never guesses.
 */
export function calculateBalance(
  account: CheckInAccountInput,
  base: { value: number; month: MonthKey } | null,
  month: MonthKey,
): CalculatedFigure | null {
  if (!CALCULABLE_TYPES.has(String(account.type ?? ""))) return null;
  const rate = asNumber(account.interestRate);
  const payment = asNumber(account.monthlyContribution);
  if (rate === null || rate < 0 || payment === null || payment <= 0 || !base) return null;
  const months = monthIndex(month) - monthIndex(base.month);
  if (!Number.isFinite(months) || months < 1) return null;
  const baseValue = Math.abs(base.value);
  return {
    value: projectAmortisedBalance({
      balanceGbp: baseValue,
      interestRateApr: rate,
      monthlyPaymentGbp: payment,
      months,
    }),
    baseValue,
    baseMonth: base.month,
    interestRate: rate,
    monthlyPayment: payment,
  };
}

/**
 * The quiet "check against a statement" prompt on a calculated figure: when no figure has been
 * typed for a year, or a recorded fixed-rate end date has passed since the last typed figure.
 */
export function statementPromptFor(
  account: CheckInAccountInput,
  rows: readonly Row[],
  month: MonthKey,
): StatementPrompt | null {
  const typed = rows.filter((r) => r.source === "manual" || r.source === "onboarding");
  const lastTyped = typed.at(-1)?.month ?? null;
  const ended = fixedEndMonth(account.fixedRateEndDate);
  if (
    ended &&
    compareMonths(ended, month) < 0 &&
    (lastTyped === null || compareMonths(lastTyped, ended) <= 0)
  ) {
    return { kind: "fixedRateEnded", endedMonth: ended };
  }
  const now = monthIndex(month);
  if (lastTyped === null || now - monthIndex(lastTyped) >= 12) return { kind: "yearSinceTyped" };
  return null;
}

/** One step per manual account, ordered by how often it changes. Connected accounts are skipped. */
export function buildCheckInSteps(
  accounts: readonly CheckInAccountInput[],
  details: readonly AccountDetailInput[],
  month: MonthKey,
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
      const isLiability = isLiabilityCategory(categorizeAccountType(type));
      const rows = rowsFor(accountId, details);
      const atMonth = rows.find((r) => r.month === month) ?? null;
      const before = rows.filter((r) => compareMonths(r.month, month) < 0).at(-1) ?? null;
      const shown = (v: number) => (isLiability ? Math.abs(v) : v);
      // With no earlier month, last month's figure falls back to the saved balance.
      const saved = asNumber(account.balance);
      const lastValue = before ? shown(before.value) : saved !== null ? shown(saved) : null;
      const calculated = calculateBalance(
        account,
        before ? { value: before.value, month: before.month } : null,
        month,
      );
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

/** "From your rate of 4.5% and monthly payment of £1,250 since October 2026." */
export function calculatedExplain(c: CalculatedFigure): string {
  const pct = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 }).format(c.interestRate);
  const pay = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(c.monthlyPayment);
  return `From your rate of ${pct}% and monthly payment of ${pay} since ${formatMonth(c.baseMonth)}.`;
}

/** The statement prompt's words. Plain, no alarm. */
export function statementPromptText(p: StatementPrompt): string {
  return p.kind === "fixedRateEnded"
    ? `Your fixed rate ended in ${formatMonth(p.endedMonth)}, so the rate may have changed. Worth checking this against a statement.`
    : "It has been a year since you entered this balance yourself. Worth checking it against a statement.";
}
