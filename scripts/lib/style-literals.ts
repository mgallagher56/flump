// Pure logic for the E16 style-literal ratchet (plan section 4.7). Four rules, each counted per
// file so a baseline can only shrink:
//   fontSize    a fontSize value that is not a `fontSizes` scale key (raw px/rem/clamp/numbers).
//               Sizes belong in textStyles or the scale.
//   fontWeight  a fontWeight above 700 (800, 900, "extrabold", "black").
//   duration    a transition/animation duration written as a literal ("0.2s ease", "150ms").
//               Use the `durations` and `easings` tokens.
//   inlineStyle a JSX `style=` prop in apps/web or apps/marketing.

export const STYLE_RULES = ["fontSize", "fontWeight", "duration", "inlineStyle"] as const;
export type StyleRule = (typeof STYLE_RULES)[number];
export type StyleCounts = Record<StyleRule, number>;

/** `fontSizes` keys from packages/tokens/src/index.ts, plus CSS-wide keywords. */
export const FONT_SIZE_KEYS = new Set([
  "xs",
  "sm",
  "md",
  "lg",
  "xl",
  "2xl",
  "3xl",
  "4xl",
  "5xl",
  "6xl",
  "inherit",
  "initial",
  "unset",
  "1em",
  "100%",
]);
const HEAVY_WEIGHTS = new Set(["800", "900", "extrabold", "black", "heavy"]);
const MOTION_PROPS =
  "transition|transitionDuration|transitionDelay|animation|animationDuration|animationDelay";
// A duration literal: 0.2s, .15s, 150ms, 1s. `token(durations.fast)` never matches.
const DURATION = /(?<![\w.-])\d*\.?\d+m?s(?![\w-])/g;

const INLINE_STYLE_DIRS = ["apps/web/", "apps/marketing/"];

/**
 * Strip // and /* *\/ comments so prose never counts. Quote-aware: "//" or "/*" inside a string
 * or template literal (URLs, `${scheme}//${host}`) is kept. Regex literals are not parsed, which
 * is fine for style files.
 */
export function stripComments(source: string): string {
  let out = "";
  let quote: string | null = null;
  for (let i = 0; i < source.length; i++) {
    const c = source[i] as string;
    const next = source[i + 1];
    if (quote) {
      out += c;
      if (c === "\\") {
        out += next ?? "";
        i++;
      } else if (c === quote || (quote !== "`" && c === "\n")) quote = null;
    } else if (c === "/" && next === "/") {
      while (i < source.length && source[i] !== "\n") i++;
      out += "\n";
    } else if (c === "/" && next === "*") {
      const end = source.indexOf("*/", i + 2);
      i = end === -1 ? source.length : end + 1;
    } else {
      if (c === '"' || c === "'" || c === "`") quote = c;
      out += c;
    }
  }
  return out;
}

/**
 * The expression after `key:` (object property) or `key=` (JSX attribute).
 * Property: up to the first `,` `;` newline or closing bracket at depth 0, so it covers
 * `{ base: "2xl", md: "4xl" }` and ternaries. Attribute: exactly one string or one `{...}`.
 */
function valueSpan(source: string, start: number, isAttribute: boolean): string {
  let depth = 0;
  let quote: string | null = null;
  let i = start;
  for (; i < source.length; i++) {
    const c = source[i] as string;
    if (quote) {
      if (c === "\\") i++;
      else if (c === quote) {
        quote = null;
        if (isAttribute && depth === 0) return source.slice(start, i + 1);
      }
      continue;
    }
    if (c === '"' || c === "'" || c === "`") quote = c;
    else if (c === "(" || c === "[" || c === "{") depth++;
    else if (c === ")" || c === "]" || c === "}") {
      if (depth === 0) break;
      depth--;
      if (isAttribute && depth === 0) return source.slice(start, i + 1);
    } else if (depth === 0 && (c === "," || c === ";" || c === "\n")) break;
    else if (isAttribute && depth === 0 && /\s/.test(c)) break;
  }
  return source.slice(start, i);
}

function stringsIn(span: string): string[] {
  return [...span.matchAll(/"([^"\n]*)"|'([^'\n]*)'|`([^`]*)`/g)].map(
    (m) => (m[1] ?? m[2] ?? m[3]) as string,
  );
}

/** Bare numbers outside strings, e.g. `fontSize: 12` or `fontSize={11}`. */
function bareNumbersIn(span: string): string[] {
  const noStrings = span.replace(/"[^"\n]*"|'[^'\n]*'|`[^`]*`/g, '""');
  // Ignore numbers that are part of identifiers or member access (size2, sizes[0]).
  return [...noStrings.matchAll(/(?<![\w.[\]])\d+(?:\.\d+)?(?![\w.])/g)].map((m) => m[0]);
}

function spansFor(code: string, prop: string): string[] {
  // `:` is an object property, `=` (not `==`) a JSX attribute or a default value.
  const re = new RegExp(`(?<![\\w-])(?:${prop})\\s*(:|=(?!=))\\s*`, "g");
  return [...code.matchAll(re)].map((m) =>
    valueSpan(code, (m.index ?? 0) + m[0].length, m[1] === "="),
  );
}

export function countFontSizeLiterals(code: string): number {
  let n = 0;
  for (const span of spansFor(code, "fontSize")) {
    for (const s of stringsIn(span)) if (!FONT_SIZE_KEYS.has(s.trim())) n++;
    n += bareNumbersIn(span).length;
  }
  return n;
}

export function countHeavyWeights(code: string): number {
  let n = 0;
  for (const span of spansFor(code, "fontWeight")) {
    for (const s of stringsIn(span)) if (HEAVY_WEIGHTS.has(s.trim())) n++;
    for (const num of bareNumbersIn(span)) if (Number(num) > 700) n++;
  }
  return n;
}

export function countDurationLiterals(code: string): number {
  let n = 0;
  for (const span of spansFor(code, MOTION_PROPS)) {
    for (const s of stringsIn(span)) n += s.match(DURATION)?.length ?? 0;
    // A bare number is a duration only as the whole value (`transitionDuration: 200`) or under a
    // duration/delay key (`transition={{ duration: 0.3 }}`); spring stiffness/damping do not count.
    const noStrings = span.replace(/"[^"\n]*"|'[^'\n]*'|`[^`]*`/g, '""');
    if (/^\s*\d*\.?\d+\s*$/.test(noStrings)) n++;
    n += noStrings.match(/\b(?:duration|delay)\s*:\s*\d*\.?\d+/g)?.length ?? 0;
  }
  return n;
}

export function countInlineStyles(code: string): number {
  return code.match(/(?<![\w-])style=\{/g)?.length ?? 0;
}

export function countStyleLiterals(relPath: string, source: string): StyleCounts {
  const code = stripComments(source);
  return {
    fontSize: countFontSizeLiterals(code),
    fontWeight: countHeavyWeights(code),
    duration: countDurationLiterals(code),
    inlineStyle: INLINE_STYLE_DIRS.some((d) => relPath.startsWith(d)) ? countInlineStyles(code) : 0,
  };
}

/** Token and preset files define the scale itself, so they are not scanned. */
export function isStyleScanExempt(relPath: string): boolean {
  return relPath.startsWith("packages/tokens/") || relPath.startsWith("packages/ui/src/tokens/");
}

export type StyleBaseline = Record<StyleRule, Record<string, number>>;

export function emptyBaseline(): StyleBaseline {
  return { fontSize: {}, fontWeight: {}, duration: {}, inlineStyle: {} };
}
