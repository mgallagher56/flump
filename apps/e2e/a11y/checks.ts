import AxeBuilder from "@axe-core/playwright";
import type { ElementHandle, Page } from "@playwright/test";
import { horizontalOverflow } from "../support/page";
import type { RuleCounts } from "./baseline";

/** One check's result: counts for the baseline, and human-readable detail for a failure. */
export interface CheckResult {
  counts: RuleCounts;
  details: string[];
}

/** WCAG 2.0, 2.1 and 2.2 A and AA, as the UX guidelines require (A7). */
export const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

/**
 * How many Tab stops the focus walk visits. Enough to cover the skip link, the header, the
 * navigation and the first controls of the page body on every route, without making each test
 * slow on the long pages.
 */
export const MAX_TAB_STOPS = 25;

export const EXPECTED_LANG = "en-GB";

/** axe rule id -> number of failing nodes. */
export async function runAxe(page: Page): Promise<CheckResult> {
  const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  const counts: RuleCounts = {};
  const details: string[] = [];
  for (const violation of results.violations) {
    counts[violation.id] = violation.nodes.length;
    const targets = violation.nodes
      .slice(0, 3)
      .map((node) => node.target.join(" "))
      .join(", ");
    details.push(
      `axe ${violation.id} (${violation.impact ?? "n/a"}): ${violation.nodes.length} node(s), e.g. ${targets}. ${violation.helpUrl}`,
    );
  }
  return { counts, details };
}

/** WCAG 1.4.10 reflow: nothing wider than the viewport (run at 320 px). */
export async function runReflow(page: Page): Promise<CheckResult> {
  const overflow = await horizontalOverflow(page);
  const overflowing = overflow.culprits.length > 0 || overflow.scrollWidth > overflow.viewport;
  return {
    counts: { "horizontal-overflow": overflowing ? 1 : 0 },
    details: overflowing
      ? [
          `reflow: scrollWidth ${overflow.scrollWidth} > ${overflow.viewport}px; ${overflow.culprits.join(", ")}`,
        ]
      : [],
  };
}

/** `<html lang>` is en-GB on both sites (A7, K19). */
export async function runLang(page: Page): Promise<CheckResult> {
  const lang = await page.locator("html").getAttribute("lang");
  const ok = lang === EXPECTED_LANG;
  return {
    counts: { "html-lang-not-en-GB": ok ? 0 : 1 },
    details: ok ? [] : [`lang: <html lang="${lang ?? ""}">, expected "${EXPECTED_LANG}"`],
  };
}

/** The page renders something a user can identify: a non-empty `<title>`. */
export async function runRender(page: Page): Promise<CheckResult> {
  const empty = (await page.title()).trim() === "";
  return {
    counts: { "empty-title": empty ? 1 : 0 },
    details: empty ? ["render: the document <title> is empty"] : [],
  };
}

/** What a focus indicator can change, on the element, its two nearest ancestors and pseudos. */
function focusSignature(el: Element): { signature: string; hasOutline: boolean } {
  // Only what can be seen counts: an outline-offset change under `outline: none`, or a border
  // colour change on a zero-width border, is not an indicator.
  const transparent = (colour: string) => /rgba\([^)]*,\s*0\)|transparent/.test(colour);
  const visibleOutline = (style: CSSStyleDeclaration) =>
    style.outlineStyle !== "none" &&
    Number.parseFloat(style.outlineWidth) > 0 &&
    !transparent(style.outlineColor);
  const border = (style: CSSStyleDeclaration, side: "Top" | "Right" | "Bottom" | "Left") =>
    style[`border${side}Style`] !== "none" && Number.parseFloat(style[`border${side}Width`]) > 0
      ? style[`border${side}Color`]
      : "-";
  const read = (style: CSSStyleDeclaration) =>
    [
      visibleOutline(style)
        ? `${style.outlineStyle} ${style.outlineWidth} ${style.outlineColor} ${style.outlineOffset}`
        : "-",
      style.boxShadow,
      border(style, "Top"),
      border(style, "Right"),
      border(style, "Bottom"),
      border(style, "Left"),
      style.textDecorationLine,
    ].join("|");
  const parts: string[] = [];
  let hasOutline = false;
  for (const pseudo of [null, "::before", "::after"]) {
    const style = getComputedStyle(el, pseudo);
    parts.push(read(style));
    if (visibleOutline(style)) hasOutline = true;
  }
  let ancestor = el.parentElement;
  for (let i = 0; i < 2 && ancestor; i++, ancestor = ancestor.parentElement)
    parts.push(read(getComputedStyle(ancestor)));
  return { signature: parts.join("||"), hasOutline };
}

interface FocusStop {
  /** Null when focus left the page or came back round to an element already visited. */
  description: string | null;
  isSkipLink: boolean;
  obscured: boolean;
  signature: string;
  hasOutline: boolean;
}

