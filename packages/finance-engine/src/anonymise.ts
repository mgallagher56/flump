import { ALL_TAX_CATEGORIES } from "./tax-calculator.js";

/**
 * Shared institution scrub list (E17-N4). One list for every anonymisation path so the
 * MCP tools and the AI context pack cannot drift apart.
 *
 * Matching is hardened against trivial bypasses: text is NFKC-normalised, zero-width
 * characters and apostrophes are removed, common Cyrillic/Greek homoglyphs are mapped to
 * Latin, and entries match with optional spaces or hyphens between letters ("NAT WEST",
 * "Mon-zo"). Every pattern is a flat sequence of literals separated by a bounded character
 * class, so matching is linear (no nested quantifiers).
 */
export const INSTITUTION_SCRUB_LIST: readonly string[] = [
  "monzo",
  "starling",
  "barclays",
  "barclaycard",
  "hsbc",
  "santander",
  "natwest",
  "lloyds",
  "halifax",
  "amex",
  "american express",
  "nationwide",
  "revolut",
  "tsb",
  "first direct",
  "metro bank",
  "virgin money",
  "mbna",
  "chase",
  "rbs",
  "royal bank of scotland",
  "co-op",
  "capital one",
  "tesco bank",
  "sainsburys bank",
  "marcus",
  "zopa",
  "tide",
  "kroo",
  "atom",
  "clydesdale",
  "yorkshire",
  "coventry",
  "leeds",
  "skipton",
  "principality",
  "klarna",
  "paypal",
  "vanquis",
  "aqua",
];

const HOMOGLYPHS: Record<string, string> = {
  а: "a",
  в: "b",
  с: "c",
  е: "e",
  н: "h",
  і: "i",
  к: "k",
  м: "m",
  о: "o",
  р: "p",
  т: "t",
  у: "y",
  х: "x",
  ѕ: "s",
  ј: "j",
  α: "a",
  ο: "o",
  ρ: "p",
  ν: "v",
  ι: "i",
  κ: "k",
  τ: "t",
};

const ZERO_WIDTH = /[​-‍⁠﻿­]/g;
const SEPARATOR = "[-\\s]*";

