/**
 * What Home shows (E12 S5, plan 9.8), as one state: loading, not set up, an error with the reason
 * and a way to try again, or ready with the net worth hero (null with no accounts yet). It reads
 * the check-in's four queries (`useCheckInData`), so Home makes no request of its own, and every
 * figure comes from an engine selector that web's Home calls too: the app adds and subtracts
 * nothing.
 */
import {
  type NetWorthChange,
  type NetWorthLeftOut,
  type NetWorthTrend,
  PortfolioSnapshot,
  selectNetWorth,
  selectNetWorthChange,
  selectNetWorthTrend,
  selectSavedNetWorthSeries,
} from "@flump/finance-engine/net-worth";
import { useMemo } from "react";
import { useCheckInQueries } from "../../data/checkIn";
import { type CheckInDataState, useCheckInData } from "../check-in/useCheckInData";

interface NetWorthHero {
  /** Today's net worth under the person's choices. */
  netWorth: number;
  /** Against the latest recorded month before this one; null when none is recorded. */
  change: NetWorthChange | null;
  /** The last recorded months' bars; null below three months or when every month is equal. */
  trend: NetWorthTrend | null;
  /** What the figure leaves out, in display order. */
  leftOut: NetWorthLeftOut[];
  /** Net worth counts the person's own home estimate (web's `homeCounted`). */
  homeCounted: boolean;
  /** The Europe/London month, "YYYY-MM". */
  currentMonth: string;
}

export type HomeDataState =
  | { status: "loading" }
  | { status: "notSetUp" }
  | Extract<CheckInDataState, { status: "error" }>
  /** `hero` is null with no accounts yet: an empty prompt, never £0. */
  | { status: "ready"; hero: NetWorthHero | null };

type Rows<T> = T extends { data?: infer D } ? NonNullable<D> : never;
type Accounts = Rows<ReturnType<typeof useCheckInQueries>["accounts"]>;
type Details = Rows<ReturnType<typeof useCheckInQueries>["details"]>;

/** The hero from the saved rows, as web's Home loader and `HomeDashboard` build it. */
function selectNetWorthHero(
  accounts: Accounts,
  details: Details,
  basis: Parameters<typeof selectNetWorth>[1],
  currentMonth: string,
): NetWorthHero | null {
  if (accounts.length === 0) return null;
  const totals = selectNetWorth(new PortfolioSnapshot([...accounts], [...details]), basis);
  const series = selectSavedNetWorthSeries(accounts, details, currentMonth, basis);
  return {
    netWorth: totals.netWorth,
    change: selectNetWorthChange(totals.netWorth, series, currentMonth),
    trend: selectNetWorthTrend(series),
    leftOut: totals.leftOut,
    homeCounted: totals.homeEstimate > 0 && !totals.leftOut.includes("property"),
    currentMonth,
  };
}

export function useHomeData(now: () => Date = () => new Date()): {
  home: HomeDataState;
  checkIn: CheckInDataState;
} {
  const checkIn = useCheckInData(now);
  // The same cached answers the check-in state was built from, typed as the API sends them.
  const { accounts, details } = useCheckInQueries();
  const ready = checkIn.status === "ready" ? checkIn.inputs : null;
  const a = accounts.data;
  const d = details.data;
  const hero = useMemo(
    () => (ready && a && d ? selectNetWorthHero(a, d, ready.basis, ready.month) : null),
    [ready, a, d],
  );
  if (checkIn.status !== "ready") return { home: checkIn, checkIn };
  return { home: { status: "ready", hero }, checkIn };
}
