// @vitest-environment node
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (rel: string) => fs.readFileSync(path.resolve(__dirname, rel), "utf-8");

describe("marketing copy (R-10)", () => {
  it.each([
    "components/BaselineSnapshotPreview/BaselineSnapshotPreview.tsx",
    "components/PayRiseTeaser/PayRiseTeaser.tsx",
    // E42 PR 2: the home bands and the short-form calculators (coordinator sign-off).
    "pages/HomePage/HomePage.tsx",
    "components/FeatureTiles/FeatureTiles.tsx",
    "components/TryItSection/TryItSection.tsx",
    "pages/FeaturePage/FeaturePage.tsx",
    "utils/featureAreas.ts",
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
  "pages/PreviewPage/PreviewPage.tsx",
  "pages/PricingPage/PricingPage.tsx",
  "pages/SecurityPage/SecurityPage.tsx",
  "pages/AiConnectionPage/AiConnectionPage.tsx",
  "pages/AiConnectionPage/mcpTools.ts",
  "pages/FeaturePage/FeaturePage.tsx",
  "pages/FeaturesIndexPage/FeaturesIndexPage.tsx",
  "components/AreaStrip/AreaStrip.tsx",
  "utils/featureAreas.ts",
  "pages/ContactPage/ContactPage.tsx",
  "pages/NotFoundPage/NotFoundPage.tsx",
  "components/BaselineSnapshotPreview/BaselineSnapshotPreview.tsx",
  "components/PayRiseTeaser/PayRiseTeaser.tsx",
  "components/FeatureTiles/FeatureTiles.tsx",
  "components/TryItSection/TryItSection.tsx",
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

/**
 * E42 PR 2 done criterion: no marketing source links to a calculator page or to /mcp. Both answer
 * 301 (server/redirects.ts), so a link to either would send every visitor through a redirect.
 */
describe("no links to old addresses (E42)", () => {
  const sourceFiles = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return sourceFiles(full);
      return /\.tsx?$/.test(entry.name) && !/\.(test|stories)\.tsx?$/.test(entry.name)
        ? [full]
        : [];
    });

  // Comments may name the old addresses (to say they redirect); code may not quote them.
  const withoutComments = (source: string) =>
    source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

  it("no source quotes a /tools or /mcp path", () => {
    const hits = sourceFiles(__dirname)
      .filter((file) =>
        /["'`]\/(tools|mcp)\b/.test(withoutComments(fs.readFileSync(file, "utf-8"))),
      )
      .map((file) => path.relative(__dirname, file));
    expect(hits).toEqual([]);
  });
});

// "tool slugs" left with E42 PR 2: the marketing site lists no calculator slugs. Every slug and
// alias in the shared catalogue is now asserted to answer 301 in server/redirects.test.ts.

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
