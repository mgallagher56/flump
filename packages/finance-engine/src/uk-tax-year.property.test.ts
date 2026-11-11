/**
 * E4 T14 (F-06): table-value, sweep (property) and boundary tests per supported tax year.
 *
 * Tax figures policy: every expected value below is read from GOV.UK (source
 * URL in each comment) or hand-derived from such values. Anything that could
 * not be confirmed is marked "UNVERIFIED: <reason>" next to the figure; those
 * figures pin the value the engine already used and must not be treated as
 * signed off.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { calculateMonthlyMortgagePayment } from "./mortgage.js";
import { buildLegacyUKConfig, getCurrentUKTaxYear } from "./tax-rules.js";
import { SUPPORTED_UK_TAX_YEARS, type UkTaxRegion, type UkTaxYear } from "./types.js";
import { calculateNationalInsurance, calculateTaxTrapRelief, calculateUkTax } from "./uk-tax.js";
import {
  calculateEmployeeNi,
  getCurrentUkTaxYear,
  getUkTaxYearRules,
  UnsupportedUkTaxYearError,
} from "./uk-tax-year.js";

afterEach(() => {
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// Table values per year
// ---------------------------------------------------------------------------

interface YearVector {
  /** Personal allowance. */
  pa: number;
  /** Basic rate band width (taxable income). */
  basicBand: number;
  /** Taxable-income threshold where the additional rate starts. */
  additionalThreshold: number;
  /** Class 1 primary threshold, upper earnings limit, main and upper rates. */
  ni: { pt: number; uel: number; main: number; upper: number };
  /** Student loan thresholds; undefined = plan not listed for that year. */
  studentLoan: {
    plan1: number;
    plan2: number;
    plan4?: number;
    plan5?: number;
    postgrad: number;
  };
  /** UNVERIFIED notes for figures in this row. */
  unverified: string[];
}

const EMPLOYERS = (y: string) =>
  `https://www.gov.uk/guidance/rates-and-thresholds-for-employers-${y}`;

/**
 * Sources (all GOV.UK):
 * - Income tax 2023/24 to 2026/27:
 *   https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past
 * - Income tax 2020/21 to 2022/23: UK Government Web Archive captures of https://www.gov.uk/income-tax-rates
 *   (20200901000000, 20211001000000, 20220801195953).
 * - NI and student loans: https://www.gov.uk/guidance/rates-and-thresholds-for-employers-YYYY-to-YYYY
 *   (see EMPLOYERS above), student loan table and employee NI table of each year's page.
 * Basic band widths are derived by subtraction: upper limit of the basic band minus the
 * personal allowance (2020/21: 50,000 - 12,500 = 37,500; 2021/22 on: 50,270 - 12,570 = 37,700).
 */
const YEAR_VECTORS: Record<UkTaxYear, YearVector> = {
  "2020/21": {
    // https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2020-to-2021
    pa: 12500,
    basicBand: 37500,
    additionalThreshold: 150000,
    ni: { pt: 9500, uel: 50000, main: 0.12, upper: 0.02 },
    studentLoan: { plan1: 19390, plan2: 26575, postgrad: 21000 }, // Plan 4 not on the page (UNVERIFIED, omitted)
    unverified: ["Plan 4 is not listed on the 2020 to 2021 employer page"],
  },
  "2021/22": {
    pa: 12570,
    basicBand: 37700,
    additionalThreshold: 150000,
    ni: { pt: 9568, uel: 50270, main: 0.12, upper: 0.02 },
    studentLoan: { plan1: 19895, plan2: 27295, plan4: 25000, postgrad: 21000 },
    unverified: [],
  },
  "2022/23": {
    pa: 12570,
    basicBand: 37700,
    additionalThreshold: 150000,
    // UNVERIFIED: full-year approximation of a mid-year change. 11,908 and 12.73% / 2.73% are the
    // annual-method figures GOV.UK prints for directors, applied to all employees.
    ni: { pt: 11908, uel: 50270, main: 0.1273, upper: 0.0273 },
    studentLoan: { plan1: 20195, plan2: 27295, plan4: 25375, postgrad: 21000 },
    unverified: ["Class 1 NI is an annual approximation of mid-year changes"],
  },
  "2023/24": {
    pa: 12570,
    basicBand: 37700,
    additionalThreshold: 125140,
    // UNVERIFIED: 11.5% = (9 x 12% + 3 x 10%) / 12 is derived arithmetic, not a printed figure.
    ni: { pt: 12570, uel: 50270, main: 0.115, upper: 0.02 },
    // UNVERIFIED: Plan 5 25,000 is not on the 2023 to 2024 page.
    studentLoan: { plan1: 22015, plan2: 27295, plan4: 27660, plan5: 25000, postgrad: 21000 },
    unverified: ["Class 1 main rate is derived", "Plan 5 not on the page"],
  },
  "2024/25": {
    pa: 12570,
    basicBand: 37700,
    additionalThreshold: 125140,
    ni: { pt: 12570, uel: 50270, main: 0.08, upper: 0.02 },
    // UNVERIFIED: Plan 5 25,000 is not on the 2024 to 2025 page.
    studentLoan: { plan1: 24990, plan2: 27295, plan4: 31395, plan5: 25000, postgrad: 21000 },
    unverified: ["Plan 5 not on the page"],
  },
  "2025/26": {
    pa: 12570,
    basicBand: 37700,
    additionalThreshold: 125140,
    ni: { pt: 12570, uel: 50270, main: 0.08, upper: 0.02 },
    // UNVERIFIED: Plan 5 25,000 is not on the 2025 to 2026 page.
    studentLoan: { plan1: 26065, plan2: 28470, plan4: 32745, plan5: 25000, postgrad: 21000 },
    unverified: ["Plan 5 not on the page"],
  },
  "2026/27": {
    pa: 12570,
    basicBand: 37700,
    additionalThreshold: 125140,
    ni: { pt: 12570, uel: 50270, main: 0.08, upper: 0.02 },
    studentLoan: { plan1: 26900, plan2: 29385, plan4: 33795, plan5: 25000, postgrad: 21000 },
    unverified: [],
  },
};

