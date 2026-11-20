/**
 * E25-T6 properties. Hand-written seeded generators (E23 D-11: no fast-check for tax), so every failure
 * prints a reproducible scenario.
 */
import { describe, expect, it } from "vitest";
import { SUPPORTED_UK_TAX_YEARS, type UkTaxRegion, type UkTaxYear } from "./types.js";
import { computeUkTakeHome, type UkIncomeScenario, type UkPensionMethod } from "./uk-take-home.js";
import { scenarioAtGross } from "./uk-tax-thresholds.js";
import {
  getUkTaxYearRules,
  type UkStudentLoanPlanKey,
  UnsupportedUkTaxYearError,
} from "./uk-tax-year.js";
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

/**
 * The engine deliberately refuses Scottish figures for 2027/28: no Scottish table is published
 * for that year (owner decision). This is the only year and region pair the generators skip; a
 * plain test below checks it throws. Plans a year does not list (Plan 1 and Plan 4 in 2027/28)
 * are already left out by the `available` filter in genScenario.
 */
const isRefusedYearRegion = (taxYear: string, region: UkTaxRegion): boolean =>
  taxYear === "2027/28" && region === "SCOTLAND";

function genScenario(r: () => number, opts: { children?: boolean } = {}): UkIncomeScenario {
  const pick = <T>(xs: readonly T[]) => xs[Math.floor(r() * xs.length)] as T;
  let taxYear: UkTaxYear;
  let region: UkTaxRegion;
  do {
    taxYear = pick(SUPPORTED_UK_TAX_YEARS) as UkTaxYear;
    region = pick<UkTaxRegion>(["ENGLAND_NI_WALES", "SCOTLAND"]);
  } while (isRefusedYearRegion(taxYear, region));
  const rules = getUkTaxYearRules(taxYear);
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
  it("refuses a Scottish 2027/28 scenario, the one pair the generators skip", () => {
    expect(() =>
      computeUkTakeHome({ taxYear: "2027/28", region: "SCOTLAND", salary: 40_000 }),
    ).toThrow(UnsupportedUkTaxYearError);
  });

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
        if (isRefusedYearRegion(taxYear, region)) continue;
        const before = computeUkTakeHome({ taxYear, region, salary: mid });
        const band =
          region === "SCOTLAND"
            ? rules.scotland?.bands.find(
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

  // The curve's own work is three take-home calculations per point (at g, g + 1 and g + 1,000) for
  // 601 points: 1,803 calls of computeUkTakeHome, plus the what-if at your pay. Its cost is checked
  // against those same 1,803 calls timed straight after it, not against a fixed number of
  // milliseconds: CPU contention from tests running beside it slows both alike, so the check does
  // not flake. What it catches: work added in the curve's own loop that grows four-fold or more,
  // such as a re-sweep per point. What it does not catch: a slowdown inside computeUkTakeHome
  // itself, which slows the reference equally (no test in this package guards that cost now; see
  // E41 P4). The time itself is reported as an annotation.
  // (E41: a wall-clock limit here failed when the backend specs began running in parallel.)
  it("defaults to about 600 points from 0 to 150,000 at the cost of three take-home calls each", async ({
    annotate,
  }) => {
    const scenario: UkIncomeScenario = {
      ...s,
      studentLoans: ["plan2"],
      childBenefit: { children: 2 },
    };
    const reference = () => {
      for (let g = 0; g <= 150_000; g += 250) {
        computeUkTakeHome(scenarioAtGross(scenario, g));
        computeUkTakeHome(scenarioAtGross(scenario, g + 1));
        computeUkTakeHome(scenarioAtGross(scenario, g + 1000));
      }
    };
    marginalRateCurve(scenario); // warm up module caches
    reference();
    let curveMs = Number.POSITIVE_INFINITY;
    let referenceMs = Number.POSITIVE_INFINITY;
    let c = marginalRateCurve(scenario);
    // Best of five, each pair back to back, so a pause in one run does not decide the result.
    for (let i = 0; i < 5; i++) {
      const t0 = performance.now();
      c = marginalRateCurve(scenario);
      const t1 = performance.now();
      reference();
      const t2 = performance.now();
      curveMs = Math.min(curveMs, t1 - t0);
      referenceMs = Math.min(referenceMs, t2 - t1);
    }
    expect(c.points).toHaveLength(601);
    expect(c.points[0]?.gross).toBe(0);
    expect(c.points.at(-1)?.gross).toBe(150_000);
    // Measured ratio of curve to reference on a loaded laptop: 0.83 to 2.05 over nine rounds (the
    // curve also builds 601 point objects and the what-if at your pay). Four times the reference
    // leaves room for that and for noise. A reviewer's probe: twice the per-point work passed,
    // four times failed, a quadratic re-sweep fails clearly.
    expect(curveMs).toBeLessThan(4 * referenceMs);
    await annotate(
      `curve ${curveMs.toFixed(1)} ms; the same 1,803 take-home calls ${referenceMs.toFixed(1)} ms (plan budget 50 ms in the browser)`,
    );
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

  it("labels the whole range, not only your own pay: the taper is flagged for a 30,000 earner in 2021/22", () => {
    // 2021/22's taper rate is UNVERIFIED in the registry; 30,000 never reaches it, the curve does.
    const c = marginalRateCurve({ taxYear: "2021/22", region: "ENGLAND_NI_WALES", salary: 30000 });
    expect(c.unverifiedRuleKeys).toContain("personalAllowanceTaper");
  });
});
