import { describe, expect, it } from "vitest";
import { getUkIncomeThresholds, type UkIncomeThreshold } from "../../uk-tax-thresholds.js";
import { getUkTaxYearRules } from "../../uk-tax-year.js";
import { whatIfGrossChange } from "../../uk-what-if.js";
import { isFigureKnown } from "../figure.js";
import type { ProfileFacts } from "../input.js";
import {
  incomeScenarioFromFacts,
  nextThresholdAbove,
  selectMarginalRate,
} from "./marginal-rate.js";
import { ASSUMED_REGION_NOTE } from "./take-home.js";

const FACTS: ProfileFacts = {
  annualSalary: 48_000,
  employmentType: "employed",
  taxRegion: "ENGLAND",
  studentLoanPlans: ["PLAN_2"],
  pensionPercent: 5,
  isSalarySacrifice: true,
};

const opts = { taxYear: "2026/27" } as const;

describe("incomeScenarioFromFacts", () => {
  it("maps saved facts onto the engine scenario", () => {
    const { scenario, missing } = incomeScenarioFromFacts(FACTS, opts);
    expect(missing).toEqual([]);
    expect(scenario).toEqual({
      taxYear: "2026/27",
      region: "ENGLAND_NI_WALES",
      salary: 48_000,
      pension: { method: "salary-sacrifice", pct: 5 },
      studentLoans: ["plan2"],
    });
  });

  it("uses net pay when salary sacrifice is off, and Scottish rates for Scotland", () => {
    const { scenario } = incomeScenarioFromFacts(
      { ...FACTS, isSalarySacrifice: false, taxRegion: "SCOTLAND" },
      opts,
    );
    expect(scenario.pension?.method).toBe("net-pay");
    expect(scenario.region).toBe("SCOTLAND");
  });

  it("keeps the saved method at 0% so an extra contribution is modelled as it is paid", () => {
    const { scenario } = incomeScenarioFromFacts({
      ...FACTS,
      pensionPercent: 0,
      isSalarySacrifice: false,
    });
    expect(scenario.pension).toEqual({ method: "net-pay", pct: 0 });
  });

  it("leaves an unanswered region out so the engine labels it", () => {
    expect(incomeScenarioFromFacts({ ...FACTS, taxRegion: null }).scenario.region).toBeUndefined();
  });

  it("names every missing fact", () => {
    const { missing } = incomeScenarioFromFacts({
      annualSalary: null,
      employmentType: null,
      taxRegion: null,
      studentLoanPlans: null,
      pensionPercent: null,
      isSalarySacrifice: null,
    });
    expect(missing).toEqual([
      "annualSalary",
      "employmentType",
      "pensionPercent",
      "isSalarySacrifice",
    ]);
  });
});

describe("selectMarginalRate", () => {
  it("equals the engine's whatIfGrossChange on the next £1,000", () => {
    const fig = selectMarginalRate(FACTS, opts);
    if (!isFigureKnown(fig)) throw new Error("expected known");
    const { scenario } = incomeScenarioFromFacts(FACTS, opts);
    const expected = whatIfGrossChange(scenario, 1000);
    expect(fig.value.nextThousandDeductedPct).toBe(expected.effectiveMarginalRatePct);
    expect(fig.value.takeHomeFromNextThousand).toBe(expected.deltaTakeHome);
    expect(fig.value.ratesYear).toBe("2026/27");
    expect(fig.value.grossPay).toBe(48_000);
  });

  it("gives the first threshold above current pay, with the distance to it", () => {
    const fig = selectMarginalRate(FACTS, opts);
    if (!isFigureKnown(fig)) throw new Error("expected known");
    const next = fig.value.nextThreshold;
    expect(next).not.toBeNull();
    expect(next?.grossAt).toBeGreaterThan(48_000);
    expect(next?.distance).toBeCloseTo((next?.grossAt ?? 0) - 48_000, 2);
    const { scenario } = incomeScenarioFromFacts(FACTS, opts);
    const all = getUkIncomeThresholds(getUkTaxYearRules("2026/27"), scenario);
    const above = all.filter((t) => t.grossAt !== null && t.grossAt > 48_000);
    expect(Math.min(...above.map((t) => t.grossAt as number))).toBe(next?.grossAt);
  });

  it("is unknown for a self-employed profile, which the PAYE core does not model", () => {
    const fig = selectMarginalRate({ ...FACTS, employmentType: "self-employed" }, opts);
    expect(fig).toEqual({ status: "unknown", missing: ["employmentType"], reason: "not-set" });
  });

  it("labels an assumed region", () => {
    const fig = selectMarginalRate({ ...FACTS, taxRegion: null }, opts);
    expect(isFigureKnown(fig) && fig.assumptions).toEqual([ASSUMED_REGION_NOTE]);
  });

  it("switches rates year on 6 April", () => {
    const before = selectMarginalRate(FACTS, { now: new Date("2026-04-05T12:00:00Z") });
    const after = selectMarginalRate(FACTS, { now: new Date("2026-04-06T12:00:00Z") });
    expect(isFigureKnown(before) && before.value.ratesYear).toBe("2025/26");
    expect(isFigureKnown(after) && after.value.ratesYear).toBe("2026/27");
  });
});

describe("taper thresholds (E31)", () => {
  const next = (salary: number) => {
    const fig = selectMarginalRate(
      { ...FACTS, annualSalary: salary, studentLoanPlans: [], pensionPercent: 0 },
      opts,
    );
    if (!isFigureKnown(fig)) throw new Error("expected known");
    return fig.value.nextThreshold;
  };

  it("never offers the taper as the next threshold below £90,000 adjusted net income", () => {
    expect(next(60_000)?.kind).not.toBe("taperStart");
    expect(next(89_000)?.kind).not.toBe("taperStart");
  });

  it("offers it from £90,000", () => {
    expect(next(95_000)?.kind).toBe("taperStart");
    // £125,140 is both the taper end and the additional rate start.
    expect(["taperEnd", "additionalRate"]).toContain(next(110_000)?.kind);
  });
});

