import { describe, expect, it } from "vitest";
import {
  isCanonicalToolSlug,
  isKnownToolSlug,
  resolveToolSlug,
  TOOL_SLUG_ALIASES,
  TOOL_SLUGS,
} from "./toolCatalog";

describe("tool catalogue", () => {
  it("has unique slugs and never leads with the £100k trap (E31)", () => {
    expect(new Set(TOOL_SLUGS).size).toBe(TOOL_SLUGS.length);
    expect(TOOL_SLUGS[0]).toBe("uk-debt-snowball-vs-avalanche-calculator");
    expect(TOOL_SLUGS.indexOf("uk-100k-tax-trap-calculator")).toBeGreaterThan(
      TOOL_SLUGS.length / 2,
    );
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
