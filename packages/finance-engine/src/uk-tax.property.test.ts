/**
 * BE-08 (backend audit M23): fast-check properties on the UK tax engine. These check shape, not
 * figures: the figures are pinned by the GOV.UK-sourced vectors and uk-tax-year.property.test.ts.
 * DECISIONS D-11 originally kept tax properties hand-written; the 2026-11 backend audit plan
 * (PLAN.md, BE-08) adds fast-check here alongside the existing seeded sweeps.
 */
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  getRecordAnnualTotalForTaxYear,
  getTaxYearForRecordDate,
  type TaxRecord,
} from "./tax-calculator.js";
import { SUPPORTED_UK_TAX_YEARS, type UkTaxRegion, type UkTaxYear } from "./types.js";
import { calculateUkTax } from "./uk-tax.js";
import {
  calculateClass4Ni,
  calculateEmployeeNi,
  calculatePersonalAllowanceForYear,
  getUkTaxYearForDate,
  getUkTaxYearRules,
} from "./uk-tax-year.js";

const RUNS = { numRuns: 200 };
const PENNY = 0.011;

const year = fc.constantFrom<UkTaxYear>(...SUPPORTED_UK_TAX_YEARS);
const region = fc.constantFrom<UkTaxRegion>("ENGLAND_NI_WALES", "SCOTLAND");
const gross = fc.integer({ min: 0, max: 400_000 });

const DAY_MS = 86_400_000;
const isoDate = fc
  .integer({
    min: Date.UTC(1990, 0, 1) / DAY_MS,
    max: Date.UTC(2100, 11, 31) / DAY_MS,
  })
  .map((day) => new Date(day * DAY_MS).toISOString().slice(0, 10));

function tax(y: UkTaxYear, r: UkTaxRegion, grossSalary: number) {
  return calculateUkTax({ taxYear: y, region: r, grossSalary });
}

function maxBandRate(y: UkTaxYear): number {
  const rules = getUkTaxYearRules(y);
  return Math.max(rules.ewni.additionalRate, ...rules.scotland.bands.map((b) => b.rate));
}

describe("tax-year boundaries", () => {
  it("every date maps to a year whose 6 April start <= date <= 5 April end", () => {
    fc.assert(
      fc.property(isoDate, (date) => {
        const label = getUkTaxYearForDate(date);
        const start = Number(label.slice(0, 4));
        expect(`${start}-04-06` <= date && date <= `${start + 1}-04-05`, date).toBe(true);
        expect(label.slice(5), date).toBe(String((start + 1) % 100).padStart(2, "0"));
      }),
      RUNS,
    );
  });

  it("5 April ends a year and 6 April starts the next, for any calendar year", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1990, max: 2100 }), (y) => {
        const ending = getUkTaxYearForDate(`${y}-04-05`);
        const starting = getUkTaxYearForDate(`${y}-04-06`);
        expect(Number(ending.slice(0, 4))).toBe(y - 1);
        expect(Number(starting.slice(0, 4))).toBe(y);
      }),
      RUNS,
    );
  });

  it("a record is filed under the date's tax year and counts in that year only", () => {
    fc.assert(
      fc.property(isoDate, (date) => {
        const filed = getTaxYearForRecordDate(date);
        expect(filed).toBe(getUkTaxYearForDate(date));
        const start = Number(filed.slice(0, 4));
        const label = (s: number) => `${s}/${String((s + 1) % 100).padStart(2, "0")}`;
        const rec = {
          id: "r",
          userId: "u",
          type: "income",
          source: "paye",
          category: "paye_salary",
          name: "n",
          amount: 100,
          frequency: "one-off",
          date,
          endDate: null,
          notes: null,
          createdAt: "",
          updatedAt: "",
        } as unknown as TaxRecord;
        expect(getRecordAnnualTotalForTaxYear(rec, filed), date).toBe(100);
        expect(getRecordAnnualTotalForTaxYear(rec, label(start - 1)), date).toBe(0);
        expect(getRecordAnnualTotalForTaxYear(rec, label(start + 1)), date).toBe(0);
      }),
      RUNS,
    );
  });
});

