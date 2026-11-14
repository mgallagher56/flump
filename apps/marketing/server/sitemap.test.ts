// @vitest-environment node
import { describe, expect, it } from "vitest";
import { CANONICAL_TOOL_SLUGS, STATIC_PATHS } from "../src/utils/toolSlugs";
import {
  buildSitemap,
  canonicalLinkTag,
  canonicalPath,
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

  it("warns on set values that are not exactly true", () => {
    expect(indexingFlagWarning({ ALLOW_INDEXING: "1" })).toContain('"1"');
    expect(indexingFlagWarning({ ALLOW_INDEXING: "true", FLUMP_LAUNCH: "TRUE" })).toContain(
      "FLUMP_LAUNCH must be exactly",
    );
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
  const tag = (u: string) => canonicalLinkTag("https://flump.example", u);
  const link = (p: string) => `<link rel="canonical" href="https://flump.example${p}" />`;

  it("is empty without a valid https SITE_URL", () => {
    expect(canonicalLinkTag(undefined, "/pricing")).toBe("");
    expect(canonicalLinkTag("http://flump.example", "/pricing")).toBe("");
  });

  it("strips the query, hash, repeated slashes and trailing slashes", () => {
    expect(tag("/pricing?utm=x#top")).toBe(link("/pricing"));
    expect(tag("/pricing/")).toBe(link("/pricing"));
    expect(tag("/pricing//")).toBe(link("/pricing"));
    expect(tag("//pricing")).toBe(link("/pricing"));
    expect(tag("/?a=1")).toBe(link("/"));
  });

  it("normalises case and percent-encoding", () => {
    expect(tag("/Pricing")).toBe(link("/pricing"));
    expect(tag("/%70ricing")).toBe(link("/pricing"));
  });

  it("maps tool aliases to the canonical slug", () => {
    expect(tag("/tools/overdraft-interest-calculator")).toBe(
      link("/tools/overdraft-cost-and-payoff-calculator"),
    );
    expect(tag("/tools/uk-100k-tax-trap-calculator")).toBe(
      link("/tools/uk-100k-tax-trap-calculator"),
    );
    // Former web app slugs, from the shared catalogue in @repo/ui/tools.
    expect(tag("/tools/mortgage-overpay-vs-isa")).toBe(
      link("/tools/mortgage-overpayment-vs-isa-calculator"),
    );
    expect(tag("/tools/section-24-landlord-calculator")).toBe(
      link("/tools/section-24-landlord-tax-calculator"),
    );
  });

  it("emits nothing for unknown pages and cannot be broken out of the attribute", () => {
    expect(tag("/nope")).toBe("");
    expect(tag("/tools/nope")).toBe("");
    expect(tag('/a"><script>')).toBe("");
    expect(tag("/%E0%A4%A")).toBe("");
    expect(canonicalPath("/tools")).toBe("/tools");
  });
});
