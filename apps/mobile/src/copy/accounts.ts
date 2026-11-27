/**
 * The accounts list, account page and net worth history words (E12 S6, plan section 9.9), copied
 * from web so both apps say the same: `AccountsGroupList`, `AccountsContainer`,
 * `AccountDetailContainer`, `AccountDetails`, `AccountDetailChart`, `SnapshotHistoryPage`,
 * `snapshotModel` and `snapshotCopy`. Web's `accountsCopyParity.test.tsx` pins each one to web's
 * own. Replaced by `packages/copy` when P5 lands.
 *
 * Copy guide rules: plain en-GB, sentence case, no exclamation marks. A change reads the same
 * whichever way it went, a debt is an amount owed, and nothing grades the figure or the person
 * (advice policy R1). Every figure comes from the engine; these functions only format it.
 */
import {
  categorizeAccountType,
  jointShareLabel,
  type NetWorthLeftOut,
  type RecordedMonthComparison,
} from "@flump/finance-engine/accounts";
import { formatCurrency, formatMonthYear } from "@flump/format";
import { HOME, leftOutSentence } from "./home";

/* The list (web's `AccountsGroupList` and `AccountsContainer`) */

export const ACCOUNTS = {
  /** The list's hero label: the total of what is listed, under the person's choices. */
  heroLabel: "Total of the accounts listed",
  seeHowItHasChanged: "See how it has changed",
  startCheckIn: "Start monthly check-in",
  ownTitle: "What you own",
  ownDescription: "Money and property you own, from your saved balances.",
  ownTotal: "Total you own",
  oweTitle: "What you owe",
  oweDescription: "Your debts, from your saved balances.",
  oweTotal: "Total you owe",
  notCountedTitle: "Not counted in net worth",
  notCountedDescription: "Accounts your net worth choices leave out.",
  emptyTitle: "No accounts yet",
  emptyDescription: "Add a current account, savings or pension and your totals will appear here.",
  /** Web's "Add an account" opens a form; here it opens the website until S8, and says so. */
  addAccount: HOME.addAccount,
  loading: "Loading your accounts",
} as const;

/** The repayment facts said with a student loan. */
export const STUDENT_LOAN_FACTS =
  "Repayments come out of your pay as you earn, and any balance left at the end of the repayment term is written off.";

/** Web's `studentLoanFootnote`: the footnote follows the person's choice; the facts stay. */
export const studentLoanFootnote = (counted: boolean): string =>
  counted
    ? `Student loans are in this total and your net worth. ${STUDENT_LOAN_FACTS}`
    : `Student loans are not in your net worth. ${STUDENT_LOAN_FACTS}`;

/** Web's `TYPE_LABEL`: plain names for the stored types. */
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

/** Web's `ACCOUNT_SUBTYPE_LABEL`. */
const ACCOUNT_SUBTYPE_LABEL: Readonly<Record<string, string>> = {
  easy_access: "Easy access savings",
  notice: "Notice savings",
  regular_saver: "Regular saver",
  fixed_term: "Fixed term savings",
  general_savings: "General savings",
  cash_isa: "Cash ISA",
  lifetime_isa: "Lifetime ISA (LISA)",
  stocks_and_shares_isa: "Stocks and shares ISA",
  general_investment: "General investment account",
  residential_mortgage: "Residential mortgage",
  btl_mortgage: "Buy-to-let (BTL) mortgage",
  home: "Home",
  rental: "Rental property",
  car_finance: "Car finance or HP",
  buy_now_pay_later: "Buy now, pay later",
  other_loan: "Personal or other loan",
};

/** The subtype's label, else the type's, else the type as stored (an unknown type, section 4.9). */
function typeLabel(row: { type: string; accountSubtype?: string | null }): string {
  const subtypeLabel = row.accountSubtype ? ACCOUNT_SUBTYPE_LABEL[row.accountSubtype] : undefined;
  return subtypeLabel || TYPE_LABEL[row.type] || row.type;
}

/**
 * Web's account page subline (`typeSubtitle` in `AccountDetailContainer`): the type under the
 * name, unless the name contains it. "Barclaycard" reads "Credit card"; "Residential mortgage"
 * hides "Mortgage". Unlike the list's type line, a name that only contains the type hides it.
 */
