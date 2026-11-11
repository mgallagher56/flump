// Pure logic for the design-token ratchet (AGENTS.md section 2): components may
// not use raw hex/rgb/hsl colours or primitive scale tokens such as "indigo.600".

const STRING_LITERAL = /"[^"\n]*"|'[^'\n]*'|`[^`]*`/g;
const HEX = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/g;
const COLOUR_FN = /\b(?:rgba?|hsla?)\(/g;

const PRIMITIVES = [
  "slate",
  "gray",
  "grey",
  "zinc",
  "neutral",
  "stone",
  "red",
  "orange",
  "amber",
  "yellow",
  "lime",
  "green",
  "emerald",
  "teal",
  "cyan",
  "sky",
  "blue",
  "indigo",
  "violet",
  "purple",
  "fuchsia",
  "pink",
  "rose",
  "success",
  "warning",
  "danger",
  "info",
  "brand",
  "accent",
  "primary",
];
const SCALE = "(?:50|100|200|300|400|500|600|700|800|900|950)";
// Requires a scale suffix, so semantic tokens (status.danger.text, primary.solid,
// chart.series1) never match.
const PRIMITIVE = new RegExp(`(?<![\\w-])(?:${PRIMITIVES.join("|")})\\.${SCALE}(?![\\w-])`, "g");

export function countTokenViolations(source: string): number {
  // Only string literal contents are inspected, so comments and code never count.
  let total = 0;
  for (const literal of source.match(STRING_LITERAL) ?? []) {
    for (const re of [HEX, COLOUR_FN, PRIMITIVE]) total += literal.match(re)?.length ?? 0;
  }
  return total;
}

export type BaselineComparison = { failures: string[]; stale: string[] };

// Ratchet: a file may never exceed its baseline (new files have a baseline of 0),
// and baseline entries that are now lower or gone are stale so it can only shrink.
export function compareToBaseline(
  counts: Record<string, number>,
  baseline: Record<string, number>,
): BaselineComparison {
  const failures: string[] = [];
  const stale: string[] = [];
  for (const [file, count] of Object.entries(counts)) {
    if (count === 0) continue;
    const allowed = baseline[file] ?? 0;
    if (count > allowed)
      failures.push(`${file}: ${count} violation(s), baseline allows ${allowed}`);
  }
  for (const [file, allowed] of Object.entries(baseline)) {
    const count = counts[file] ?? 0;
    if (count < allowed) stale.push(`${file}: baseline ${allowed}, now ${count}`);
  }
  return { failures, stale };
}
