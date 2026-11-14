import type { AccountDetail } from "~/containers/accounts/types";
import { isLiabilityType, toDisplayBalance } from "~/containers/accounts/utils";
import { isFutureMonth, monthYearSort } from "~/utils/accounts";

export interface AccountRowSource {
  id?: string;
  name?: string;
  type?: string;
  balance?: number | string;
}

export interface AccountRow {
  id: string;
  name: string;
  type: string;
  /** Amount held, or amount owed for a liability. Undefined when no balance is known. */
  balance: number | undefined;
  /** Whole-number change against the previous month, or null when there is no earlier month. */
  changePercent: number | null;
  /** True when the change is good news (assets up, liabilities down). */
  favourable: boolean;
}

const isBeforeMonth = (month: number, year: number, currentM: number, currentY: number) =>
  year < currentY || (year === currentY && month < currentM);

type DetailWithAccount = AccountDetail & { accountId?: string };

/** The balance figures for one account, read from its saved balance and its recorded months. */
export interface AccountBalanceSummary {
  /** Amount held, or amount owed for a liability. Undefined when no balance is known. */
  balance: number | undefined;
  /** Whole-number change against `againstLabel`, or null when there is no earlier month. */
  changePercent: number | null;
  /** True when the change is good news (assets up, liabilities down). */
  favourable: boolean;
  /** "October 2026": the latest recorded month before the current one, or null. */
  againstLabel: string | null;
  /** "November 2026": the current calendar month. */
  currentLabel: string;
  /** True when the current month has a recorded balance. */
  currentRecorded: boolean;
}

const monthLabel = (month: number, year: number): string =>
  new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(
    new Date(year, month - 1, 1),
  );

/**
 * The saved balance is the current balance (D22). Recorded months are history: they never replace
 * the saved balance, and the latest one is used only when no balance is saved. The change is
 * against the latest recorded month before the current one.
 *
 * `detailsAreThisAccounts`: the caller passes only this account's recorded months (an account
 * detail loader), so a row without an account id belongs to it. Otherwise a row without an id
 * matches no account, so one stray row never counts for every account.
 */
export const summariseAccountBalance = (
  account: AccountRowSource,
  accountDetails: DetailWithAccount[],
  now: Date = new Date(),
  detailsAreThisAccounts = false,
): AccountBalanceSummary => {
  const id = account.id ?? "";
  const type = account.type ?? "";
  const currentM = now.getMonth() + 1;
  const currentY = now.getFullYear();
  const history = accountDetails
    .filter((detail) => {
      const detailId = detail.account_id || detail.accountId;
      if (!detailId) return detailsAreThisAccounts;
      return !id || detailId === id;
    })
    .filter(
      (detail) => !isFutureMonth(detail.month as number, detail.year as number, currentM, currentY),
    )
    .sort(monthYearSort);

  const latest = history[history.length - 1];
  const previous = history
    .filter((detail) =>
      isBeforeMonth(detail.month as number, detail.year as number, currentM, currentY),
    )
    .pop();
  const currentRecorded = history.some(
    (detail) => detail.month === currentM && detail.year === currentY,
  );

  const stored =
    account.balance !== undefined && account.balance !== null && account.balance !== ""
      ? Number(account.balance)
      : undefined;
  const raw = stored ?? (latest?.value !== undefined ? Number(latest.value) : undefined);
  const balance = toDisplayBalance(type, raw);
  const previousBalance =
    previous?.value !== undefined ? toDisplayBalance(type, Number(previous.value)) : undefined;

  const changePercent =
    balance !== undefined && previousBalance
      ? Math.round(((balance - previousBalance) / previousBalance) * 100)
      : null;
  const isUp = balance !== undefined && previousBalance !== undefined && balance >= previousBalance;
  const favourable =
    changePercent === null || changePercent === 0 ? true : isLiabilityType(type) ? !isUp : isUp;

  return {
    balance,
    changePercent,
    favourable,
    againstLabel:
      previous?.month && previous.year ? monthLabel(previous.month, previous.year) : null,
    currentLabel: monthLabel(currentM, currentY),
    currentRecorded,
  };
};

/** One display row per account, from `summariseAccountBalance`. */
export const buildAccountRows = (
  accounts: AccountRowSource[],
  accountDetails: DetailWithAccount[],
  now: Date = new Date(),
): AccountRow[] =>
  accounts.map((account) => {
    const id = account.id ?? "";
    const own = accountDetails.filter((detail) => (detail.account_id || detail.accountId) === id);
    const { balance, changePercent, favourable } = summariseAccountBalance(account, own, now);
    return {
      id,
      name: account.name ?? "",
      type: account.type ?? "",
      balance,
      changePercent,
      favourable,
    };
  });

/** "March 2026" for the latest recorded month, or null when there is no history yet. */
export const lastUpdatedLabel = (accountDetails: AccountDetail[]): string | null => {
  const latest = [...accountDetails]
    .filter((detail) => !isFutureMonth(detail.month as number, detail.year as number))
    .sort(monthYearSort)
    .pop();
  if (!latest?.month || !latest.year) return null;
  return monthLabel(latest.month, latest.year);
};