export function accountTypeSubtitle(account: {
  name: string;
  type: string;
  accountSubtype?: string | null;
}): string | null {
  const label = typeLabel(account);
  return account.name.toLowerCase().includes(label.trim().toLowerCase()) ? null : label;
}

/** What a row's type line reads. `sharePercent` is the engine's `resolveAccountSharePercent`. */
export interface TypeLineInput {
  name: string;
  type: string;
  accountSubtype?: string | null;
  ownership?: string;
  sharePercent?: number;
}

/**
 * Web's `typeLine`: the type under the name, unless the name already says it ("Current account"),
 * then "Joint, 50%" for a joint account, joined with " · ". Null when there is nothing to say. An
 * unknown type shows as stored (section 4.9: the row keeps its name and balance).
 */
export function typeLine(row: TypeLineInput): string | null {
  const label = typeLabel(row);
  const baseType = label.trim().toLowerCase() === row.name.trim().toLowerCase() ? null : label;
  const jointLabel = jointShareLabel(row);
  if (baseType && jointLabel) return `${baseType} · ${jointLabel}`;
  return baseType || jointLabel;
}

/** Web's "Show data" drawer under a chart, which reads "Hide data" while open. */
export const SHOW_DATA = { show: "Show data", hide: "Hide data" } as const;

/* The account page (web's `AccountDetailContainer`, `AccountDetails`, `AccountDetailChart`) */

export const ACCOUNT = {
  balanceLabel: "Current balance",
  owedLabel: "Amount owed",
  notCounted: "Not counted in your net worth.",
  historyTitle: "Balance history",
  /** Web's `HISTORY_DESCRIPTION`, for an account held alone. */
  historyDescription: "This account's balance each month, as recorded.",
  noHistoryTitle: "No balance history yet",
  noHistoryDescription: "Record this account's balance each month and its history shows here.",
  chartNotEnough: "The chart appears once this account has more monthly balances.",
  carriedEnd: "The dashed end is this month's saved balance, not yet recorded.",
  /** Web's Edit button opens a dialog; here it opens the account on the website until S8. */
  edit: "Edit this account on the website",
  /**
   * Mobile-only words, with no web equivalent (web does all of these on the page): what the app
   * leaves to the website for now, shown whatever the build's configuration, so the page says it
   * even when the link can only say "Open the Flump website".
   */
  onWebsite:
    "Editing this account, updating its balance, goals and the estimated return are on the Flump website for now.",
  /** Web's `ownerPageFor` link words, on the website until the app has the page (S11, S12). */
  seeMortgage: "See your mortgage on the website",
  seeDebts: "See your debts on the website",
  notFound: "We cannot find that account.",
  backToAccounts: "Back to accounts",
  /** The header while the account's name is not known. */
  titleFallback: "Account",
  loading: "Loading this account",
  savedBalance: "Saved balance",
  calculated: "Calculated",
  confirmed: "Confirmed",
  /** A month typed by hand, as web's "Show data" table and history's month list say. */
  recorded: "Recorded",
} as const;

/**
 * Web's `ownerPageFor`: the page that owns this account's detail. A mortgage's is the mortgage
 * page, a debt's or student loan's the debts page; null for anything else.
 */
export function ownerPageFor(type: string): "mortgage" | "debts" | null {
  const category = categorizeAccountType(type);
  if (category === "mortgages") return "mortgage";
  if (category === "debt" || category === "studentLoans") return "debts";
  return null;
}

/** "October 2026" for "2026-10". */
function monthLabel(month: string): string {
  return formatMonthYear(`${month}-01`, { month: "long" });
}

/** "October" for "2026-10". */
function monthName(month: string): string {
  const label = monthLabel(month);
  return label.split(" ")[0] ?? label;
}

const key = (month: number, year: number) => `${year}-${String(month).padStart(2, "0")}`;

/** Whole pounds, rounded by Intl as on web: "£52,100", "-£6,400". */
export function pounds(value: number): string {
  return formatCurrency(value);
}

