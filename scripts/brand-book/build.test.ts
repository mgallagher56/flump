import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  marketingDurations,
  marketingEasings,
  durations as primitiveDurations,
  easings as primitiveEasings,
} from "../../packages/tokens/src/motion";
import {
  breakpoints,
  type ColorKey,
  dark,
  light,
  radii,
  type ShadowKey,
  sizes,
  spacing,
  zIndex,
} from "../../packages/tokens/src/native.generated";
import { buildBrandBook } from "./build";
import { REPO_ROOT, toCssIdent } from "./tokens";

const BRAND_DIR = resolve(REPO_ROOT, "docs/brand");
const HTML_PATH = resolve(BRAND_DIR, "BRAND-BOOK.html");
const README_PATH = resolve(BRAND_DIR, "README.md");

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripTags(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function extractBalancedElement(html: string, startIdx: number, tagName: string): string {
  const openRe = new RegExp(`<${tagName}\\b`, "gi");
  const closeRe = new RegExp(`</${tagName}>`, "gi");
  let depth = 0;
  let pos = startIdx;

  while (pos < html.length) {
    openRe.lastIndex = pos;
    closeRe.lastIndex = pos;
    const nextOpen = openRe.exec(html);
    const nextClose = closeRe.exec(html);

    if (!nextClose) {
      throw new Error(`Unclosed <${tagName}> starting at ${startIdx}`);
    }
    if (nextOpen && nextOpen.index < nextClose.index) {
      depth += 1;
      pos = nextOpen.index + nextOpen[0].length;
    } else {
      depth -= 1;
      pos = nextClose.index + nextClose[0].length;
      if (depth === 0) {
        return html.slice(startIdx, pos);
      }
    }
  }
  throw new Error(`Could not balance <${tagName}> starting at ${startIdx}`);
}

interface ParsedTokenElement {
  token: string;
  attrs: Record<string, string>;
  text: string;
}

function parseDataTokenElements(html: string): ParsedTokenElement[] {
  const results: ParsedTokenElement[] = [];
  const tagRe = /<([a-z0-9-]+)\b([^>]*\bdata-path="([^"]+)"[^>]*)>/gi;

  for (const match of html.matchAll(tagRe)) {
    const tagName = match[1];
    const attrString = match[2];
    const token = match[3];
    if (!tagName || !attrString || !token || match.index === undefined) continue;

    const attrs: Record<string, string> = {};
    for (const attrMatch of attrString.matchAll(/([a-z0-9-]+)="([^"]*)"/gi)) {
      const k = attrMatch[1];
      const v = attrMatch[2];
      if (k && v !== undefined) attrs[k] = decodeHtmlEntities(v);
    }

    const fullEl = extractBalancedElement(html, match.index, tagName);
    results.push({
      token,
      attrs,
      text: stripTags(fullEl),
    });
  }

  return results;
}

function resolveIndependentSingleValue(tokenPath: string): string | null {
  if (tokenPath.startsWith("spacing.")) {
    const key = tokenPath.slice("spacing.".length) as keyof typeof spacing;
    if (key in spacing) return `${spacing[key]}px`;
  }
  if (tokenPath.startsWith("radii.")) {
    const key = tokenPath.slice("radii.".length) as keyof typeof radii;
    if (key in radii) return `${radii[key]}px`;
  }
  if (tokenPath.startsWith("sizes.")) {
    const key = tokenPath.slice("sizes.".length) as keyof typeof sizes;
    if (key in sizes) return `${sizes[key]}px`;
  }
  if (tokenPath.startsWith("zIndex.")) {
    const key = tokenPath.slice("zIndex.".length) as keyof typeof zIndex;
    if (key in zIndex) return String(zIndex[key]);
  }
  if (tokenPath.startsWith("breakpoints.")) {
    const key = tokenPath.slice("breakpoints.".length) as keyof typeof breakpoints;
    if (key in breakpoints) return `${breakpoints[key]}px`;
  }
  if (tokenPath.startsWith("durations.marketing.")) {
    const key = tokenPath.slice("durations.marketing.".length) as keyof typeof marketingDurations;
    if (key in marketingDurations) return marketingDurations[key].value;
  }
  if (tokenPath.startsWith("easings.marketing.")) {
    const key = tokenPath.slice("easings.marketing.".length) as keyof typeof marketingEasings;
    if (key in marketingEasings) return marketingEasings[key].value;
  }
  if (tokenPath.startsWith("durations.")) {
    const key = tokenPath.slice("durations.".length) as keyof typeof primitiveDurations;
    if (key in primitiveDurations) return primitiveDurations[key].value;
  }
  if (tokenPath.startsWith("easings.")) {
    const key = tokenPath.slice("easings.".length) as keyof typeof primitiveEasings;
    if (key in primitiveEasings) return primitiveEasings[key].value;
  }
  return null;
}

