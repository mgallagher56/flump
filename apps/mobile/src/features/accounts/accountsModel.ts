/**
 * What the accounts list, an account's page and net worth history show (E12 S6, plan 9.9), built
 * from the saved rows exactly as web builds them: `buildAccountRows` and `AccountsGroupList`, the
 * account page's container and chart, and `buildSnapshotHistory`. Every figure comes from an
 * engine selector web calls too; this file picks rows, sorts and counts, and adds, subtracts,
 * flips and shares nothing.
 */
import {
  type AccountSeriesPoint,
  categorizeAccountType,
  isOwedAccountType,
  type NetWorthLeftOut,
  type NetWorthPoint,
  netWorthChoicesAvailable,
  type RecordedMonthComparison,
  resolveAccountOwnership,
  resolveAccountSharePercent,
  resolveNetWorthScope,
  selectAccountBalance,
  selectAccountBalanceSeries,
  selectAccountChangeEffect,
  selectAccountDeltas,
  selectAccountGroups,
  selectChartFractions,
  selectRecordedMonthComparison,
  selectSeriesChange,
} from "@flump/finance-engine/accounts";
import {
  countsTowardNetWorth,
  type NetWorthBasis,
  nextCheckInDate,
} from "@flump/finance-engine/check-in";
import {
  PortfolioSnapshot,
  selectNetWorth,
  selectSavedNetWorthSeries,
} from "@flump/finance-engine/net-worth";

/** An account as the app's loose read holds it: only `id`, `type` and `balance` are certain. */
export interface AppAccount {
  id: string;
  type: string;
  balance: number;
  name?: string;
  accountSubtype?: string | null;
  ownership?: string | null;
  sharePercent?: number | null;
  /** The saved version, sent as `If-Match` with a balance update (E12 S8). */
  updatedAt?: string | null;
}

/** A recorded month as the app's loose read holds it. */
export interface AppAccountMonth {
  accountId: string;
  year: number;
  month: number;
  value: number;
  source?: string | null;
}

/** One account in the list, as web's `AccountRow`. */
export interface AccountRow {
  id: string;
  name: string;
  type: string;
  accountSubtype: string | null;
  ownership: "sole" | "joint";
  sharePercent: number;
  /** The person's share, an amount owed as positive; undefined when no balance is known. */
  balance: number | undefined;
  /** Under what you owe but not borrowing: its balance is below zero to check (27 Nov 2026). */
  belowZeroToCheck?: true;
}

export interface AccountsList {
  netWorth: number;
  /** Everything owned that counts, from `selectNetWorth` (web's `totalOwn`). */
  totalOwn: number;
  /** Everything owed that counts (web's `totalOwe`). */
  totalOwe: number;
  /** What the basis line says is left out (web's `basisLeftOut`). */
  leftOut: readonly NetWorthLeftOut[];
  /** A net worth choice applies to these accounts, so "Change what counts" is offered. */
  choicesAvailable: boolean;
  own: AccountRow[];
  owe: AccountRow[];
  notCounted: AccountRow[];
  /** A counted student loan under "What you owe": its footnote says it is counted. */
  countedStudentLoan: boolean;
  /** A student loan in "Not counted": the repayment facts under that group. */
  leftOutStudentLoan: boolean;
}

/** This account's recorded months, as web's loader and `buildAccountRows` pick them. */
const monthsOf = (id: string, details: readonly AppAccountMonth[]) =>
  details.filter((d) => d.accountId === id);

const shareInput = (account: AppAccount) => ({
  name: account.name,
  type: account.type,
  accountSubtype: account.accountSubtype,
  ownership: account.ownership,
  sharePercent: account.sharePercent,
});

/** Web's `buildAccountRows`: one row per account, its balance from `selectAccountBalance`. */
function buildAccountRows(
  accounts: readonly AppAccount[],
  details: readonly AppAccountMonth[],
  currentMonth: string,
): AccountRow[] {
  return accounts.map((account) => {
    const { balance } = selectAccountBalance(account, monthsOf(account.id, details), currentMonth);
    return {
      id: account.id,
      name: account.name ?? "",
      type: account.type,
      accountSubtype: account.accountSubtype ?? null,
      ownership: resolveAccountOwnership(shareInput(account)),
      sharePercent: resolveAccountSharePercent(shareInput(account)),
      balance,
    };
  });
}

