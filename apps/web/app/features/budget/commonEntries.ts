import { INCOME_CATEGORY } from "./income";

/** The fields two entries are matched on. `isIncome` puts an entry under income, whatever its category. */
export interface CommonEntryKey {
  name: string;
  category: string;
  isIncome?: boolean;
}

/**
 * Names that mean the same common entry within a category, after normalising. One rule for the
 * wizard's "Add common entries" and the page's, so neither adds a second copy of an entry the
 * budget already has under another name (old seed rows included).
 */
const SYNONYM_GROUPS: ReadonlyArray<{ category: string; names: ReadonlyArray<string> }> = [
  { category: "housing", names: ["rent or mortgage", "rent", "mortgage"] },
  { category: "bills", names: ["gas and electricity", "gas", "electricity", "energy"] },
  { category: "bills", names: ["broadband", "phone and broadband", "internet"] },
  { category: "expenses", names: ["groceries", "food shop", "food"] },
  { category: "bills", names: ["council tax"] },
  { category: "bills", names: ["water"] },
  { category: "savings", names: ["savings", "emergency fund", "isa or investments"] },
  {
    category: INCOME_CATEGORY,
    names: ["take-home pay", "salary", "salary after tax", "wages"],
  },
];

/** Lower case, trimmed, "/" read as "or", "&" as "and", and runs of spaces collapsed. */
export const normaliseEntryName = (name: string): string =>
  name
    .trim()
    .toLowerCase()
    .replace(/\//g, " or ")
    .replace(/&/g, " and ")
    .replace(/\s+/g, " ")
    .trim();

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
