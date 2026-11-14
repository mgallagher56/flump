/**
 * Page-rules test helper (E16 plan 4.7). Plain DOM code with no test-library imports, so it runs
 * in Storybook `play()` functions and in Vitest alike, and never reaches an app bundle (import it
 * from `@repo/ui/testing` in tests and stories only).
 *
 * WHAT COUNTS AS A FIGURE (plan section 3, P1): a money amount, a percentage, a duration or a date
 * shown as data. Each occurrence counts, so a figure printed twice costs two (P6 forbids repeats).
 *
 * - An element marked `data-figure` counts as exactly one figure, whatever its text. Use it for a
 *   value split across elements (a `£` in one span and the digits in another) or for a figure the
 *   patterns below do not recognise. Its contents are not scanned again.
 * - Anything inside `[data-list-row]` is skipped: a user's own list rows are budgeted per row by
 *   P1.4, not in the page total.
 * - Anything not shown is skipped: `aria-hidden="true"`, the `hidden` attribute, `<template>`,
 *   `<script>`, `<style>`, visually hidden text (the `VisuallyHidden` recipe class) and
 *   `[data-figure-ignore]` (an escape hatch for decorative text the patterns misread).
 * - Text in the remaining elements is matched against these patterns, never across a block
 *   boundary (a `div`, `p`, `li`, cell or heading ends a run of text):
 *   - money: `£1,234`, `-£1,234.56`, `−£3.4k`, `£1.2m`, `£1.5bn`;
 *   - percentage: `5%`, `24.9%`, `5.25 %`;
 *   - duration: `3 years 4 months`, `1 year`, `18 months`, `6 weeks`, `10 days` (one figure each);
 *   - date: `Mar 2030`, `March 2030`, `1 Mar 2030`, `2025/26` (a tax year).
 *   Bare numbers and bare years ("2030") are not figures: axis ticks and counts would swamp them.
 */
import { visuallyHiddenRecipe } from "../primitives/VisuallyHidden/VisuallyHidden.styles";

export type FigureKind = "money" | "percent" | "duration" | "date" | "marked";

export interface FoundFigure {
  kind: FigureKind;
  /** The matched text (for `marked`, the element's trimmed text). */
  text: string;
}

const MONTH =
  "(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June?|July?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)";

/** Order matters: earlier kinds claim their text first, so "3 years 4 months" is one duration. */
const PATTERNS: ReadonlyArray<{ kind: Exclude<FigureKind, "marked">; source: string }> = [
  { kind: "money", source: "[-−]?£ ?\\d(?:[\\d,]*\\d)?(?:\\.\\d+)?(?:bn|[km])?(?!\\w)" },
  { kind: "percent", source: "[-−]?\\d+(?:\\.\\d+)? ?%" },
  {
    kind: "duration",
    source:
      "\\b\\d+ (?:years?|yrs?)(?: (?:and )?\\d+ months?)?\\b|\\b\\d+ (?:months?|weeks?|days?)\\b",
  },
  { kind: "date", source: `\\b(?:\\d{1,2} )?${MONTH} \\d{4}\\b|\\b\\d{4}/\\d{2}\\b` },
];

const COMBINED = new RegExp(PATTERNS.map((p) => `(${p.source})`).join("|"), "g");

const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "TEMPLATE", "NOSCRIPT", "SVG"]);

/** Elements that end a run of text, so a pattern never joins words from two blocks. */
const BLOCK_TAGS = new Set([
  "ADDRESS",
  "ARTICLE",
  "ASIDE",
  "BLOCKQUOTE",
  "BR",
  "BUTTON",
  "CAPTION",
  "DD",
  "DETAILS",
  "DIALOG",
  "DIV",
  "DL",
  "DT",
  "FIELDSET",
  "FIGCAPTION",
  "FIGURE",
  "FOOTER",
  "FORM",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "HEADER",
  "HR",
  "LABEL",
  "LEGEND",
  "LI",
  "MAIN",
  "NAV",
  "OL",
  "OPTION",
  "P",
  "SECTION",
  "SELECT",
  "SUMMARY",
  "TABLE",
  "TBODY",
  "TD",
  "TFOOT",
  "TH",
  "THEAD",
  "TR",
  "UL",
]);

let hiddenClasses: string[] | undefined;
const visuallyHiddenClasses = (): string[] => {
  hiddenClasses ??= visuallyHiddenRecipe({ focusable: false }).split(/\s+/).filter(Boolean);
  return hiddenClasses;
};

const isVisuallyHidden = (el: Element): boolean => {
  const classes = visuallyHiddenClasses();
  return classes.length > 0 && classes.every((c) => el.classList.contains(c));
};

const isSkipped = (el: Element): boolean =>
  SKIP_TAGS.has(el.tagName.toUpperCase()) ||
  el.getAttribute("aria-hidden") === "true" ||
  el.hasAttribute("hidden") ||
  el.hasAttribute("data-figure-ignore") ||
  el.hasAttribute("data-list-row") ||
  isVisuallyHidden(el);

