import { describe, expect, it } from "vitest";
import { getTaxFeatureVerification, getTaxYearVerification } from "./tax-year-verification.js";
import { SIGNOFF_OWNER, vectorSignoffHash, yearVerification } from "./test-vectors/signoff.js";
import { UK_TAX_VECTORS } from "./test-vectors/uk-tax.vectors.js";
import { selectUkWhatIfVectors, UK_WHATIF_VECTORS } from "./test-vectors/uk-whatif.vectors.js";
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

describe("getTaxFeatureVerification isolation (E25-T8)", () => {
  it("a fixture-signed feature flips only that feature", () => {
    const year = "2026/27";
    const whatIf = selectUkWhatIfVectors({ taxYear: year, feature: "whatIf" }).map((v) => ({
      ...v,
      signedOffBy: SIGNOFF_OWNER,
      signedOffAt: "2026-12-01",
      signedOffHash: vectorSignoffHash(v),
      ...(v.status === "UNVERIFIED" ? { rulingRef: "fixture-ruling" } : {}),
    }));
    const others = UK_WHATIF_VECTORS.filter((v) => !(v.taxYear === year && v.feature === "whatIf"));
    const catalogues = { core: UK_TAX_VECTORS, whatIf: [...whatIf, ...others] };
    expect(getTaxFeatureVerification(year, "whatIf", catalogues)).toBe("verified");
    expect(getTaxFeatureVerification(year, "hicbc", catalogues)).toBe("unverified");
    expect(getTaxFeatureVerification(year, "core", catalogues)).toBe("unverified");
    expect(getTaxFeatureVerification("2025/26", "whatIf", catalogues)).toBe("unverified");
  });
});
