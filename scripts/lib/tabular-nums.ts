// Pure logic for the tabular-nums ratchet (AGENTS.md section 2).

const FORMATS_NUMBERS =
  /\b(?:formatCurrency|useFormatCurrency)\b|Intl\.NumberFormat|\.toLocaleString\(|\.toFixed\(/;
const HAS_TABULAR = /tabular-nums|tabularNums|fontVariantNumeric/;

export function needsTabular(source: string): boolean {
  return FORMATS_NUMBERS.test(source) && !HAS_TABULAR.test(source);
}