declare global {
  interface Window {
    __a11yVisited?: WeakSet<Element>;
  }
}

/**
 * Tabs through the first MAX_TAB_STOPS focusable elements (WCAG 2.4.7 focus visible, 2.4.11
 * focus not obscured, 2.4.1 bypass blocks) and counts:
 * - `no-visible-indicator`: focusing changes no outline, box-shadow or border on the element,
 *   its pseudo-elements or its two nearest ancestors, and it has no visible outline;
 * - `obscured`: the point at the element's centre belongs to a fixed or sticky bar that does
 *   not contain it;
 * - `skip-link-not-first`: a skip link exists but is not the first Tab stop;
 * - `no-skip-link`: the page has no skip link (A3 asks for one on every page).
 */
export async function runFocusWalk(page: Page): Promise<CheckResult> {
  // Transitions would let a computed style be read mid-animation.
  await page.addStyleTag({
    content: "*, *::before, *::after { transition: none !important; animation: none !important; }",
  });
  const hasSkipLink = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')].some((a) =>
      /skip/i.test(a.textContent ?? ""),
    ),
  );

  const counts: RuleCounts = {
    "no-visible-indicator": 0,
    obscured: 0,
    "skip-link-not-first": 0,
    "no-skip-link": hasSkipLink ? 0 : 1,
  };
  const details: string[] = hasSkipLink ? [] : ["focus: the page has no skip link"];

  let previous: { handle: ElementHandle<Element>; stop: FocusStop } | null = null;
  const settlePrevious = async () => {
    if (!previous) return;
    const { handle, stop } = previous;
    const unfocused = await handle.evaluate(focusSignature).catch(() => null);
    const changed = unfocused !== null && unfocused.signature !== stop.signature;
    if (!stop.hasOutline && !changed) {
      counts["no-visible-indicator"] = (counts["no-visible-indicator"] ?? 0) + 1;
      details.push(`focus: no visible indicator on ${stop.description}`);
    }
    await handle.dispose();
    previous = null;
  };

  for (let i = 0; i < MAX_TAB_STOPS; i++) {
    await page.keyboard.press("Tab");
    const handle = (await page.evaluateHandle(() => document.activeElement)).asElement();
    const info = handle
      ? await handle.evaluate((el) => {
          window.__a11yVisited ??= new WeakSet();
          if (
            el === document.body ||
            el === document.documentElement ||
            window.__a11yVisited.has(el)
          )
            return null;
          window.__a11yVisited.add(el);

          const name = (
            el.getAttribute("aria-label") ||
            el.textContent ||
            el.getAttribute("title") ||
            el.getAttribute("name") ||
            ""
          )
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 40);
          const role = el.getAttribute("role");
          const description = `${el.tagName.toLowerCase()}${role ? `[role=${role}]` : ""} "${name}"`;
          const isSkipLink =
            el instanceof HTMLAnchorElement &&
            (el.getAttribute("href") ?? "").startsWith("#") &&
            /skip/i.test(el.textContent ?? "");

          let obscured = false;
          const rect = el.getBoundingClientRect();
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height / 2;
          const onScreen =
            rect.width >= 2 &&
            rect.height >= 2 &&
            cx >= 0 &&
            cy >= 0 &&
            cx < window.innerWidth &&
            cy < window.innerHeight;
          const hit = onScreen ? document.elementFromPoint(cx, cy) : null;
          const label = hit?.closest("label");
          const related =
            !hit ||
            hit === el ||
            el.contains(hit) ||
            hit.contains(el) ||
            (label !== null && label !== undefined && (label.control === el || label.contains(el)));
          if (!related) {
            for (let n: Element | null = hit; n && n !== document.body; n = n.parentElement) {
              const position = getComputedStyle(n).position;
              if ((position === "fixed" || position === "sticky") && !n.contains(el)) {
                obscured = true;
                break;
              }
            }
          }
          return { description, isSkipLink, obscured };
        })
      : null;
    const stop: FocusStop | null =
      handle && info ? { ...info, ...(await handle.evaluate(focusSignature)) } : null;

    await settlePrevious();
    if (!handle || !stop) {
      await handle?.dispose();
      break;
    }
    if (i === 0 && hasSkipLink && !stop.isSkipLink) {
      counts["skip-link-not-first"] = 1;
      details.push(`focus: the first Tab stop is ${stop.description}, not the skip link`);
    }
    if (stop.obscured) {
      counts.obscured = (counts.obscured ?? 0) + 1;
      details.push(`focus: ${stop.description} is hidden behind a fixed or sticky bar`);
    }
    previous = { handle, stop };
  }
  // The last stop is compared once focus has moved off it.
  if (previous) {
    await page.keyboard.press("Tab");
    await settlePrevious();
  }
  return { counts, details };
}
