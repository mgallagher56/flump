// Pure logic for the design-token ratchet (AGENTS.md section 2): components may
// not use raw hex/rgb/hsl colours or primitive scale tokens such as "indigo.600".

// Hex rule: 6 or 8 digits match anywhere inside a literal ("1px solid #12345678").
// 3 or 4 digits only match when the WHOLE literal is exactly that hex ("#fff"),
// because short fragments such as "#faq" or "#add" are almost always anchors.
// Any literal directly assigned to href/id/to/htmlFor/aria-* (`href="#fab"`,
// `id: "#cafe"`) is treated as an anchor/identifier and never counts as a colour.
const HEX_LONG = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6})(?![0-9a-zA-Z_-])/g;
const HEX_SHORT_WHOLE = /^#[0-9a-fA-F]{3,4}$/;
// Short hex inside a longer CSS-like literal ("1px solid #fff", "linear-gradient(#fff, #000)"):
// must follow whitespace, "(" or ",", and contain a letter or repeat one digit (#000), so "Issue #123" and anchors are ignored.
const HEX_SHORT_INLINE =
  /(?<=[\s(,])#(?=[0-9a-fA-F]{3,4}(?![\w-]))(?:[0-9a-fA-F]*[a-fA-F][0-9a-fA-F]*|(\d)\1{2,3})/g;
/(?<=[\s(,])#(?=[0-9a-fA-F]{3,4}(?![\w-]))[0-9a-fA-F]*[a-fA-F][0-9a-fA-F]*/g;
const ANCHOR_CONTEXT =
  /(?:\b(?:href|id|htmlFor)|\baria-[\w-]+)\s*[=:]\s*\{?\s*$|\bto\s*=\s*\{?\s*$/;
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

type Literal = { text: string; before: string };

const KEYWORDS_BEFORE_STRING = new Set([
  "return",
  "case",
  "typeof",
  "in",
  "of",
  "else",
  "default",
  "yield",
  "await",
  "void",
  "delete",
  "new",
  "throw",
]);
// A single quote only opens a string after one of these characters (or a keyword
// such as `return`). This is what stops the apostrophe in JSX text or prose
// ("Don't", "users' data") from pairing with a later quote and hiding literals.
const SINGLE_QUOTE_OPENERS = "=([{,:?|&+-*/%<!;~^";

function singleQuoteOpens(source: string, i: number): boolean {
  let j = i - 1;
  while (j >= 0 && /\s/.test(source[j] as string)) j--;
  if (j < 0) return true;
  const ch = source[j] as string;
  if (ch === ">") return source[j - 1] === "=";
  if (SINGLE_QUOTE_OPENERS.includes(ch)) return true;
  if (/\w/.test(ch)) {
    let k = j;
    while (k >= 0 && /\w/.test(source[k] as string)) k--;
    return KEYWORDS_BEFORE_STRING.has(source.slice(k + 1, j + 1));
  }
  return false;
}

// Small tokenizer: yields string literals, skipping // and /* */ comments.
// Known limits: a "//" in JSX text (not after ":") is read as a comment; template
// literals are read to the next backtick without parsing `${}`.
export function extractStringLiterals(source: string): Literal[] {
  const out: Literal[] = [];
  let i = 0;
  while (i < source.length) {
    const c = source[i] as string;
    const next = source[i + 1];
    if (c === "/" && next === "/" && source[i - 1] !== ":") {
      while (i < source.length && source[i] !== "\n") i++;
    } else if (c === "/" && next === "*") {
      const end = source.indexOf("*/", i + 2);
      i = end === -1 ? source.length : end + 2;
    } else if (c === '"' || c === "`" || (c === "'" && singleQuoteOpens(source, i))) {
      let j = i + 1;
      while (j < source.length && source[j] !== c) {
        if (c !== "`" && source[j] === "\n") break;
        if (source[j] === "\\" && c !== "`") j++;
        j++;
      }
      if (source[j] === c) {
        out.push({ text: source.slice(i + 1, j), before: source.slice(Math.max(0, i - 40), i) });
        i = j + 1;
      } else {
        i++; // unterminated: treat the quote as plain text
      }
    } else {
      i++;
    }
  }
  return out;
}

// E16: Panda exposes a DEFAULT key under the group name only ("border", "primary"); a literal
// "border.DEFAULT" resolves to an undefined CSS variable, so the colour falls back to currentColor.
const DEFAULT_PATH = /(?<![\w-])[a-z]\w*(?:\.\w+)*\.DEFAULT(?![\w-])/g;

export function countTokenViolations(source: string): number {
  // Only string literal contents are inspected, so comments and code never count.
  let total = 0;
  for (const { text, before } of extractStringLiterals(source)) {
    if (!ANCHOR_CONTEXT.test(before)) {
      total += text.match(HEX_LONG)?.length ?? 0;
      if (HEX_SHORT_WHOLE.test(text)) total += 1;
      else total += text.match(HEX_SHORT_INLINE)?.length ?? 0;
    }
    total += text.match(COLOUR_FN)?.length ?? 0;
    total += text.match(PRIMITIVE)?.length ?? 0;
    total += text.match(DEFAULT_PATH)?.length ?? 0;
  }
  return total;
}

// E16 plan 4.4/4.7: disclaimers and scenario notes use the quiet note style (text.secondary,
// border.subtle, parent surface), never the indigo status.info alert. Counted only inside the
// ProjectionNotice and ScenarioZone recipes; status.info stays legal elsewhere.
const NOTICE_RECIPE = /(?:^|\/)(?:ProjectionNotice|ScenarioZone)\/[^/]+\.styles\.ts$/;
const STATUS_INFO = /(?<![\w-])status\.info(?:\.(?:text|bg|border|solid))?(?![\w-])/g;

export function countNoticeInfoUses(relPath: string, source: string): number {
  if (!NOTICE_RECIPE.test(relPath)) return 0;
  return extractStringLiterals(source).reduce(
    (n, { text }) => n + (text.match(STATUS_INFO)?.length ?? 0),
    0,
  );
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
