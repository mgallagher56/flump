import { describe, expect, it } from "vitest";
import { getTaxFeatureVerification, getTaxYearVerification } from "./tax-year-verification.js";
import { evaluateSignoff, signVector, yearVerification } from "./test-vectors/signoff.js";
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
    // The 5 HICBC and 2 relief-at-source 2027/28 vectors are unsigned, so it does not say "checked".
    const v = getTaxYearVerification(Y);
    expect(v.status).toBe("unverified");
    expect(v.detail).toBe(
      "2027/28 figures use rates that are announced but not yet law. Treat them as an estimate and check them against HMRC.",
    );
    expect(v.detail).not.toMatch(/verified|owner/i);
    expect(getTaxFeatureVerification(Y, "core")).toBe("unverified");
    expect(getTaxFeatureVerification(Y, "hicbc", undefined, [])).toBe("unverified");
  });

  it("says the figures were checked only when every vector for the year is signed, what-if ones included", () => {
    // Fixture: the what-if catalogue without its unsigned 2027/28 vectors, so all that is left is signed.
    const whatIf = selectUkWhatIfVectors().filter(
      (v) => v.taxYear !== Y || evaluateSignoff(v).state === "signed",
    );
    const all = { core: UK_TAX_VECTORS, selfAssessment: UK_SELF_ASSESSMENT_VECTORS, whatIf };
    const v = getTaxYearVerification(Y, undefined, all);
    expect(v).toEqual({
      status: "unverified",
      detail:
        "2027/28 figures use rates that are announced but not yet law. They have been checked against the announced rates. Treat them as an estimate.",
    });
    expect(v.detail).not.toMatch(/verified|owner/i);
  });

  it("is verified once the provisional marker is removed", () => {
    expect(getTaxYearVerification(Y, [])).toEqual({
      status: "verified",
      detail:
        "2027/28 figures have been checked against the published rates. Checks of separate features, such as the Child Benefit charge, are not reported here.",
    });
    expect(getTaxFeatureVerification(Y, "core", undefined, [])).toBe("verified");
  });

  it("a year marked provisional in a fixture, with unsigned core vectors, is not said to be checked", () => {
    // 2026/27 core vectors are unsigned; marking it provisional here gives the not-yet-law wording.
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
      "1999/00 figures have not yet all been checked against the published rates. Treat them as an estimate and check them against HMRC.",
    );
  });

  it("always returns a non-empty detail", () => {
    for (const y of SUPPORTED_UK_TAX_YEARS) {
      expect(getTaxYearVerification(y).detail.length).toBeGreaterThan(10);
    }
  });

  it("never says a person signed the figures off", () => {
    // Figures are checked against the published (or announced) rates; no wording may suggest an
    // owner, an accountant or a sign-off by a person.
    const details = [
      ...SUPPORTED_UK_TAX_YEARS.flatMap((y) => [
        getTaxYearVerification(y).detail,
        getTaxYearVerification(y, []).detail,
        getTaxYearVerification(y, [y]).detail,
      ]),
      getTaxYearVerification("2027/28", []).detail,
      getTaxYearVerification("1999/00").detail,
    ];
    for (const d of details) expect(d).not.toMatch(/owner|accountant|sign(ed)?[- ]?off|—/i);
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
    const whatIf = selectUkWhatIfVectors({ taxYear: year, feature: "whatIf" }).map((v) =>
      signVector(
        v,
        "fable-decider",
        "2026-12-01",
        v.status === "UNVERIFIED" ? "fixture-ruling" : undefined,
      ),
    );
    const others = UK_WHATIF_VECTORS.filter((v) => !(v.taxYear === year && v.feature === "whatIf"));
    const catalogues = { core: UK_TAX_VECTORS, whatIf: [...whatIf, ...others] };
    expect(getTaxFeatureVerification(year, "whatIf", catalogues)).toBe("verified");
    expect(getTaxFeatureVerification(year, "hicbc", catalogues)).toBe("unverified");
    expect(getTaxFeatureVerification(year, "core", catalogues)).toBe("unverified");
    expect(getTaxFeatureVerification("2025/26", "whatIf", catalogues)).toBe("unverified");
  });
});
