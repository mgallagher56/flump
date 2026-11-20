import { describe, expect, it } from "vitest";
import { selectUkWhatIfVectors } from "./test-vectors/uk-whatif.vectors.js";
import type { UkTaxYear } from "./types.js";
import {
  calculateChildBenefitAnnual,
  calculateHicbc,
  calculateHicbcPercent,
  childBenefitWeeksInTaxYear,
} from "./uk-hicbc.js";
import { getUkTaxYearRules } from "./uk-tax-year.js";

const rules = (y: UkTaxYear) => getUkTaxYearRules(y);
const charge = (y: UkTaxYear, ani: number, children: number) => {
  const r = rules(y);
  return calculateHicbc(ani, calculateChildBenefitAnnual(children, r), r).charge;
};

describe("hicbc vectors (E25-T2, hand-derived, UNVERIFIED)", () => {
  const vectors = selectUkWhatIfVectors({ kind: "hicbc" });
  it("has vectors", () => expect(vectors.length).toBeGreaterThan(0));
  for (const v of vectors) {
    it(v.id, () => {
      const ani = v.input.adjustedNetIncome as number;
      const children = v.input.children as number;
      expect(charge(v.taxYear as UkTaxYear, ani, children)).toBeCloseTo(v.expected, 2);
    });
  }
});

/**
 * ITEPA 2003 s.681H(3) (https://www.legislation.gov.uk/ukpga/2003/1/section/681H): a week counts in
 * a tax year if its Monday falls in the year (decider ruling adopted 20 Nov 2026). Counted by hand
 * from the calendar: 6 April 2020 and 5 April 2021 were both Mondays, so 2020/21 has 53; 6 April
 * 2026 and 5 April 2027 are both Mondays, so 2026/27 has 53. 2021/22: first Monday 12 April 2021,
 * last 4 April 2022, 52. 2027/28: first Monday 12 April 2027, last 3 April 2028, 52.
 */
describe("Child Benefit weeks in a tax year (ITEPA 2003 s.681H(3))", () => {
  it("is the number of Mondays from 6 April to the next 5 April", () => {
    expect(childBenefitWeeksInTaxYear("2020/21")).toBe(53);
    for (const y of ["2021/22", "2022/23", "2023/24", "2024/25", "2025/26"]) {
      expect(childBenefitWeeksInTaxYear(y), y).toBe(52);
    }
    expect(childBenefitWeeksInTaxYear("2026/27")).toBe(53);
    expect(childBenefitWeeksInTaxYear("2027/28")).toBe(52);
  });
  it("counts from the calendar, not a table of special years", () => {
    // 2032/33: 6 April 2032 is a Tuesday; first Monday 12 April 2032; 5 April 2033 is a Tuesday,
    // last Monday 4 April 2033; (357 days / 7) + 1 = 52.
    expect(childBenefitWeeksInTaxYear("2032/33")).toBe(52);
    // 2037/38: 6 April 2037 is a Monday and 5 April 2038 is a Monday: 53.
    expect(childBenefitWeeksInTaxYear("2037/38")).toBe(53);
    // 2031/32: 6 April 2031 is a Sunday, so 7 April 2031 is the first Monday; 5 April 2032 is a
    // Monday (2032 is a leap year): (364 / 7) + 1 = 53.
    expect(childBenefitWeeksInTaxYear("2031/32")).toBe(53);
  });
  it("rejects a malformed year", () => {
    expect(() => childBenefitWeeksInTaxYear("2026-27")).toThrow();
    expect(() => childBenefitWeeksInTaxYear("2026/28")).toThrow();
  });
});

describe("Child Benefit annual amount", () => {
  it("is eldest plus other children, times the weeks in the year", () => {
    // 2026/27 has 53 weeks: 27.05 x 53 = 1,433.65; (27.05 + 2 x 17.90) x 53 = 62.85 x 53 = 3,331.05.
    expect(calculateChildBenefitAnnual(1, rules("2026/27"))).toBe(1433.65);
    expect(calculateChildBenefitAnnual(3, rules("2026/27"))).toBe(3331.05);
    // 2025/26 has 52: 26.05 x 52 = 1,354.60.
    expect(calculateChildBenefitAnnual(1, rules("2025/26"))).toBe(1354.6);
  });
  it("is zero for no or invalid children", () => {
    expect(calculateChildBenefitAnnual(0, rules("2026/27"))).toBe(0);
    expect(calculateChildBenefitAnnual(-1, rules("2026/27"))).toBe(0);
    expect(calculateChildBenefitAnnual(Number.NaN, rules("2026/27"))).toBe(0);
  });
});

describe("HICBC boundaries, 100-step regime (2023/24)", () => {
  const r = rules("2023/24");
  it("threshold minus 1, at, and plus 1", () => {
    expect(calculateHicbcPercent(49999, r)).toBe(0);
    expect(calculateHicbcPercent(50000, r)).toBe(0);
    expect(calculateHicbcPercent(50001, r)).toBe(0);
  });
  it("steps up on each full 100", () => {
    expect(calculateHicbcPercent(50099, r)).toBe(0);
    expect(calculateHicbcPercent(50100, r)).toBe(1);
    expect(calculateHicbcPercent(50199, r)).toBe(1);
    expect(calculateHicbcPercent(50200, r)).toBe(2);
    expect(calculateHicbcPercent(55000, r)).toBe(50);
  });
  it("reaches 100% at 60,000 and stays capped", () => {
    expect(calculateHicbcPercent(59999, r)).toBe(99);
    expect(calculateHicbcPercent(60000, r)).toBe(100);
    expect(calculateHicbcPercent(60001, r)).toBe(100);
    expect(calculateHicbcPercent(500000, r)).toBe(100);
  });
});

