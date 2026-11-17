import { type AccountShareInput, resolveAccountOwnership } from "@flump/finance-engine";

/**
 * The mortgage page works on the whole loan and the whole property value (E34). A joint account
 * counts at the user's share in net worth, but an overpayment pays the whole loan and loan to
 * value is the whole loan over the whole property, so the page reads its figures from rows with
 * the ownership fields removed. The input rows are not changed.
 */
export function withWholeBalances<T extends object>(
  accounts: readonly T[],
): Omit<T, "ownership" | "sharePercent">[] {
  return accounts.map((account) => {
    const {
      ownership: _ownership,
      sharePercent: _sharePercent,
      ...rest
    } = account as T & {
      ownership?: unknown;
      sharePercent?: unknown;
    };
    return rest;
  });
}

/** True when the account is counted as joint (an ISA or pension never is). */
export function isJointAccount(account: AccountShareInput | null | undefined): boolean {
  return !!account && resolveAccountOwnership(account) === "joint";
}
