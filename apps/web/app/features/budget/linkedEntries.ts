import {
  accountFitsBudgetLink,
  type FinancialPicture,
  isBudgetAccountLink,
} from "@flump/finance-engine";
import type { BudgetEntry } from "~/types/budget";

/**
 * The budget as the page lists it: the engine's `budgetRows` (saved rows with the linked take-home
 * and housing rows in place, owner items 7 and 33b), each saved row as it was loaded. So a row on
 * screen and the figures it adds to always agree, and a linked figure is never copied anywhere.
 */
export function pageBudgetEntries(
  entries: readonly BudgetEntry[],
  picture: Pick<FinancialPicture, "budgetRows">,
): BudgetEntry[] {
  const byId = new Map(entries.map((e) => [e.id, e]));
  const rows: BudgetEntry[] = [];
  for (const row of picture.budgetRows) {
    if (row.linked) {
      rows.push({
        id: row.id,
        userId: "",
        category: row.category,
        name: row.name,
        amount: row.amount,
        frequency: "monthly",
        isIncome: row.isIncome,
        isPrimaryIncome: false,
        isEssential: row.isEssential,
        notes: null,
        isDefault: false,
        // The share the figures count it at, so the row and the totals agree.
        ownership: row.ownership === "joint" ? "joint" : "sole",
        sharePercent: row.sharePercent ?? null,
        linked: row.linked,
        ...(row.linkedRowId ? { linkedRowId: row.linkedRowId } : {}),
        ...(row.linkAccountId ? { linkAccountId: row.linkAccountId } : {}),
        ...(row.notSet ? { notSet: true as const } : {}),
        createdAt: "",
        updatedAt: "",
      });
      continue;
    }
    const saved = byId.get(row.id);
    if (saved) rows.push(saved);
  }
  return rows;
}

/** True for a row the engine added from a saved detail. Such a row has no stored id to change. */
const isLinkedEntry = (entry: Pick<BudgetEntry, "linked">): boolean => entry.linked !== undefined;

/** True for a linked line whose saved fact is not set. Its amount is unknown, never £0. */
export const isNotSetEntry = (entry: Pick<BudgetEntry, "notSet">): boolean => entry.notSet === true;

/** An account as the budget page holds it from the loader: enough to name it and check its kind. */
export interface LinkableAccount {
  id: string;
  name: string;
  type: string;
}

/**
 * The account a savings or debt line reads, when it still exists and still fits the line (a
 * savings or investment account for a savings line, a card, loan or overdraft for a debt line).
 * Null for any other line, or when the account was deleted or changed type.
 */
export function linkedAccountFor(
  entry: Pick<BudgetEntry, "linked" | "linkAccountId">,
  accounts: readonly LinkableAccount[],
): LinkableAccount | null {
  if (!isBudgetAccountLink(entry.linked) || !entry.linkAccountId) return null;
  const account = accounts.find((a) => a.id === entry.linkAccountId);
  return account && accountFitsBudgetLink(entry.linked, account.type) ? account : null;
}

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
  if (!isBudgetAccountLink(entry.linked)) {
    return entry.notSet ? "Linked to your saved housing payment, which is not set" : undefined;
  }
  const account = linkedAccountFor(entry, accounts);
  if (!account) return "The account this line used was removed or changed";
  const what = entry.linked === "savings" ? "monthly saving" : "monthly payment";
  return entry.notSet
    ? `Linked to ${account.name}, which has no ${what} saved`
    : `From ${account.name}`;
}
