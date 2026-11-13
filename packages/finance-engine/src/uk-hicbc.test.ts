import { describe, expect, it } from "vitest";
import { selectUkWhatIfVectors } from "./test-vectors/uk-whatif.vectors.js";
import type { UkTaxYear } from "./types.js";
import { calculateChildBenefitAnnual, calculateHicbc, calculateHicbcPercent } from "./uk-hicbc.js";
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

describe("Child Benefit annual amount", () => {
  it("is eldest plus other children, times 52", () => {
    expect(calculateChildBenefitAnnual(1, rules("2026/27"))).toBe(1406.6);
    expect(calculateChildBenefitAnnual(3, rules("2026/27"))).toBe(3268.2);
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
    const res = calculateHicbc(1e9, 1406.6, r);
    expect(res.charge).toBe(1406.6);
    expect(res.netChildBenefit).toBe(0);
  });
  it("exposes the thresholds on the year rules", () => {
    expect(rules("2024/25").hicbc.hicbcThresholdStart).toBe(60000);
    expect(rules("2023/24").hicbc.hicbcStepWidth).toBe(100);
  });
});
