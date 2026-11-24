import { describe, expect, it } from "vitest";
import { retirementYearIncomeTax, taxFreeLumpSum, ufplsTaxFreePart } from "../retirement-tax.js";
import { calculateEwniIncomeTax, calculateScottishIncomeTax } from "../uk-tax.js";
import { getUkPensionAllowances } from "../uk-tax-year.js";
import { evaluateSignoff } from "./signoff.js";
import {
  selectUkRetirementVectors,
  UK_RETIREMENT_VECTOR_KINDS,
  UK_RETIREMENT_VECTORS,
  type UkRetirementVector,
} from "./uk-retirement.vectors.js";
import { UK_SELF_ASSESSMENT_VECTORS } from "./uk-self-assessment.vectors.js";
import { UK_TAX_VECTOR_YEARS, UK_TAX_VECTORS } from "./uk-tax.vectors.js";
import { UK_WHATIF_VECTORS } from "./uk-whatif.vectors.js";

const GOV_URL = /^https:\/\/www\.(gov\.(uk|scot)|legislation\.gov\.uk)\//;
const num = (v: UkRetirementVector, key: string) => Number(v.input[key]);
const get = (prefix: string) => UK_RETIREMENT_VECTORS.find((v) => v.id.startsWith(prefix));

/** Runs the engine on one vector's inputs. */
function engineValue(v: UkRetirementVector): number {
  switch (v.kind) {
    case "ufplsTaxFreePart":
      return ufplsTaxFreePart(num(v, "withdrawal"), num(v, "remainingLumpSumAllowance"));
    case "taxFreeLumpSum":
      return taxFreeLumpSum(num(v, "pot"), num(v, "lumpSumAllowance"));
    case "retirementYearTax": {
      const withdrawal = num(v, "pensionWithdrawal");
      const taxFree =
        v.input.method === "ufpls"
          ? ufplsTaxFreePart(withdrawal, num(v, "remainingLumpSumAllowance"))
          : 0;
      return retirementYearIncomeTax({
        taxablePensionGbp: withdrawal - taxFree,
        statePensionGbp: num(v, "statePension"),
        taxYear: v.taxYear,
        region: v.region,
      });
    }
  }
}

describe("E33 S6 retirement vector catalogue", () => {
  it("every kind is present and RV10 to RV16 are covered", () => {
    for (const kind of UK_RETIREMENT_VECTOR_KINDS) {
      expect(selectUkRetirementVectors({ kind }).length, kind).toBeGreaterThan(0);
    }
    for (const rv of ["RV10", "RV11", "RV12", "RV13", "RV14", "RV15", "RV16"]) {
      expect(
        UK_RETIREMENT_VECTORS.some((v) => v.id.includes(`.${rv}.`)),
        rv,
      ).toBe(true);
    }
    expect(selectUkRetirementVectors({ region: "SCOTLAND" }).length).toBeGreaterThan(0);
  });

  it("every vector cites gov.uk, gov.scot or legislation.gov.uk and a read date", () => {
    for (const v of UK_RETIREMENT_VECTORS) {
      expect(v.source, v.id).toMatch(GOV_URL);
      for (const extra of v.additionalSources ?? []) expect(extra, v.id).toMatch(GOV_URL);
      expect(v.sourceReadOn, v.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("every vector has a derivation, a finite value, a supported year and a valid fable-decider signature", () => {
    for (const v of UK_RETIREMENT_VECTORS) {
      expect(v.derivation.trim().length, v.id).toBeGreaterThan(20);
      expect(Number.isFinite(v.expected), v.id).toBe(true);
      expect(UK_TAX_VECTOR_YEARS, v.id).toContain(v.taxYear);
      // Signed on 2026-11-24 by an independent Fable decider (DECISIONS, owner rule of 20 Nov 2026).
      expect(v.signedOffBy, v.id).toBe("fable-decider");
      expect(evaluateSignoff(v).state, v.id).toBe("signed");
    }
  });

  it("UNVERIFIED vectors carry a reason and are medium confidence; VERIFIED ones carry none", () => {
    for (const v of UK_RETIREMENT_VECTORS) {
      if (v.status === "UNVERIFIED") {
        expect(v.unverifiedReason, v.id).toMatch(/^UNVERIFIED: .{10,}/);
        expect(v.confidence, v.id).toBe("medium");
      } else {
        expect(v.status, v.id).toBe("VERIFIED");
        expect(v.unverifiedReason, v.id).toBeUndefined();
        expect(v.confidence, v.id).toBe("high");
      }
    }
  });

  it("ids are unique across every catalogue", () => {
    const ids = [
      ...UK_RETIREMENT_VECTORS,
      ...UK_TAX_VECTORS,
      ...UK_WHATIF_VECTORS,
      ...UK_SELF_ASSESSMENT_VECTORS,
    ].map((v) => v.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("the lump sum allowance in the vectors is the engine's 2026/27 allowance", () => {
    expect(getUkPensionAllowances("2026/27").pensionLumpSumAllowance).toBe(268275);
  });

  it.each(UK_RETIREMENT_VECTORS.map((v) => [v.id, v] as const))(
    "the engine gives the hand-derived value for %s",
    (_id, v) => {
      expect(engineValue(v)).toBe(v.expected);
    },
  );

  it("holds the hand-derived anchor values", () => {
    // RV10: (30,000 x 75%) + 12,547.60 = 35,047.60; less 12,570 = 22,477.60 at 20% = 4,495.52.
    expect(get("retirementYearTax.RV10.")?.expected).toBe(4495.52);
    // RV15 Scotland: 3,967 x 19% + 12,989 x 20% + 13,021.60 x 21% = 6,086.066, to 6,086.07.
    expect(get("retirementYearTax.RV15.")?.expected).toBe(6086.07);
    // RV16 taper: 113,000 income, allowance 12,570 - 6,500 = 6,070; 7,540 + 69,230 x 40% = 35,232.
    expect(get("retirementYearTax.RV16.")?.expected).toBe(35232);
    // RV13c: 25% of 1,500,000 = 375,000, capped at 268,275.
    expect(get("taxFreeLumpSum.RV13c.")?.expected).toBe(268275);
  });

  it("RV10 equals the tax engine's figure for the same income", () => {
    const v = get("retirementYearTax.RV10.") as UkRetirementVector;
    // Same income through the England, Wales and NI income tax entry point: 35,047.60 less the
    // 12,570 allowance.
    expect(engineValue(v)).toBe(calculateEwniIncomeTax(35047.6, 12570, 0, "2026/27"));
  });

  it("RV15 equals the Scottish income tax entry point for the same income", () => {
    const v = get("retirementYearTax.RV15.") as UkRetirementVector;
    expect(engineValue(v)).toBe(calculateScottishIncomeTax(42547.6, 12570, "2026/27"));
  });
});
