/**
 * The Budget tab's choices that are not figures (E12 S10, plan 9.10b): which entries the phone may
 * edit, the editor's sections in web's order, and a new entry's Essential default. Every figure and
 * every rank comes from the engine (`@flump/finance-engine/budget`); this file picks rows, sorts by
 * the engine's order and compares names, and adds, subtracts or compares no money.
 */
import {
  budgetPageCategories,
  INCOME_CATEGORY,
  isIncomeEntry,
  rankBudgetCategories,
} from "@flump/finance-engine/budget";
import type { AppBudgetEntry } from "../../data/budget";
import type { BudgetPageRow } from "./useBudgetData";

/**
 * The saved row behind a listed entry when the phone may edit it: the person's own sole row, not
 * linked to a saved fact. A linked line, a joint row or a row the API did not send is read-only
 * here, with its page on the website (S11, S12 bring those).
 */
export function editableRow(
  row: BudgetPageRow,
  saved: ReadonlyMap<string, AppBudgetEntry>,
): AppBudgetEntry | null {
  if ("linked" in row && row.linked) return null;
  const raw = saved.get(row.id);
  if (!raw) return null;
  if (raw.ownership === "joint" || raw.linkKind) return null;
  return raw;
}

/** One section of the editor: income first, then the categories in the read view's order. */
export interface EditorSection {
  category: string;
  /** The entries listed under it: income under "Money in", spending under its own category. */
  rows: BudgetPageRow[];
}

/**
 * Web's editor order (`BudgetEditor` `sectionOrder`): money in first, then spending ranked by the
 * engine, empty categories at the foot so they can be filled in.
 */
export function editorSections(
  rows: readonly BudgetPageRow[],
  customCategories: readonly string[],
): EditorSection[] {
  const categories = budgetPageCategories(customCategories, rows);
  const ranked = rankBudgetCategories(categories, [...rows], { keepEmpty: true }).map(
    (r) => r.category,
  );
  const order = Array.from(
    new Set([INCOME_CATEGORY, ...ranked.filter((c) => categories.includes(c)), ...categories]),
  );
  return order.map((category) => ({
    category,
    rows:
      category === INCOME_CATEGORY
        ? rows.filter(isIncomeEntry)
        : rows.filter((e) => e.category === category && !isIncomeEntry(e)),
  }));
}

/**
 * The categories an entry may sit in, income included, in the page's fixed order (the engine's
 * `budgetPageCategories`: the standard ones, then custom ones), so the add and edit forms list
 * them alike and the list never moves as amounts change (the editor ranks by amount).
 */
export function categoryChoices(
  rows: readonly BudgetPageRow[],
  customCategories: readonly string[],
): string[] {
  return budgetPageCategories(customCategories, rows);
}

/**
 * Web's add row Essential default (`defaultEssential`): income always counts; everyday expenses
 * and savings start off; other spending starts on.
 */
export function defaultEssential(category: string): boolean {
  if (category === INCOME_CATEGORY) return true;
  return category !== "expenses" && category !== "savings";
}