describe("nextThresholdAbove", () => {
  it("returns null when nothing lies above", () => {
    expect(nextThresholdAbove([], 10_000)).toBeNull();
  });
});

describe("incomeScenarioFromFacts: details", () => {
  it("orders the plans undergraduate first, then postgraduate, whatever order they were saved in", () => {
    const { scenario } = incomeScenarioFromFacts(
      { ...FACTS, studentLoanPlans: ["POSTGRAD", "PLAN_5", "PLAN_4", "PLAN_1"] },
      opts,
    );
    expect(scenario.studentLoans).toEqual(["plan1", "plan4", "plan5", "postgrad"]);
  });

  it("leaves student loans out when none are saved", () => {
    const { scenario } = incomeScenarioFromFacts({ ...FACTS, studentLoanPlans: [] }, opts);
    expect(scenario).not.toHaveProperty("studentLoans");
  });

  it("leaves the pension out when salary sacrifice is not answered", () => {
    const { scenario, missing } = incomeScenarioFromFacts(
      { ...FACTS, isSalarySacrifice: null },
      opts,
    );
    expect(scenario).not.toHaveProperty("pension");
    expect(missing).toEqual(["isSalarySacrifice"]);
  });

  it("names the salary as missing when it is 0 or less", () => {
    expect(incomeScenarioFromFacts({ ...FACTS, annualSalary: 0 }, opts).missing).toEqual([
      "annualSalary",
    ]);
    expect(incomeScenarioFromFacts({ ...FACTS, annualSalary: -1 }, opts).missing).toEqual([
      "annualSalary",
    ]);
  });
});

describe("selectMarginalRate: year, labels and the taper window", () => {
  it("uses the tax year asked for", () => {
    const fig = selectMarginalRate(FACTS, { taxYear: "2021/22" });
    expect(isFigureKnown(fig) && fig.value.ratesYear).toBe("2021/22");
  });

  it("is derived with no assumptions when the region is saved, and an assumption when it is not", () => {
    const saved = selectMarginalRate(FACTS, opts);
    expect(isFigureKnown(saved) && saved.provenance).toBe("derived");
    expect(isFigureKnown(saved) && saved.assumptions).toBeUndefined();
    const assumed = selectMarginalRate({ ...FACTS, taxRegion: null }, opts);
    expect(isFigureKnown(assumed) && assumed.provenance).toBe("assumption");
  });

  it("offers the taper from exactly 90,000 of adjusted net income (2026/27)", () => {
    // Taper start 100,000 (ITA 2007 s.35) less the 10,000 window = 90,000. No pension, so adjusted
    // net income equals pay.
    const fig = selectMarginalRate(
      { ...FACTS, annualSalary: 90_000, studentLoanPlans: [], pensionPercent: 0 },
      opts,
    );
    expect(isFigureKnown(fig) && fig.value.nextThreshold?.kind).toBe("taperStart");
  });

  it("is an unverified estimate when a rule group it uses is unverified (student loans, 2025/26)", () => {
    // uk-rule-sources.ts lists the 2025/26 student loan group as unverified.
    const fig = selectMarginalRate(FACTS, { taxYear: "2025/26" });
    expect(isFigureKnown(fig) && fig.value.isUnverifiedEstimate).toBe(true);
  });
});

describe("nextThresholdAbove: which threshold is next", () => {
  const th = (
    kind: UkIncomeThreshold["kind"],
    grossAt: number | null,
    extra: Partial<UkIncomeThreshold> = {},
  ): UkIncomeThreshold => ({
    kind,
    measure: "taxableIncome",
    at: 0,
    bandExtension: 0,
    grossAt,
    aniAt: null,
    ruleKey: "personalAllowance",
    status: "verified",
    source: "",
    ...extra,
  });

  it("counts a threshold exactly 50p above pay, and skips one closer than that", () => {
    expect(nextThresholdAbove([th("higherRate", 10_000.5)], 10_000)?.distance).toBe(0.5);
    expect(
      nextThresholdAbove([th("higherRate", 10_000.2), th("studentLoan", 12_000)], 10_000)?.kind,
    ).toBe("studentLoan");
  });

  it("skips thresholds below pay and ones never crossed", () => {
    expect(nextThresholdAbove([th("higherRate", 5_000), th("taperEnd", null)], 10_000)).toBeNull();
  });

  it("picks the nearest above pay in any order, and the first listed on a tie", () => {
    expect(
      nextThresholdAbove([th("additionalRate", 20_000), th("higherRate", 12_000)], 10_000)?.kind,
    ).toBe("higherRate");
    expect(
      nextThresholdAbove([th("taperEnd", 12_000), th("additionalRate", 12_000)], 10_000)?.kind,
    ).toBe("taperEnd");
  });

  it("carries the plan and the band when the threshold has them", () => {
    // Distance 12,000 - 10,000 = 2,000.
    expect(nextThresholdAbove([th("studentLoan", 12_000, { plan: "plan2" })], 10_000)).toEqual({
      kind: "studentLoan",
      plan: "plan2",
      grossAt: 12_000,
      distance: 2000,
    });
    expect(
      nextThresholdAbove(
        [th("higherRate", 12_000, { band: { name: "Higher rate", rate: 0.4 } })],
        10_000,
      ),
    ).toEqual({
      kind: "higherRate",
      band: { name: "Higher rate", rate: 0.4 },
      grossAt: 12_000,
      distance: 2000,
    });
  });
});
