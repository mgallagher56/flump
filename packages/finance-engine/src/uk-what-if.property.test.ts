/**
 * E25-T6 properties. Hand-written seeded generators (E23 D-11: no fast-check for tax), so every failure
 * prints a reproducible scenario.
 */
import { describe, expect, it } from "vitest";
import { SUPPORTED_UK_TAX_YEARS, type UkTaxRegion, type UkTaxYear } from "./types.js";
import { computeUkTakeHome, type UkIncomeScenario, type UkPensionMethod } from "./uk-take-home.js";
import { getUkTaxYearRules, type UkStudentLoanPlanKey } from "./uk-tax-year.js";
import { marginalRateCurve, whatIfGrossChange, whatIfSacrificeChange } from "./uk-what-if.js";

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const METHODS: (UkPensionMethod | null)[] = [
  null,
  "salary-sacrifice",
  "net-pay",
  "relief-at-source",
];

function genScenario(r: () => number, opts: { children?: boolean } = {}): UkIncomeScenario {
  const pick = <T>(xs: readonly T[]) => xs[Math.floor(r() * xs.length)] as T;
  const taxYear = pick(SUPPORTED_UK_TAX_YEARS) as UkTaxYear;
  const rules = getUkTaxYearRules(taxYear);
  const region = pick<UkTaxRegion>(["ENGLAND_NI_WALES", "SCOTLAND"]);
  const method = pick(METHODS);
  const available = (["plan1", "plan2", "plan4", "plan5"] as const).filter(
    (p) => rules.studentLoans.plans[p],
  );
  const loans: UkStudentLoanPlanKey[] = [];
  if (r() < 0.4) loans.push(pick(available));
  if (r() < 0.2) loans.push("postgrad");
  return {
    taxYear,
    region,
    salary: Math.round(r() * 180_000),
    bonus: r() < 0.2 ? Math.round(r() * 10_000) : 0,
    pension: method ? { method, pct: Math.round(r() * 10) } : undefined,
    studentLoans: loans,
    childBenefit: opts.children && r() < 0.5 ? { children: 1 + Math.floor(r() * 3) } : undefined,
  };
}

const RUNS = 300;

describe("what-if properties", () => {
  it("whatIf(s, d).after equals compute(s with salary + d)", () => {
    const r = rng(1);
    for (let i = 0; i < RUNS; i++) {
      const s = genScenario(r, { children: true });
      const d = Math.round((r() - 0.3) * 20_000);
      const w = whatIfGrossChange(s, d);
      const direct = computeUkTakeHome({ ...s, salary: Math.max(0, s.salary + d) });
      expect(w.after.takeHome, JSON.stringify({ s, d })).toBe(direct.takeHome);
    }
  });

  it("take-home never falls as gross rises without Child Benefit (no monetary cliffs are modelled)", () => {
    const r = rng(2);
    for (let i = 0; i < RUNS; i++) {
      const s = genScenario(r);
      const d = 1 + Math.round(r() * 5_000);
      expect(
        whatIfGrossChange(s, d).deltaTakeHome,
        JSON.stringify({ s, d }),
      ).toBeGreaterThanOrEqual(-0.01);
    }
  });

  it("with Child Benefit, take-home never falls over a rise of at least one HICBC step", () => {
    const r = rng(7);
    for (let i = 0; i < RUNS; i++) {
      const s = genScenario(r, { children: true });
      const step = getUkTaxYearRules(s.taxYear as UkTaxYear).hicbc.hicbcStepWidth;
      const d = step + Math.round(r() * 5_000);
      expect(
        whatIfGrossChange(s, d).deltaTakeHome,
        JSON.stringify({ s, d }),
      ).toBeGreaterThanOrEqual(-0.01);
    }
  });

  it("the effective marginal rate is between 0 and 100% outside HICBC steps", () => {
    const r = rng(3);
    for (let i = 0; i < RUNS; i++) {
      const s = genScenario(r);
      const w = whatIfGrossChange(s, 1000);
      expect(w.effectiveMarginalRatePct, JSON.stringify(s)).toBeGreaterThanOrEqual(-0.01);
      expect(w.effectiveMarginalRatePct, JSON.stringify(s)).toBeLessThanOrEqual(100.01);
    }
  });

  it("inside the taper, income tax alone is 60% (EWNI) and 67.5% (Scotland)", () => {
    for (const taxYear of SUPPORTED_UK_TAX_YEARS) {
      const rules = getUkTaxYearRules(taxYear);
      const mid = (rules.ewni.personalAllowanceTaperStart + rules.taperEnd) / 2;
      for (const region of ["ENGLAND_NI_WALES", "SCOTLAND"] as const) {
        const before = computeUkTakeHome({ taxYear, region, salary: mid });
        const band =
          region === "SCOTLAND"
            ? rules.scotland.bands.find(
                (b) =>
                  before.taxableIncome > b.from &&
                  (b.to === null || before.taxableIncome + 1500 <= b.to),
              )?.rate
            : rules.ewni.higherRate;
        const w = whatIfGrossChange({ taxYear, region, salary: mid }, 1000);
        expect(w.components.incomeTax, `${taxYear} ${region}`).toBeCloseTo(
          (band ?? 0) * 1.5 * 1000,
          0,
        );
        if (band === 0.4) expect(w.components.incomeTax).toBeCloseTo(600, 0);
        if (band === 0.45) expect(w.components.incomeTax).toBeCloseTo(675, 0);
      }
    }
  });

  it("salary sacrifice never raises NI", () => {
    const r = rng(4);
    for (let i = 0; i < RUNS; i++) {
      const s: UkIncomeScenario = {
        ...genScenario(r),
        pension: { method: "salary-sacrifice", amount: 0 },
      };
      const w = whatIfSacrificeChange(s, Math.round(r() * 20_000));
      expect(w.components.nationalInsurance, JSON.stringify(s)).toBeLessThanOrEqual(0);
    }
  });

  it("deltas are symmetric: +d then -d returns to the start", () => {
    const r = rng(5);
    for (let i = 0; i < RUNS; i++) {
      const s = genScenario(r, { children: true });
      const d = Math.round(r() * 10_000);
      const up = whatIfGrossChange(s, d);
      const back = whatIfGrossChange({ ...s, salary: s.salary + d }, -d);
      expect(back.after.takeHome, JSON.stringify({ s, d })).toBe(up.before.takeHome);
      expect(back.deltaTakeHome).toBeCloseTo(-up.deltaTakeHome, 2);
    }
  });

  it("take-home plus every component delta adds up to the gross change", () => {
    const r = rng(6);
    for (let i = 0; i < RUNS; i++) {
      const s = genScenario(r, { children: true });
      const w = whatIfGrossChange(s, 1000);
      const c = w.components;
      const sum =
        w.deltaTakeHome + c.incomeTax + c.nationalInsurance + c.studentLoan + c.hicbc + c.pension;
      expect(sum, JSON.stringify(s)).toBeCloseTo(w.deltaGross, 2);
    }
  });
});

