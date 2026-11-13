import { describe, expect, it } from "vitest";
import { getTaxFeatureVerification, getTaxYearVerification } from "./tax-year-verification.js";
import { yearVerification } from "./test-vectors/signoff.js";
import { UK_TAX_VECTORS } from "./test-vectors/uk-tax.vectors.js";
import { SUPPORTED_UK_TAX_YEARS } from "./types.js";

describe("getTaxYearVerification", () => {
  it("matches yearVerification for every supported year", () => {
    for (const y of SUPPORTED_UK_TAX_YEARS) {
      expect(getTaxYearVerification(y).status).toBe(yearVerification(y, UK_TAX_VECTORS));
    }
  });

  it("is unverified with an explanatory detail for a year with no vectors", () => {
    const v = getTaxYearVerification("1999/00");
    expect(v.status).toBe("unverified");
    expect(v.detail).toContain("1999/00");
  });

  it("always returns a non-empty detail", () => {
    for (const y of SUPPORTED_UK_TAX_YEARS) {
      expect(getTaxYearVerification(y).detail.length).toBeGreaterThan(10);
    }
  });
});

describe("getTaxFeatureVerification (E25-T8)", () => {
  it("every feature in every supported year is unverified today", () => {
    for (const y of SUPPORTED_UK_TAX_YEARS) {
      for (const f of ["core", "hicbc", "whatIf", "scheduled"] as const) {
        expect(getTaxFeatureVerification(y, f), `${y} ${f}`).toBe("unverified");
      }
    }
  });

  it("core follows the original catalogue, so E25 vectors never un-sign it", () => {
    for (const y of SUPPORTED_UK_TAX_YEARS) {
      expect(getTaxFeatureVerification(y, "core")).toBe(getTaxYearVerification(y).status);
    }
  });

  it("a year with no vectors for a feature is unverified", () => {
    // The 2029 cap vectors are illustrations at 2026/27 rates only.
    expect(getTaxFeatureVerification("2020/21", "scheduled")).toBe("unverified");
  });
});
