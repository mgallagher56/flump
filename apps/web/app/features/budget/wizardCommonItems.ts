import type { BudgetEntry } from "~/types/budget";
import { type CommonEntryKey, hasCommonEntry } from "./commonEntries";

/** The fields the wizard creates a common entry with. */
export type WizardCommonItem = Omit<BudgetEntry, "id" | "userId" | "createdAt" | "updatedAt">;

const commonItem = (name: string, category: string, isEssential: boolean): WizardCommonItem => ({
  name,
  amount: 0,
  category,
  frequency: "monthly",
  isIncome: false,
  isPrimaryIncome: false,
  isEssential,
  notes: null,
  isDefault: true,
});

/**
 * The wizard's common entries, each with the plain label shown on screen (the saved names are
 * kept as they were, so older budgets still match). Names only: the amount starts at 0 for the person to fill in, so
 * no invented figure reaches budget totals, safe to spend or breathing room (E23).
 */
export const WIZARD_COMMON_ITEMS: ReadonlyArray<{ label: string; entry: WizardCommonItem }> = [
  { label: "Rent or mortgage", entry: commonItem("Rent / Mortgage", "housing", true) },
  { label: "Council tax", entry: commonItem("Council Tax", "bills", true) },
  { label: "Gas and electricity", entry: commonItem("Gas & Electricity", "bills", true) },
  { label: "Water", entry: commonItem("Water", "bills", true) },
  { label: "Broadband", entry: commonItem("Broadband", "bills", false) },
  { label: "Groceries", entry: commonItem("Groceries", "expenses", true) },
];

/**
 * The common entries `entries` does not already have, by `hasCommonEntry` (same category and
 * the same or a synonym name), so adding them never duplicates a saved row.
 */
export const missingWizardCommonItems = (
  entries: ReadonlyArray<CommonEntryKey>,
): Array<{ label: string; entry: WizardCommonItem }> =>
  WIZARD_COMMON_ITEMS.filter((item) => !hasCommonEntry(entries, item.entry));
