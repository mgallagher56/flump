import fs from "node:fs";
import path from "node:path";
import { TOOL_CATALOGUE } from "@repo/ui/tools";
import { describe, expect, it } from "vitest";
import { CANONICAL_TOOL_SLUGS } from "./utils/toolSlugs";

const read = (rel: string) => fs.readFileSync(path.resolve(__dirname, rel), "utf-8");

describe("marketing copy (R-10)", () => {
  it.each([
    "pages/ToolsIndexPage/ToolsIndexPage.tsx",
    "components/BaselineSnapshotPreview/BaselineSnapshotPreview.tsx",
    "components/MonthlyPictureSection/MonthlyPictureSection.tsx",
    "components/PayRiseTeaser/PayRiseTeaser.tsx",
  ])("%s does not over-claim", (file) => {
    expect(read(file)).not.toMatch(/\bexact\b|guaranteed|gross take-home/i);
  });
});

/**
 * E16 PR 12 copy guide checks on the pages this PR owns (copy guide 3.2, 4.1, 5.4, 6.1, 6.2, 7.4).
 * Read from the source so a page cannot bring back a never-use word, a "/mo" unit, an arrow glyph
 * or an ampersand in visible copy.
 */
const PR12_SOURCES = [
  "pages/HomePage/HomePage.tsx",
  "pages/PricingPage/PricingPage.tsx",
  "pages/SecurityPage/SecurityPage.tsx",
  "pages/McpPage/McpPage.tsx",
  "pages/McpPage/mcpTools.ts",
  "pages/ContactPage/ContactPage.tsx",
  "pages/NotFoundPage/NotFoundPage.tsx",
  "components/BaselineSnapshotPreview/BaselineSnapshotPreview.tsx",
  "components/MonthlyPictureSection/MonthlyPictureSection.tsx",
  "components/PayRiseTeaser/PayRiseTeaser.tsx",
  "components/SecurityPrivacySection/SecurityPrivacySection.tsx",
  "components/HomeFAQ/HomeFAQ.tsx",
  "components/DisclosurePolicySection/DisclosurePolicySection.tsx",
  "components/Header/Header.tsx",
  "components/Footer/Footer.tsx",
];

/** String literals and JSX text only, so identifiers such as `BaselineSnapshotPreview` pass. */
const visibleCopy = (source: string): string => {
  const strings = [...source.matchAll(/"([^"\n]*)"|`([^`]*)`/g)].map((m) => m[1] ?? m[2] ?? "");
  const jsxText = [...source.matchAll(/>\s*([^<>{}\n][^<>{}]*?)\s*</g)].map((m) => m[1] ?? "");
  return [...strings, ...jsxText].join("\n");
};

describe("E16 PR 12 page copy", () => {
  it.each(PR12_SOURCES)("%s uses no never-use word", (file) => {
    // Paths, URLs and kebab-case ids (`/sandbox`, `baseline-snapshot-preview`) are not copy.
    const copy = visibleCopy(read(file))
      .replace(/\S*\/\S*/g, "")
      .replace(/\b[a-z]+(-[a-z]+)+\b/g, "");
    expect(copy).not.toMatch(
      /\b(surplus|discretionary|engine|cashflow|manual-first|deterministic|guardrails?|token-bucket|baseline|sandbox|live demo)\b/i,
    );
  });

  it.each(PR12_SOURCES)("%s has no '/mo', '/wk', arrow glyph or emoji", (file) => {
    const copy = visibleCopy(read(file));
    expect(copy).not.toMatch(/\/mo\b|\/wk\b|[→↓↑]|\p{Extended_Pictographic}/u);
  });

  it.each(PR12_SOURCES)("%s has no ampersand in visible copy", (file) => {
    expect(visibleCopy(read(file)).replace(/&[a-z]+;/g, "")).not.toMatch(/ & /);
  });

  it.each(PR12_SOURCES)("%s says 'free' only as 'free during the beta' (ruling 4)", (file) => {
    for (const m of visibleCopy(read(file)).matchAll(/\bfree\b[^.\n]*/gi)) {
      // A question ("Is Flump free?") is allowed; its answer carries the condition.
      expect(m[0]).toMatch(/^free during the beta|^free\?$/i);
    }
  });

  it.each(PR12_SOURCES)("%s promises no bank feed or connection", (file) => {
    expect(visibleCopy(read(file))).not.toMatch(
      /bank (feeds?|sync)|bank connection (is )?(coming|planned)|connect your bank/i,
    );
  });
});

describe("tool slugs", () => {
  it("canonical slugs match the tools catalogue", () => {
    expect(TOOL_CATALOGUE.map((t) => t.slug).sort()).toEqual([...CANONICAL_TOOL_SLUGS].sort());
  });
});

describe("index.html (R-13)", () => {
  const html = read("../index.html");
  it("has no static <title> (Helmet owns it via the head-meta slot)", () => {
    expect(html).not.toMatch(/<title>/);
    expect(html).toContain("<!--head-meta-->");
  });
  it("uses a real favicon that exists", () => {
    expect(html).not.toContain("vite.svg");
    expect(fs.existsSync(path.resolve(__dirname, "../public/favicon.svg"))).toBe(true);
  });
  it("declares British English on the document (en-GB, PR #670 a11y gate)", () => {
    expect(html).toMatch(/<html lang="en-GB">/);
  });
});