describe("table values per supported tax year", () => {
  it("covers exactly the supported years", () => {
    expect(Object.keys(YEAR_VECTORS)).toEqual([...SUPPORTED_UK_TAX_YEARS]);
    expect(EMPLOYERS("2025-to-2026")).toContain("2025-to-2026");
  });

  it.each(SUPPORTED_UK_TAX_YEARS)("%s income tax table equals the vector", (year) => {
    const v = YEAR_VECTORS[year];
    const { ewni } = getUkTaxYearRules(year);
    expect(ewni.personalAllowance).toBe(v.pa);
    expect(ewni.basicRateBandWidth).toBe(v.basicBand);
    expect(ewni.higherRateThreshold).toBe(v.pa + v.basicBand);
    expect(ewni.additionalRateThreshold).toBe(v.additionalThreshold);
    expect(ewni.basicRate).toBe(0.2);
    expect(ewni.higherRate).toBe(0.4);
    expect(ewni.additionalRate).toBe(0.45);
    expect(ewni.personalAllowanceTaperStart).toBe(100000);
  });

  it.each(SUPPORTED_UK_TAX_YEARS)("%s Class 1 NI table equals the vector", (year) => {
    const v = YEAR_VECTORS[year].ni;
    const { class1 } = getUkTaxYearRules(year).ni;
    expect(class1.primaryThreshold).toBe(v.pt);
    expect(class1.upperEarningsLimit).toBe(v.uel);
    expect(class1.mainRate).toBe(v.main);
    expect(class1.upperRate).toBe(v.upper);
  });

  it.each(SUPPORTED_UK_TAX_YEARS)("%s student loan thresholds equal the vector", (year) => {
    const v = YEAR_VECTORS[year].studentLoan;
    const plans = getUkTaxYearRules(year).studentLoans.plans;
    expect(plans.plan1.threshold).toBe(v.plan1);
    expect(plans.plan2.threshold).toBe(v.plan2);
    expect(plans.plan4?.threshold).toBe(v.plan4);
    expect(plans.plan5?.threshold).toBe(v.plan5);
    expect(plans.postgrad.threshold).toBe(v.postgrad);
    for (const plan of [plans.plan1, plans.plan2, plans.plan4, plans.plan5]) {
      if (plan) expect(plan.rate).toBe(0.09);
    }
    expect(plans.postgrad.rate).toBe(0.06);
  });

  it.each(SUPPORTED_UK_TAX_YEARS)(
    "%s: figures marked UNVERIFIED here are flagged by the rules",
    (year) => {
      const v = YEAR_VECTORS[year];
      const rules = getUkTaxYearRules(year);
      if (v.unverified.length > 0) {
        expect(rules.verified, year).toBe(false);
        expect(
          rules.unverified.some((n) => n.startsWith("UNVERIFIED:")),
          year,
        ).toBe(true);
      }
    },
  );
});

// ---------------------------------------------------------------------------
// Deterministic sweep 0..300000 step 250
// ---------------------------------------------------------------------------

