import { describe, expect, it } from "vitest";
import {
  BrowserCookieSeedAdapter,
  InMemoryProfileAdapter,
  parseCookieValue,
} from "./persistence.js";
import type { FinancialBaseline, OnboardingSeedPayload } from "./types.js";

describe("Profile Persistence", () => {
  it("parseCookieValue extracts named cookie", () => {
    const header = "foo=bar; flump_onboarding_seed=hello123; other=xyz";
    expect(parseCookieValue(header, "flump_onboarding_seed")).toBe("hello123");
    expect(parseCookieValue(header, "not_found")).toBeNull();
    expect(parseCookieValue(null, "foo")).toBeNull();
  });

  it("BrowserCookieSeedAdapter implements ProfilePersistenceAdapter", () => {
    const adapter = new BrowserCookieSeedAdapter();
    const testBaseline: FinancialBaseline = {
      userId: "u123",
      taxYear: "2025/26",
      ukRegion: "ENGLAND_NI_WALES",
      employmentStatus: "PAYE",
      annualGrossSalary: 60000,
      annualBonusOrSideIncome: 0,
      pensionContributionPct: 5,
      employerPensionMatchPct: 3,
      isSalarySacrifice: true,
      studentLoanPlan: "NONE",
      propertyOwnershipSharePct: 100,
      financialStage: "STAGE_2_BUFFER_BUILD",
      enabledModules: ["accounts", "budget"],
    };

    adapter.saveBaseline(testBaseline);
    expect(adapter.getBaseline()).toEqual(testBaseline);
  });

  it("InMemoryProfileAdapter round-trips baseline and seed", () => {
    const adapter = new InMemoryProfileAdapter();
    const seed: OnboardingSeedPayload = {
      salary: 50000,
      stage: "STAGE_2_BUFFER_BUILD",
    };

    adapter.saveSeed(seed);
    expect(adapter.getSeed()).toEqual(seed);
    adapter.clearSeed();
    expect(adapter.getSeed()).toBeNull();
  });
});
