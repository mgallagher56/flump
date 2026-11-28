import { describe, expect, it } from "bun:test";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
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
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
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
    const systemDarkBlockMatch = css.match(
      /@media\s*\(prefers-color-scheme:\s*dark\)\s*\{\s*:root:not\(\[data-theme="light"\]\)\s*\{([\s\S]*?)\n\s*\}/,
    );
    const explicitDarkBlockMatch = css.match(/:root\[data-theme="dark"\]\s*\{([\s\S]*?)\n\}/);
    const explicitLightBlockMatch = css.match(/:root\[data-theme="light"\]\s*\{([\s\S]*?)\n\}/);

    expect(rootBlockMatch).not.toBeNull();
    expect(systemDarkBlockMatch).not.toBeNull();
    expect(explicitDarkBlockMatch).not.toBeNull();
    expect(explicitLightBlockMatch).not.toBeNull();

    const lightRootCss = rootBlockMatch?.[1] ?? "";
    const systemDarkCss = systemDarkBlockMatch?.[1] ?? "";
    const explicitDarkCss = explicitDarkBlockMatch?.[1] ?? "";
    const explicitLightCss = explicitLightBlockMatch?.[1] ?? "";

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
        expect(explicitLightCss).toContain(`${cssProp}: ${expectedLight};`);
        expect(systemDarkCss).toContain(`${cssProp}: ${expectedDark};`);
        expect(explicitDarkCss).toContain(`${cssProp}: ${expectedDark};`);
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
        expect(explicitLightCss).toContain(`${cssProp}: ${expectedLight};`);
        expect(systemDarkCss).toContain(`${cssProp}: ${expectedDark};`);
        expect(explicitDarkCss).toContain(`${cssProp}: ${expectedDark};`);
      } else {
        const expected = resolveIndependentSingleValue(el.token);
        expect(expected).not.toBeNull();
        expect(el.attrs["data-value"]).toBe(expected as string);
        expect(el.text).toContain(expected as string);
      }
    }
  });

  it("(c) allows only short inline scripts with zero external requests, external assets, em dashes or internal jargon", () => {
    expect(committedHtml.toLowerCase()).not.toContain("<link");
    expect(committedHtml).not.toMatch(/<script\b[^>]*\bsrc\s*=/i);
    expect(committedHtml).not.toMatch(/(?:src|href)\s*=\s*["'](?:https?:)?\/\//i);
    expect(committedHtml).not.toMatch(/url\(\s*["']?(?:https?:)?\/\//i);
    expect(committedHtml).not.toMatch(/@import\s+[^;]*(?:https?:)?\/\//i);
    expect(committedHtml).not.toMatch(/https?:\/\//i);

    const scriptBlocks = [...committedHtml.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
    expect(scriptBlocks.length).toBeGreaterThanOrEqual(1);
    for (const match of scriptBlocks) {
      const code = match[1] ?? "";
      expect(code.trim().length).toBeGreaterThan(0);
      expect(code.length).toBeLessThan(4000);
      for (const line of code.split("\n")) {
        expect(line.length).toBeLessThan(220);
      }
      expect(code).not.toMatch(/\b(?:fetch|XMLHttpRequest|WebSocket)\b/);
      expect(code).not.toMatch(/\bimport\s*\(/);
      expect(code).not.toMatch(/\/\*!/);
      expect(code).not.toMatch(/\b(?:gsap|THREE|jQuery|webpack)\b/);
      expect(code).not.toContain("//");
    }

    expect(committedHtml).toContain('data-theme-choice="system"');
    expect(committedHtml).toContain('data-theme-choice="light"');
    expect(committedHtml).toContain('data-theme-choice="dark"');
    expect(committedHtml).toContain("data-motion-toggle");
    expect(committedHtml).toContain(':root[data-motion="reduce"]');

    expect(committedHtml).toContain("font-family: 'Plus Jakarta Sans Variable'");
    expect(committedHtml).toContain("font-family: 'Inter Variable'");
    expect(committedHtml).toContain("data:font/woff2;base64,");

    expect(committedHtml).not.toContain("—");
    expect(readFileSync(README_PATH, "utf8")).not.toContain("—");
    const mainIdx = committedHtml.indexOf("<main");
    expect(mainIdx).toBeGreaterThan(-1);
    expect(stripTags(committedHtml.slice(mainIdx))).not.toContain("!");

    expect(committedHtml).toContain('href="#evolution"');
    expect(committedHtml).toContain('<section class="chapter" id="evolution">');
    expect(committedHtml).toContain('href="#reference"');
    expect(committedHtml).toContain('<section class="chapter" id="reference">');

    const refIdx = committedHtml.indexOf('<section class="chapter" id="reference">');
    expect(refIdx).toBeGreaterThan(mainIdx);
    const visibleChaptersText = stripTags(committedHtml.slice(mainIdx, refIdx));
    const forbiddenLabels = [
      /\bDirection [ABC]\b/i,
      /\bE(?:15|17|35|42)\b/,
      /\bPrototype 11\b/i,
      /\bp11b?\b/i,
      /\bPR \d+\b/i,
      /\b(?:STYLE-GUIDE|UX-GUIDELINES|COPY-GUIDE|ROLLOUT-PLAN|DECISIONS\.md)\b/,
      /\b(?:FlumpLogo|HomeLogo|HeroFigure|KpiStrip|PageBody|PageHeader|ScenarioZone|ResultBlock|ChartFigure|ChartTooltipContent|GlassOrb|ExampleTag|CarouselDots|useChartAnimation)\b/,
      /\bRule (?:C\d+|MC\d+|MK\d+|T\d+|CH\d+|L\d+|R\d+|S\d+|AT\d+|IL\d+)\b/,
      /\bSources:/,
      /packages\/tokens/,
      /docs\/ux\//,
      /\b(?:gsap|three\.js|WebGL)\b/i,
    ];
    for (const pattern of forbiddenLabels) {
      expect(visibleChaptersText).not.toMatch(pattern);
    }
  });

  it("(d) every referenced image and video exists with required attributes and stays under 4 MB per folder", () => {
    const imgTags = [...committedHtml.matchAll(/<img\b([^>]*)>/gi)];
    expect(imgTags.length).toBeGreaterThanOrEqual(2);

    const referencedHistory = new Set<string>();
    for (const match of imgTags) {
      const attrs = match[1] ?? "";
      const src = attrs.match(/\bsrc="([^"]+)"/i)?.[1];
      const alt = attrs.match(/\balt="([^"]*)"/i)?.[1];
      const width = attrs.match(/\bwidth="(\d+)"/i)?.[1];
      const height = attrs.match(/\bheight="(\d+)"/i)?.[1];

      expect(src).toBeDefined();
      expect(alt).toBeDefined();
      expect((alt ?? "").trim().length).toBeGreaterThan(0);
      expect(Number(width)).toBeGreaterThan(0);
      expect(Number(height)).toBeGreaterThan(0);

      const target = resolve(BRAND_DIR, src as string);
      expect(target.startsWith(`${BRAND_DIR}/`)).toBe(true);
      expect(existsSync(target)).toBe(true);

      if ((src as string).startsWith("assets/history/")) {
        referencedHistory.add((src as string).slice("assets/history/".length));
      }
    }

    expect(referencedHistory.size).toBeGreaterThanOrEqual(15);

    const historyDir = resolve(BRAND_DIR, "assets/history");
    const historyFiles = readdirSync(historyDir);
    expect(historyFiles.length).toBe(referencedHistory.size);

    let totalHistoryBytes = 0;
    for (const file of historyFiles) {
      expect(referencedHistory.has(file)).toBe(true);
      totalHistoryBytes += statSync(resolve(historyDir, file)).size;
    }
    expect(totalHistoryBytes).toBeLessThan(4 * 1024 * 1024);

    const videoTags = [...committedHtml.matchAll(/<video\b([^>]*)>([\s\S]*?)<\/video>/gi)];
    expect(videoTags.length).toBe(2);

    const referencedVideos = new Set<string>();
    for (const match of videoTags) {
      const attrs = match[1] ?? "";
      const body = match[2] ?? "";
      expect(attrs).toMatch(/\bcontrols\b/i);
      expect(attrs).toMatch(/\bmuted\b/i);
      expect(attrs).toMatch(/\bloop\b/i);
      expect(attrs).toMatch(/\bplaysinline\b/i);
      expect(attrs).toMatch(/\bpreload="metadata"/i);
      expect(attrs).not.toMatch(/\bautoplay\b/i);

      const poster = attrs.match(/\bposter="([^"]+)"/i)?.[1];
      expect(poster).toBeDefined();
      const posterTarget = resolve(BRAND_DIR, poster as string);
      expect(posterTarget.startsWith(`${BRAND_DIR}/`)).toBe(true);
      expect(existsSync(posterTarget)).toBe(true);

      const sourceSrc = body.match(/<source\b[^>]*\bsrc="([^"]+)"/i)?.[1];
      expect(sourceSrc).toBeDefined();
      expect((sourceSrc as string).startsWith("assets/video/")).toBe(true);
      const videoTarget = resolve(BRAND_DIR, sourceSrc as string);
      expect(videoTarget.startsWith(`${BRAND_DIR}/`)).toBe(true);
      expect(existsSync(videoTarget)).toBe(true);
      referencedVideos.add((sourceSrc as string).slice("assets/video/".length));
    }

    const videoDir = resolve(BRAND_DIR, "assets/video");
    const videoFiles = readdirSync(videoDir);
    expect(videoFiles.length).toBe(referencedVideos.size);

    let totalVideoBytes = 0;
    for (const file of videoFiles) {
      expect(referencedVideos.has(file)).toBe(true);
      totalVideoBytes += statSync(resolve(videoDir, file)).size;
    }
    expect(totalVideoBytes).toBeLessThan(4 * 1024 * 1024);
  });
});
