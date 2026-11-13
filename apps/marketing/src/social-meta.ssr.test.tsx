// @vitest-environment node
import { describe, expect, it } from "vitest";
import { buildHeadMeta } from "../server/headMeta";
import { render } from "./entry-server";

const PAGES = [
  "/",
  "/tools",
  "/tools/uk-100k-tax-trap-calculator",
  "/tools/section-24-landlord-tax-calculator",
  "/pricing",
  "/security",
  "/mcp",
];

const SINGLE = [
  'name="description"',
  'property="og:title"',
  'property="og:description"',
  'property="og:type"',
  'property="og:site_name"',
  'property="og:locale"',
  'name="twitter:card"',
  'name="twitter:title"',
  'name="twitter:description"',
];

// react-helmet-async 3 on React 19 renders tags inline in the app HTML (helmet context is empty),
// so the document a crawler sees is the injected head meta plus the rendered app HTML.
const head = (url: string, siteUrl: string | undefined) => {
  const { html, helmet, status } = render(url);
  return `${buildHeadMeta({ helmet, appUrlScript: "", siteUrl, url, status })}${html}`;
};

const stripSvg = (s: string) => s.replace(/<svg[\s\S]*?<\/svg>/g, "");
const count = (haystack: string, needle: string) => haystack.split(needle).length - 1;

describe("SSR social meta per page", () => {
  for (const url of PAGES) {
    it(`${url} emits each tag exactly once, with og:url from SITE_URL`, () => {
      const out = head(url, "https://flump.example");
      expect(count(stripSvg(out), "<title")).toBe(1);
      for (const key of SINGLE) expect(count(out, key)).toBe(1);
      expect(count(out, 'property="og:url"')).toBe(1);
      expect(count(out, 'rel="canonical"')).toBe(1);
      expect(out).toContain('content="en_GB"');
      expect(out).toContain('name="twitter:card" content="summary"');
      expect(out).toContain('property="og:type" content="website"');
      const og = /property="og:url" content="([^"]+)"/.exec(out)?.[1];
      const canonical = /rel="canonical" href="([^"]+)"/.exec(out)?.[1];
      expect(og).toBe(canonical);
    });

    it(`${url} omits og:url and canonical without SITE_URL but keeps the rest`, () => {
      const out = head(url, undefined);
      expect(out).not.toContain("og:url");
      expect(out).not.toContain("canonical");
      for (const key of SINGLE) expect(count(out, key)).toBe(1);
    });
  }

  it("og:title matches the page title", () => {
    const out = head("/pricing", undefined);
    expect(out).toContain("<title>Pricing and plans | Flump</title>");
    expect(out).toContain('property="og:title" content="Pricing and plans | Flump"');
  });

  it("does not emit og:url on a 404", () => {
    const out = head("/does-not-exist", "https://flump.example");
    expect(out).not.toContain("og:url");
    expect(out).not.toContain("canonical");
  });
});