/**
 * The accounts list, as web's `AccountsContainer` and `AccountsGroupList` show it; null with no
 * accounts (the empty state, never £0). `homeValue` is the profile's own home estimate, which
 * keeps the home value notice away, as web's `basisLeftOut`.
 */
export function buildAccountsList(
  accounts: readonly AppAccount[],
  details: readonly AppAccountMonth[],
  basis: NetWorthBasis,
  currentMonth: string,
  homeValue: number | null,
): AccountsList | null {
  if (accounts.length === 0) return null;
  const totals = selectNetWorth(new PortfolioSnapshot([...accounts], [...details]), basis);
  const rows = buildAccountRows(accounts, details, currentMonth);
  const { own, owe, notCounted } = selectAccountGroups(rows, totals.leftOut);
  const hasHome =
    rows.some((row) => categorizeAccountType(row.type) === "property") || (homeValue ?? 0) > 0;
  const choices = netWorthChoicesAvailable(rows);
  return {
    netWorth: totals.netWorth,
    totalOwn: totals.totalAssets,
    totalOwe: totals.totalLiabilities,
    leftOut: hasHome
      ? totals.leftOut.filter((item) => item !== "homeValueMissing")
      : totals.leftOut,
    choicesAvailable: choices.property || choices.studentLoan,
    own,
    owe,
    notCounted,
    countedStudentLoan: owe.some((row) => row.type === "Student Loan"),
    leftOutStudentLoan: notCounted.some((row) => row.type === "Student Loan"),
  };
}

/** One point of a drawn line: its height as a fraction of the plot, and whether it is carried. */
interface ChartPoint {
  /** 0 is the bottom of the plot, 1 the top (the engine's `selectChartFractions`). */
  fraction: number;
  carried: boolean;
}

export interface AccountDetail {
  account: AppAccount;
  name: string;
  /** Mortgages, loans, cards, overdrafts and student loans read "Amount owed". */
  owed: boolean;
  hero: ReturnType<typeof selectAccountBalance>["hero"];
  /** The net worth choices leave this account out. */
  notCounted: boolean;
  /** The recorded months web's empty state reads: none shows "No balance history yet". */
  hasMonths: boolean;
  /** The chart's months, oldest first: the whole balance, a debt as the amount owed. */
  series: AccountSeriesPoint[];
  chart: ChartPoint[];
  /** The change from the first point to the last, whole pounds; null without two points. */
  change: number | null;
  firstMonth: string | null;
  endCarried: boolean;
  /** The Europe/London month, as numbers: the date line names a month of another year in full. */
  current: { month: number; year: number };
}

const monthKey = (point: { month: number; year: number }) =>
  `${point.year}-${String(point.month).padStart(2, "0")}`;

/** One account's page, as web's `AccountDetailContainer` and `AccountDetails`; null when not found. */
export function buildAccountDetail(
  id: string,
  accounts: readonly AppAccount[],
  details: readonly AppAccountMonth[],
  basis: NetWorthBasis,
  currentMonth: string,
): AccountDetail | null {
  const account = accounts.find((a) => a.id === id);
  if (!account) return null;
  const months = monthsOf(account.id, details);
  const { hero } = selectAccountBalance(account, months, currentMonth, {
    detailsAreThisAccounts: true,
  });
  const series = selectAccountBalanceSeries(account, months, currentMonth);
  const fractions = selectChartFractions(series.map((p) => p.value));
  const first = series[0];
  return {
    account,
    name: account.name ?? "",
    owed: isOwedAccountType(account.type),
    hero,
    notCounted: !countsTowardNetWorth(categorizeAccountType(account.type), basis),
    hasMonths: months.length > 0,
    series,
    chart: series.map((p, i) => ({ fraction: fractions[i] ?? 0.5, carried: p.carried === true })),
    change: selectSeriesChange(series),
    firstMonth: first ? monthKey(first) : null,
    endCarried: series.at(-1)?.carried === true,
    current: { month: Number(currentMonth.slice(5, 7)), year: Number(currentMonth.slice(0, 4)) },
  };
}

