/**
 * Shared institution scrub list (E17-N4). One list for every anonymisation path so the
 * MCP tools and the AI context pack cannot drift apart.
 */
export const INSTITUTION_SCRUB_LIST: readonly string[] = [
  "monzo",
  "starling",
  "barclays",
  "hsbc",
  "santander",
  "natwest",
  "lloyds",
  "halifax",
  "amex",
  "nationwide",
  "revolut",
  "tsb",
  "first direct",
  "metro bank",
  "virgin money",
  "mbna",
];

const SCRUB_PATTERN = new RegExp(INSTITUTION_SCRUB_LIST.join("|"), "gi");

/** Replaces known institution names in free text with the generic label "Bank". */
export function scrubInstitutionNames(text: string): string {
  return text.replace(SCRUB_PATTERN, "Bank");
}
