import { describe, expect, it } from "vitest";
import { deriveOnboardingSummary } from "./deriveOnboardingSummary";
import { INITIAL_VALUES, type OnboardingValues } from "./types";

const v = (patch: Partial<OnboardingValues>): OnboardingValues => ({ ...INITIAL_VALUES, ...patch });

describe("deriveOnboardingSummary", () => {
  it("cannot finish without income and a region, and says which is missing", () => {
    expect(deriveOnboardingSummary(v({})).missingForFinish).toBe(
      "Enter your income and choose where you pay tax",
    );
    expect(deriveOnboardingSummary(v({ grossSalary: 45000 })).missingForFinish).toBe(
      "Choose where you pay tax",
    );
    expect(deriveOnboardingSummary(v({ taxRegion: "ENGLAND" })).missingForFinish).toBe(
      "Enter your income",
    );
    const ok = deriveOnboardingSummary(v({ grossSalary: 45000, taxRegion: "ENGLAND" }));
    expect(ok.canFinish).toBe(true);
    expect(ok.missingForFinish).toBeNull();
  });

  it("uses the typed take-home in net mode", () => {
    const s = deriveOnboardingSummary(
      v({
        incomeMode: "net",
        monthlyTakeHome: 3000,
        monthlyHousingCost: 1000,
        monthlyOtherOutgoings: 500,
      }),
    );
    expect(s.monthlyTakeHome).toBe(3000);
    expect(s.annualTakeHome).toBe(36000);
    expect(s.monthlySurplus).toBe(1500);
  });

  it("matches the known £45,000 England take-home and differs for Scotland", () => {
    const england = deriveOnboardingSummary(v({ grossSalary: 45000, taxRegion: "ENGLAND" }));
    const scotland = deriveOnboardingSummary(v({ grossSalary: 45000, taxRegion: "SCOTLAND" }));
    expect(england.monthlyTakeHome).not.toBe(scotland.monthlyTakeHome);
  });

  it("ignores housing cost when own outright and equity when renting", () => {
    const own = deriveOnboardingSummary(
      v({
        incomeMode: "net",
        monthlyTakeHome: 2000,
        housingStatus: "own_outright",
        monthlyHousingCost: 900,
        propertyValue: 300000,
      }),
    );
    expect(own.monthlyHousing).toBe(0);
    expect(own.homeEquity).toBe(300000);
    const rent = deriveOnboardingSummary(v({ propertyValue: 300000 }));
    expect(rent.homeEquity).toBe(0);
  });

  it("computes starting net worth and knows when nothing was entered", () => {
    expect(deriveOnboardingSummary(v({})).hasNetWorthInputs).toBe(false);
    const s = deriveOnboardingSummary(
      v({
        housingStatus: "mortgage",
        propertyValue: 300000,
        mortgageBalance: 200000,
        cashSavings: 5000,
        pensionPot: 15000,
        unsecuredDebt: 2000,
      }),
    );
    expect(s.startingNetWorth).toBe(118000);
    expect(s.hasNetWorthInputs).toBe(true);
  });
});

describe("onboarding take-home is the engine's one selector (E16 PR 3)", () => {
  it("equals selectTakeHome on the same facts at every step, with a note once deductions apply", async () => {
    const { selectTakeHome } = await import("@flump/finance-engine");
    const { onboardingTakeHomeFacts } = await import("./deriveOnboardingSummary");
    const step1 = v({ grossSalary: 45000, taxRegion: "ENGLAND", studentLoanPlan: "PLAN_2" });
    const step3 = { ...step1, pensionPercent: 5 };
    for (const values of [step1, step3]) {
      const fig = selectTakeHome(onboardingTakeHomeFacts(values));
      if (fig.status !== "known") throw new Error("expected known");
      expect(deriveOnboardingSummary(values).monthlyTakeHome).toBe(fig.value.monthly);
    }
    expect(deriveOnboardingSummary(step1).takeHomeNote).toBe("Now includes your student loan");
    expect(deriveOnboardingSummary(step3).takeHomeNote).toBe(
      "Now includes your 5% pension and student loan",
    );
    expect(deriveOnboardingSummary(v({ grossSalary: 45000 })).takeHomeNote).toBeNull();
    expect(
      deriveOnboardingSummary(v({ incomeMode: "net", monthlyTakeHome: 2000, pensionPercent: 5 }))
        .takeHomeNote,
    ).toBeNull();
  });
});
