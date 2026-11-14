import { describe, expect, it } from "vitest";
import type { ProfileFacts } from "../input.js";
import { otherAnnualIncomeFromProfile, selectPsaBand } from "./psa-band.js";

const FACTS: ProfileFacts = {
  annualSalary: 32000,
  employmentType: "employed",
  taxRegion: "ENGLAND",
  studentLoanPlans: [],
  pensionPercent: 5,
  isSalarySacrifice: null,
};

const opts = { taxYear: "2026/27" } as const;

describe("selectPsaBand", () => {
  it("is basic for an English employee on £32,000", () => {
    expect(selectPsaBand(FACTS, opts)).toBe("basic");
  });

  it("is higher for £70,000 and additional above £125,140", () => {
    expect(selectPsaBand({ ...FACTS, annualSalary: 70000 }, opts)).toBe("higher");
    expect(selectPsaBand({ ...FACTS, annualSalary: 200000 }, opts)).toBe("additional");
  });

  it("maps Scottish bands to the PSA bands", () => {
    expect(selectPsaBand({ ...FACTS, taxRegion: "SCOTLAND" }, opts)).toBe("basic");
    expect(selectPsaBand({ ...FACTS, taxRegion: "SCOTLAND", annualSalary: 70000 }, opts)).toBe(
      "higher",
    );
  });

  it("claims no band when income is not saved", () => {
    expect(selectPsaBand({ ...FACTS, annualSalary: null }, opts)).toBeNull();
    expect(selectPsaBand({ ...FACTS, annualSalary: 0 }, opts)).toBeNull();
  });

  it("counts second and rental income: £45,000 salary plus £10,000 rent is higher rate", () => {
    const salaryOnly = { ...FACTS, annualSalary: 45000 };
    expect(selectPsaBand(salaryOnly, opts)).toBe("basic");
    expect(selectPsaBand(salaryOnly, { ...opts, otherAnnualIncome: 10000 })).toBe("higher");
  });
});

describe("otherAnnualIncomeFromProfile", () => {
  it("annualises second and rental income the user said they have", () => {
    expect(
      otherAnnualIncomeFromProfile({
        hasSecondIncome: true,
        secondIncomeMonthly: 500,
        hasRentalIncome: true,
        rentalIncomeMonthly: "250" as unknown as number,
      }),
    ).toBe(9000);
  });

  it("ignores amounts left behind when the user said they have no such income", () => {
    expect(
      otherAnnualIncomeFromProfile({
        hasSecondIncome: false,
        secondIncomeMonthly: 500,
        hasRentalIncome: false,
        rentalIncomeMonthly: 250,
      }),
    ).toBe(0);
  });

  it("is 0 for a missing profile or bad values", () => {
    expect(otherAnnualIncomeFromProfile(null)).toBe(0);
    expect(otherAnnualIncomeFromProfile({ hasSecondIncome: true, secondIncomeMonthly: null })).toBe(
      0,
    );
  });
});
