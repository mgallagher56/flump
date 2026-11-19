import type { Page } from "@playwright/test";

/**
 * Measured phone checks for the phone audit (docs/audit/phone-audit-2026-11). Every check runs in
 * the page and returns short descriptions, never markup, so the JSON stays readable. A check is a
 * signal for a person to look at, not a verdict: FINDINGS.md records what was confirmed by eye.
 */
export interface PhoneMetrics {
  viewport: { width: number; height: number };
  /** The page scrolls sideways, and up to six elements that stick out past the viewport. */
  hscroll: boolean;
  overflow: string[];
  /** Visible controls under 44px in either direction (UX-GUIDELINES touch targets, WCAG 2.5.5). */
  smallTargets: string[];
  /** Controls under 24px with a neighbour closer than 24px centre to edge (WCAG 2.5.8 AA). */
  crampedTargets: string[];
  /** Inputs whose text is under 16px (iOS Safari zooms the page on focus). */
  zoomInputs: string[];
  /** Inputs that look like money, a percentage, a date or an email without the matching keyboard. */
  keyboardMismatch: string[];
  /** Text inputs with no `autocomplete` where one exists for the field (name, email). */
  autocompleteMissing: string[];
  /** Text cut off by its own box (ellipsis or clipped overflow). */
  clipped: string[];
  /** Fixed and sticky chrome in the first view: top and bottom heights in px. */
  chromeTop: number;
  chromeBottom: number;
  chrome: string[];
  /** The last piece of content ends under the bottom chrome when scrolled to the end. */
  hiddenUnderBottomBar: string | null;
  /** Top of the page's headline (the hero figure, else the h1) in px from the top of the page. */
  headlineTop: number | null;
  headlineInFold: boolean;
  /** Illustrations at least partly in the first view (owner rule: at most one). */
  illustrationsInFold: number;
  /** Cumulative layout shift since load (layout-shift entries without recent input). */
  cls: number;
  pageHeight: number;
}

/** Injected before any page script so layout shifts from the first paint are counted. */
export const CLS_INIT = `
  window.__cls = 0;
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) window.__cls += entry.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
  } catch {}
`;

