import type { Page } from "@playwright/test";

/**
 * DOM metrics for one rendered page, field for field the shape of
 * docs/design/e16-polish/before/metrics-*.json, plus the E16 page-rule counts.
 *
 * Figures follow `countFigures` in packages/ui/src/testing/pageRules.ts: text runs never cross an
 * element boundary, `data-figure` elements count once, hidden text and `[data-list-row]` rows are
 * skipped. Only the money, percentage and duration patterns are used (dates are left out, as in
 * the first audit). N1 is distinct figures in the first view, N distinct figures on the page.
 */
export interface DomMetrics {
  h1: string;
  title: string;
  foldNumbers: number;
  foldDistinct: number;
  pageNumbers: number;
  pageDistinct: number;
  foldHeadings: string[];
  pageHeadings: number;
  foldButtons: string[];
  pageButtons: number;
  inputs: number;
  charts: number;
  tables: number;
  fontSizes: string[];
  fonts: string[];
  pageHeight: number;
  hscroll: boolean;
  words: number;
  heroes: number;
  notices: { projection: number; note: number };
  notSet: number;
  primaryButtons: number;
}

export function readMetrics(page: Page): Promise<DomMetrics> {
  return page.evaluate(() => {
    const foldHeight = window.innerHeight;
    const PATTERNS = [
      "[-−]?£ ?\\d(?:[\\d,]*\\d)?(?:\\.\\d+)?(?:bn|[km])?(?!\\w)",
      "[-−]?\\d+(?:\\.\\d+)? ?%",
      "\\b\\d+ (?:years?|yrs?)(?: (?:and )?\\d+ months?)?\\b|\\b\\d+ (?:months?|weeks?|days?)\\b",
    ];
    const combined = new RegExp(PATTERNS.map((p) => `(${p})`).join("|"), "g");
    const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "TEMPLATE", "NOSCRIPT", "SVG"]);

    const isHidden = (el: Element): boolean => {
      if (SKIP_TAGS.has(el.tagName.toUpperCase())) return true;
      if (el.getAttribute("aria-hidden") === "true" || el.hasAttribute("hidden")) return true;
      if (el.hasAttribute("data-figure-ignore") || el.hasAttribute("data-list-row")) return true;
      const style = getComputedStyle(el);
      // Not checkVisibility(): it is false for `display: contents` wrappers, whose children show.
      if (style.display === "none" || style.visibility === "hidden") return true;
      const rect = el.getBoundingClientRect();
      // The VisuallyHidden recipe: a 1px box with its overflow clipped.
      if (rect.width <= 1 && rect.height <= 1 && style.overflow === "hidden") return true;
      return false;
    };
    const inFold = (el: Element): boolean => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.top < foldHeight && rect.bottom > 0;
    };

    type Run = { text: string; el: Element; marked: boolean };
    const runs: Run[] = [];
    const visit = (el: Element) => {
      if (isHidden(el)) return;
      if (el.hasAttribute("data-figure")) {
        runs.push({ text: (el.textContent ?? "").replace(/\s+/g, " ").trim(), el, marked: true });
        return;
      }
      let run = "";
      const flush = () => {
        if (run.trim()) runs.push({ text: run, el, marked: false });
        run = "";
      };
      for (const child of Array.from(el.childNodes)) {
        if (child.nodeType === 3) run += (child.nodeValue ?? "").replace(/\s+/g, " ");
        else if (child.nodeType === 1) {
          flush();
          visit(child as Element);
        }
      }
      flush();
    };
    visit(document.body);

    const figures: Array<{ text: string; fold: boolean }> = [];
    let notSet = 0;
    for (const run of runs) {
      const fold = inFold(run.el);
      if (run.marked) {
        figures.push({ text: run.text, fold });
        continue;
      }
      notSet += run.text.match(/\bNot set\b/g)?.length ?? 0;
      for (const match of run.text.matchAll(combined))
        figures.push({ text: match[0].trim(), fold });
    }
    const foldFigures = figures.filter((f) => f.fold);

    const visible = (el: Element) => !isHiddenUp(el);
    const isHiddenUp = (el: Element): boolean => {
      for (let node: Element | null = el; node; node = node.parentElement) {
        if (node.hasAttribute("hidden") || node.getAttribute("aria-hidden") === "true") return true;
      }
      const style = getComputedStyle(el);
      if (style.display === "contents") return false;
      return !(el as HTMLElement).checkVisibility?.({ visibilityProperty: true });
    };
    const label = (el: Element) =>
      (el.getAttribute("aria-label") || (el.textContent ?? "")).replace(/\s+/g, " ").trim();

    const headings = [...document.querySelectorAll("h1, h2, h3, h4")].filter(visible);
    const buttons = [
      ...document.querySelectorAll('button, [role="button"], a[data-variant]'),
    ].filter(visible);
    const textEls = [...document.body.querySelectorAll("*")].filter(
      (el) =>
        [...el.childNodes].some((n) => n.nodeType === 3 && (n.nodeValue ?? "").trim()) &&
        visible(el),
    );
    const sizes = new Set<string>();
    const fonts = new Set<string>();
    for (const el of textEls) {
      const style = getComputedStyle(el);
      sizes.add(style.fontSize);
      fonts.add(style.fontFamily.split(",")[0]?.trim() ?? "");
    }
    const root = document.documentElement;
    return {
      h1: label(headings.find((h) => h.tagName === "H1") ?? document.createElement("i")),
      title: document.title,
      foldNumbers: foldFigures.length,
      foldDistinct: new Set(foldFigures.map((f) => f.text)).size,
      pageNumbers: figures.length,
      pageDistinct: new Set(figures.map((f) => f.text)).size,
      foldHeadings: headings.filter(inFold).map((h) => `${h.tagName}:${label(h)}`),
      pageHeadings: headings.length,
      foldButtons: buttons.filter(inFold).map(label),
      pageButtons: buttons.length,
      inputs: [...document.querySelectorAll("input, select, textarea")].filter(visible).length,
      charts: document.querySelectorAll(".recharts-wrapper, canvas, [data-chart]").length,
      tables: [...document.querySelectorAll("table")].filter(visible).length,
      fontSizes: [...sizes].sort((a, b) => Number.parseFloat(a) - Number.parseFloat(b)),
      fonts: [...fonts],
      pageHeight: root.scrollHeight,
      hscroll: root.scrollWidth > root.clientWidth,
      // biome-ignore lint/performance/useDomNodeTextContent: rendered words are the measure, as in the first audit
      words: (document.body.innerText.match(/\S+/g) ?? []).length,
      heroes: document.querySelectorAll('[data-tone="hero"]').length,
      notices: {
        projection: document.querySelectorAll('[data-notice="projection"]').length,
        note: [...document.querySelectorAll('[role="note"]')].filter(visible).length,
      },
      notSet,
      primaryButtons: [
        ...document.querySelectorAll('button[data-variant="primary"], a[data-variant="primary"]'),
      ].filter(visible).length,
    };
  });
}
