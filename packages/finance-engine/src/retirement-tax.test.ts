import { describe, expect, it } from "vitest";
import {
  RETIREMENT_WITHDRAWAL_METHODS,
  retirementYearIncomeTax,
  taxFreeLumpSum,
  ufplsTaxFreePart,
} from "./retirement-tax.js";
import {
  calculateIncomeTaxOnNonSavingsIncome,
  calculatePensionTaxFreePart,
  getUkTaxYearRules,
} from "./uk-tax-year.js";

const RULES = getUkTaxYearRules("2026/27");

describe("calculatePensionTaxFreePart", () => {
  it.each([
    // 25% of 20,000 = 5,000, below the allowance left.
    [20000, 268275, 5000],
    // 25% of 20,000 = 5,000, exactly the allowance left.
    [20000, 5000, 5000],
    // 25% of 20,000 = 5,000, one penny more than the 4,999.99 left: capped.
    [20000, 4999.99, 4999.99],
    // 25% of 1,234.57 = 308.6425, to the penny 308.64.
    [1234.57, 268275, 308.64],
    // Nothing left: nothing tax-free.
    [20000, 0, 0],
    // A negative allowance left is treated as nothing left.
    [20000, -10, 0],
    // A negative or zero amount has no tax-free part.
    [-4000, 268275, 0],
    [0, 268275, 0],
  ])("amount %d with %d left gives %d", (amount, left, expected) => {
    expect(calculatePensionTaxFreePart(amount, left)).toBe(expected);
  });
});

describe("calculateIncomeTaxOnNonSavingsIncome (2026/27)", () => {
  it.each([
    // Below the 12,570 allowance: no tax.
    [12569, "ENGLAND_NI_WALES", 0],
    [12570, "ENGLAND_NI_WALES", 0],
    // 12,580: 10 taxable at 20% = 2.
    [12580, "ENGLAND_NI_WALES", 2],
    // 50,270: 37,700 at 20% = 7,540.
    [50270, "ENGLAND_NI_WALES", 7540],
    // 60,000: 7,540 + (47,430 - 37,700) 9,730 at 40% = 3,892; total 11,432.
    [60000, "ENGLAND_NI_WALES", 11432],
    // 100,000: allowance not tapered (taper starts above 100,000): 87,430 taxable;
    // 7,540 + 49,730 x 40% = 19,892; total 27,432.
    [100000, "ENGLAND_NI_WALES", 27432],
    // 100,002: taper floor(2 / 2) = 1, allowance 12,569, taxable 87,433;
    // 7,540 + 49,733 x 40% = 19,893.20; total 27,433.20.
    [100002, "ENGLAND_NI_WALES", 27433.2],
    // 130,000: allowance gone (taper 15,000 > 12,570); taxable 130,000;
    // 7,540 + (125,140 - 37,700) 87,440 x 40% = 34,976 + (130,000 - 125,140) 4,860 x 45% = 2,187;
    // total 44,703.
    [130000, "ENGLAND_NI_WALES", 44703],
    // Scotland 20,000: 7,430 taxable; starter 3,967 x 19% = 753.73, basic 3,463 x 20% = 692.60;
    // total 1,446.33.
    [20000, "SCOTLAND", 1446.33],
    // Negative income: no tax.
    [-500, "ENGLAND_NI_WALES", 0],
  ] as const)("income %d in %s gives %d", (income, region, expected) => {
    expect(calculateIncomeTaxOnNonSavingsIncome(income, RULES, region)).toBe(expected);
  });
});

describe("retirement tax helpers", () => {
  it("lists both withdrawal methods, UFPLS first", () => {
    expect(RETIREMENT_WITHDRAWAL_METHODS).toEqual(["ufpls", "lumpSum"]);
  });

  it("ufplsTaxFreePart takes 25% up to the allowance left", () => {
    // 25% x 30,000 = 7,500; with 2,000 left only 2,000.
    expect(ufplsTaxFreePart(30000, 268275)).toBe(7500);
    expect(ufplsTaxFreePart(30000, 2000)).toBe(2000);
  });

  it("taxFreeLumpSum is 25% of the pot up to the allowance", () => {
    // 25% x 800,000 = 200,000; 25% x 1,200,000 = 300,000, capped at 268,275.
    expect(taxFreeLumpSum(800000, 268275)).toBe(200000);
    expect(taxFreeLumpSum(1200000, 268275)).toBe(268275);
  });

  it("retirementYearIncomeTax taxes the pension and the State Pension together", () => {
    // 15,000 + 12,547.60 = 27,547.60; less 12,570 = 14,977.60 at 20% = 2,995.52.
    expect(
      retirementYearIncomeTax({
        taxablePensionGbp: 15000,
        statePensionGbp: 12547.6,
        taxYear: "2026/27",
        region: "ENGLAND_NI_WALES",
      }),
    ).toBe(2995.52);
    // The State Pension alone under the allowance: no tax.
    expect(
      retirementYearIncomeTax({
        taxablePensionGbp: 0,
        statePensionGbp: 12547.6,
        taxYear: "2026/27",
        region: "ENGLAND_NI_WALES",
      }),
    ).toBe(0);
  });

  it("retirementYearIncomeTax treats negative parts as nothing", () => {
    // -5,000 counts as 0, so only 20,000: 7,430 at 20% = 1,486.
    expect(
      retirementYearIncomeTax({
        taxablePensionGbp: -5000,
        statePensionGbp: 20000,
        taxYear: "2026/27",
        region: "ENGLAND_NI_WALES",
      }),
    ).toBe(1486);
    expect(
      retirementYearIncomeTax({
        taxablePensionGbp: 20000,
        statePensionGbp: -5000,
        taxYear: "2026/27",
        region: "ENGLAND_NI_WALES",
      }),
    ).toBe(1486);
  });

  it("retirementYearIncomeTax uses the region's bands", () => {
    // Scotland 20,000: 753.73 + 692.60 = 1,446.33 (as above), against 1,486 in England.
    expect(
      retirementYearIncomeTax({
        taxablePensionGbp: 20000,
        statePensionGbp: 0,
        taxYear: "2026/27",
        region: "SCOTLAND",
      }),
    ).toBe(1446.33);
  });
});