/** One account's change between the last two recorded months, as web's `AccountChange`. */
interface AccountChange {
  accountId: string;
  name: string;
  isLiability: boolean;
  current: number;
  /** The change's effect on net worth (`selectAccountChangeEffect`). */
  effect: number;
  carried: boolean;
  currentSource: string | null;
}

export interface NetWorthHistory {
  hasAccounts: boolean;
  series: NetWorthPoint[];
  /** Months with at least one recorded balance. */
  recordedMonths: number;
  /** The last two recorded months and the change between them; null below two. */
  comparison: RecordedMonthComparison | null;
  /** The current month, named ("November"). */
  currentMonthName: string;
  /** This month's check-in is completed (web's `currentMonthRecorded`). */
  checkedIn: boolean;
  /** What the figure leaves out, as one sentence's items (web's `basisText` input). */
  leftOut: readonly NetWorthLeftOut[];
  latestRecorded: NetWorthPoint | null;
  previousRecorded: NetWorthPoint | null;
  chart: ChartPoint[];
  change: number | null;
  firstMonth: string | null;
  earlierCarried: boolean;
  endCarried: boolean;
  accountChanges: AccountChange[];
  /** "YYYY-MM-DD", once this month's check-in is done; else null. */
  nextCheckIn: string | null;
}

/** Fewest recorded months for the net worth chart (web's `MIN_CHART_MONTHS`). */
export const MIN_CHART_MONTHS = 3;

/** Net worth history, as web's `buildSnapshotHistory` and `SnapshotHistoryPage`. */
export function buildNetWorthHistory(input: {
  accounts: readonly AppAccount[];
  details: readonly AppAccountMonth[];
  basis: NetWorthBasis;
  currentMonth: string;
  today: string;
  checkInDay: number | null;
  latestCompletedMonth: string | null;
}): NetWorthHistory {
  const { accounts, details, basis, currentMonth } = input;
  const names = new Map(accounts.map((a) => [a.id.toLowerCase(), a.name ?? ""]));
  const series = selectSavedNetWorthSeries(accounts, details, currentMonth, basis);
  const recorded = series.filter((p) => !p.allCarried);
  const latestRecorded = recorded.at(-1) ?? null;
  const previousRecorded = recorded.at(-2) ?? null;
  const { comparison, currentMonth: current } = selectRecordedMonthComparison(series, currentMonth);
  const sourceAt = (accountId: string, month: string): string | null => {
    const [y, m] = month.split("-").map(Number);
    const row = details.find(
      (d) =>
        d.accountId.toLowerCase() === accountId && Number(d.year) === y && Number(d.month) === m,
    );
    return row?.source === "calculated" || row?.source === "confirmed" ? row.source : null;
  };
  const accountChanges: AccountChange[] =
    latestRecorded && previousRecorded
      ? selectAccountDeltas(previousRecorded, latestRecorded)
          .map((d) => {
            const a = latestRecorded.accounts.find((x) => x.accountId === d.accountId);
            const isLiability = a?.isLiability ?? false;
            return {
              accountId: d.accountId,
              name: String(names.get(d.accountId) || "Account"),
              isLiability,
              current: d.current,
              effect: selectAccountChangeEffect(d.change, isLiability),
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
  const fractions = selectChartFractions(series.map((p) => p.netWorth));
  const end = series.at(-1);
  const endCarried = end?.month === currentMonth && end.allCarried;
  const checkedIn = !!input.latestCompletedMonth && input.latestCompletedMonth >= currentMonth;
  return {
    hasAccounts: accounts.length > 0,
    series,
    recordedMonths: recorded.length,
    comparison,
    currentMonthName: current.name,
    checkedIn,
    leftOut: resolveNetWorthScope(accounts, basis).leftOut,
    latestRecorded,
    previousRecorded,
    chart: series.map((p, i) => ({ fraction: fractions[i] ?? 0.5, carried: p.allCarried })),
    change: selectSeriesChange(series.map((p) => ({ value: p.netWorth }))),
    firstMonth: series[0]?.month ?? null,
    earlierCarried: series.slice(0, endCarried ? -1 : undefined).some((p) => p.allCarried),
    endCarried,
    accountChanges,
    nextCheckIn: checkedIn
      ? nextCheckInDate({
          today: input.today,
          checkInDay: input.checkInDay,
          lastRecordedMonth: currentMonth,
        })
      : null,
  };
}
