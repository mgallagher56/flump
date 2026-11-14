import { describe, expect, it } from "vitest";
import type { ProfileFacts } from "../input.js";
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
});
