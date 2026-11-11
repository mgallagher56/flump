// Pure logic for the tabular-nums ratchet (AGENTS.md section 2).

const FORMATS_NUMBERS =
  /\b(?:formatCurrency|useFormatCurrency)\b|Intl\.NumberFormat|\.toLocaleString\(|\.toFixed\(/;
const HAS_TABULAR = /tabular-nums|tabularNums|fontVariantNumeric/;

// Known limitations (heuristic ratchet, not a type-aware check):
// - The tabular-nums marker is file-wide: one `tabular-nums` anywhere satisfies the
//   whole file, even if other number-formatting call sites lack it.
// - `.toFixed(` is flagged even when the number is not financial (e.g. a CSS
//   value or a progress ratio); baseline such files rather than loosening the regex.
export function needsTabular(source: string): boolean {
  return FORMATS_NUMBERS.test(source) && !HAS_TABULAR.test(source);
}
