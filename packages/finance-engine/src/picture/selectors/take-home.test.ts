import { describe, expect, it } from "vitest";
import { UK_TAX_VECTORS } from "../../test-vectors/uk-tax.vectors.js";
import { type Figure, isFigureKnown } from "../figure.js";
import type { ProfileFacts } from "../input.js";
import { profileFactsFromProfile } from "../input.js";
import {
  ASSUMED_NO_STUDENT_LOAN_NOTE,
  ASSUMED_REGION_NOTE,
  selectTakeHome,
  type TakeHome,
} from "./take-home.js";

const FACTS: ProfileFacts = {
  annualSalary: 50000,
  employmentType: "employed",
  taxRegion: "ENGLAND",
  studentLoanPlans: [],
  pensionPercent: 5,
  isSalarySacrifice: false,
};

function value(fig: Figure<TakeHome>): TakeHome {
  if (!isFigureKnown(fig)) throw new Error(`expected known, got unknown: ${JSON.stringify(fig)}`);
  return fig.value;
}

const opts = { taxYear: "2026/27" } as const;

describe("selectTakeHome", () => {
  it("uses Scottish bands for a Scottish employed £50,000 (vector value) and differs from England", () => {
    const vector = UK_TAX_VECTORS.find((v) => v.id === "scotland.incomeTax.2026-27.50000");
    expect(vector?.expected).toBe(8982.05);
    // Pension is net-pay, so income tax is on 50,000 less the pension; use 0% to hit the vector.
    const scot = value(
      selectTakeHome({ ...FACTS, taxRegion: "SCOTLAND", pensionPercent: 0 }, opts),
    );
    const eng = value(selectTakeHome({ ...FACTS, pensionPercent: 0 }, opts));
    expect(scot.incomeTax).toBe(vector?.expected);
    expect(scot.region).toBe("SCOTLAND");
    expect(eng.region).toBe("ENGLAND_NI_WALES");
    expect(scot.incomeTax).not.toBe(eng.incomeTax);
    expect(scot.monthly).not.toBe(eng.monthly);
  });

  it("applies a Plan 2 student loan at £38,000", () => {
    const base = { ...FACTS, annualSalary: 38000 };
    const none = value(selectTakeHome(base, opts));
    const plan2 = value(selectTakeHome({ ...base, studentLoanPlans: ["PLAN_2"] }, opts));
    expect(none.studentLoan).toBe(0);
    expect(plan2.studentLoan).toBeGreaterThan(0);
    expect(plan2.monthly).toBeLessThan(none.monthly);
  });

  it("prefers an undergraduate plan over postgraduate", () => {
    const fig = value(
      selectTakeHome(
        { ...FACTS, annualSalary: 38000, studentLoanPlans: ["POSTGRAD", "PLAN_2"] },
        opts,
      ),
    );
    const plan2 = value(
      selectTakeHome({ ...FACTS, annualSalary: 38000, studentLoanPlans: ["PLAN_2"] }, opts),
    );
    expect(fig.studentLoan).toBe(plan2.studentLoan);
  });

  it.each([
    ["annualSalary", { annualSalary: null }],
    ["annualSalary", { annualSalary: 0 }],
    ["employmentType", { employmentType: null }],
    ["pensionPercent", { pensionPercent: null }],
    ["isSalarySacrifice", { isSalarySacrifice: null }],
  ] as const)("is unknown when %s is missing", (key, patch) => {
    const fig = selectTakeHome({ ...FACTS, ...patch }, opts);
    expect(fig).toEqual({ status: "unknown", missing: [key], reason: "not-set" });
  });

  it("lists every missing key at once", () => {
    const fig = selectTakeHome(
      { ...FACTS, employmentType: null, pensionPercent: null, isSalarySacrifice: null },
      opts,
    );
    expect(fig).toEqual({
      status: "unknown",
      missing: ["employmentType", "pensionPercent", "isSalarySacrifice"],
      reason: "not-set",
    });
  });

  it("never returns gross as take-home for 'other' employment", () => {
    const fig = selectTakeHome({ ...FACTS, employmentType: "other" }, opts);
    expect(fig.status).toBe("unknown");
    expect(fig.status === "unknown" && fig.missing).toContain("employmentType");
  });

  it("assumes England, Wales and Northern Ireland rates when the region is not set", () => {
    const fig = selectTakeHome({ ...FACTS, taxRegion: null }, opts);
    expect(fig).toMatchObject({ status: "known", provenance: "assumption" });
    expect(isFigureKnown(fig) && fig.assumptions).toEqual([
      "Assuming England, Wales and Northern Ireland rates.",
    ]);
    expect(ASSUMED_REGION_NOTE).toBe("Assuming England, Wales and Northern Ireland rates.");
    expect(value(fig).region).toBe("ENGLAND_NI_WALES");
  });

  it("assumes no student loan when the plans are not answered", () => {
    const fig = selectTakeHome({ ...FACTS, studentLoanPlans: null }, opts);
    expect(isFigureKnown(fig) && fig.assumptions).toEqual([ASSUMED_NO_STUDENT_LOAN_NOTE]);
    expect(value(fig).studentLoan).toBe(0);
  });

  it("is derived with no assumptions when everything is answered", () => {
    const fig = selectTakeHome(FACTS, opts);
    expect(fig).toMatchObject({ status: "known", provenance: "derived" });
    expect(isFigureKnown(fig) && fig.assumptions).toBeUndefined();
  });

  it("maps Wales and Northern Ireland to the England, NI and Wales bands", () => {
    const eng = value(selectTakeHome(FACTS, opts));
    for (const taxRegion of ["WALES", "NORTHERN_IRELAND"] as const) {
      expect(value(selectTakeHome({ ...FACTS, taxRegion }, opts)).incomeTax).toBe(eng.incomeTax);
    }
  });

  it("charges exact Class 4 NI on £50,000 self-employed profit in 2026/27", () => {
    // (50,000 - 12,570) x 6% = 2,245.80; above the upper profits limit only 2% applies.
    const fig = selectTakeHome(
      { ...FACTS, employmentType: "self-employed", pensionPercent: 0, isSalarySacrifice: null },
      opts,
    );
    expect(value(fig).nationalInsurance).toBeCloseTo(2245.8, 2);
  });

  it("does not ask the self-employed about salary sacrifice", () => {
    const fig = selectTakeHome(
      { ...FACTS, employmentType: "self-employed", isSalarySacrifice: null },
      opts,
    );
    expect(fig.status).toBe("known");
  });

  it("takes sacrificed salary out of take-home (hand-calculated, England 2026/27)", () => {
    // £40,000 with 5% sacrificed: pay 38,000; tax (38,000 - 12,570) x 20% = 5,086;
    // NI (38,000 - 12,570) x 8% = 2,034.40; net 30,879.60.
    const fig = selectTakeHome(
      { ...FACTS, annualSalary: 40000, pensionPercent: 5, isSalarySacrifice: true },
      opts,
    );
    expect(value(fig)).toMatchObject({ pension: 2000, annual: 30880, monthly: 2573 });
    expect(value(fig).incomeTax).toBeCloseTo(5086, 2);
    expect(value(fig).nationalInsurance).toBeCloseTo(2034.4, 2);
  });

  it("combines Scottish bands with a Plan 2 loan; the loan does not depend on region", () => {
    const base = { ...FACTS, annualSalary: 38000, studentLoanPlans: ["PLAN_2"] };
    const scot = value(selectTakeHome({ ...base, taxRegion: "SCOTLAND" }, opts));
    const eng = value(selectTakeHome({ ...base, taxRegion: "ENGLAND" }, opts));
    expect(scot.region).toBe("SCOTLAND");
    expect(scot.studentLoan).toBeGreaterThan(0);
    expect(scot.studentLoan).toBe(eng.studentLoan);
    expect(scot.incomeTax).not.toBe(eng.incomeTax);
  });

  it("uses Class 4 NI for the self-employed", () => {
    const emp = value(selectTakeHome(FACTS, opts));
    const se = value(selectTakeHome({ ...FACTS, employmentType: "self-employed" }, opts));
    expect(se.nationalInsurance).toBeGreaterThan(0);
    expect(se.nationalInsurance).not.toBe(emp.nationalInsurance);
  });

  it("returns unknown 'unsupported-year' instead of throwing", () => {
    const fig = selectTakeHome(FACTS, { taxYear: "2099/00" as never });
    expect(fig).toEqual({ status: "unknown", missing: [], reason: "unsupported-year" });
  });

  it("reports whole-pound monthly and annual that reconcile with the deductions", () => {
    const v = value(selectTakeHome(FACTS, opts));
    expect(Number.isInteger(v.monthly)).toBe(true);
    expect(Number.isInteger(v.annual)).toBe(true);
    expect(v.annual).toBe(
      Math.round(50000 - v.pension - v.incomeTax - v.nationalInsurance - v.studentLoan),
    );
    expect(v.taxYear).toBe("2026/27");
  });

  it("merges overrides over the facts", () => {
    const withPension = value(selectTakeHome(FACTS, opts));
    const without = value(selectTakeHome(FACTS, { ...opts, overrides: { pensionPercent: 0 } }));
    expect(without.pension).toBe(0);
    expect(without.monthly).toBeGreaterThan(withPension.monthly);
    expect(selectTakeHome(FACTS, { ...opts, overrides: { annualSalary: null } }).status).toBe(
      "unknown",
    );
  });
});

