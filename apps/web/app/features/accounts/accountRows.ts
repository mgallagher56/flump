import {
  type AccountOwnership,
  resolveAccountOwnership,
  resolveAccountSharePercent,
  selectAccountBalance,
} from "@flump/finance-engine";
import type { AccountDetail } from "~/containers/accounts/types";
import { isFutureMonth, monthYearSort } from "~/utils/accounts";
import { londonMonth } from "~/utils/londonMonth";

export interface AccountRowSource {
  id?: string;
  name?: string;
  type?: string;
  accountSubtype?: string | null;
  balance?: number | string;
  ownership?: AccountOwnership | string | null;
  sharePercent?: number | string | null;
}

export interface AccountRow {
  id: string;
  name: string;
  type: string;
  ownership?: AccountOwnership;
  sharePercent?: number;
  accountSubtype?: string | null;
  /** Amount held, or amount owed for a liability. Undefined when no balance is known. */
  balance: number | undefined;
  /** Whole-number change against the previous month, or null when there is no earlier month. */
  changePercent: number | null;
  /** True when the change is good news (assets up, liabilities down). */
  favourable: boolean;
}

type DetailWithAccount = AccountDetail & { accountId?: string };

const monthLabel = (month: number, year: number): string =>
  new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(
    new Date(year, month - 1, 1),
  );

/**
 * One display row per account. The figures (the saved balance as the current balance, D22; the
 * joint share; the change against the latest earlier month) come from the engine's
 * `selectAccountBalance`, so the mobile app shows the same ones (E12 S6).
 */
export const buildAccountRows = (
  accounts: AccountRowSource[],
  accountDetails: DetailWithAccount[],
  now: Date = new Date(),
): AccountRow[] =>
  accounts.map((account) => {
    const id = account.id ?? "";
    const own = accountDetails.filter((detail) => (detail.account_id || detail.accountId) === id);
    const { balance, changePercent, favourable } = selectAccountBalance(
      account,
      own,
      londonMonth(now),
    );
    const shareInput = {
      name: account.name,
      type: account.type,
      accountSubtype: account.accountSubtype,
      ownership: account.ownership,
      sharePercent: account.sharePercent,
    };
    const ownership = resolveAccountOwnership(shareInput);
    const sharePercent = resolveAccountSharePercent(shareInput);
    return {
      id,
      name: account.name ?? "",
      type: account.type ?? "",
      ownership,
      sharePercent,
      accountSubtype: account.accountSubtype ?? null,
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
