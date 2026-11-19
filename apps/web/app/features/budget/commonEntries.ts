import { BUDGET_SYNONYM_GROUPS, normaliseEntryName } from "@flump/finance-engine";
import { INCOME_CATEGORY } from "./income";

/** The fields two entries are matched on. `isIncome` puts an entry under income, whatever its category. */
export interface CommonEntryKey {
  name: string;
  category: string;
  isIncome?: boolean;
}

/**
 * Synonym groups and the name normaliser live in the engine (PR 779's groups), so the wizard's
 * "Add common entries", the page's, and the engine's linked take-home and housing rows read one
 * list and never add a second copy of an entry the budget already has under another name.
 */
const SYNONYM_GROUPS = BUDGET_SYNONYM_GROUPS;

export { normaliseEntryName };

const categoryOf = (entry: CommonEntryKey): string =>
  entry.isIncome ? INCOME_CATEGORY : entry.category.trim().toLowerCase();

/** The name an entry is compared by: its synonym group when it has one, else its own name. */
const matchKey = (entry: CommonEntryKey): string => {
  const category = categoryOf(entry);
  const name = normaliseEntryName(entry.name);
  const group = SYNONYM_GROUPS.findIndex((g) => g.category === category && g.names.includes(name));
  return group >= 0 ? `group:${group}` : `name:${name}`;
};

/** Whether two entries are the same common entry: same category and the same or a synonym name. */
export const isSameCommonEntry = (a: CommonEntryKey, b: CommonEntryKey): boolean =>
  categoryOf(a) === categoryOf(b) && matchKey(a) === matchKey(b);

/** Whether `entries` already holds an entry that is the same common entry as `candidate`. */
export const hasCommonEntry = (
  entries: ReadonlyArray<CommonEntryKey>,
  candidate: CommonEntryKey,
): boolean => entries.some((entry) => isSameCommonEntry(entry, candidate));
