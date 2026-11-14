import { describe, expect, it } from "vitest";
import { draftFromValues, valuesFromProfile } from "./draft";
import { INITIAL_VALUES, type OnboardingValues } from "./types";

const v = (patch: Partial<OnboardingValues>): OnboardingValues => ({ ...INITIAL_VALUES, ...patch });

describe("draftFromValues", () => {
  it("keeps only the answers given and never marks setup finished", () => {
    const draft = draftFromValues(v({ grossSalary: 45000, taxRegion: "SCOTLAND" }));
    expect(draft).toEqual({
      employmentType: "employed",
      annualSalary: 45000,
      taxRegion: "SCOTLAND",
    });
    expect(draft).not.toHaveProperty("onboardingCompleted");
    expect(draft).not.toHaveProperty("housingStatus");
  });

  it("saves living with family with a £0 amount", () => {
    const draft = draftFromValues(
      v({ housingStatus: "living_with_family", monthlyHousingCost: 0 }),
    );
    expect(draft.housingStatus).toBe("living_with_family");
    expect(draft.monthlyHousingCost).toBe(0);
  });
});

describe("valuesFromProfile", () => {
  it("starts empty with no profile, and for someone who has finished setup", () => {
    expect(valuesFromProfile(null)).toEqual(INITIAL_VALUES);
    expect(valuesFromProfile({ onboardingCompleted: true, annualSalary: 50000 })).toEqual(
      INITIAL_VALUES,
    );
  });

  it("picks up saved answers and leaves housing unanswered when none is saved", () => {
    const values = valuesFromProfile({
      onboardingCompleted: false,
      annualSalary: 52000,
      taxRegion: "WALES",
      housingStatus: null,
    });
    expect(values.grossSalary).toBe(52000);
    expect(values.taxRegion).toBe("WALES");
    expect(values.housingStatus).toBeNull();
  });

  it("round-trips a draft", () => {
    const start = v({
      incomeMode: "net",
      monthlyTakeHome: 2400,
      housingStatus: "living_with_family",
      monthlyHousingCost: 150,
      monthlyOtherOutgoings: 700,
    });
    const back = valuesFromProfile({ onboardingCompleted: false, ...draftFromValues(start) });
    expect(back).toMatchObject({
      incomeMode: "net",
      monthlyTakeHome: 2400,
      housingStatus: "living_with_family",
      monthlyHousingCost: 150,
      monthlyOtherOutgoings: 700,
    });
  });
});
