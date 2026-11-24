import { describe, expect, it } from "vitest";
import { buildRetirementPlanInput, retirementTaxRegion } from "./retirement-input.js";

const NOW = new Date("2026-11-17T12:00:00Z");
const plan = { retirementAge: 65, planToAge: 85 };

function tax(over: { taxRegion?: string | null; withdrawalMethod?: "ufpls" | "lumpSum" }) {
  const result = buildRetirementPlanInput({
    plan,
    birthYear: 1981,
    now: NOW,
    accounts: [],
    taxRegion: over.taxRegion,
    overrides: over.withdrawalMethod ? { withdrawalMethod: over.withdrawalMethod } : undefined,
  });
  if (!result.ok) throw new Error("expected a built input");
  return result.input.tax;
}

describe("retirementTaxRegion", () => {
  it.each([
    ["SCOTLAND", "SCOTLAND"],
    ["ENGLAND", "ENGLAND_NI_WALES"],
    ["WALES", "ENGLAND_NI_WALES"],
    ["NORTHERN_IRELAND", "ENGLAND_NI_WALES"],
    ["ENGLAND_NI_WALES", "ENGLAND_NI_WALES"],
    ["scotland", null],
    ["", null],
    [null, null],
    [undefined, null],
  ] as const)("maps %s to %s", (raw, expected) => {
    expect(retirementTaxRegion(raw)).toBe(expected);
  });
});

describe("buildRetirementPlanInput: income tax", () => {
  it("uses UFPLS and the saved region for the saved figures", () => {
    expect(tax({ taxRegion: "SCOTLAND" })).toEqual({
      withdrawalMethod: "ufpls",
      taxYear: "2026/27",
      region: "SCOTLAND",
    });
  });

  it("leaves the region empty (assumed) when none is saved", () => {
    expect(tax({ taxRegion: null })).toEqual({
      withdrawalMethod: "ufpls",
      taxYear: "2026/27",
      region: null,
    });
  });

  it("takes the lump sum method only from a what-if override", () => {
    expect(tax({ taxRegion: "ENGLAND", withdrawalMethod: "lumpSum" })).toEqual({
      withdrawalMethod: "lumpSum",
      taxYear: "2026/27",
      region: "ENGLAND_NI_WALES",
    });
  });

  it("takes the tax year from now", () => {
    const result = buildRetirementPlanInput({
      plan,
      birthYear: 1981,
      now: new Date("2027-06-01T12:00:00Z"),
      accounts: [],
    });
    if (!result.ok) throw new Error("expected a built input");
    expect(result.input.tax?.taxYear).toBe("2027/28");
  });
});
