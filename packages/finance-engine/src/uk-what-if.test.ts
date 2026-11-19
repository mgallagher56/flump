/**
 * E41 M2: behaviour tests for the what-if and marginal-rate API (uk-what-if.ts).
 *
 * Every figure is worked by hand from the published rules for one named year, England, Wales
 * and Northern Ireland bands:
 * - 2025/26: GOV.UK "Income Tax rates and Personal Allowances" 2025/26 (Personal Allowance 12,570,
 *   basic rate 20% on the first 37,700 of taxable income, higher rate 40% to 125,140, allowance
 *   reduced by 1 for every 2 of adjusted net income over 100,000, ITA 2007 s.35) and GOV.UK "Rates
 *   and thresholds for employers 2025 to 2026" (Class 1 employee NI 8% from 12,570 to 50,270, 2%
 *   above). High Income Child Benefit Charge from 60,000 to 80,000 of adjusted net income (GOV.UK
 *   "High Income Child Benefit Charge", from 6 April 2024).
 */
import { describe, expect, it } from "vitest";
import type { UkIncomeScenario } from "./uk-take-home.js";
import { getUkIncomeThresholds } from "./uk-tax-thresholds.js";
import { getUkTaxYearRules } from "./uk-tax-year.js";
import { marginalRateCurve, whatIfGrossChange, whatIfSacrificeChange } from "./uk-what-if.js";

const Y = "2025/26";
const base = (salary: number, extra: Partial<UkIncomeScenario> = {}): UkIncomeScenario => ({
  taxYear: Y,
  region: "ENGLAND_NI_WALES",
  salary,
  ...extra,
});

describe("whatIfGrossChange", () => {
  it("keeps 72% of a 1,000 rise in the basic rate band: 30,000 to 31,000 in 2025/26", () => {
    // Income tax: 1,000 x 20% = 200. NI: 1,000 x 8% = 80. Take-home: 1,000 - 200 - 80 = 720.
    // Keep rate 720 / 1,000 = 72%; effective marginal rate 100 - 72 = 28%.
    const r = whatIfGrossChange(base(30_000), 1000);
    expect(r.deltaGross).toBe(1000);
    expect(r.deltaTakeHome).toBe(720);
    expect(r.components).toEqual({
      incomeTax: 200,
      nationalInsurance: 80,
      studentLoan: 0,
      hicbc: 0,
      pension: 0,
    });
    expect(r.keepRatePct).toBe(72);
    expect(r.effectiveMarginalRatePct).toBe(28);
  });

  it("keeps 58% of a 1,000 rise in the higher rate band: 60,000 to 61,000 in 2025/26", () => {
    // Income tax: 1,000 x 40% = 400. NI above 50,270: 1,000 x 2% = 20. Take-home 1,000 - 420 = 580.
    const r = whatIfGrossChange(base(60_000), 1000);
    expect(r.deltaTakeHome).toBe(580);
    expect(r.keepRatePct).toBe(58);
    expect(r.effectiveMarginalRatePct).toBe(42);
  });

  it("takes 62% of a 1,000 rise inside the Personal Allowance taper: 100,000 to 101,000", () => {
    // ITA 2007 s.35: the allowance falls by 1,000 / 2 = 500, so taxable income rises by 1,500.
    // Income tax: 1,500 x 40% = 600. NI: 1,000 x 2% = 20. Take-home 1,000 - 620 = 380.
    // Keep rate 38%; effective marginal rate 62%.
    const r = whatIfGrossChange(base(100_000), 1000);
    expect(r.components.incomeTax).toBe(600);
    expect(r.deltaTakeHome).toBe(380);
    expect(r.effectiveMarginalRatePct).toBe(62);
  });

  it("reports 0% for both rates when gross pay does not change", () => {
    // No change in gross: the rates are defined as 0, not 0 / 0.
    const r = whatIfGrossChange(base(30_000), 0);
    expect(r.deltaGross).toBe(0);
    expect(r.deltaTakeHome).toBe(0);
    expect(r.keepRatePct).toBe(0);
    expect(r.effectiveMarginalRatePct).toBe(0);
  });
});