export function readPhoneMetrics(page: Page): Promise<PhoneMetrics> {
  return page.evaluate(async () => {
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;
    const nameOf = (el: Element) => {
      const label =
        el.getAttribute("aria-label") ||
        el.getAttribute("title") ||
        el.getAttribute("placeholder") ||
        el.textContent ||
        el.getAttribute("name") ||
        "";
      const text = label.replace(/\s+/g, " ").trim().slice(0, 40);
      const id = el.id ? `#${el.id}` : "";
      return `${el.tagName.toLowerCase()}${id}${text ? ` "${text}"` : ""}`;
    };
    const shown = (el: Element) => {
      const he = el as HTMLElement;
      if (!he.checkVisibility?.({ opacityProperty: true, visibilityProperty: true })) return false;
      if (el.closest('[aria-hidden="true"], [inert]')) return false;
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return false;
      const style = getComputedStyle(el);
      // The VisuallyHidden recipe.
      return !(style.position === "absolute" && style.clip !== "auto" && r.width <= 1);
    };
    // Scroll containers that scroll sideways on purpose (tables, tab rows, chart wrappers).
    const inSideScroller = (el: Element) => {
      for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
        const ox = getComputedStyle(n).overflowX;
        if (ox === "auto" || ox === "scroll" || ox === "hidden" || ox === "clip") return true;
      }
      return false;
    };

    const root = document.documentElement;
    const hscroll = root.scrollWidth > root.clientWidth + 1;
    const overflow = hscroll
      ? [...document.body.querySelectorAll("*")]
          .filter((el) => {
            const r = el.getBoundingClientRect();
            return r.width > 0 && r.right > vw + 1 && !inSideScroller(el);
          })
          .slice(0, 6)
          .map((el) => `${nameOf(el)} right=${Math.round(el.getBoundingClientRect().right)}`)
      : [];

    const CONTROL =
      'a[href], button, input:not([type="hidden"]), select, textarea, summary, [role="button"], [role="tab"], [role="link"], [role="menuitem"], [role="switch"], [role="checkbox"], [role="radio"], [role="slider"], [role="combobox"]';
    const controls = [...document.querySelectorAll(CONTROL)].filter(shown);
    // An inline link inside running text is exempt from the target size (WCAG 2.5.8 "inline").
    const inlineLink = (el: Element) =>
      el.tagName === "A" &&
      getComputedStyle(el).display === "inline" &&
      /^(P|LI|SPAN|SMALL|DD|TD)$/.test(el.parentElement?.tagName ?? "");
    // A native checkbox or radio inside a label is sized by the label.
    const labelled = (el: Element) => {
      if (!(el instanceof HTMLInputElement)) return null;
      if (!["checkbox", "radio", "range"].includes(el.type)) return null;
      return (
        el.closest("label") ?? (el.id ? document.querySelector(`label[for="${el.id}"]`) : null)
      );
    };
    const boxes = controls
      .filter((el) => !inlineLink(el))
      .map((el) => {
        const target = labelled(el) ?? el;
        return { el, r: target.getBoundingClientRect() };
      });
    const smallTargets = boxes
      .filter(({ r }) => r.width < 43.5 || r.height < 43.5)
      .map(({ el, r }) => `${nameOf(el)} ${Math.round(r.width)}x${Math.round(r.height)}`);
    const crampedTargets: string[] = [];
    for (const a of boxes) {
      if (a.r.width >= 24 && a.r.height >= 24) continue;
      const cx = a.r.left + a.r.width / 2;
      const cy = a.r.top + a.r.height / 2;
      const near = boxes.find(
        (b) =>
          b !== a &&
          !a.el.contains(b.el) &&
          !b.el.contains(a.el) &&
          Math.max(b.r.left - cx, 0, cx - b.r.right) ** 2 +
            Math.max(b.r.top - cy, 0, cy - b.r.bottom) ** 2 <
            12 ** 2,
      );
      if (near) crampedTargets.push(`${nameOf(a.el)} next to ${nameOf(near.el)}`);
    }

    const labelOf = (el: Element) => {
      const id = el.id;
      const byFor = id ? document.querySelector(`label[for="${id}"]`)?.textContent : "";
      const aria = el.getAttribute("aria-label") ?? "";
      const ref = el.getAttribute("aria-labelledby");
      const byRef = ref
        ? ref
            .split(" ")
            .map((r) => document.getElementById(r)?.textContent ?? "")
            .join(" ")
        : "";
      return `${byFor ?? ""} ${aria} ${byRef} ${el.closest("label")?.textContent ?? ""} ${
        el.getAttribute("name") ?? ""
      } ${el.getAttribute("placeholder") ?? ""}`.toLowerCase();
    };
    const fields = [...document.querySelectorAll("input, select, textarea")].filter(
      (el) =>
        shown(el) &&
        !["checkbox", "radio", "range", "hidden", "submit", "button"].includes(
          (el as HTMLInputElement).type,
        ),
    ) as HTMLInputElement[];
    const zoomInputs = fields
      .filter((el) => Number.parseFloat(getComputedStyle(el).fontSize) < 16)
      .map((el) => `${nameOf(el)} ${getComputedStyle(el).fontSize}`);
    const keyboardMismatch: string[] = [];
    const autocompleteMissing: string[] = [];
    for (const el of fields) {
      if (el.tagName !== "INPUT") continue;
      const label = labelOf(el);
      const mode = el.inputMode;
      const type = el.type;
      const want =
        /£|amount|balance|salary|income|value|cost|payment|price|rent|pay |owe|limit/.test(label)
          ? "decimal"
          : /%|rate|percent|apr/.test(label)
            ? "decimal"
            : /\bemail\b/.test(label)
              ? "email"
              : /\b(age|year|years|months|term|day)\b/.test(label)
                ? "numeric"
                : null;
      const ok =
        want === "email"
          ? type === "email" || mode === "email"
          : want
            ? type === "number" || mode === "decimal" || mode === "numeric"
            : true;
      if (!ok)
        keyboardMismatch.push(
          `${nameOf(el)} wants ${want}, has type=${type} inputmode=${mode || "-"}`,
        );
      if (/\b(first name|last name|your name|email)\b/.test(label) && !el.autocomplete)
        autocompleteMissing.push(nameOf(el));
    }

    const clipped = [...document.body.querySelectorAll("*")]
      .filter((el) => {
        if (!(el instanceof HTMLElement) || !shown(el)) return false;
        if (![...el.childNodes].some((n) => n.nodeType === 3 && (n.nodeValue ?? "").trim()))
          return false;
        const s = getComputedStyle(el);
        const hidesX = s.overflowX === "hidden" || s.overflowX === "clip";
        const hidesY = s.overflowY === "hidden" || s.overflowY === "clip";
        return (
          (hidesX && el.scrollWidth > el.clientWidth + 1) ||
          (hidesY && el.scrollHeight > el.clientHeight + 2 && s.position !== "absolute")
        );
      })
      .slice(0, 12)
      .map(nameOf);

    const chromeEls = [...document.body.querySelectorAll("*")].filter((el) => {
      const p = getComputedStyle(el).position;
      if (p !== "fixed" && p !== "sticky") return false;
      if (!shown(el)) return false;
      const r = el.getBoundingClientRect();
      return r.width >= vw * 0.6 && r.top < vh && r.bottom > 0 && r.height < vh * 0.6;
    });
    let chromeTop = 0;
    let chromeBottom = 0;
    const chrome: string[] = [];
    for (const el of chromeEls) {
      const r = el.getBoundingClientRect();
      if (r.top <= 1) chromeTop = Math.max(chromeTop, r.bottom);
      else if (r.bottom >= vh - 1) chromeBottom = Math.max(chromeBottom, vh - r.top);
      chrome.push(
        `${nameOf(el).slice(0, 30)} ${getComputedStyle(el).position} ${Math.round(r.top)}..${Math.round(r.bottom)}`,
      );
    }

    const hero =
      document.querySelector('[data-tone="hero"]') ?? document.querySelector("main h1, h1");
    const headlineTop = hero ? Math.round(hero.getBoundingClientRect().top + window.scrollY) : null;
    const headlineInFold = hero ? hero.getBoundingClientRect().bottom <= vh - chromeBottom : false;

    const illustrationsInFold = [
      ...document.querySelectorAll(
        'img[src*="illustration"], [data-illustration], svg[data-illustration]',
      ),
    ].filter((el) => {
      if (!shown(el)) return false;
      const r = el.getBoundingClientRect();
      return r.top < vh && r.bottom > 0;
    }).length;

    // Scroll to the end and see whether the last content ends under the bottom chrome.
    let hiddenUnderBottomBar: string | null = null;
    if (chromeBottom > 0) {
      const y = window.scrollY;
      window.scrollTo(0, root.scrollHeight);
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const main = document.querySelector("main") ?? document.body;
      const content = [...main.querySelectorAll("*")].filter(
        (el) =>
          shown(el) &&
          !chromeEls.some((c) => c.contains(el)) &&
          [...el.childNodes].some((n) => n.nodeType === 3 && (n.nodeValue ?? "").trim()),
      );
      const last = content.sort(
        (a, b) => b.getBoundingClientRect().bottom - a.getBoundingClientRect().bottom,
      )[0];
      if (last && last.getBoundingClientRect().bottom > vh - chromeBottom + 1)
        hiddenUnderBottomBar = `${nameOf(last)} bottom=${Math.round(last.getBoundingClientRect().bottom)} bar top=${Math.round(vh - chromeBottom)}`;
      window.scrollTo(0, y);
    }

    return {
      viewport: { width: vw, height: vh },
      hscroll,
      overflow,
      smallTargets,
      crampedTargets: crampedTargets.slice(0, 12),
      zoomInputs,
      keyboardMismatch,
      autocompleteMissing,
      clipped,
      chromeTop: Math.round(chromeTop),
      chromeBottom: Math.round(chromeBottom),
      chrome,
      hiddenUnderBottomBar,
      headlineTop,
      headlineInFold,
      illustrationsInFold,
      cls: Math.round(((window as unknown as { __cls?: number }).__cls ?? 0) * 1000) / 1000,
      pageHeight: root.scrollHeight,
    };
  });
}

