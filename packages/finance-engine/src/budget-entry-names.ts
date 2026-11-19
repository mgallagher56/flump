/**
 * Names that mean the same common budget entry within a category, after normalising (PR 779's
 * wizard synonym groups, moved here so the engine's linked rows and the web wizard read one list).
 * Matching is exact on the normalised name, so "Rent for parking" or "Water softener" is never read
 * as one of these.
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

interface NamedRow {
  name: string;
  category: string;
  isIncome?: boolean;
}

/**
 * Words that mark an income row as pay from work, beyond the exact synonyms: "Salary (net)", "My
 * wages", "Net pay", "Earnings". Read as whole words, so "Payment from lodger" or "Repayments" are
 * not pay.
 */
const PAY_WORDS = /\b(salary|salaries|wage|wages|pay|payslip|earnings|take[- ]home)\b/;

/**
 * True for an income row that is the person's own pay: a take-home synonym ("Salary", "Wages") or
 * a name with a pay word in it ("Salary (net)", "Net pay"). Such a row, with an amount, wins over
 * the take-home worked out from the profile, so pay is never counted twice.
 */
export const isTakeHomePayRow = (row: NamedRow): boolean => {
  if (row.isIncome !== true && row.category !== BUDGET_INCOME_CATEGORY) return false;
  const name = normaliseEntryName(row.name);
  return TAKE_HOME_PAY_NAMES.includes(name) || PAY_WORDS.test(name);
};

/** True for a spending row in housing named as the rent or mortgage payment. */
export const isHousingPaymentRow = (row: NamedRow): boolean =>
  row.isIncome !== true &&
  row.category === "housing" &&
  HOUSING_PAYMENT_NAMES.includes(normaliseEntryName(row.name));
