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

/** Generic label for an account, shared by the context pack and the debt simulator. */
export function genericAccountLabel(type: string | null | undefined, ordinal: number): string {
  const typeKey = (type || "other").toString().replace(/\s+/g, " ");
  return `${typeKey} Account #${ordinal}`;
}

/** The fields of a budget entry that its generic label is built from. */
export interface BudgetEntryLabelInput {
  category: string;
  isIncome: boolean;
}

/**
 * Generic labels for budget entries in anonymised mode (M-PRIV4), one per entry in the given order.
 * The free-text entry name ("Rent to J Smith") is never used: income becomes "Income #1",
 * "Income #2"; anything else becomes its scrubbed category plus a per-category ordinal
 * ("Housing #1", "Housing #2"), the same pattern as income and the generic account labels.
 * `cleanCategory` lets a caller cap or flatten the scrubbed category before the ordinal is added,
 * so the ordinal is never cut off.
 */
export function anonymousBudgetEntryLabels(
  entries: readonly BudgetEntryLabelInput[],
  cleanCategory: (scrubbed: string) => string = (s) => s,
): string[] {
  const ordinals = new Map<string, number>();
  let income = 0;
  return entries.map((entry) => {
    if (entry.isIncome) return `Income #${++income}`;
    const category =
      cleanCategory(anonymiseDescription(entry.category ?? "")).trim() || "Budget entry";
    const n = (ordinals.get(category) ?? 0) + 1;
    ordinals.set(category, n);
    return `${category} #${n}`;
  });
}
