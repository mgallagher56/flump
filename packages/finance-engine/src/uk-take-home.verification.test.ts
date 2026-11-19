import { describe, expect, it, vi } from "vitest";
import { computeUkTakeHome, type UkIncomeScenario } from "./uk-take-home.js";

// No tax year has signed vectors yet, so with the real catalogues every result is an unverified
// estimate. This stands in a sign-off state so the rule "an estimate is verified only when nothing
// it rests on is unverified" can be checked: every feature signed except HICBC in every year and
// the core feature in 2025/26.
vi.mock("./tax-year-verification.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./tax-year-verification.js")>();
  return {
    ...actual,
    getTaxFeatureVerification: (year: string, feature: string) =>
      feature === "hicbc" || (year === "2025/26" && feature === "core") ? "unverified" : "verified",
  };
});

const base: UkIncomeScenario = { taxYear: "2026/27", region: "ENGLAND_NI_WALES", salary: 39_000 };

describe("computeUkTakeHome: when an estimate counts as verified", () => {
  it("is a verified estimate when every feature, rule group and assumption is verified", () => {
    const b = computeUkTakeHome(base);
    expect(b.verification).toEqual({ core: "verified", whatIf: "verified" });
    expect(b.isUnverifiedEstimate).toBe(false);
  });

  it("an assumed region does not by itself make the estimate unverified", () => {
    expect(computeUkTakeHome({ taxYear: "2026/27", salary: 39_000 }).isUnverifiedEstimate).toBe(
      false,
    );
  });

  it("is unverified when only a rule group is unverified (2026/27 Scottish rates)", () => {
    const b = computeUkTakeHome({ ...base, region: "SCOTLAND" });
    expect(b.unverifiedRuleKeys).toEqual(["incomeTaxScotland"]);
    expect(b.isUnverifiedEstimate).toBe(true);
  });

  it("is unverified when only one assumption is unverified (several undergraduate plans)", () => {
    const b = computeUkTakeHome({ ...base, salary: 45_000, studentLoans: ["plan1", "plan2"] });
    expect(b.unverifiedRuleKeys).toEqual([]);
    expect(b.verification).toEqual({ core: "verified", whatIf: "verified" });
    expect(b.isUnverifiedEstimate).toBe(true);
  });

  it("is unverified when only one feature is unsigned (2025/26 core)", () => {
    const b = computeUkTakeHome({ ...base, taxYear: "2025/26" });
    expect(b.unverifiedRuleKeys).toEqual([]);
    expect(b.assumptions.every((a) => !a.unverified)).toBe(true);
    expect(b.verification).toEqual({ core: "unverified", whatIf: "verified" });
    expect(b.isUnverifiedEstimate).toBe(true);
  });

  it("reports each feature's own status, not another feature's", () => {
    const b = computeUkTakeHome({ ...base, childBenefit: { children: 1 } });
    expect(b.verification).toEqual({ core: "verified", whatIf: "verified", hicbc: "unverified" });
  });
});