/** The figure's size only, for words that carry the direction ("Up £300"). */
const size = (value: number) => pounds(value).replace(/^-/, "");

/**
 * Web's `balanceDateLine`: dates the account hero's figure. "As of October" when it is not from
 * this month, "Calculated for November" for a calculated balance, nothing for a figure recorded
 * this month, and "No monthly balances recorded yet" with no history.
 */
export function balanceDateLine(
  current: { month: number; year: number },
  latest: { month: number; year: number; source?: string | null } | null,
): string | null {
  if (!latest) return "No monthly balances recorded yet";
  const name = monthName(key(latest.month, latest.year));
  const words = latest.year === current.year ? name : `${name} ${latest.year}`;
  if (latest.source === "calculated") return `Calculated for ${words}`;
  const isCurrent = latest.month === current.month && latest.year === current.year;
  return isCurrent ? null : `As of ${words}`;
}

/** Web's `sentences` under the account hero: a full stop between sentences; null with none. */
export function heroSentences(...parts: (string | null)[]): string | null {
  const said = parts.filter((part): part is string => Boolean(part));
  if (said.length === 0) return null;
  if (said.length === 1) return said[0] ?? null;
  return said.map((part) => (part.endsWith(".") ? part : `${part}.`)).join(" ");
}

/**
 * Web's `accountSourceLabel`: how a month's figure was given, beside it in the month list, as the
 * "Show data" table's Source column. A month typed by hand is "Recorded".
 */
export function accountMonthNote(point: { source?: string | null; carried?: true }): string {
  if (point.carried) return ACCOUNT.savedBalance;
  if (point.source === "calculated") return ACCOUNT.calculated;
  if (point.source === "confirmed") return ACCOUNT.confirmed;
  return ACCOUNT.recorded;
}

/**
 * Web's `changeSinceSentence`, over the engine's `selectSeriesChange`: "Up £15,000 since May
 * 2026.", "Down £1,200 since May 2026." or "No change since May 2026.". Empty with no change.
 */
function changeSinceSentence(firstMonth: string | null, change: number | null): string {
  if (firstMonth === null || change === null) return "";
  const since = `since ${monthLabel(firstMonth)}.`;
  if (change === 0) return `No change ${since}`;
  return `${change > 0 ? "Up" : "Down"} ${size(change)} ${since}`;
}

/** Web's `accountChartSummary`: the change since the first month, then the dashed end. */
export function accountChartSummary(
  firstMonth: string | null,
  change: number | null,
  endCarried: boolean,
): string {
  return [changeSinceSentence(firstMonth, change), endCarried ? ACCOUNT.carriedEnd : ""]
    .filter(Boolean)
    .join(" ");
}

/** "November 2026" for a series point. */
export const pointMonth = (point: { month: number; year: number }) =>
  monthLabel(key(point.month, point.year));

/* Net worth history (web's `SnapshotHistoryPage`, `snapshotModel`, `snapshotCopy`) */

export const HISTORY = {
  title: "Net worth history",
  /** The check-in button once this month's check-in is done (web's `currentMonthRecorded`). */
  seeCheckIn: "See this month's check-in",
  description: "Your net worth, recorded once a month.",
  heroLabel: "Net worth change",
  noChangeLabel: "Monthly change",
  noChangePrompt: "The change shows once you have two months recorded.",
  noEarlierMonth: "No earlier month",
  chartTitle: "Net worth over time",
  chartDescription: "Your net worth each month, from your recorded balances.",
  earlierCarried: "Months with no check-in show as a dashed line.",
  endCarried: "The dashed end is this month's saved balances, not yet recorded.",
  emptyTitle: "No monthly balances yet",
  emptyWithAccounts:
    "Record this month's balances to start your history. You can add earlier months too.",
  emptyNoAccounts:
    "Add your accounts first. Their balances then become your first month of history.",
  /** Web's "Add earlier months" opens a form; here it opens the website until S8. */
  addEarlierMonths: "Add earlier months on the website",
  /**
   * Mobile-only words, with no web equivalent (web adds earlier months on the page): shown
   * whatever the build's configuration, so the page says it even beside "Open the Flump website".
   */
  onWebsite: "Adding earlier months is on the Flump website for now.",
  showChanges: "Show changes by account",
  hideChanges: "Hide changes by account",
  effectOnNetWorth: "Effect on net worth",
  owed: " (owed)",
  carriedForward: "Carried forward",
  recorded: "Recorded",
  loading: "Loading your net worth history",
} as const;