describe("marginalRateCurve", () => {
  const s: UkIncomeScenario = { taxYear: "2026/27", region: "ENGLAND_NI_WALES", salary: 39000 };

  // About 35 ms on a laptop (plan budget 50 ms). The test allows headroom and retries, because parallel
  // test files share the CPU.
  it("defaults to about 600 points from 0 to 150,000 and computes within budget", {
    retry: 2,
  }, () => {
    marginalRateCurve(s); // warm up module caches
    const t0 = performance.now();
    const c = marginalRateCurve({ ...s, studentLoans: ["plan2"], childBenefit: { children: 2 } });
    const ms = performance.now() - t0;
    expect(c.points).toHaveLength(601);
    expect(c.points[0]?.gross).toBe(0);
    expect(c.points.at(-1)?.gross).toBe(150_000);
    // Plan budget is 50 ms in the browser; CI machines vary, so allow headroom here.
    expect(ms).toBeLessThan(250);
  });

  it("reads the default median example: 39,000 keeps 72% of the next 1,000", () => {
    const c = marginalRateCurve(s);
    expect(c.yourPay.gross).toBe(39000);
    expect(c.yourPay.next.deltaTakeHome).toBeCloseTo(720, 2);
    expect(c.yourPay.next.components).toEqual({
      incomeTax: 200,
      nationalInsurance: 80,
      studentLoan: 0,
      hicbc: 0,
      pension: 0,
    });
    expect(c.asAtTaxYear).toBe("2026/27");
    expect(c.isUnverifiedEstimate).toBe(true);
  });

  it("marks the taper at 62% smoothed and lists the HICBC stepped zone", () => {
    const c = marginalRateCurve({ ...s, childBenefit: { children: 1 } });
    const inTaper = c.points.find((p) => p.gross === 110_000);
    expect(inTaper?.smoothedRatePct).toBeCloseTo(62, 2);
    expect(c.steppedZones).toEqual([{ from: 60000, to: 80000, ruleKey: "hicbc" }]);
    // Point rate spikes on a GBP200 step edge; the smoothed rate stays sensible.
    for (const p of c.points.filter((p) => p.gross > 60000 && p.gross < 80000)) {
      expect(p.smoothedRatePct).toBeLessThan(60);
    }
  });

  it("refuses an absurd number of points", () => {
    expect(() => marginalRateCurve(s, { step: 1, to: 1_000_000 })).toThrow(RangeError);
  });
});
