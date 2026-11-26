/**
 * Monthly check-in words (E12 S3, plan section 9.6). `packages/copy` (P5) is not on main yet, so the
 * words live here in one module, copied from web's `snapshotCopy.ts` and `CheckInRow.tsx` so both
 * apps say the same; when P5 lands this module is replaced by imports from it.
 *
 * Copy guide rules: plain en-GB, sentence case, no exclamation marks. Nothing grades a balance or
 * the person: "Updated", "No change" and "Calculated" say how a figure was given. Changes read the
 * same whichever way a figure moved (advice policy R1). No streaks, targets or missed months.
 */
import type {
  CalculatedFigure,
  CheckInMonth,
  StatementPrompt,
} from "@flump/finance-engine/check-in";
import { formatCurrency, formatMonthYear, formatPercent } from "@flump/format";

/** "November 2026" for "2026-11". */
function monthLabel(month: CheckInMonth): string {
  return formatMonthYear(`${month}-01`, { month: "long" });
}

/** "November" for "2026-11". */
function monthName(month: CheckInMonth): string {
  return monthLabel(month).split(" ")[0] ?? month;
}

/** Whole pounds, as every figure is read: "£1,204", "−£300" with a true minus. */
function wholePounds(value: number): string {
  return formatCurrency(Math.round(value));
}

export const CHECK_IN = {
  title: "Monthly check-in",
  rowHeading: "Monthly check-in",
  start: "Start monthly check-in",
  continue: "Continue check-in",
  description: "Update each balance or keep it as it is. Each one saves as you go.",
  update: "Update",
  noChange: "No change",
  keep: "Keep this figure",
  calculated: "Calculated",
  change: "Change",
  back: "Back",
  next: "Next",
  saving: "Saving…",
  newBalance: "New balance",
  owedNow: "Amount owed now",
  stepError: "We could not save this balance. Nothing has changed. Try again.",
  tryAgain: "Try again",
  whatChanged: "What changed",
  netWorth: "Net worth",
  done: "Done",
  changeBalance: "Change a balance",
  finish: "Finish check-in",
  finishError: "We could not finish the check-in. Nothing has changed. Try again.",
  outsideNetWorth: "Not counted in net worth",
  loadErrorHeading: "We could not load your accounts",
  loadErrorBody: "Check your connection and try again.",
  /** Flump answered in a shape this version does not understand: not a connection problem. */
  loadErrorOutOfStepBody:
    "This version of the app did not understand Flump's answer. Try again later, or update the app if an update is available.",
  /** A person with no profile yet, or who has not finished setup on the website. */
  notSetUpHeading: "Finish setting up Flump on the website",
  notSetUpBody: "Your accounts and monthly check-in appear here once setup is done.",
  notSetUpAction: "Finish setup on the website",
  empty: "Add an account first, then its balance appears here.",
  addAccount: "Add an account on the website",
  offline: "Saving needs a connection. Your answers will save once you are back online.",
  loading: "Loading your accounts",
} as const;

/**
 * The row's one line on the signed-in screen, from the saved check-ins (CH-3), as web's
 * `checkInLine`: when the last one was, that there has been none, or (unknown) which month to record.
 */
export function rowLine(
  currentMonth: CheckInMonth,
  lastCheckInMonth: CheckInMonth | null | undefined,
): string {
  if (lastCheckInMonth) return `Last check-in: ${monthLabel(lastCheckInMonth)}`;
  if (lastCheckInMonth === null) return "No monthly check-in yet";
  return `Record your ${monthName(currentMonth)} balances`;
}

/** Web's account type names (`TYPE_LABEL` in AccountsGroupList), so both apps say the same. */
const TYPE_LABEL: Readonly<Record<string, string>> = {
  Current: "Current account",
  Saving: "Savings",
  Investment: "Investments",
  Pension: "Pension",
  Property: "Property",
  Owed: "Owed to you",
  Mortgage: "Mortgage",
  "Credit Card": "Credit card",
  Loan: "Loan",
  Overdraft: "Overdraft",
  "Student Loan": "Student loan",
};

/** The type line under a card's name, or null when the name already says it, as on web. */
export function typeLabel(type: string, name: string): string | null {
  const label = TYPE_LABEL[type] ?? type;
  return label.toLowerCase() === name.toLowerCase() ? null : label;
}

/** "Account 2 of 6". */
export function progressText(position: number, total: number): string {
  return `Account ${position} of ${total}`;
}

/** The figure "No change" keeps: the saved current balance (D22), or no figure yet. */
export function lastFigureText(lastValue: number | null): string {
  if (lastValue === null) return "No balance recorded yet";
  return `Current balance: ${wholePounds(lastValue)}`;
}

/** "Recorded in October 2026", or nothing recorded before this month. */
export function lastMonthText(lastMonth: CheckInMonth | null): string {
  return lastMonth ? `Recorded in ${monthLabel(lastMonth)}` : "No earlier month recorded";
}

/**
 * What a screen reader says for a card, as one group (plan 9.6 acceptance 11):
 * "Current account, £1,204, recorded in October 2026, account 2 of 6".
 */
