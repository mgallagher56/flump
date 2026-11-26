/**
 * What the check-in and its row read (plan 9.6), as one state: loading, an error with the reason
 * and a way to try again, or ready with the inputs the engine takes. A failure is never shown as an
 * empty list (plan section 2, failure 1): "ready" needs every read to have answered.
 */
import {
  type AccountDetailInput,
  type CheckInAccountInput,
  type CheckInMonth,
  getUkCalendarDate,
  type NetWorthBasis,
  netWorthBasisFromProfile,
} from "@flump/finance-engine/check-in";
import { useMemo, useState } from "react";
import { useCheckInQueries } from "../../data/checkIn";
import { type ApiProblem, classifyApiError } from "../../data/problems";

export interface CheckInInputs {
  /** The Europe/London month being checked in. */
  month: CheckInMonth;
  /** Today in Europe/London, "YYYY-MM-DD". */
  today: string;
  accounts: readonly CheckInAccountInput[];
  details: readonly AccountDetailInput[];
  basis: NetWorthBasis;
  checkInDay: number | null;
  latestCompletedMonth: CheckInMonth | null;
  /** Absent from an older backend: unknown. */
  latestStartedMonth: CheckInMonth | null | undefined;
}

export type CheckInDataState =
  | { status: "loading" }
  /** No profile yet, or setup not finished on the website: nothing to check in until it is. */
  | { status: "notSetUp" }
  | { status: "error"; problem: ApiProblem; retry: () => void }
  | {
      status: "ready";
      inputs: CheckInInputs;
      /** A read is being fetched again: the check-in waits for it so it never opens on stale data. */
      fetching: boolean;
    };

/** Today in Europe/London as "YYYY-MM-DD" and its month, from the engine's one London formatter. */
export function londonToday(now: Date): { today: string; month: CheckInMonth } {
  const today = getUkCalendarDate(now);
  return { today, month: today.slice(0, 7) };
}

export function useCheckInData(now: () => Date = () => new Date()): CheckInDataState {
  const { accounts, details, profile, checkIns, refetch } = useCheckInQueries();
  const all = [accounts, details, profile, checkIns];
  // Failed only with nothing to show: a background refetch that fails keeps the data on screen, and
  // a read being fetched again after "Try again" shows as loading, not as the old error.
  const failed = all.find((q) => q.error && q.data === undefined && !q.isFetching);
  // The London date is read once per screen: a check-in open across midnight keeps its month.
  const [{ today, month }] = useState(() => londonToday(now()));
  const a = accounts.data;
  const d = details.data;
  const p = profile.data;
  const c = checkIns.data;
  const ready = a && d && p !== undefined && c;

  // Rebuilt only when an answer changes, so the engine's steps keep their identity between renders.
  const inputs = useMemo<CheckInInputs | null>(() => {
    if (!a || !d || !p || !c) return null;
    return {
      month,
      today,
      accounts: a,
      details: d,
      basis: netWorthBasisFromProfile(p),
      checkInDay: p.checkInDay ?? null,
      latestCompletedMonth: c.latestCompletedMonth,
      latestStartedMonth: c.latestStartedMonth,
    };
  }, [a, d, p, c, today, month]);

  if (failed) return { status: "error", problem: classifyApiError(failed.error), retry: refetch };
  // As web, which sends a person to onboarding until it is finished. Only once every read has
  // answered: a slower read that then fails shows its error, never "not set up" first.
  if (p === null || p?.onboardingCompleted === false) {
    return a && d && c ? { status: "notSetUp" } : { status: "loading" };
  }
  if (ready && inputs) {
    return { status: "ready", inputs, fetching: all.some((q) => q.isFetching) };
  }
  return { status: "loading" };
}
