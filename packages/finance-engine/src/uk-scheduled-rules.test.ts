import { describe, expect, it } from "vitest";
import { salarySacrificeAboveCap, UK_SCHEDULED_RULES } from "./uk-scheduled-rules.js";
import { salarySacrificeCapExtraNi } from "./uk-take-home.js";
import { getUkTaxYearRules } from "./uk-tax-year.js";

const CAP = UK_SCHEDULED_RULES["ni.salarySacrificePensionCap2029"];

describe("2029 salary sacrifice NI cap (E25-T7)", () => {
  it("is provisional, sourced from GOV.UK and labelled UNVERIFIED", () => {
    expect(CAP.status).toBe("announced-provisional");
    expect(CAP.effectiveFrom).toBe("2029-04-06");
    expect(CAP.capGbp).toBe(2000);
    expect(CAP.source).toMatch(/^https:\/\/www\.gov\.uk\//);
    expect(CAP.note).toMatch(/^UNVERIFIED: /);
  });

  it("counts only sacrifice above the cap, never negative", () => {
    expect(salarySacrificeAboveCap(1500, CAP)).toBe(0);
    expect(salarySacrificeAboveCap(2000, CAP)).toBe(0);
    expect(salarySacrificeAboveCap(5000, CAP)).toBe(3000);
    expect(salarySacrificeAboveCap(Number.NaN, CAP)).toBe(0);
  });

  it("works out the extra employee and employer NI at the given year's rates", () => {
    const rules = getUkTaxYearRules("2026/27");
    // 40,000 with 5,000 sacrificed: 3,000 above the cap, all inside the main 8% band.
    const extra = salarySacrificeCapExtraNi(40000, 5000, rules);
    expect(extra.employee).toBeCloseTo(240, 2);
    expect(extra.employer).toBeCloseTo(3000 * rules.employerNi.rate, 2);
    expect(salarySacrificeCapExtraNi(40000, 1000, rules)).toEqual({ employee: 0, employer: 0 });
  });
});
