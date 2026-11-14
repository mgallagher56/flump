import { formatMonth } from "~/features/snapshot/snapshotModel";
import type { CommitPlan, ImportStatus, PreviewRow } from "./importModel";

/** Copy for the import review (E17 re-plan PR E). Neutral and factual; en-GB. */

export const formatCount = (n: number) => new Intl.NumberFormat("en-GB").format(n);

const plural = (n: number, one: string, other: string) =>
  `${formatCount(n)} ${n === 1 ? one : other}`;

export const balancesLabel = (n: number) => plural(n, "monthly balance", "monthly balances");
export const accountsLabel = (n: number) => plural(n, "account", "accounts");

export const STATUS_LABEL: Record<ImportStatus, string> = {
  staged: "Ready to review",
  committed: "Saved",
  reverted: "Undone",
  expired: "Expired",
};

export const STATUS_TONE: Record<ImportStatus, "info" | "positive" | "neutral" | "warning"> = {
  staged: "info",
  committed: "positive",
  reverted: "neutral",
  expired: "warning",
};

export function reviewDescription(
  balances: number,
  accounts: number,
  range: { from: string; to: string } | null,
): string {
  const span = range
    ? range.from === range.to
      ? `, ${formatMonth(range.from)}`
      : `, ${formatMonth(range.from)} to ${formatMonth(range.to)}`
    : "";
  return `${balancesLabel(balances)} for ${accountsLabel(accounts)}${span}. Nothing is saved until you confirm.`;
}

export const expiryLine = (days: number) =>
  days <= 0
    ? "This import expires today."
    : `This import expires in ${plural(days, "day", "days")}.`;

export const NEW_ACCOUNT_OPTION = "Create a new account";

export const MAPPING_HELP =
  "Choose where each account in the import goes. New accounts are created when you confirm.";

/** Where an existing value came from, for the replace tick. */
function sourceLabel(source: string | null): string {
  switch (source) {
    case "manual":
    case "onboarding":
      return "the value you entered";
    case "connected":
      return "the value from your bank";
    case "agent":
      return "the value from an earlier import";
    default:
      return "the saved value";
  }
}

/** The tick label on a flagged row. `prior` is already formatted. */
export function replaceLabel(row: PreviewRow, prior: string | null): string {
  if (row.prior === null || prior === null) {
    return "Record this value instead of this month's bank balance";
  }
  return `Replace ${sourceLabel(row.priorSource)} (${prior})`;
}

export function rowStatusLabel(row: PreviewRow): string {
  if (row.status === "unchanged") return "No change";
  if (row.status === "new") return "New";
  return "Replaces";
}

export function planSentence(plan: CommitPlan): string {
  const parts = [
    `${plural(plan.new, "new balance", "new balances")}`,
    `${formatCount(plan.overwrite)} replaced`,
    `${formatCount(plan.unchanged)} unchanged`,
  ];
  if (plan.kept > 0) parts.push(`${formatCount(plan.kept)} skipped`);
  return `${parts.join(", ")}.`;
}

export const FLAGGED_HELP =
  "These rows would replace a value already saved in Flump, or this month's balance from your bank. They are skipped unless you tick them.";

export const commitButtonLabel = (n: number) =>
  n === 0 ? "Nothing to save" : `Save ${balancesLabel(n)}`;

export const COMMIT_ERROR =
  "The import could not be saved. Nothing has changed. Try again in a moment.";
export const PREVIEW_ERROR =
  "The changes could not be loaded for this choice of accounts. Try again in a moment.";
export const REVERT_ERROR =
  "The import could not be undone. Nothing has changed. Try again in a moment.";

export const UNDO_CONFIRM =
  "Balances this import replaced go back to what they were before, and balances it added are removed. Any that have changed since stay as they are, and new accounts it created are removed if nothing else uses them.";

export const invalidRowsLine = (n: number) =>
  `${formatCount(n)} ${n === 1 ? "row in the import was" : "rows in the import were"} not valid (for example a future month) and will not be saved.`;

export function savedSentence(counts: {
  new?: number | null;
  overwrite?: number | null;
  unchanged?: number | null;
  skipped?: number | null;
}): string {
  const n = (v: number | null) => v ?? 0;
  const parts = [
    `${plural(n(counts.new), "new balance", "new balances")} saved`,
    `${formatCount(n(counts.overwrite))} replaced`,
    `${formatCount(n(counts.unchanged))} unchanged`,
  ];
  if (n(counts.skipped) > 0) parts.push(`${formatCount(n(counts.skipped))} skipped`);
  return `${parts.join(", ")}.`;
}

export function undoneSentence(r: { restored: number; removed: number; kept: number }): string {
  const parts = [`${formatCount(r.restored)} restored`, `${formatCount(r.removed)} removed`];
  if (r.kept > 0) parts.push(`${formatCount(r.kept)} left as they are now`);
  return `Import undone: ${parts.join(", ")}.`;
}

export const EXPIRED_TITLE = "This import has expired";
export const EXPIRED_BODY =
  "Imports wait 7 days for review and are then cleared. Nothing from this one was saved. Ask your assistant to prepare it again if you still want it.";

export const LIST_DESCRIPTION =
  "Balances prepared for you to review, for example by an AI assistant. Nothing is saved until you confirm. Imports not confirmed within 7 days are cleared.";
export const LIST_EMPTY_TITLE = "No imports yet";
export const LIST_EMPTY_BODY =
  "When an AI assistant you have connected prepares an import, it appears here for you to review.";

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Europe/London",
  }).format(new Date(iso));
}
