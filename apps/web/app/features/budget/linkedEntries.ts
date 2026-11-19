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
        // The share the figures count it at, so the row and the totals agree.
        ownership: row.ownership === "joint" ? "joint" : "sole",
        sharePercent: row.sharePercent ?? null,
        linked: row.linked,
        ...(row.linkedRowId ? { linkedRowId: row.linkedRowId } : {}),
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
export const isLinkedEntry = (entry: Pick<BudgetEntry, "linked">): boolean =>
  entry.linked !== undefined;

/** True for a linked line whose saved fact is not set. Its amount is unknown, never £0. */
export const isNotSetEntry = (entry: Pick<BudgetEntry, "notSet">): boolean => entry.notSet === true;

/** Where a linked line that is not set sends the person to add the fact it reads. */
export function notSetActionFor(
  entry: Pick<BudgetEntry, "linked">,
  housingStatus: string | null,
): { to: string; label: string } | null {
  if (entry.linked === "take_home") {
    return { to: "/app/profile#settings-age-and-pay", label: "Add your salary" };
  }
  if (entry.linked === "housing" && housingStatus === "mortgage") {
    return { to: "/app/mortgage", label: "Add your mortgage payment" };
  }
  return null;
}