describe("HICBC boundaries, 200-step regime (2024/25 onwards)", () => {
  for (const year of ["2024/25", "2025/26", "2026/27"] as const) {
    const r = rules(year);
    it(`${year} threshold, steps and cap`, () => {
      expect(calculateHicbcPercent(59999, r)).toBe(0);
      expect(calculateHicbcPercent(60000, r)).toBe(0);
      expect(calculateHicbcPercent(60001, r)).toBe(0);
      expect(calculateHicbcPercent(60199, r)).toBe(0);
      expect(calculateHicbcPercent(60200, r)).toBe(1);
      expect(calculateHicbcPercent(60399, r)).toBe(1);
      expect(calculateHicbcPercent(60400, r)).toBe(2);
      expect(calculateHicbcPercent(70000, r)).toBe(50);
      expect(calculateHicbcPercent(79799, r)).toBe(98);
      expect(calculateHicbcPercent(79800, r)).toBe(99);
      expect(calculateHicbcPercent(79999, r)).toBe(99);
      expect(calculateHicbcPercent(80000, r)).toBe(100);
      expect(calculateHicbcPercent(80001, r)).toBe(100);
    });
  }
});

describe("calculateHicbc result and edge cases", () => {
  const r = rules("2025/26");
  it("splits Child Benefit into charge and net", () => {
    expect(calculateHicbc(70000, 2000, r)).toEqual({
      childBenefitAnnual: 2000,
      chargePercent: 50,
      charge: 1000,
      netChildBenefit: 1000,
    });
  });
  it("charges nothing with no Child Benefit", () => {
    expect(calculateHicbc(90000, 0, r).charge).toBe(0);
  });
  it("treats negative or non-finite inputs as zero", () => {
    expect(calculateHicbc(Number.NaN, 1000, r).charge).toBe(0);
    expect(calculateHicbc(90000, -5, r).charge).toBe(0);
    expect(calculateHicbc(90000, Number.NaN, r).charge).toBe(0);
  });
  it("never charges more than the Child Benefit", () => {
    // 100% of the total rounded down: 1,406.60 -> 1,406; 1,406 x 100% = 1,406. Net 0.60.
    const res = calculateHicbc(1e9, 1406.6, r);
    expect(res.charge).toBe(1406);
    expect(res.netChildBenefit).toBe(0.6);
  });
});

/**
 * ITEPA 2003 s.681C(3) (https://www.legislation.gov.uk/ukpga/2003/1/section/681C): the total Child
 * Benefit, the appropriate percentage and the charge are each rounded down to a whole number. Order
 * (coordinator ruling): total, then percentage, then multiply, then the charge.
 */
describe("HICBC rounding (ITEPA 2003 s.681C(3))", () => {
  const r = rules("2025/26");
  it("rounds the total Child Benefit down to whole pounds before the percentage", () => {
    // Total 1,354.60 -> 1,354. 50% of 1,354 = 677 (not 50% of 1,354.60 = 677.30).
    const res = calculateHicbc(70000, 1354.6, r);
    expect(res.charge).toBe(677);
    expect(res.childBenefitAnnual).toBe(1354.6);
    expect(res.netChildBenefit).toBe(677.6);
  });
  it("rounds the charge down to whole pounds", () => {
    // Total 1,354.60 -> 1,354; 99% at ANI 79,800 (floor(19,800 / 200) = 99);
    // 1,354 x 99% = 1,340.46 -> 1,340.
    expect(calculateHicbc(79800, 1354.6, r).charge).toBe(1340);
    // Total 1,354; 1% at ANI 60,200; 13.54 -> 13.
    expect(calculateHicbc(60200, 1354.6, r).charge).toBe(13);
  });
  it("rounds a total of 0.99 down to 0, so no charge", () => {
    // floor(0.99) = 0; 0 x 100% = 0.
    expect(calculateHicbc(90000, 0.99, r).charge).toBe(0);
  });
  it("leaves a whole-pound total and charge unchanged", () => {
    // 2,000 x 50% = 1,000, already whole.
    expect(calculateHicbc(70000, 2000, r).charge).toBe(1000);
  });
});

describe("HICBC result fields", () => {
  const r = rules("2025/26");
  it("charges 0 when the percentage is 0", () => {
    expect(calculateHicbc(60000, 1354.6, r)).toEqual({
      childBenefitAnnual: 1354.6,
      chargePercent: 0,
      charge: 0,
      netChildBenefit: 1354.6,
    });
  });
  it("exposes the thresholds on the year rules", () => {
    expect(rules("2024/25").hicbc.hicbcThresholdStart).toBe(60000);
    expect(rules("2023/24").hicbc.hicbcStepWidth).toBe(100);
  });
});