const REGIONS: UkTaxRegion[] = ["ENGLAND_NI_WALES", "SCOTLAND"];
const GROSSES: number[] = [];
for (let g = 0; g <= 300000; g += 250) GROSSES.push(g);

interface SweepVariant {
  name: string;
  pensionPct: number;
  plan: "NONE" | "PLAN_2";
}

// Non-salary-sacrifice pension keeps net + deductions + pension = gross checkable.
const VARIANTS: SweepVariant[] = [
  { name: "no pension, no loan", pensionPct: 0, plan: "NONE" },
  { name: "5% pension, plan 2 loan", pensionPct: 5, plan: "PLAN_2" },
];

describe("sweep 0..300000 step 250 per year, region and variant", () => {
  const cases = SUPPORTED_UK_TAX_YEARS.flatMap((year) =>
    REGIONS.flatMap((region) => VARIANTS.map((variant) => ({ year, region, variant }))),
  );

  it.each(cases)("$year $region ($variant.name)", ({ year, region, variant }) => {
    let prevNet = Number.NEGATIVE_INFINITY;
    let prevGross = 0;
    const violations: string[] = [];
    for (const gross of GROSSES) {
      const r = calculateUkTax({
        grossSalary: gross,
        taxYear: year,
        region,
        pensionContributionPct: variant.pensionPct,
        isSalarySacrifice: false,
        studentLoanPlan: variant.plan,
      });
      const pension = r.employeePensionDeductionGbp;
      if (r.incomeTaxGbp < 0) violations.push(`tax<0 at ${gross}: ${r.incomeTaxGbp}`);
      if (r.nationalInsuranceGbp < 0) violations.push(`NI<0 at ${gross}`);
      if (r.studentLoanDeductionGbp < 0) violations.push(`SL<0 at ${gross}`);
      if (r.netTakeHomePayAnnualGbp < prevNet - 1e-9) {
        violations.push(
          `net fell between ${prevGross} (${prevNet}) and ${gross} (${r.netTakeHomePayAnnualGbp})`,
        );
      }
      const sum =
        r.netTakeHomePayAnnualGbp +
        r.incomeTaxGbp +
        r.nationalInsuranceGbp +
        r.studentLoanDeductionGbp +
        pension;
      if (Math.abs(sum - gross) > 0.01) {
        violations.push(`identity at ${gross}: components sum to ${sum}`);
      }
      prevNet = r.netTakeHomePayAnnualGbp;
      prevGross = gross;
    }
    expect(violations.slice(0, 5)).toEqual([]);
  });

  it("the whole sweep runs in under 5 seconds", () => {
    const t0 = performance.now();
    for (const year of SUPPORTED_UK_TAX_YEARS) {
      for (const region of REGIONS) {
        for (const gross of GROSSES) calculateUkTax({ grossSalary: gross, taxYear: year, region });
      }
    }
    expect(performance.now() - t0).toBeLessThan(5000);
  });

  // KNOWN DEFECT (reported by T14, not fixed here): calculateUkTax takes NI from the year-less
  // calculateNationalInsurance (uk-tax.ts:266, constants for 2024/25 onward) instead of the per-year
  // table that calculateEmployeeNi reads, so 2020/21 to 2023/24 NI is wrong in calculateUkTax.
  // it.fails documents this: when the wiring is fixed this test starts failing and should become it().
  it.fails("calculateUkTax NI equals the per-year Class 1 NI for every supported year", () => {
    for (const year of SUPPORTED_UK_TAX_YEARS) {
      const rules = getUkTaxYearRules(year);
      for (const gross of [20000, 60000, 120000]) {
        const r = calculateUkTax({ grossSalary: gross, taxYear: year });
        expect(r.nationalInsuranceGbp, `${year} ${gross}`).toBeCloseTo(
          calculateEmployeeNi(gross, rules),
          2,
        );
      }
    }
  });

  it("the year-less NI helper still matches the per-year table for 2024/25 to 2026/27", () => {
    for (const year of ["2024/25", "2025/26", "2026/27"] as const) {
      const rules = getUkTaxYearRules(year);
      for (const gross of [0, 12570, 30000, 50270, 80000]) {
        expect(calculateNationalInsurance(gross)).toBeCloseTo(calculateEmployeeNi(gross, rules), 2);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Mortgage payment: exact value
// ---------------------------------------------------------------------------

describe("mortgage payment exact value", () => {
  it("250,000 at 4.5% over 25 years (300 months) is 1,389.58", () => {
    // M = P r (1+r)^n / ((1+r)^n - 1), r = 0.045 / 12 = 0.00375, n = 300.
    // (1.00375)^300 = 3.073742528...; M = 250000 x 0.00375 x 3.073742528 / 2.073742528
    //   = 937.5 x 1.482197... = 1389.5811949... -> 1389.58 to the penny.
    expect(calculateMonthlyMortgagePayment(250000, 4.5, 300)).toBe(1389.58);
    const r = 0.045 / 12;
    const f = (1 + r) ** 300;
    expect(f).toBeCloseTo(3.073742528, 9);
    expect(250000 * ((r * f) / (f - 1))).toBeCloseTo(1389.5811949, 6);
  });
});

// ---------------------------------------------------------------------------
// 5 / 6 April boundary with fake timers (UK calendar date, Europe/London)
// ---------------------------------------------------------------------------

describe("tax year rollover at 5/6 April with fake timers", () => {
  it.each([
    // BST starts last Sunday of March, so London = UTC + 1 on these dates.
    ["2025-04-05T22:59:59Z", "2024/25"], // 23:59:59 on 5 April 2025
    ["2025-04-05T23:00:00Z", "2025/26"], // 00:00:00 on 6 April 2025
    ["2026-04-05T22:59:59Z", "2025/26"],
    ["2026-04-05T23:00:00Z", "2026/27"],
  ] as const)("at %s the current year is %s", (instant, expected) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(instant));
    expect(getCurrentUkTaxYear()).toBe(expected);
    expect(getCurrentUKTaxYear()).toBe(expected);
    expect(calculateUkTax({ grossSalary: 50000 }).taxYear).toBe(expected);
  });
});

// ---------------------------------------------------------------------------
// Unknown years throw
// ---------------------------------------------------------------------------

describe("unknown tax years", () => {
  it("buildLegacyUKConfig throws UnsupportedUkTaxYearError instead of falling back", () => {
    expect(() => buildLegacyUKConfig("1999/00")).toThrow(UnsupportedUkTaxYearError);
    expect(() => buildLegacyUKConfig("2027/28")).toThrow(UnsupportedUkTaxYearError);
    for (const year of SUPPORTED_UK_TAX_YEARS) {
      expect(buildLegacyUKConfig(year).personalAllowance).toBe(YEAR_VECTORS[year].pa);
    }
  });
});

// ---------------------------------------------------------------------------
// D7-a: tax trap rates
// ---------------------------------------------------------------------------

describe("tax trap rates (D7-a)", () => {
  // EWNI at 110,000: income tax 40% + 20% (taper: 1 per 2, taxed at 40%) = 60% (income tax only);
  // plus 2% NI above the upper earnings limit = 62%.
  // Scotland at 110,000: advanced rate 45% (taxable income 110,000 - 7,570 = 102,430, inside the
  // 62,430 to 125,140 band in 2024/25 to 2026/27) + 22.5% taper = 67.5%; + 2% NI = 69.5%.
  // Sources: https://www.gov.uk/income-tax-rates/income-over-100000 (taper),
  // https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2025-to-2026 (Scottish bands, UEL, NI rates).
  it("EWNI 110000: income tax rate 60, effective incl NI 62, saved 6000 / 6200", () => {
    const t = calculateTaxTrapRelief(110000);
    expect(t.marginalRatePct).toBe(60);
    expect(t.effectiveMarginalRatePct).toBe(62);
    expect(t.estimatedTaxSavedByEscapingGbp).toBe(6000);
    expect(t.estimatedTaxSaved).toBe(6200);
  });

  it("Scotland 110000: income tax rate 67.5, effective incl NI 69.5, saved 6750 / 6950", () => {
    const t = calculateTaxTrapRelief(110000, "2025/26", "SCOTLAND");
    expect(t.marginalRatePct).toBe(67.5);
    expect(t.effectiveMarginalRatePct).toBe(69.5);
    expect(t.estimatedTaxSavedByEscapingGbp).toBe(6750);
    expect(t.estimatedTaxSaved).toBe(6950);
  });

  it("calculateTaxTrapRelief matches analyzeTaxTrap rates and does not overwrite them", () => {
    for (const region of REGIONS) {
      for (const income of [90000, 100000, 100001, 110000, 125140, 125141, 200000]) {
        const t = calculateTaxTrapRelief(income, "2025/26", region);
        const r = calculateUkTax({ grossSalary: income, taxYear: "2025/26", region });
        expect(t.marginalRatePct, `${region} ${income}`).toBe(r.taxTrap.marginalRatePct);
        expect(t.effectiveMarginalRatePct, `${region} ${income}`).toBe(
          r.taxTrap.effectiveMarginalRatePct,
        );
      }
    }
  });
});