export function cardSummary(input: {
  name: string;
  figure: number | null;
  lastMonth: CheckInMonth | null;
  position: number;
  total: number;
  /** The type line, when it is shown. */
  type?: string | null;
  outsideNetWorth?: boolean;
}): string {
  const parts = [input.name];
  if (input.type) parts.push(input.type);
  parts.push(input.figure === null ? "no balance recorded yet" : wholePounds(input.figure));
  if (input.lastMonth) parts.push(`recorded in ${monthLabel(input.lastMonth)}`);
  if (input.outsideNetWorth) parts.push("not counted in net worth");
  parts.push(`account ${input.position} of ${input.total}`);
  return parts.join(", ");
}

/** "From your interest rate of 4.5% and monthly payment of £1,250 since October 2026." */
export function calculatedExplain(c: CalculatedFigure): string {
  // As many decimals as the saved rate has, up to two: 4%, 4.5%, 4.25% (web's maximumFractionDigits).
  const r = c.interestRate;
  const digits = Number.isInteger(r) ? 0 : Number.isInteger(Math.round(r * 1000) / 100) ? 1 : 2;
  const pct = formatPercent(r, { fractionDigits: digits });
  const pay = formatCurrency(c.monthlyPayment, "GBP", {
    fractionDigits: Math.round(c.monthlyPayment * 100) % 100 === 0 ? 0 : 2,
  });
  return `From your interest rate of ${pct} and monthly payment of ${pay} since ${monthLabel(c.baseMonth)}.`;
}

/** The statement prompt's words. Plain, no alarm. */
export function statementPromptText(p: StatementPrompt): string {
  return p.kind === "fixedRateEnded"
    ? `Your fixed rate ended in ${monthLabel(p.endedMonth)}, so the rate may have changed. Worth checking it against a statement.`
    : "It has been a year since you entered this balance yourself. Worth checking it against a statement.";
}

/** A done card: "Updated £3,400", "No change" or "Calculated £185,447". */
export function doneText(kind: "updated" | "noChange" | "calculated", value: number): string {
  if (kind === "noChange") return CHECK_IN.noChange;
  if (kind === "calculated") return `${CHECK_IN.calculated} ${wholePounds(value)}`;
  return `Updated ${wholePounds(value)}`;
}

/**
 * The one-press keep (E38 S1, owner approved 20 November 2026): "Keep all 6 balances as they are"
 * when it covers every account, otherwise "Keep the other 4 balances as they are".
 */
export function keepRestLabel(count: number, all: boolean): string {
  const noun = count === 1 ? "balance" : "balances";
  return all
    ? `Keep all ${count} ${noun} as they are`
    : `Keep the other ${count} ${noun} as they are`;
}

/** Said once the keep is saved. */
export function keptText(count: number): string {
  if (count === 1) return "1 balance kept as it is. You can still change it.";
  return `${count} balances kept as they are. You can still change any of them.`;
}

/** The summary heading: "November is checked in." Celebrates the action, never the amount. */
export function checkedInText(month: CheckInMonth): string {
  return `${monthName(month)} is checked in.`;
}

/** One change in the summary: "£3,400 to £3,450", or the new figure alone with nothing before. */
export function changeText(previous: number | null, value: number): string {
  if (previous === null) return wholePounds(value);
  return `${wholePounds(previous)} to ${wholePounds(value)}`;
}

/** The line under net worth: "Up £1,250 on October 2026." The same sentence both ways (R1). */
export function netWorthChangeText(change: number | null, since: CheckInMonth): string | null {
  if (change === null) return null;
  const rounded = Math.round(change);
  if (rounded === 0) return `The same as ${monthLabel(since)}.`;
  const direction = rounded > 0 ? "Up" : "Down";
  return `${direction} ${formatCurrency(Math.abs(rounded))} on ${monthLabel(since)}.`;
}

/** "+£1,200", "−£300" or "£0". */
function signedChange(change: number): string {
  const rounded = Math.round(change);
  if (rounded === 0) return "£0";
  const body = formatCurrency(Math.abs(rounded));
  return rounded > 0 ? `+${body}` : `−${body}`;
}

/** Web's "Month in brief" (E35 Set 3): plain facts after a check-in, the same both ways. */
export function monthInBrief(
  month: CheckInMonth,
  summary: {
    change: number | null;
    debtsChange?: number | null;
    accountsAdded?: number;
    changed: readonly unknown[];
  },
): { heading: string; facts: string[] } | null {
  const facts: string[] = [];
  if (summary.change !== null) facts.push(`Net worth changed by ${signedChange(summary.change)}.`);
  if (summary.debtsChange !== null && summary.debtsChange !== undefined) {
    facts.push(`Debts changed by ${signedChange(summary.debtsChange)}.`);
  }
  const added = summary.accountsAdded ?? 0;
  if (added === 1) facts.push("One account added.");
  else if (added > 1) facts.push(`${added} accounts added.`);
  else if (summary.changed.length > 0) {
    const n = summary.changed.length;
    facts.push(`${n} ${n === 1 ? "account" : "accounts"} updated.`);
  } else if (facts.length > 0) facts.push("No accounts added.");
  if (facts.length === 0) return null;
  return { heading: `${monthName(month)} in brief`, facts };
}
