import { describe, expect, it } from "vitest";
import { getUkIncomeThresholds } from "../../uk-tax-thresholds.js";
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

describe("nextThresholdAbove", () => {
  it("returns null when nothing lies above", () => {
    expect(nextThresholdAbove([], 10_000)).toBeNull();
  });
});