describe("whatIfSacrificeChange", () => {
  it("assumes salary sacrifice when the scenario has no pension, and labels that assumption", () => {
    // 1,000 sacrificed from 30,000: income tax and NI are worked on 29,000.
    // Income tax falls by 1,000 x 20% = 200; NI by 1,000 x 8% = 80.
    // Take-home: -1,000 + 200 + 80 = -720. Gross pay is unchanged, so both rates are 0.
    const r = whatIfSacrificeChange(base(30_000), 1000);
    expect(r.after.pensionMethod).toBe("salary-sacrifice");
    expect(r.deltaGross).toBe(0);
    expect(r.deltaTakeHome).toBe(-720);
    expect(r.deltaPensionGross).toBe(1000);
    expect(r.components).toEqual({
      incomeTax: -200,
      nationalInsurance: -80,
      studentLoan: 0,
      hicbc: 0,
      pension: 1000,
    });
    expect(r.keepRatePct).toBe(0);
    expect(r.effectiveMarginalRatePct).toBe(0);
    expect(r.after.assumptions).toContainEqual({ code: "pensionMethodAssumed", unverified: false });
    expect(r.before.assumptions.map((a) => a.code)).not.toContain("pensionMethodAssumed");
  });

  it("keeps a saved relief-at-source method and adds to the amount already paid", () => {
    // Relief at source, 800 net a year (grossed up x 1.25 = 1,000). Adding 800 net makes 1,600 net,
    // 2,000 gross. A basic-rate taxpayer pays the same tax, so take-home falls by the 800 net.
    const r = whatIfSacrificeChange(
      base(30_000, { pension: { method: "relief-at-source", amount: 800 } }),
      800,
    );
    expect(r.after.pensionMethod).toBe("relief-at-source");
    expect(r.after.pensionEmployee).toBe(1600);
    // Gross into the pension: 2,000 - 1,000 = 1,000.
    expect(r.deltaPensionGross).toBe(1000);
    expect(r.deltaTakeHome).toBe(-800);
    expect(r.components.incomeTax).toBe(0);
    expect(r.components.pension).toBe(800);
    expect(r.after.assumptions.map((a) => a.code)).not.toContain("pensionMethodAssumed");
  });

  it("stops at no contribution when the cut is larger than what is paid", () => {
    // 800 net paid, cut by 2,000: the contribution floors at 0, so take-home rises by the 800.
    const r = whatIfSacrificeChange(
      base(30_000, { pension: { method: "relief-at-source", amount: 800 } }),
      -2000,
    );
    expect(r.after.pensionEmployee).toBe(0);
    expect(r.deltaTakeHome).toBe(800);
    expect(r.components.pension).toBe(-800);
  });

  it("converts a percentage pension to its amount before adding to it", () => {
    // Net pay 5% of 30,000 = 1,500. Adding 500 makes 2,000 by net pay.
    // Net pay lowers income tax (500 x 20% = 100) but not NI. Take-home: -500 + 100 = -400.
    const r = whatIfSacrificeChange(base(30_000, { pension: { method: "net-pay", pct: 5 } }), 500);
    expect(r.before.pensionEmployee).toBe(1500);
    expect(r.after.pensionEmployee).toBe(2000);
    expect(r.components.incomeTax).toBe(-100);
    expect(r.components.nationalInsurance).toBe(0);
    expect(r.deltaTakeHome).toBe(-400);
  });
});