describe("profileFactsFromProfile", () => {
  it("does not invent defaults", () => {
    expect(profileFactsFromProfile({})).toEqual({
      annualSalary: null,
      employmentType: null,
      taxRegion: null,
      studentLoanPlans: null,
      pensionPercent: null,
      isSalarySacrifice: null,
    });
  });

  it("converts numeric strings, blanks to null, keeps 0 and [] meaningful", () => {
    const facts = profileFactsFromProfile({
      annualSalary: "42000" as never,
      pensionPercent: "0" as never,
      employmentType: "employed",
      taxRegion: "WALES",
      studentLoanPlans: [],
      isSalarySacrifice: false,
    });
    expect(facts).toMatchObject({
      annualSalary: 42000,
      pensionPercent: 0,
      studentLoanPlans: [],
      isSalarySacrifice: false,
    });
    expect(profileFactsFromProfile({ annualSalary: "" as never }).annualSalary).toBeNull();
  });

  it("falls back to the legacy single plan only when plans are absent", () => {
    expect(profileFactsFromProfile({ studentLoanPlan: "PLAN_2" }).studentLoanPlans).toEqual([
      "PLAN_2",
    ]);
    expect(profileFactsFromProfile({ studentLoanPlan: "NONE" }).studentLoanPlans).toEqual([]);
    expect(
      profileFactsFromProfile({ studentLoanPlan: "PLAN_2", studentLoanPlans: ["PLAN_1"] })
        .studentLoanPlans,
    ).toEqual(["PLAN_1"]);
  });
});
