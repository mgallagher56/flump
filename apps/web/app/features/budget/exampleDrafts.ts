import type { BudgetEntry } from "~/types/budget";
import { type CommonEntryKey, hasCommonEntry } from "./commonEntries";
import { INCOME_CATEGORY } from "./income";

/**
 * An example row in the budget editor: held on the page only, never saved until the person saves
 * it. The amount starts empty, so no invented figure reaches a total (E23).
 */
export interface DraftBudgetEntry {
  id: string;
  category: string;
  name: string;
  amount: number | null;
  frequency: BudgetEntry["frequency"];
  isEssential: boolean;
}

/** The fields a saved entry is created with, matching the editor's add row. */
export type NewEntryFromDraft = Omit<BudgetEntry, "id" | "userId" | "createdAt" | "updatedAt">;

const EXAMPLE_ROWS: ReadonlyArray<{ category: string; name: string }> = [
  { category: INCOME_CATEGORY, name: "Take-home pay" },
  { category: "housing", name: "Rent or mortgage" },
  { category: "bills", name: "Council tax" },
  { category: "bills", name: "Energy" },
  { category: "bills", name: "Phone and broadband" },
  { category: "expenses", name: "Food shop" },
  { category: "expenses", name: "Travel" },
  { category: "savings", name: "Savings" },
];

/** The editor's add-row defaults: spending is essential except everyday expenses and savings. */
const essentialFor = (category: string) =>
  category === INCOME_CATEGORY ? true : category !== "expenses" && category !== "savings";

/**
 * Fresh common-entry rows, each monthly with no amount, for only the common entries the budget
 * does not already have (by `isSameCommonEntry`), so a saved row is never shown twice.
 */
export const exampleBudgetDrafts = (
  existing: ReadonlyArray<CommonEntryKey> = [],
): DraftBudgetEntry[] =>
  EXAMPLE_ROWS.map(
    (row, index): DraftBudgetEntry => ({
      id: `example-${index + 1}`,
      category: row.category,
      name: row.name,
      amount: null,
      frequency: "monthly",
      isEssential: essentialFor(row.category),
    }),
  ).filter((draft) => !hasCommonEntry(existing, draft));

/** Whether an example row has an amount above £0 and a name, so it can be saved. */
export const isDraftReady = (draft: DraftBudgetEntry): boolean =>
  (draft.amount ?? 0) > 0 && draft.name.trim().length > 0;

/** The new entry an example row is saved as. */
export const entryFromDraft = (draft: DraftBudgetEntry): NewEntryFromDraft => {
  const isIncome = draft.category === INCOME_CATEGORY;
  return {
    category: draft.category,
    name: draft.name.trim(),
    amount: draft.amount ?? 0,
    frequency: draft.frequency,
    isIncome,
    isPrimaryIncome: false,
    isEssential: draft.isEssential,
    notes: null,
    isDefault: false,
  };
};
