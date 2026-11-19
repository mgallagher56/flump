import { describe, expect, it } from "vitest";
import { profileFactsFromProfile, salarySacrificeFromProfile } from "./input.js";

describe("profileFactsFromProfile", () => {
  it("reads a blank or space-only number as unanswered, not £0", () => {
    expect(profileFactsFromProfile({ annualSalary: "   " as never }).annualSalary).toBeNull();
    expect(profileFactsFromProfile({ annualSalary: "" as never }).annualSalary).toBeNull();
    // A number written as text is still read.
    expect(profileFactsFromProfile({ annualSalary: "36000" as never }).annualSalary).toBe(36000);
  });

  it("keeps only the named student loan plans, dropping blanks and non-text", () => {
    const facts = profileFactsFromProfile({
      studentLoanPlans: ["PLAN_2", "", "   ", 5 as never, "POSTGRADUATE"],
    });
    expect(facts.studentLoanPlans).toEqual(["PLAN_2", "POSTGRADUATE"]);
  });

  it("reads the legacy single plan, with a blank one unanswered", () => {
    expect(profileFactsFromProfile({ studentLoanPlan: "PLAN_1" }).studentLoanPlans).toEqual([
      "PLAN_1",
    ]);
    expect(profileFactsFromProfile({ studentLoanPlan: "" }).studentLoanPlans).toBeNull();
    expect(profileFactsFromProfile({ studentLoanPlan: "   " }).studentLoanPlans).toBeNull();
  });

  it("reads a legacy 'none' as no loan, whatever its case or spacing", () => {
    expect(profileFactsFromProfile({ studentLoanPlan: " none " }).studentLoanPlans).toEqual([]);
    expect(profileFactsFromProfile({ studentLoanPlan: "NONE" }).studentLoanPlans).toEqual([]);
  });
});

describe("salarySacrificeFromProfile", () => {
  it("is unanswered with no profile at all", () => {
    expect(salarySacrificeFromProfile(null)).toBeNull();
    expect(salarySacrificeFromProfile(undefined)).toBeNull();
  });

  it("keeps a saved false as the person's own answer", () => {
    expect(salarySacrificeFromProfile({ isSalarySacrifice: false })).toBe(false);
  });
});