export interface OverlayMetrics {
  /** Which edge the panel is attached to: left, right, top, bottom, centre or full. */
  edge: string;
  rect: { top: number; left: number; width: number; height: number };
  /** The panel is taller than the viewport, or its bottom is off screen. */
  tallerThanViewport: boolean;
  /** The close control, its position and size; null when there is none. */
  close: string | null;
  /** Px from the bottom of the screen to the close control (one-handed reach). */
  closeFromBottom: number | null;
  focusInside: boolean;
  /** The page behind is not scroll-locked with the overlay open (body or html overflow). */
  backgroundScrolls: boolean;
  smallTargets: string[];
  zoomInputs: string[];
  keyboardMismatch: string[];
  hscroll: boolean;
}

export function readOverlayMetrics(page: Page): Promise<OverlayMetrics | null> {
  return page.evaluate(async () => {
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;
    const panels = [
      ...document.querySelectorAll('[role="dialog"], [role="alertdialog"], [role="menu"]'),
    ].filter((el) => (el as HTMLElement).checkVisibility?.());
    const panel = panels.at(-1);
    if (!panel) return null;
    const r = panel.getBoundingClientRect();
    const near = (a: number, b: number) => Math.abs(a - b) <= 2;
    const full = near(r.left, 0) && near(r.right, vw);
    const edge =
      full && near(r.top, 0) && r.bottom >= vh - 2
        ? "full"
        : full && r.bottom >= vh - 2
          ? "bottom"
          : full && near(r.top, 0)
            ? "top"
            : near(r.left, 0) && !near(r.right, vw)
              ? "left"
              : near(r.right, vw) && !near(r.left, 0)
                ? "right"
                : "centre";
    const nameOf = (el: Element) =>
      `${el.tagName.toLowerCase()} "${(el.getAttribute("aria-label") || el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 30)}"`;
    const closeEl = [...panel.querySelectorAll("button")].find((b) =>
      /^(close|cancel|×|✕)/i.test((b.getAttribute("aria-label") || b.textContent || "").trim()),
    );
    const cr = closeEl?.getBoundingClientRect();
    const shown = (el: Element) => {
      const b = el.getBoundingClientRect();
      return (el as HTMLElement).checkVisibility?.() && b.width > 1 && b.height > 1;
    };
    const controls = [
      ...panel.querySelectorAll(
        'a[href], button, input:not([type="hidden"]), select, textarea, [role="button"], [role="tab"], [role="menuitem"], [role="switch"], [role="slider"]',
      ),
    ].filter(shown);
    const smallTargets = controls
      .map((el) => {
        const target =
          el instanceof HTMLInputElement && ["checkbox", "radio"].includes(el.type)
            ? (el.closest("label") ?? el)
            : el;
        return { el, b: target.getBoundingClientRect() };
      })
      .filter(({ b }) => b.width < 43.5 || b.height < 43.5)
      .map(({ el, b }) => `${nameOf(el)} ${Math.round(b.width)}x${Math.round(b.height)}`);
    const fields = [...panel.querySelectorAll("input, select, textarea")].filter(
      (el) =>
        shown(el) &&
        !["checkbox", "radio", "range", "hidden"].includes((el as HTMLInputElement).type),
    ) as HTMLInputElement[];
    const zoomInputs = fields
      .filter((el) => Number.parseFloat(getComputedStyle(el).fontSize) < 16)
      .map((el) => `${nameOf(el)} ${getComputedStyle(el).fontSize}`);
    const keyboardMismatch = fields
      .filter((el) => el.tagName === "INPUT")
      .filter((el) => {
        const label =
          `${el.id ? (document.querySelector(`label[for="${el.id}"]`)?.textContent ?? "") : ""} ${el.getAttribute("aria-label") ?? ""} ${el.name}`.toLowerCase();
        const money = /£|amount|balance|salary|income|value|cost|payment|rate|%|apr|limit/.test(
          label,
        );
        return money && el.type !== "number" && !["decimal", "numeric"].includes(el.inputMode);
      })
      .map((el) => `${nameOf(el)} type=${el.type} inputmode=${el.inputMode || "-"}`);

    // Radix and react-remove-scroll lock the page with overflow hidden on body (and a data
    // attribute); a programmatic scroll is not blocked by them, so the styles are read instead.
    const body = getComputedStyle(document.body);
    const html = getComputedStyle(document.documentElement);
    const backgroundScrolls = !(
      body.overflow === "hidden" ||
      body.overflowY === "hidden" ||
      html.overflow === "hidden" ||
      html.overflowY === "hidden" ||
      document.body.hasAttribute("data-scroll-locked") ||
      body.position === "fixed"
    );

    return {
      edge,
      rect: {
        top: Math.round(r.top),
        left: Math.round(r.left),
        width: Math.round(r.width),
        height: Math.round(r.height),
      },
      tallerThanViewport: r.height > vh + 1 || r.bottom > vh + 1,
      close:
        closeEl && cr
          ? `${nameOf(closeEl)} at ${Math.round(cr.left)},${Math.round(cr.top)} ${Math.round(cr.width)}x${Math.round(cr.height)}`
          : null,
      closeFromBottom: cr ? Math.round(vh - cr.bottom) : null,
      focusInside: panel.contains(document.activeElement),
      backgroundScrolls,
      smallTargets,
      zoomInputs,
      keyboardMismatch,
      hscroll: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    };
  });
}

/** Hover rules that reveal something with no matching focus rule: hover-only affordances. */
export function readHoverOnly(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const found = new Set<string>();
    const walk = (rules: CSSRuleList) => {
      for (const rule of [...rules]) {
        if (
          "cssRules" in rule &&
          (rule as CSSGroupingRule).cssRules &&
          !(rule instanceof CSSStyleRule)
        ) {
          const media = (rule as CSSMediaRule).media?.mediaText ?? "";
          if (/hover:\s*hover|pointer:\s*fine/.test(media)) continue;
          walk((rule as CSSGroupingRule).cssRules);
          continue;
        }
        if (!(rule instanceof CSSStyleRule)) continue;
        const sel = rule.selectorText;
        if (!sel.includes(":hover") || /focus/.test(sel)) continue;
        const s = rule.style;
        const reveals =
          s.opacity === "1" || s.visibility === "visible" || (s.display && s.display !== "none");
        if (reveals) found.add(sel.slice(0, 120));
      }
    };
    for (const sheet of [...document.styleSheets]) {
      try {
        walk(sheet.cssRules);
      } catch {
        // A cross-origin sheet (fonts) cannot be read.
      }
    }
    return [...found];
  });
}
