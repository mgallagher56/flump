import { describe, expect, it } from "vitest";
import { inferModules } from "./inferModules";
import { INITIAL_VALUES, type OnboardingValues } from "./types";

const v = (patch: Partial<OnboardingValues>): OnboardingValues => ({ ...INITIAL_VALUES, ...patch });

describe("inferModules", () => {
  it("starts with accounts, budget and savings", () => {
    expect(inferModules(v({}))).toEqual(["accounts", "budget", "savings"]);
  });

  it("adds modules for what was entered", () => {
    expect(inferModules(v({ unsecuredDebt: 100 }))).toContain("debt");
    expect(inferModules(v({ pensionPot: 1 }))).toContain("pension");
    expect(inferModules(v({ pensionPercent: 5 }))).toContain("pension");
    expect(inferModules(v({ housingStatus: "mortgage" }))).toContain("mortgage");
    expect(inferModules(v({ propertyValue: 1 }))).toContain("mortgage");
  });

  it("only turns Self Assessment on for the self-employed", () => {
    expect(inferModules(v({}))).not.toContain("tax");
    expect(inferModules(v({ employmentType: "self-employed" }))).toContain("tax");
  });

  it("treats a typed 0 as no module", () => {
    expect(inferModules(v({ unsecuredDebt: 0, pensionPot: 0 }))).toEqual([
      "accounts",
      "budget",
      "savings",
    ]);
  });
});