const NOT_SET = /\bNot set\b/g;

type Run = { kind: "text" | "marked"; text: string };

/**
 * The shown text under `root`, as runs that never cross a block boundary. A `data-figure` element
 * is one `marked` run; skipped elements (see the module comment) contribute nothing.
 */
function readRuns(root: Element): Run[] {
  const runs: Run[] = [];
  let run = "";

  const flush = (): void => {
    if (run.trim()) runs.push({ kind: "text", text: run });
    run = "";
  };

  const visit = (node: Node): void => {
    if (node.nodeType === 3) {
      // Normalise non-breaking and other spaces so "£1,000 a month" and "3&nbsp;years" match.
      run += (node.nodeValue ?? "").replace(/\s+/g, " ");
      return;
    }
    if (node.nodeType !== 1) return;
    const el = node as Element;
    if (isSkipped(el)) return;
    if (el.hasAttribute("data-figure")) {
      flush();
      runs.push({ kind: "marked", text: (el.textContent ?? "").replace(/\s+/g, " ").trim() });
      return;
    }
    const block = BLOCK_TAGS.has(el.tagName.toUpperCase());
    if (block) flush();
    for (const child of Array.from(el.childNodes)) visit(child);
    if (block) flush();
  };

  if (isSkipped(root)) return runs;
  visit(root);
  flush();
  return runs;
}

/** List every figure under `root` (see the module comment for the rules). */
export function findFigures(root: Element): FoundFigure[] {
  const found: FoundFigure[] = [];
  for (const run of readRuns(root)) {
    if (run.kind === "marked") {
      found.push({ kind: "marked", text: run.text });
      continue;
    }
    for (const match of run.text.matchAll(COMBINED)) {
      const index = match.slice(1).findIndex((group) => group !== undefined);
      const pattern = PATTERNS[index];
      if (pattern) found.push({ kind: pattern.kind, text: match[0] });
    }
  }
  return found;
}

/** Count the shown "Not set" values under `root` (same visibility rules as `findFigures`). */
export function countNotSet(root: Element): number {
  return readRuns(root).reduce((sum, run) => sum + (run.text.match(NOT_SET)?.length ?? 0), 0);
}

/** Count the figures shown under `root`: money, percentages, durations and dates (see above). */
export function countFigures(root: Element): number {
  return findFigures(root).length;
}

export interface PageRulesOptions {
  /** Most figures allowed (P1.1 first view: 4; P1.3 whole page: 12). Omit to skip the check. */
  maxFigures?: number;
  /** Most "Not set" values allowed (P3.4: 1 in the first view, 3 on the page). Omit to skip. */
  maxNotSet?: number;
  /**
   * Exact number of `[data-notice="projection"]` notices expected (P4.1). Defaults to "at most 1";
   * pass 1 on a page that shows a projection, 0 on one that does not.
   */
  projectionNotices?: number;
}

/**
 * Assert the page-level rules on a rendered page and throw one error listing every breach:
 * - at most `maxFigures` figures (`countFigures`);
 * - at most `maxNotSet` "Not set" values;
 * - at most one `[data-tone="hero"]` (P2.2);
 * - at most one `[data-notice="projection"]`, or exactly `projectionNotices` (P4.1);
 * - no projection notice before the page's h1 in document order (P4.1, "never above the h1").
 */
export function expectPageRules(root: Element, options: PageRulesOptions = {}): void {
  const problems: string[] = [];

  if (options.maxFigures !== undefined) {
    const figures = findFigures(root);
    if (figures.length > options.maxFigures) {
      const list = figures.map((f) => `${f.kind} "${f.text}"`).join(", ");
      problems.push(
        `Shows ${figures.length} figures, more than the ${options.maxFigures} allowed: ${list}`,
      );
    }
  }

  if (options.maxNotSet !== undefined) {
    const notSet = countNotSet(root);
    if (notSet > options.maxNotSet) {
      problems.push(`Shows "Not set" ${notSet} times, more than the ${options.maxNotSet} allowed`);
    }
  }

  const heroes = root.querySelectorAll('[data-tone="hero"]').length;
  if (heroes > 1) problems.push(`Has ${heroes} hero blocks; at most one is allowed`);

  const notices = Array.from(root.querySelectorAll('[data-notice="projection"]'));
  if (options.projectionNotices !== undefined) {
    if (notices.length !== options.projectionNotices) {
      problems.push(
        `Has ${notices.length} projection notices; expected ${options.projectionNotices}`,
      );
    }
  } else if (notices.length > 1) {
    problems.push(`Has ${notices.length} projection notices; at most one is allowed`);
  }

  const h1 = root.querySelector("h1");
  if (h1) {
    for (const notice of notices) {
      // DOCUMENT_POSITION_FOLLOWING (4): the h1 comes after the notice.
      if (notice.compareDocumentPosition(h1) & 4) {
        problems.push("A projection notice sits above the h1");
        break;
      }
    }
  }

  if (problems.length > 0) {
    throw new Error(`Page rules failed:\n- ${problems.join("\n- ")}`);
  }
}
