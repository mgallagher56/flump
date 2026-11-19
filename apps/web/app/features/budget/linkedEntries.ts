import type { FinancialPicture } from "@flump/finance-engine";
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
        ownership: "sole",
        sharePercent: null,
        linked: row.linked,
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
export const isLinkedEntry = (entry: Pick<BudgetEntry, "linked">): boolean =>
  entry.linked !== undefined;