describe("income tax", () => {
  it("is never negative and never exceeds gross income", () => {
    fc.assert(
      fc.property(year, region, gross, (y, r, g) => {
        const t = tax(y, r, g).incomeTaxGbp;
        expect(t).toBeGreaterThanOrEqual(0);
        expect(t).toBeLessThanOrEqual(g);
      }),
      RUNS,
    );
  });

  it("is monotonic non-decreasing in gross income", () => {
    fc.assert(
      fc.property(year, region, gross, gross, (y, r, a, b) => {
        const [lo, hi] = a <= b ? [a, b] : [b, a];
        expect(tax(y, r, lo).incomeTaxGbp).toBeLessThanOrEqual(tax(y, r, hi).incomeTaxGbp);
      }),
      RUNS,
    );
  });

  it("marginal rate stays within the year's bands (at most 1.5x the top rate in the taper)", () => {
    fc.assert(
      fc.property(year, region, gross, (y, r, g) => {
        const step = 100;
        const rate = (tax(y, r, g + step).incomeTaxGbp - tax(y, r, g).incomeTaxGbp) / step;
        expect(rate).toBeGreaterThanOrEqual(0);
        expect(rate).toBeLessThanOrEqual(maxBandRate(y) * 1.5 + PENNY / step);
      }),
      RUNS,
    );
  });

  it("is zero up to the personal allowance", () => {
    fc.assert(
      fc.property(year, region, fc.double({ min: 0, max: 1, noNaN: true }), (y, r, f) => {
        const pa = getUkTaxYearRules(y).ewni.personalAllowance;
        expect(tax(y, r, Math.floor(pa * f)).incomeTaxGbp).toBe(0);
      }),
      RUNS,
    );
  });
});

describe("personal allowance taper", () => {
  it("is full up to the taper start, zero from start + 2 x allowance, and non-increasing between", () => {
    fc.assert(
      fc.property(year, fc.integer({ min: 0, max: 200_000 }), fc.nat(5_000), (y, ani, d) => {
        const rules = getUkTaxYearRules(y);
        const { personalAllowance: pa, personalAllowanceTaperStart: start } = rules.ewni;
        const allowance = calculatePersonalAllowanceForYear(ani, rules);
        if (ani <= start) expect(allowance).toBe(pa);
        else if (ani >= start + 2 * pa) expect(allowance).toBe(0);
        else expect(allowance).toBe(pa - Math.floor((ani - start) / 2));
        expect(allowance).toBeGreaterThanOrEqual(0);
        expect(calculatePersonalAllowanceForYear(ani + d, rules)).toBeLessThanOrEqual(allowance);
      }),
      RUNS,
    );
  });

  it("is fully withdrawn at 125,140 for years with a 12,570 allowance", () => {
    fc.assert(
      fc.property(year, fc.integer({ min: 0, max: 30_000 }), (y, over) => {
        const rules = getUkTaxYearRules(y);
        if (rules.ewni.personalAllowance !== 12_570) return;
        expect(calculatePersonalAllowanceForYear(125_140 + over, rules)).toBe(0);
        expect(calculatePersonalAllowanceForYear(125_138, rules)).toBe(1);
      }),
      RUNS,
    );
  });
});

describe("national insurance", () => {
  it("employee and Class 4 NI are non-negative and non-decreasing", () => {
    fc.assert(
      fc.property(year, gross, gross, (y, a, b) => {
        const rules = getUkTaxYearRules(y);
        const [lo, hi] = a <= b ? [a, b] : [b, a];
        expect(calculateEmployeeNi(lo, rules)).toBeGreaterThanOrEqual(0);
        expect(calculateClass4Ni(lo, rules)).toBeGreaterThanOrEqual(0);
        expect(calculateEmployeeNi(lo, rules)).toBeLessThanOrEqual(calculateEmployeeNi(hi, rules));
        expect(calculateClass4Ni(lo, rules)).toBeLessThanOrEqual(calculateClass4Ni(hi, rules));
      }),
      RUNS,
    );
  });

  it("calculateUkTax NI is non-negative and below gross", () => {
    fc.assert(
      fc.property(year, region, gross, (y, r, g) => {
        const ni = tax(y, r, g).nationalInsuranceGbp;
        expect(ni).toBeGreaterThanOrEqual(0);
        expect(ni).toBeLessThanOrEqual(g);
      }),
      RUNS,
    );
  });
});
