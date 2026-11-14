import { describe, expect, it } from "vitest";
import {
  getToolEntry,
  isCanonicalToolSlug,
  isKnownToolSlug,
  resolveToolSlug,
  TOOL_CATALOGUE,
  TOOL_SLUG_ALIASES,
  TOOL_SLUGS,
} from "./toolCatalog";
import { TOOL_ICONS } from "./toolIcons";

describe("tool catalogue", () => {
  it("has unique slugs and lists the income above £100,000 tool last (owner rule)", () => {
    expect(new Set(TOOL_SLUGS).size).toBe(TOOL_SLUGS.length);
    expect(TOOL_SLUGS[0]).toBe("uk-debt-snowball-vs-avalanche-calculator");
    expect(TOOL_SLUGS.at(-1)).toBe("uk-100k-tax-trap-calculator");
    expect(TOOL_CATALOGUE.at(-1)?.slug).toBe("uk-100k-tax-trap-calculator");
  });

  it("has one entry per slug, in slug order, each with an icon", () => {
    expect(TOOL_CATALOGUE.map((entry) => entry.slug)).toEqual([...TOOL_SLUGS]);
    for (const slug of TOOL_SLUGS) {
      const entry = getToolEntry(slug);
      expect(entry.slug).toBe(slug);
      expect(entry.title).not.toBe("");
      expect(entry.shortTitle).not.toBe("");
      expect(entry.description).not.toBe("");
      expect(entry.metaTitle).not.toBe("");
      expect(TOOL_ICONS[entry.icon]).toBeDefined();
    }
    expect(new Set(TOOL_CATALOGUE.map((entry) => entry.title)).size).toBe(TOOL_SLUGS.length);
  });

  it("keeps hooks and unsupported claims out of every title and description", () => {
    for (const entry of TOOL_CATALOGUE) {
      const text = [entry.title, entry.shortTitle, entry.description, entry.metaTitle].join(" ");
      expect(text).not.toMatch(/trap/i);
      expect(text).not.toMatch(/mathematically/i);
      expect(text).not.toMatch(/guaranteed/i);
      expect(text).not.toMatch(/\$/);
    }
  });

  it("maps every alias to a canonical slug, and no alias is itself canonical", () => {
    for (const [alias, target] of Object.entries(TOOL_SLUG_ALIASES)) {
      expect(isCanonicalToolSlug(alias)).toBe(false);
      expect(isCanonicalToolSlug(target)).toBe(true);
    }
  });

  it("resolves canonical slugs and aliases, and rejects anything else", () => {
    expect(resolveToolSlug("uk-pay-rise-take-home-calculator")).toBe(
      "uk-pay-rise-take-home-calculator",
    );
    expect(resolveToolSlug("mortgage-overpay-vs-isa")).toBe(
      "mortgage-overpayment-vs-isa-calculator",
    );
    expect(resolveToolSlug("section-24-landlord-calculator")).toBe(
      "section-24-landlord-tax-calculator",
    );
    expect(resolveToolSlug("toString")).toBeUndefined();
    expect(resolveToolSlug(undefined)).toBeUndefined();
    expect(isKnownToolSlug("not-a-tool")).toBe(false);
    expect(isKnownToolSlug("overdraft-interest-calculator")).toBe(true);
  });
});