describe("Flump brand book", () => {
  const committedHtml = readFileSync(HTML_PATH, "utf8");

  it("(a) building in memory matches the committed docs/brand/BRAND-BOOK.html", () => {
    const built = buildBrandBook();
    expect(built).toBe(committedHtml);
  });

  it("(b) every data-path element and CSS custom property matches native.generated.ts and primitives", () => {
    const elements = parseDataTokenElements(committedHtml);
    expect(elements.length).toBeGreaterThan(80);

    const styleMatch = committedHtml.match(/<style>([\s\S]*?)<\/style>/);
    expect(styleMatch).not.toBeNull();
    const css = styleMatch?.[1] ?? "";

    const rootBlockMatch = css.match(/:root\s*\{([\s\S]*?)\n\}/);
    const darkBlockMatch = css.match(
      /@media\s*\(prefers-color-scheme:\s*dark\)\s*\{\s*:root\s*\{([\s\S]*?)\n\s*\}/,
    );
    expect(rootBlockMatch).not.toBeNull();
    expect(darkBlockMatch).not.toBeNull();
    const lightRootCss = rootBlockMatch?.[1] ?? "";
    const darkRootCss = darkBlockMatch?.[1] ?? "";

    for (const el of elements) {
      if (el.token in light.colors) {
        const key = el.token as ColorKey;
        const expectedLight = light.colors[key];
        const expectedDark = dark.colors[key];
        expect(el.attrs["data-light"]).toBe(expectedLight);
        expect(el.attrs["data-dark"]).toBe(expectedDark);
        expect(el.text).toContain(expectedLight);
        expect(el.text).toContain(expectedDark);

        const cssProp = `--color-${toCssIdent(key)}`;
        expect(lightRootCss).toContain(`${cssProp}: ${expectedLight};`);
        expect(darkRootCss).toContain(`${cssProp}: ${expectedDark};`);
      } else if (el.token.startsWith("shadows.")) {
        const key = el.token.slice("shadows.".length) as ShadowKey;
        expect(key in light.shadows).toBe(true);
        const expectedLight = light.shadows[key];
        const expectedDark = dark.shadows[key];
        expect(el.attrs["data-light"]).toBe(expectedLight);
        expect(el.attrs["data-dark"]).toBe(expectedDark);
        expect(el.text).toContain(expectedLight);
        expect(el.text).toContain(expectedDark);

        const cssProp = `--shadow-${toCssIdent(key)}`;
        expect(lightRootCss).toContain(`${cssProp}: ${expectedLight};`);
        expect(darkRootCss).toContain(`${cssProp}: ${expectedDark};`);
      } else {
        const expected = resolveIndependentSingleValue(el.token);
        expect(expected).not.toBeNull();
        expect(el.attrs["data-value"]).toBe(expected as string);
        expect(el.text).toContain(expected as string);
      }
    }
  });

  it("(c) is self-contained with no scripts, external URLs, stylesheet links or em dashes", () => {
    expect(committedHtml.toLowerCase()).not.toContain("<script");
    expect(committedHtml.toLowerCase()).not.toContain("<link");
    expect(committedHtml).not.toMatch(/(?:src|href)\s*=\s*["']https?:\/\//i);
    expect(committedHtml).not.toMatch(/url\(\s*["']?https?:\/\//i);
    expect(committedHtml).not.toMatch(/@import\s+[^;]*https?:\/\//i);
    expect(committedHtml).not.toMatch(/https?:\/\//i);

    expect(committedHtml).toContain("font-family: 'Plus Jakarta Sans Variable'");
    expect(committedHtml).toContain("font-family: 'Inter Variable'");
    expect(committedHtml).toContain("data:font/woff2;base64,");

    expect(committedHtml).not.toContain("—");
    expect(readFileSync(README_PATH, "utf8")).not.toContain("—");

    expect(committedHtml).toContain('href="#evolution"');
    expect(committedHtml).toContain(
      '<section id="evolution"><!-- EVOLUTION CHAPTER: filled by a later run --></section>',
    );
  });

  it("(d) every referenced image file exists under docs/brand/", () => {
    const imgSrcs = [...committedHtml.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/gi)].map((m) => m[1]);
    expect(imgSrcs.length).toBeGreaterThanOrEqual(2);

    for (const src of imgSrcs) {
      expect(src).toBeDefined();
      const target = resolve(BRAND_DIR, src as string);
      expect(target.startsWith(`${BRAND_DIR}/`)).toBe(true);
      expect(existsSync(target)).toBe(true);
    }
  });
});
