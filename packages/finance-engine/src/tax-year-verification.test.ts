import { describe, expect, it } from "vitest";
import { getTaxYearVerification } from "./tax-year-verification.js";
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