describe("marginalRateCurve", () => {
  it("gives the point, smoothed and per-deduction rates at 30,000 in 2025/26", () => {
    // Take-home at 30,000: income tax (30,000 - 12,570) x 20% = 3,486; NI 17,430 x 8% = 1,394.40.
    // 30,000 - 3,486 - 1,394.40 = 25,119.60.
    // The next 1 keeps 1 - 0.20 - 0.08 = 0.72, so the point rate is 28%. Over the next 1,000:
    // income tax 200 (20%), NI 80 (8%), smoothed rate 28%.
    const c = marginalRateCurve(base(30_000), { from: 30_000, to: 30_000 });
    expect(c.points).toEqual([
      {
        gross: 30_000,
        takeHome: 25_119.6,
        pointRatePct: 28,
        smoothedRatePct: 28,
        componentRatesPct: {
          incomeTax: 20,
          nationalInsurance: 8,
          studentLoan: 0,
          hicbc: 0,
          pension: 0,
        },
      },
    ]);
  });

  it("starts at 0 when asked to start below it", () => {
    const c = marginalRateCurve(base(30_000), { from: -1000, to: 0 });
    expect(c.points.map((p) => p.gross)).toEqual([0]);
  });

  it("includes both ends of the range: 0 to 1,000 in steps of 250 is five points", () => {
    const c = marginalRateCurve(base(30_000), { from: 0, to: 1000, step: 250 });
    expect(c.points.map((p) => p.gross)).toEqual([0, 250, 500, 750, 1000]);
  });

  it("allows exactly 5,000 steps and refuses more", () => {
    // (200,000 - 50,000) / 30 = 5,000 steps: allowed. (200,030 - 50,000) / 30 = 5,001: refused.
    const ok = marginalRateCurve(base(30_000), { from: 50_000, to: 200_000, step: 30 });
    expect(ok.points).toHaveLength(5001);
    expect(() =>
      marginalRateCurve(base(30_000), { from: 50_000, to: 200_030, step: 30 }),
    ).toThrowError(new RangeError("marginalRateCurve: more than 5000 points requested"));
  }, 30_000);

  describe("rule groups the range crosses (2021/22, when the taper rules were unverified)", () => {
    // 2021/22: the Personal Allowance taper group is unverified; the allowance, England and Wales
    // income tax and Class 1 NI groups are verified. Pay of 30,000 never reaches the taper, and
    // adjusted net income of exactly 100,000 is not over it, so only a taper threshold drawn on the
    // curve can bring the taper group in.
    const s: UkIncomeScenario = { taxYear: "2021/22", region: "ENGLAND_NI_WALES", salary: 30_000 };
    const taperAt = getUkIncomeThresholds(getUkTaxYearRules("2021/22"), s).find(
      (t) => t.kind === "taperStart",
    )?.grossAt as number;

    it("lists the taper group when its threshold lies inside the range", () => {
      expect(taperAt).toBeGreaterThan(99_999);
      expect(taperAt).toBeLessThanOrEqual(100_000);
      expect(
        marginalRateCurve(s, { from: 0, to: 100_000, step: 50_000 }).unverifiedRuleKeys,
      ).toEqual(["personalAllowanceTaper"]);
    });

    it("includes a threshold sitting exactly on either end of the range", () => {
      expect(marginalRateCurve(s, { from: taperAt, to: taperAt }).unverifiedRuleKeys).toEqual([
        "personalAllowanceTaper",
      ]);
    });

    it("leaves the taper group out when its threshold lies above the range", () => {
      expect(
        marginalRateCurve(s, { from: 0, to: 99_000, step: 33_000 }).unverifiedRuleKeys,
      ).toEqual([]);
    });
  });

  it("marks the Child Benefit charge as a stepped zone from 60,000 to 80,000 when claimed", () => {
    // 2025/26: the charge starts at 60,000 of adjusted net income and takes all the benefit at
    // 80,000. With no pension, adjusted net income equals gross pay, so the zone is 60,000 to 80,000.
    const c = marginalRateCurve(base(30_000, { childBenefit: { children: 1 } }), {
      from: 0,
      to: 0,
    });
    expect(c.steppedZones).toHaveLength(1);
    const zone = c.steppedZones[0];
    expect(zone?.ruleKey).toBe("hicbc");
    // Thresholds are solved to the penny, so allow 1p either way.
    expect(zone?.from).toBeCloseTo(60_000, 1);
    expect(zone?.to).toBeCloseTo(80_000, 1);
    expect(zone?.from).toBe(c.thresholds.find((t) => t.kind === "hicbcStart")?.grossAt);
  });

  it("has no stepped zone when no Child Benefit is claimed", () => {
    expect(marginalRateCurve(base(30_000), { from: 0, to: 0 }).steppedZones).toEqual([]);
  });

  it("joins your pay's assumptions with the top of the range's, each once, yours first", () => {
    // Your pay: salary 10,000 plus a 50,000 bonus, relief at source at 90% of salary = 9,000 net.
    // The cap is gross pay / 1.25 = 48,000, so nothing is capped.
    // Top of the range (10,000 as salary, no bonus): 9,000 net is over 10,000 / 1.25 = 8,000, so the
    // contribution is capped at earnings there only.
    const c = marginalRateCurve(
      base(10_000, { bonus: 50_000, pension: { method: "relief-at-source", pct: 90 } }),
      { from: 10_000, to: 10_000 },
    );
    expect(c.assumptions.map((a) => a.code)).toEqual([
      "annualMethod",
      "pensionPctOfSalary",
      "reliefAtSourceBandExtension",
      "pensionCappedAtEarnings",
    ]);
  });
});
