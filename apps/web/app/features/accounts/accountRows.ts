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

type DetailWithAccount = AccountDetail & { accountId?: string };

/**
 * One display row per account: the latest recorded balance (falling back to the stored balance)
 * and the change against the month before it.
 */
export const buildAccountRows = (
  accounts: AccountRowSource[],
  accountDetails: DetailWithAccount[],
): AccountRow[] =>
  accounts.map((account) => {
    const id = account.id ?? "";
    const type = account.type ?? "";
    const history = accountDetails
      .filter((detail) => (detail.account_id || detail.accountId) === id)
      .filter((detail) => !isFutureMonth(detail.month as number, detail.year as number))
      .sort(monthYearSort);

    const latest = history[history.length - 1];
    const previous = history[history.length - 2];

    const stored = account.balance !== undefined ? Number(account.balance) : undefined;
    const raw = latest?.value !== undefined ? Number(latest.value) : stored;
    const balance = toDisplayBalance(type, raw);
    const previousBalance =
      previous?.value !== undefined ? toDisplayBalance(type, Number(previous.value)) : undefined;

    const changePercent =
      balance !== undefined && previousBalance
        ? Math.round(((balance - previousBalance) / previousBalance) * 100)
        : null;
    const isUp =
      balance !== undefined && previousBalance !== undefined && balance >= previousBalance;
    const favourable =
      changePercent === null || changePercent === 0 ? true : isLiabilityType(type) ? !isUp : isUp;

    return { id, name: account.name ?? "", type, balance, changePercent, favourable };
  });

/** "March 2026" for the latest recorded month, or null when there is no history yet. */
export const lastUpdatedLabel = (accountDetails: AccountDetail[]): string | null => {
  const latest = [...accountDetails]
    .filter((detail) => !isFutureMonth(detail.month as number, detail.year as number))
    .sort(monthYearSort)
    .pop();
  if (!latest?.month || !latest.year) return null;
  return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(
    new Date(latest.year, latest.month - 1, 1),
  );
};
