import {
  type BudgetLinkableAccount,
  type FinancialPicture,
  isBudgetAccountLink,
  linkedAccountFor,
  linkedBudgetSource,
  pageBudgetRows,
} from "@flump/finance-engine";
import type { BudgetEntry } from "~/types/budget";

export { linkedAccountFor };

/**
 * The budget as the page lists it: the engine's `budgetRows` (saved rows with the linked take-home
 * and housing rows in place, owner items 7 and 33b), each saved row as it was loaded. So a row on
 * screen and the figures it adds to always agree, and a linked figure is never copied anywhere.
 */
export function pageBudgetEntries(
  entries: readonly BudgetEntry[],
  picture: Pick<FinancialPicture, "budgetRows">,
): BudgetEntry[] {
  return pageBudgetRows(entries, picture.budgetRows);
}

/** True for a linked line whose saved fact is not set. Its amount is unknown, never £0. */
export const isNotSetEntry = (entry: Pick<BudgetEntry, "notSet">): boolean => entry.notSet === true;

/** An account as the budget page holds it from the loader: enough to name it and check its kind. */
export type LinkableAccount = BudgetLinkableAccount;

/**
 * Where a linked line that is not set sends the person to add the fact it reads. A savings or
 * debt line whose account still exists goes to that account's page to add its monthly amount; one
 * whose account was deleted or changed type has nowhere to go, so it gets no link (the person
 * types their own figure or deletes the line).
 */
export function notSetActionFor(
  entry: Pick<BudgetEntry, "linked" | "linkAccountId">,
  housingStatus: string | null,
  accounts: readonly LinkableAccount[] = [],
): { to: string; label: string } | null {
  if (entry.linked === "take_home") {
    return { to: "/app/profile#settings-age-and-pay", label: "Add your salary" };
  }
  if (entry.linked === "housing" && housingStatus === "mortgage") {
    return { to: "/app/mortgage", label: "Add your mortgage payment" };
  }
  if (isBudgetAccountLink(entry.linked) && linkedAccountFor(entry, accounts)) {
    return entry.linked === "savings"
      ? { to: "/app/savings", label: "Add the monthly saving" }
      : { to: "/app/debt", label: "Add the monthly payment" };
  }
  return null;
}

/**
 * The one line under a linked line in the read view that says where its figure comes from, or
 * why it has none.
 */
export function linkedSourceText(
  entry: Pick<BudgetEntry, "linked" | "linkAccountId" | "notSet">,
  accounts: readonly LinkableAccount[],
): string | undefined {
  const source = linkedBudgetSource(entry, accounts);
  if (!source) return undefined;
  if (source.kind === "housingNotSet")
    return "Linked to your saved housing payment, which is not set";
  if (source.kind === "accountGone") return "The account this line used was removed or changed";
  const what = source.link === "savings" ? "monthly saving" : "monthly payment";
  return source.kind === "accountNotSet"
    ? `Linked to ${source.accountName}, which has no ${what} saved`
    : `From ${source.accountName}`;
}
