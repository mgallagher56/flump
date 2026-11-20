import { describe, expect, it } from "vitest";
import { getTaxFeatureVerification, getTaxYearVerification } from "./tax-year-verification.js";
import {
  evaluateSignoff,
  SIGNOFF_OWNER,
  vectorSignoffHash,
  yearVerification,
} from "./test-vectors/signoff.js";
import { UK_SELF_ASSESSMENT_VECTORS } from "./test-vectors/uk-self-assessment.vectors.js";
import { UK_TAX_VECTORS } from "./test-vectors/uk-tax.vectors.js";
import { selectUkWhatIfVectors, UK_WHATIF_VECTORS } from "./test-vectors/uk-whatif.vectors.js";
import { PROVISIONAL_UK_TAX_YEARS, SUPPORTED_UK_TAX_YEARS } from "./types.js";

// A provisional year's rates are announced, not yet law (ruling B, 20 Nov 2026): it never reports
// "verified", even when every vector is signed. Removing it from PROVISIONAL_UK_TAX_YEARS at Royal
// Assent flips it to verified with no other edit.
describe("a provisional year never reports verified", () => {
  const Y = "2027/28";
  const signed = (vs: readonly { taxYear: string }[]) =>
    vs.filter((v) => v.taxYear === Y).every((v) => evaluateSignoff(v as never).state === "signed");

  it("2027/28 is provisional and its core and Self Assessment vectors are all signed", () => {
    expect(PROVISIONAL_UK_TAX_YEARS).toContain(Y);
    expect(signed(UK_TAX_VECTORS)).toBe(true);
    expect(signed(UK_SELF_ASSESSMENT_VECTORS)).toBe(true);
  });

  it("is unverified while provisional, and says the rates are announced, not yet law", () => {
    const v = getTaxYearVerification(Y);
    expect(v.status).toBe("unverified");
    expect(v.detail).toBe(
      "2027/28 figures use rates that are announced but not yet law. They have been checked against the announced rates. Treat them as an estimate.",
    );
    expect(v.detail).not.toMatch(/verified|owner/i);
    expect(getTaxFeatureVerification(Y, "core")).toBe("unverified");
  });

  it("is verified once the provisional marker is removed", () => {
    expect(getTaxYearVerification(Y, [])).toEqual({
      status: "verified",
      detail:
        "The signed-off test vectors for 2027/28 all pass owner sign-off. Feature-level verification is not reported yet.",
    });
    expect(getTaxFeatureVerification(Y, "core", undefined, [])).toBe("verified");
  });

  it("a provisional year with unsigned vectors says the rates are not yet law, not that they were checked", () => {
    // HICBC 2027/28 has unsigned vectors; with no marker it is unverified on the vectors alone.
    expect(getTaxFeatureVerification(Y, "hicbc", undefined, [])).toBe("unverified");
    const fixtureYear = "2026/27";
    const v = getTaxYearVerification(fixtureYear, [fixtureYear]);
    expect(v.status).toBe("unverified");
    expect(v.detail).toBe(
      "2026/27 figures use rates that are announced but not yet law. Treat them as an estimate and check them against HMRC.",
    );
  });
});

describe("getTaxYearVerification", () => {
  it("matches yearVerification for every supported year that is not provisional", () => {
    for (const y of SUPPORTED_UK_TAX_YEARS) {
      if ((PROVISIONAL_UK_TAX_YEARS as readonly string[]).includes(y)) continue;
      expect(getTaxYearVerification(y).status).toBe(yearVerification(y, UK_TAX_VECTORS));
    }
  });

  it("is unverified with an explanatory detail for a year with no vectors", () => {
    const v = getTaxYearVerification("1999/00");
    expect(v.status).toBe("unverified");
    expect(v.detail).toBe(
      "1999/00 tax rules are not yet fully signed off by the owner. Treat figures as an estimate and check them against HMRC.",
    );
  });

  it("always returns a non-empty detail", () => {
    for (const y of SUPPORTED_UK_TAX_YEARS) {
      expect(getTaxYearVerification(y).detail.length).toBeGreaterThan(10);
    }
  });
});

describe("getTaxFeatureVerification (E25-T8)", () => {
  // 2027/28 core is fully signed but provisional, so it stays unverified (ruling B).
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
