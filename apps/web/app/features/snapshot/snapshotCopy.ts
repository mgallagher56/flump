import { formatMonth, type MonthKey } from "./snapshotModel";

/**
 * Snapshot copy (E30). Changes are worded the same whether a figure went up or down (advice policy
 * R1): the sign is the only difference. No streaks, no "behind" or "overdue" wording, and nothing
 * that grades a balance (copy style guide 7b).
 */

const gbp = (fractionDigits: number) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits,
  });

/** "+£1,200", "−£300" (a true minus sign) or "£0". */
export function formatSignedChange(change: number): string {
  const rounded = Math.round(change);
  if (rounded === 0) return "£0";
  const body = gbp(0).format(Math.abs(rounded));
  return rounded > 0 ? `+${body}` : `−${body}`;
}

/** "Net worth changed by +£1,200 since October 2026." The same sentence in both directions. */
export function netWorthChangeSentence(change: number, since: MonthKey): string {
  return `Net worth changed by ${formatSignedChange(change)} since ${formatMonth(since)}.`;
}

/** Screen-reader text for a change: "up £1,200", "down £300", "no change". */
export function spokenChange(change: number): string {
  const rounded = Math.round(change);
  if (rounded === 0) return "no change";
  return `${rounded > 0 ? "up" : "down"} ${gbp(0).format(Math.abs(rounded))}`;
}

export function savedToast(
  month: MonthKey,
  saved: number,
  skipped: number,
): { title: string; description?: string } {
  const label = formatMonth(month);
  if (skipped === 0) return { title: `Balances saved for ${label}` };
  return {
    title: `${saved} ${saved === 1 ? "balance" : "balances"} saved for ${label}`,
    description: "Accounts you left empty keep their earlier values. You can add them any time.",
  };
}

export const SAVE_ERROR_TOAST = {
  title: "We could not save your balances",
  description: "Nothing has changed. Try again.",
} as const;

export function statusText(
  status: "connected" | "recorded" | "notUpdated" | "noHistory",
  month: MonthKey,
  lastRecordedMonth: MonthKey | null,
): string {
  switch (status) {
    case "connected":
      return "Connected: updates from your bank";
    case "recorded":
      return `Recorded for ${formatMonth(month)}`;
    case "notUpdated":
      return lastRecordedMonth
        ? `Not updated since ${formatMonth(lastRecordedMonth)}`
        : "No balance recorded yet";
    default:
      return "No balance recorded yet";
  }
}

/**
 * The account-by-account check-in (R2-5). The same words on a phone card and in the desktop
 * list. Nothing grades a balance or the person: "Updated", "No change" and "Calculated" are
 * statements of how a figure was given.
 */
export const CHECK_IN_COPY = {
  description: "Update each balance or keep it as it is. Each one saves as you go.",
  update: "Update",
  noChange: "No change",
  keep: "Keep this figure",
  enterDifferent: "Enter a different figure",
  calculated: "Calculated",
  rest: "No change to the rest",
  change: "Change",
  back: "Back",
  next: "Next",
  saving: "Saving…",
  newBalance: "New balance",
  owedNow: "Amount owed now",
  stepError: "We could not save this balance. Nothing has changed. Try again.",
  restError: "We could not save these balances. Nothing has changed. Try again.",
  tryAgain: "Try again",
  whatChanged: "What changed",
  showAll: "Show all",
  done: "Done",
  changeBalance: "Change a balance",
  empty: "Add an account first, then its balance appears here.",
} as const;

/** "£3,360", or "£3,412.50" when the figure has pence (a true minus when negative). */
export function checkInMoney(value: number): string {
  const pence = Math.round(Math.abs(value) * 100) % 100 !== 0;
  const body = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: pence ? 2 : 0,
    maximumFractionDigits: pence ? 2 : 0,
  }).format(Math.abs(value));
  return value < 0 ? `−${body}` : body;
}

/** A calculated figure is read in whole pounds: "£185,447". */
export function checkInWholePounds(value: number): string {
  return gbp(0).format(Math.round(value));
}

/** "3 of 8". */
export function checkInProgress(position: number, total: number): string {
  return `${position} of ${total}`;
}

/** The figure "No change" keeps: the saved current balance (D22), or no figure yet. */
export function lastFigureText(lastValue: number | null): string {
  if (lastValue === null) return "No balance recorded yet";
  return `Current balance: ${checkInMoney(lastValue)}`;
}

/** A done step: "Updated £3,400", "No change" or "Calculated £185,447". */
export function doneText(kind: "updated" | "noChange" | "calculated", value: number): string {
  if (kind === "noChange") return CHECK_IN_COPY.noChange;
  if (kind === "calculated") return `${CHECK_IN_COPY.calculated} ${checkInWholePounds(value)}`;
  return `Updated ${checkInMoney(value)}`;
}

/** "Check-in saved for November 2026" (a heading: no full stop). */
export function checkInSavedText(month: MonthKey): string {
  return `Check-in saved for ${formatMonth(month)}`;
}

/** "No balances changed since October 2026." */
export function noBalancesChangedText(since: MonthKey): string {
  return `No balances changed since ${formatMonth(since)}.`;
}

/**
 * "Net worth: £231,400, up £1,250 on October 2026." The same sentence in both directions (R1);
 * with nothing to compare it states the figure alone.
 */
export function checkInNetWorthText(
  netWorth: number,
  change: number | null,
  since: MonthKey,
): string {
  const whole = Math.round(netWorth);
  // A true minus sign on a negative total (copy guide 4.1).
  const total = whole < 0 ? `−${gbp(0).format(-whole)}` : gbp(0).format(whole);
  if (change === null) return `Net worth: ${total}.`;
  const rounded = Math.round(change);
  if (rounded === 0) return `Net worth: ${total}, the same as ${formatMonth(since)}.`;
  const direction = rounded > 0 ? "up" : "down";
  return `Net worth: ${total}, ${direction} ${gbp(0).format(Math.abs(rounded))} on ${formatMonth(since)}.`;
}
