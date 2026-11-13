// @vitest-environment node
import { describe, expect, it } from "vitest";
import { CANONICAL_TOOL_SLUGS, STATIC_PATHS } from "../src/utils/toolSlugs";
import {
  buildSitemap,
  canonicalLinkTag,
  indexingFlagWarning,
  isIndexingAllowed,
  normaliseSiteUrl,
} from "./sitemap";

describe("isIndexingAllowed", () => {
  it("needs both flags to be exactly true (four combinations)", () => {
    expect(isIndexingAllowed({})).toBe(false);
    expect(isIndexingAllowed({ ALLOW_INDEXING: "true" })).toBe(false);
    expect(isIndexingAllowed({ FLUMP_LAUNCH: "true" })).toBe(false);
    expect(isIndexingAllowed({ ALLOW_INDEXING: "true", FLUMP_LAUNCH: "true" })).toBe(true);
    expect(isIndexingAllowed({ ALLOW_INDEXING: "1", FLUMP_LAUNCH: "TRUE" })).toBe(false);
  });
});

describe("indexingFlagWarning", () => {
  it("warns only when exactly one flag is set", () => {
    expect(indexingFlagWarning({})).toBeUndefined();
    expect(indexingFlagWarning({ ALLOW_INDEXING: "true", FLUMP_LAUNCH: "true" })).toBeUndefined();
    expect(indexingFlagWarning({ ALLOW_INDEXING: "true" })).toContain("FLUMP_LAUNCH is not");
    expect(indexingFlagWarning({ FLUMP_LAUNCH: "true" })).toContain("ALLOW_INDEXING is not");
  });
});

describe("normaliseSiteUrl", () => {
  it("accepts https origins only", () => {
    expect(normaliseSiteUrl("https://flump.example/x?y=1")).toBe("https://flump.example");
    expect(normaliseSiteUrl("http://flump.example")).toBeUndefined();
    expect(normaliseSiteUrl("nonsense")).toBeUndefined();
    expect(normaliseSiteUrl(undefined)).toBeUndefined();
  });
});

describe("buildSitemap", () => {
  const xml = buildSitemap("https://flump.example");

  it("is a well-formed urlset with the sitemap namespace", () => {
    expect(
      xml.startsWith(
        '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ),
    ).toBe(true);
    expect(xml.trimEnd().endsWith("</urlset>")).toBe(true);
  });

  it("lists every static path and canonical tool slug exactly once", () => {
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    const expected = [
      ...STATIC_PATHS.map((p) => `https://flump.example${p}`),
      ...CANONICAL_TOOL_SLUGS.map((s) => `https://flump.example/tools/${s}`),
    ];
    expect(locs).toEqual(expected);
  });
});

describe("canonicalLinkTag", () => {
  it("is empty without a valid https SITE_URL", () => {
    expect(canonicalLinkTag(undefined, "/pricing")).toBe("");
    expect(canonicalLinkTag("http://flump.example", "/pricing")).toBe("");
  });

  it("strips the query, hash and trailing slash", () => {
    const tag = (u: string) => canonicalLinkTag("https://flump.example", u);
    expect(tag("/pricing?utm=x#top")).toBe(
      '<link rel="canonical" href="https://flump.example/pricing" />',
    );
    expect(tag("/pricing/")).toBe('<link rel="canonical" href="https://flump.example/pricing" />');
    expect(tag("/?a=1")).toBe('<link rel="canonical" href="https://flump.example/" />');
  });

  it("escapes attribute-breaking characters", () => {
    expect(canonicalLinkTag("https://flump.example", '/a"b')).not.toContain('a"b');
  });
});