function normalise(text: string): string {
  return text
    .normalize("NFKC")
    .replace(ZERO_WIDTH, "")
    .replace(/['’`]/g, "")
    .replace(/[Ѐ-ӿͰ-Ͽ]/g, (ch) => HOMOGLYPHS[ch.toLowerCase()] ?? ch);
}

function entryPattern(entry: string): string {
  return [...entry.replace(/[\s-]/g, "")]
    .map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join(SEPARATOR);
}

const SCRUB_PATTERN = new RegExp(
  `\\b(?:${[...INSTITUTION_SCRUB_LIST]
    .sort((a, b) => b.length - a.length)
    .map(entryPattern)
    .join("|")})\\b`,
  "gi",
);

/** Replaces known institution names in free text with the generic label "Bank". */
export function scrubInstitutionNames(text: string): string {
  return normalise(text).replace(SCRUB_PATTERN, "Bank");
}

const SORT_CODE = /\b\d{2}[-\s]\d{2}[-\s]\d{2}\b/g;
const LONG_DIGIT_RUN = /\d{6,}/g;

/** Redacts sort codes (12-34-56) and digit runs of six or more (account and card numbers). */
export function redactAccountNumbers(text: string): string {
  return text.replace(SORT_CODE, "[redacted]").replace(LONG_DIGIT_RUN, "[redacted]");
}

/** Scrubs institution names and account identifiers from a free-text description. */
export function anonymiseDescription(text: string): string {
  return redactAccountNumbers(scrubInstitutionNames(text));
}

/**
 * The fixed account type words an anonymised output may carry: the app's account types, the other
 * spellings the engine's account categories recognise, and the MCP category names. The stored
 * `account.type` column is free text checked only on write, so a legacy row can hold anything.
 */
const ACCOUNT_TYPE_VOCABULARY: readonly string[] = [
  "Current",
  "Saving",
  "Mortgage",
  "Loan",
  "Credit Card",
  "Owed",
  "Investment",
  "Pension",
  "Property",
  "Student Loan",
  "Overdraft",
  "Checking",
  "Savings",
  "Investments",
  "ISA",
  "GIA",
  "Pensions",
  "SIPP",
  "credit_card",
  "student_loan",
  "Mortgages",
  "Debt",
  "Other",
];

const ACCOUNT_TYPE_BY_KEY: ReadonlyMap<string, string> = new Map(
  ACCOUNT_TYPE_VOCABULARY.map((t) => [t.toLowerCase(), t]),
);

/** The type any stored account type outside the fixed list becomes in anonymised output. */
export const ANONYMOUS_ACCOUNT_TYPE = "Other";

/**
 * An account type safe for anonymised output: the fixed word it matches (compared as the engine's
 * account categories compare it, trimmed and case-insensitively), or "Other" for anything else, so
 * a legacy free-text type such as "Jane's ISA" never leaves. The engine category of the result is
 * the same as that of the stored value, so every total is unchanged. A missing or empty type stays.
 */
export function anonymousAccountType<T extends string | null | undefined>(type: T): T | string {
  if (type === null || type === undefined || type === "") return type;
  return ACCOUNT_TYPE_BY_KEY.get(String(type).trim().toLowerCase()) ?? ANONYMOUS_ACCOUNT_TYPE;
}

/**
 * Generic label for an account, shared by the context pack and the debt simulator. The type is
 * mapped onto the fixed account type list first, so no stored free text reaches the label.
 */
export function genericAccountLabel(type: string | null | undefined, ordinal: number): string {
  return `${anonymousAccountType(type) || "other"} Account #${ordinal}`;
}

/*
 * Neutral labels for user-typed names (owner ruling 7). When a token is anonymised, every budget
 * and tax category or entry name the user typed is replaced by a label made only of a fixed group
 * name the app defines and a number: "Bills 1", "Bills 2", "Custom category 1". Amounts, groups and
 * the fixed category ids the user picked from a list stay as they are, so every total is unchanged.
 * A labeller is made once per output, so the same name in the same group gets the same label
 * throughout that output, and applying it to its own labels gives the same labels back.
 */

/** Budget categories Flump itself offers (web base categories and the onboarding seed), with display labels. */
export const BUILT_IN_BUDGET_CATEGORY_LABELS: Readonly<Record<string, string>> = {
  housing: "Housing",
  bills: "Bills",
  expenses: "Expenses",
  savings: "Savings",
  income: "Income",
  living: "Living",
  lifestyle: "Lifestyle",
  debt: "Debt",
};

/** Display labels for the fixed tax record sources. */
export const TAX_SOURCE_LABELS: Readonly<Record<string, string>> = {
  paye: "PAYE",
  "self-employed": "Self-employed",
  rental: "Rental",
  savings: "Savings",
};

/** The group for a budget entry in a category the user typed, which has no fixed group. */
export const ANONYMOUS_ENTRY_GROUP = "Entry";
/** The group for a tax record with an unrecognised source. */
export const ANONYMOUS_TAX_RECORD_GROUP = "Tax record";
/** The group for a category the user typed. */
export const ANONYMOUS_CATEGORY_GROUP = "Custom category";

function nameKey(name: unknown): string {
  return typeof name === "string" ? normalise(name).trim().replace(/\s+/g, " ").toLowerCase() : "";
}

/** The display label of a built-in budget category ("bills" gives "Bills"), or undefined for a typed one. */
export function builtInBudgetCategoryLabel(category: unknown): string | undefined {
  const key = builtInBudgetCategoryKey(category);
  return key === undefined ? undefined : BUILT_IN_BUDGET_CATEGORY_LABELS[key];
}

/** The canonical key of a built-in budget category ("Bills " gives "bills"), or undefined. */
function builtInBudgetCategoryKey(category: unknown): string | undefined {
  const key = nameKey(category);
  return Object.hasOwn(BUILT_IN_BUDGET_CATEGORY_LABELS, key) ? key : undefined;
}

/**
 * The core labeller: `label(group, name)` gives "<group> <n>", numbered per group in order of first
 * appearance, and the same name (compared case- and space-insensitively) in the same group always
 * gets the same number. `group` must be a fixed, app-defined name, never user text.
 */
export function createNeutralLabeller(): (group: string, name: unknown) => string {
  const groups = new Map<string, Map<string, number>>();
  return (group, name) => {
    let names = groups.get(group);
    if (!names) {
      names = new Map();
      groups.set(group, names);
    }
    const key = nameKey(name);
    let n = names.get(key);
    if (n === undefined) {
      n = names.size + 1;
      names.set(key, n);
    }
    return `${group} ${n}`;
  };
}

/**
 * Budget category labels for one anonymised output. A built-in category stored exactly as its key
 * ("bills") stays; one that only loosely matches a key (case, spaces, zero-width or look-alike
 * characters) becomes that key's fixed display label ("Bills"), so the stored spelling never leaves
 * as typed. The engine matches "savings" and "debt" exactly, and a display label never equals a key,
 * so every total stays the same. Any other category is one the user typed and becomes
 * "Custom category 1", "Custom category 2" in order of first appearance.
 */
export function createBudgetCategoryAnonymiser(): (category: string) => string {
  const label = createNeutralLabeller();
  return (category) => {
    const key = builtInBudgetCategoryKey(category);
    if (key === undefined) return label(ANONYMOUS_CATEGORY_GROUP, category);
    return category === key ? key : (BUILT_IN_BUDGET_CATEGORY_LABELS[key] as string);
  };
}

/** The fields of a budget entry that its neutral label is built from. */
export interface BudgetEntryLabelInput {
  name?: string | null;
  category: string;
  isIncome: boolean;
}

/**
 * Budget entry labels for one anonymised output. The group is "Income" for income, the built-in
 * category's display label ("Bills") otherwise, or "Entry" for an entry in a category the user
 * typed. The typed entry name only decides which number it gets.
 */
export function createBudgetEntryAnonymiser(): (entry: BudgetEntryLabelInput) => string {
  const label = createNeutralLabeller();
  return (entry) => {
    const group = entry.isIncome
      ? "Income"
      : (builtInBudgetCategoryLabel(entry.category) ?? ANONYMOUS_ENTRY_GROUP);
    return label(group, entry.name);
  };
}

/** Neutral labels for budget entries in anonymised mode (M-PRIV4, ruling 7), one per entry in order. */
export function anonymousBudgetEntryLabels(entries: readonly BudgetEntryLabelInput[]): string[] {
  const label = createBudgetEntryAnonymiser();
  return entries.map(label);
}

/** The fields of a tax record that its neutral label is built from. */
export interface TaxRecordLabelInput {
  name?: string | null;
  source: string;
}

/**
 * Tax record name labels for one anonymised output: the source's display label plus a number
 * ("Rental 1", "Self-employed 2"), or "Tax record 1" for an unrecognised source.
 */
export function createTaxRecordAnonymiser(): (record: TaxRecordLabelInput) => string {
  const label = createNeutralLabeller();
  return (record) => {
    const group = Object.hasOwn(TAX_SOURCE_LABELS, record.source)
      ? (TAX_SOURCE_LABELS[record.source] as string)
      : ANONYMOUS_TAX_RECORD_GROUP;
    return label(group, record.name);
  };
}

/**
 * Tax category labels for one anonymised output. A category id from the app's fixed list stays (the
 * tax maths reads it); anything else is text the user or an import typed and becomes
 * "Custom category 1". The tax maths ignores unrecognised categories, so totals are unchanged.
 */
export function createTaxCategoryAnonymiser(): (category: string) => string {
  const label = createNeutralLabeller();
  return (category) =>
    TAX_CATEGORY_IDS.has(category) ? category : label(ANONYMOUS_CATEGORY_GROUP, category);
}

const TAX_CATEGORY_IDS: ReadonlySet<string> = new Set(ALL_TAX_CATEGORIES.map((c) => c.id));
