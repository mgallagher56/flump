import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { TOOLS_CATALOG } from "./pages/ToolsIndexPage";
import { CANONICAL_TOOL_SLUGS } from "./utils/toolSlugs";

const read = (rel: string) => fs.readFileSync(path.resolve(__dirname, rel), "utf-8");

describe("marketing copy (R-10)", () => {
  it.each([
    "pages/ToolsIndexPage.tsx",
    "components/BaselineSnapshotPreview.tsx",
    "components/MonthlyPictureSection/MonthlyPictureSection.tsx",
    "components/BigMovesSection/BigMovesSection.tsx",
    "components/PayRiseTeaser/PayRiseTeaser.tsx",
  ])("%s does not over-claim", (file) => {
    expect(read(file)).not.toMatch(/\bexact\b|guaranteed|gross take-home/i);
  });
});

describe("tool slugs", () => {
  it("canonical slugs match the tools catalogue", () => {
    expect(TOOLS_CATALOG.map((t) => t.slug).sort()).toEqual([...CANONICAL_TOOL_SLUGS].sort());
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
});
