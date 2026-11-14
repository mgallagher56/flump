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