const MONTH_WORDS = ["no months", "one month", "two months"] as const;

/** Web's `fewMonthsPrompt`: "You have one month of history. The chart appears after your third check-in." */
export const fewMonthsPrompt = (recordedMonths: number): string =>
  `You have ${MONTH_WORDS[recordedMonths] ?? `${recordedMonths} months`} of history. The chart appears after your third check-in.`;

/** Web's `comparedMonthsText`: "September to October 2026", or across a year with both years. */
export const comparedMonthsText = (comparison: RecordedMonthComparison): string => {
  const { previousMonth: from, month: to } = comparison;
  return from.year === to.year
    ? `${from.name} to ${to.name} ${to.year}`
    : `${from.name} ${from.year} to ${to.name} ${to.year}`;
};

/** Web's `notRecordedPrompt`: "November check-in not done yet". */
export const notRecordedPrompt = (currentMonthName: string): string =>
  `${currentMonthName} check-in not done yet`;

/** Web's `basisSentence`: what net worth leaves out, or the missing home value in its place. */
export const basisSentence = (leftOut: readonly NetWorthLeftOut[]): string =>
  leftOut.includes("homeValueMissing") ? HOME.homeValueMissing : leftOutSentence(leftOut);

/** Web's history `sentences`: one space between, a full stop added where one is missing. */
export const sentences = (...parts: readonly string[]): string => {
  const kept = parts.filter(Boolean);
  return kept
    .map((p, i) => (i < kept.length - 1 && !(p.endsWith(".") || p.endsWith("?")) ? `${p}.` : p))
    .join(" ");
};

/** Web's `chartSummary` words: the change since the first month, then the dashed months. */
export function historyChartSummary(
  firstMonth: string | null,
  change: number | null,
  earlierCarried: boolean,
  endCarried: boolean,
): string {
  return sentences(
    changeSinceSentence(firstMonth, change),
    earlierCarried ? HISTORY.earlierCarried : "",
    endCarried ? HISTORY.endCarried : "",
  );
}

/** Web's summary below three recorded months: "Net worth recorded for October 2026: £11,700." */
export const recordedForSentence = (month: string, netWorth: number): string =>
  `Net worth recorded for ${monthLabel(month)}: ${pounds(netWorth)}.`;

/** "November 2026" for "2026-11" (web's `formatMonth`). */
export const formatMonth = monthLabel;

/** Web's "Next check-in: 28 November 2026", from the engine's "YYYY-MM-DD". */
export function nextCheckInLine(date: string): string {
  const day = Number(date.slice(8, 10));
  return `Next check-in: ${day} ${monthLabel(date.slice(0, 7))}`;
}

/** Web's caption over the changes by account: "Change by account, September 2026 to October 2026". */
export const changeByAccountCaption = (previousMonth: string, month: string): string =>
  `Change by account, ${monthLabel(previousMonth)} to ${monthLabel(month)}`;

/** Web's `formatSignedChange`: "+£1,200", "−£300" (a true minus sign) or "£0". */
export function formatSignedChange(change: number): string {
  const text = pounds(change);
  if (text === "£0") return "£0";
  return text.startsWith("-") ? `−${text.slice(1)}` : `+${text}`;
}

/** Web's `spokenChange`: "up £1,200", "down £300" or "no change". */
export function spokenChange(change: number): string {
  const text = pounds(change);
  if (text === "£0") return "no change";
  return `${text.startsWith("-") ? "down" : "up"} ${size(change)}`;
}

/** Web's `historySourceLabel`: how this month's figure was given, when not typed. */
export function historySourceLabel(source: string | null | undefined): string | undefined {
  if (source === "calculated") return "Calculated";
  if (source === "confirmed") return "Confirmed";
  return undefined;
}
