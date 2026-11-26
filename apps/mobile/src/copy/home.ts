/**
 * Home's net worth words (E12 S5, plan section 9.8), copied from web so both apps say the same:
 * `HomeDashboard` (the hero labels and the empty prompt), `NetWorthBasisLine`, `netWorthDelta` (the
 * change line) and `NetWorthTrendBars` (what a screen reader hears for the bars). Web's
 * `homeCopyParity.test.ts` pins each one to web's own. Replaced by `packages/copy` when P5 lands.
 *
 * Copy guide rules: plain en-GB, sentence case, no exclamation marks. A change reads the same
 * whichever way the figure moved, and nothing grades the figure or the person (advice policy R1).
 * The figures come from the engine; these functions only format them.
 */
import type {
  NetWorthChange,
  NetWorthLeftOut,
  NetWorthTrendBar,
} from "@flump/finance-engine/net-worth";
import { joinNetWorthLeftOut } from "@flump/finance-engine/net-worth";
import { formatCurrency, formatMonthYear } from "@flump/format";

export const HOME = {
  /** Web's `HERO_LABEL`. */
  heroLabel: "Net worth",
  /** Web's `HERO_LABEL_WITH_HOME`: net worth counts the person's own home estimate. */
  heroLabelWithHome: "Net worth, including your home estimate",
  /** Web's hero `emptyPrompt`, with no accounts yet. Never £0. */
  emptyPrompt: "Add an account to see your net worth.",
  /** Web's hero action is "Add an account"; here it opens the website until S8, and says so. */
  addAccount: "Add an account on the website",
  /** Web's `CHANGE_WHAT_COUNTS`, saying it opens the website (the choices arrive in S9). */
  changeWhatCounts: "Change what counts on the website",
  /** Web's `HOME_VALUE_MISSING_TEXT`. */
  homeValueMissing: "Your home's value is not counted until you add an estimate.",
  /** Web's `ADD_AN_ESTIMATE`, saying it opens the website (estimates arrive in S8). */
  addEstimate: "Add an estimate on the website",
  loading: "Loading your net worth",
} as const;

/** "October 2026" for "2026-10" (web's `formatMonth`). */
function monthLabel(month: string): string {
  return formatMonthYear(`${month}-01`, { month: "long" });
}

/** Whole pounds, already whole from the engine: "£52,100", "-£6,400". */
function pounds(value: number): string {
  return formatCurrency(Math.round(value));
}

/** "minus £6,400" for a negative figure, as web's `formatMoney` speaks it; otherwise the text. */
export function spokenPounds(value: number): string {
  return pounds(value).replace(/^-/, "minus ");
}

/** Web's `leftOutSentence`: "Not counting your property, mortgage or student loan." or "". */
export function leftOutSentence(leftOut: readonly NetWorthLeftOut[]): string {
  const items = joinNetWorthLeftOut(leftOut);
  return items ? `Not counting your ${items}.` : "";
}

/** Web's `sinceLabel`: "October", or "October 2025" when the month is not in the current year. */
export function sinceLabel(month: string, currentMonth: string): string {
  const label = monthLabel(month);
  if (label === "Not set") return month;
  return month.slice(0, 4) === currentMonth.slice(0, 4) ? (label.split(" ")[0] ?? label) : label;
}

type ChangeDirection = "up" | "down" | "flat";

export interface ChangeLine {
  direction: ChangeDirection;
  /** What is shown beside the arrow: "£320 since October" or "Same as October". No sign. */
  text: string;
  /** What a screen reader hears: "up £320 since October" or "same as October". */
  spoken: string;
}

/**
 * Web's `netWorthDelta` words for the engine's `selectNetWorthChange`: the arrow and its spoken
 * word carry the direction, so the text has no sign, and a fall reads like a rise.
 */
export function changeLine(change: NetWorthChange, currentMonth: string): ChangeLine {
  const since = sinceLabel(change.priorMonth, currentMonth);
  if (change.change === 0) {
    const text = `Same as ${since}`;
    return { direction: "flat", text, spoken: `same as ${since}` };
  }
  const direction = change.change > 0 ? "up" : "down";
  // The figure's size only: the arrow says which way it went.
  const text = `${pounds(change.change).replace(/^-/, "")} since ${since}`;
  return { direction, text, spoken: `${direction} ${text}` };
}

/** Web's `trendIntro`: "Net worth at your last 7 monthly check-ins, oldest first." */
export function trendIntro(count: number): string {
  return `Net worth at your last ${count} monthly check-ins, oldest first.`;
}

/** Web's `missedLine`: "No check-in for August 2026" or "No check-ins from July to September 2026". */
export function missedLine(missed: NonNullable<NetWorthTrendBar["missedBefore"]>): string {
  return missed.count === 1
    ? `No check-in for ${monthLabel(missed.from)}`
    : `No check-ins from ${monthLabel(missed.from)} to ${monthLabel(missed.to)}`;
}

/** Web's `barLine`: "November 2026, the latest: £52,100", a minus read as "minus". */
export function barLine(bar: NetWorthTrendBar): string {
  return `${monthLabel(bar.month)}${bar.latest ? ", the latest" : ""}: ${spokenPounds(bar.netWorth)}`;
}
