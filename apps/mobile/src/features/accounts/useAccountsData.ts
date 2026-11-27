/**
 * The accounts list, an account's page and net worth history (E12 S6, plan 9.9), each as one
 * state: loading, not set up, an error with the reason and a way to try again, or ready. All three
 * read the check-in's four queries (`useCheckInData`), shared with Home by query key, so they make
 * no request of their own and a move between them never shows loading again.
 */
import { useMemo } from "react";
import { useCheckInQueries } from "../../data/checkIn";
import { type CheckInDataState, useCheckInData } from "../check-in/useCheckInData";
import {
  type AccountDetail,
  type AccountsList,
  type AppAccount,
  type AppAccountMonth,
  buildAccountDetail,
  buildAccountsList,
  buildNetWorthHistory,
  type NetWorthHistory,
} from "./accountsModel";

type DataState<T> =
  | { status: "loading" }
  | { status: "notSetUp" }
  | Extract<CheckInDataState, { status: "error" }>
  | ({ status: "ready" } & T);

/** The list; `list` is null with no accounts yet (the empty state, never £0). */
export type AccountsListState = DataState<{ list: AccountsList | null }>;
/** One account; `detail` is null when no account has that id. */
export type AccountDetailState = DataState<{ detail: AccountDetail | null }>;
export type NetWorthHistoryState = DataState<{ history: NetWorthHistory }>;

type Ready = Extract<CheckInDataState, { status: "ready" }>["inputs"];

/**
 * The profile's own home estimate, read loosely: the profile read keeps fields it does not name,
 * and an older backend may not send it. Only a positive number counts; nothing is worked out.
 */
function homeValueOf(profile: unknown): number | null {
  const value = (profile as { homeValue?: unknown } | null | undefined)?.homeValue;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

/** The ready inputs, the raw rows and the pull-to-refresh read, for one screen's state. */
function useReadyRows(now: () => Date) {
  const checkIn = useCheckInData(now);
  const { accounts, details, profile, refreshAll } = useCheckInQueries();
  const ready: Ready | null = checkIn.status === "ready" ? checkIn.inputs : null;
  return {
    checkIn,
    ready,
    accounts: accounts.data as readonly AppAccount[] | undefined,
    details: details.data as readonly AppAccountMonth[] | undefined,
    homeValue: homeValueOf(profile.data),
    refresh: refreshAll,
  };
}

function notReady(checkIn: CheckInDataState) {
  return checkIn.status === "ready" ? null : checkIn;
}

export function useAccountsList(now: () => Date = () => new Date()): {
  state: AccountsListState;
  refresh(): Promise<void>;
} {
  const { checkIn, ready, accounts, details, homeValue, refresh } = useReadyRows(now);
  const list = useMemo(
    () =>
      ready && accounts && details
        ? buildAccountsList(accounts, details, ready.basis, ready.month, homeValue)
        : null,
    [ready, accounts, details, homeValue],
  );
  return { state: notReady(checkIn) ?? { status: "ready", list }, refresh };
}

export function useAccountDetail(
  id: string,
  now: () => Date = () => new Date(),
): { state: AccountDetailState; refresh(): Promise<void> } {
  const { checkIn, ready, accounts, details, refresh } = useReadyRows(now);
  const detail = useMemo(
    () =>
      ready && accounts && details
        ? buildAccountDetail(id, accounts, details, ready.basis, ready.month)
        : null,
    [id, ready, accounts, details],
  );
  return { state: notReady(checkIn) ?? { status: "ready", detail }, refresh };
}

export function useNetWorthHistory(now: () => Date = () => new Date()): {
  state: NetWorthHistoryState;
  refresh(): Promise<void>;
} {
  const { checkIn, ready, accounts, details, refresh } = useReadyRows(now);
  const history = useMemo(
    () =>
      ready && accounts && details
        ? buildNetWorthHistory({
            accounts,
            details,
            basis: ready.basis,
            currentMonth: ready.month,
            today: ready.today,
            checkInDay: ready.checkInDay,
            latestCompletedMonth: ready.latestCompletedMonth,
          })
        : null,
    [ready, accounts, details],
  );
  const waiting = notReady(checkIn);
  if (waiting) return { state: waiting, refresh };
  return history
    ? { state: { status: "ready", history }, refresh }
    : { state: { status: "loading" }, refresh };
}
