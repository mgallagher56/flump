import type { BudgetEntry } from "~/types/budget";

/** Income is money in, not somewhere money goes: it shows once, as "Money in". */
export const INCOME_CATEGORY = "income";

/**
 * The one income predicate for the budget page: an entry is income when it is flagged as income
 * or sits in the "income" category, whatever its flag. The editor and the category list both use
 * it, so an entry never counts as money in on one and as spending on the other.
 */
export const isIncomeEntry = (entry: Pick<BudgetEntry, "isIncome" | "category">): boolean =>
  entry.isIncome || entry.category === INCOME_CATEGORY;
