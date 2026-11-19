/**
 * Names that mean the same common budget entry within a category, after normalising (PR 779's
 * wizard synonym groups). For labels and wizard suggestions only: no money decision reads a row's
 * name (the linked take-home and housing rows go by category and by the person's choice). Matching
 * is exact on the normalised name, so "Rent for parking" or "Water softener" is never read as one
 * of these.
 */
export interface BudgetSynonymGroup {
  /** "housing", "bills", "expenses", "savings" or "income". */
  category: string;
  names: ReadonlyArray<string>;
}

/** The category income rows sit under, whatever their own category, when flagged as income. */
export const BUDGET_INCOME_CATEGORY = "income";

/** Each a person's monthly housing cost. The onboarding seed uses three of them. */
export const HOUSING_PAYMENT_NAMES: ReadonlyArray<string> = [
  "rent or mortgage",
  "rent",
  "mortgage",
  "rent payment",
  "mortgage payment",
  "household contribution",
];

/** Each a person's own pay after tax. */
export const TAKE_HOME_PAY_NAMES: ReadonlyArray<string> = [
  "take-home pay",
  "salary",
  "salary after tax",
  "wages",
  "monthly take-home income",
  "income",
  "net income",
  "monthly income",
  "take-home",
  "take home pay",
];

export const BUDGET_SYNONYM_GROUPS: ReadonlyArray<BudgetSynonymGroup> = [
  { category: "housing", names: HOUSING_PAYMENT_NAMES },
  {
    category: "bills",
    names: ["gas and electricity", "gas", "electricity", "energy", "energy bill"],
  },
  {
    category: "bills",
    names: ["broadband", "phone and broadband", "broadband and phone", "internet", "wi-fi", "wifi"],
  },
  {
    category: "expenses",
    names: ["groceries", "food shop", "food", "food shopping", "supermarket"],
  },
  { category: "bills", names: ["council tax", "council tax bill"] },
  { category: "bills", names: ["water", "water bill", "water rates"] },
  { category: "savings", names: ["savings", "emergency fund", "isa or investments"] },
  { category: BUDGET_INCOME_CATEGORY, names: TAKE_HOME_PAY_NAMES },
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

/** The category the linked housing row sits in. Every spending row in it is a payment row. */
export const BUDGET_HOUSING_CATEGORY = "housing";

/** The savings category, as the engine tests it (exact, lower case: budget-totals.ts). */
export const BUDGET_SAVINGS_CATEGORY = "savings";

/**
 * Whether a new row is marked essential when the person has not said: savings rows are off (owner
 * item 28, "default to off"), every other row is on. The web editor also starts everyday
 * expenses off. The API, the wizard and the editor read this one rule.
 */
export const defaultIsEssential = (category: string, isIncome = false): boolean =>
  isIncome || category !== BUDGET_SAVINGS_CATEGORY;
