import { describe, expect, it } from "vitest";
import type { ProfileFacts } from "../input.js";
import * as psaBand from "./psa-band.js";
import { selectPsaBand } from "./psa-band.js";

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

  it("counts other income: £45,000 salary plus £10,000 other income is higher rate", () => {
    // £45,000 is below the £50,270 higher-rate threshold. With £10,000 more it is £55,000, still
    // above it after the 5% pension (£2,250) either reduces the income or extends the basic band.
    const salaryOnly = { ...FACTS, annualSalary: 45000 };
    expect(selectPsaBand(salaryOnly, opts)).toBe("basic");
    expect(selectPsaBand(salaryOnly, { ...opts, otherAnnualIncome: 10000 })).toBe("higher");
  });
});

describe("psa-band module", () => {
  it("no longer exports the profile rental income reader (system audit slice 9 part two)", () => {
    expect("otherAnnualIncomeFromProfile" in psaBand).toBe(false);
  });
});
