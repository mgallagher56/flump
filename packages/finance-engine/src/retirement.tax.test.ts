import { describe, expect, it } from "vitest";
import { calculateRetirementPlan, type RetirementPlanInput } from "./retirement.js";

// Growth equal to inflation is a real rate of exactly 0, so a pot of P spent over N years gives
// P ÷ N a year and every figure below is plain arithmetic. 2026/27 rules: personal allowance
// 12,570, basic rate 20% on the first 37,700 above it, higher rate 40%, lump sum allowance 268,275.
const flat = {
  growthRates: { lower: 0.02, middle: 0.02, higher: 0.02 },
  inflationRate: 0.02,
  cashSavingsNominalRate: 0.02,
};
const band = (n: number) => ({ lower: n, middle: n, higher: n });

function plan(overrides: Partial<RetirementPlanInput>): ReturnType<typeof calculateRetirementPlan> {
  return calculateRetirementPlan({
    currentAge: 60,
    retirementAge: 60,
    planToAge: 70,
    accounts: [],
    assumptions: flat,
    tax: { taxYear: "2026/27" },
    ...overrides,
  });
}

describe("income tax in retirement, UFPLS (the saved figures)", () => {
  // Pension 200,000 over 10 years: 20,000 a year. State Pension 12,547.60 from 67.
  const result = plan({
    accounts: [{ type: "Pension", balanceGbp: 200_000 }],
    statePension: { statePensionAge: 67, annualForecastGbp: 12_547.6 },
    target: 20_000,
  });

  it("splits each withdrawal 25% tax-free, 75% taxed, and taxes it with the State Pension", () => {
    const first = result.yearlySchedule[0];
    // Age 60: 25% x 20,000 = 5,000 tax-free; 15,000 taxable; (15,000 - 12,570) x 20% = 486.
    expect(first?.pensionWithdrawalYearly).toEqual(band(20_000));
    expect(first?.taxFreePensionYearly).toEqual(band(5_000));
    expect(first?.taxableIncomeYearly).toEqual(band(15_000));
    expect(first?.incomeTaxYearly).toEqual(band(486));
    expect(first?.yearlyIncomeAfterTax).toEqual(band(19_514));
    // No housing saved: after housing equals after tax.
    expect(first?.yearlyIncomeAfterTaxAndHousing).toEqual(band(19_514));

    const atSpa = result.yearlySchedule[7];
    // Age 67: 15,000 + 12,547.60 = 27,547.60 taxable; (27,547.60 - 12,570) x 20% = 2,995.52;
    // gross 32,547.60 - 2,995.52 = 29,552.08.
    expect(atSpa?.age).toBe(67);
    expect(atSpa?.taxableIncomeYearly).toEqual(band(27_547.6));
    expect(atSpa?.incomeTaxYearly).toEqual(band(2_995.52));
    expect(atSpa?.yearlyIncomeAfterTax).toEqual(band(29_552.08));
  });

  it("gives the first-year, before and from State Pension age figures after tax", () => {
    expect(result.estimatedYearlyIncomeGbp).toEqual(band(20_000));
    expect(result.estimatedYearlyIncomeAfterTaxGbp).toEqual(band(19_514));
    expect(result.estimatedYearlyIncomeBeforeStatePensionAgeAfterTaxGbp).toEqual(band(19_514));
    expect(result.estimatedYearlyIncomeFromStatePensionAgeAfterTaxGbp).toEqual(band(29_552.08));
    expect(result.estimatedIncomeTaxYearlyGbp).toEqual(band(486));
  });

  it("gives the differences from the target after tax, and keeps the before-tax ones", () => {
    // 19,514 - 20,000 = -486; 29,552.08 - 20,000 = 9,552.08. Before tax: 20,000 - 20,000 = 0.
    expect(result.differenceYearlyAfterTax).toEqual(band(-486));
    expect(result.differenceBeforeStatePensionAgeYearlyAfterTax).toEqual(band(-486));
    expect(result.differenceFromStatePensionAgeYearlyAfterTax).toEqual(band(9_552.08));
    expect(result.differenceYearly).toEqual(band(0));
    expect(result.summary.estimatedMiddleYearlyAfterTaxGbp).toBe(19_514);
    expect(result.summary.differenceMiddleYearlyAfterTaxGbp).toBe(-486);
  });

  it("splits income after tax by source in the first year from State Pension age", () => {
    // Age 67: the State Pension alone is under the allowance (no tax of its own), so the pension
    // carries all 2,995.52: 20,000 - 2,995.52 = 17,004.48.
    expect(result.incomeAfterTaxBySource).toEqual({
      age: 67,
      statePensionGbp: 12_547.6,
      pensionsGbp: band(17_004.48),
      otherPotsGbp: band(0),
    });
  });

  it("records the method, year, assumed region and allowance", () => {
    expect(result.tax).toEqual({
      withdrawalMethod: "ufpls",
      taxYear: "2026/27",
      region: "ENGLAND_NI_WALES",
      regionAssumed: true,
      lumpSumAllowanceGbp: 268_275,
      taxFreeLumpSumGbp: null,
      refusal: null,
    });
  });
});

describe("UFPLS across the lump sum allowance", () => {
  // Pension 1,200,000 over 10 years: 120,000 a year, 25% = 30,000 tax-free while the allowance
  // lasts. 8 years use 240,000; year 9 gets the 28,275 left; year 10 gets nothing.
  const result = plan({ accounts: [{ type: "Pension", balanceGbp: 1_200_000 }] });

  it("stops the tax-free part once the allowance is used", () => {
    const taxFree = result.yearlySchedule.map((r) => r.taxFreePensionYearly.middle);
    expect(taxFree).toEqual([
      30_000, 30_000, 30_000, 30_000, 30_000, 30_000, 30_000, 30_000, 28_275, 0,
    ]);
  });

  it("taxes each year on what is left after the tax-free part", () => {
    const tax = result.yearlySchedule.map((r) => r.incomeTaxYearly.middle);
    // 90,000 taxable: (90,000 - 12,570) = 77,430; 7,540 + 39,730 x 40% = 23,432.
    expect(tax[0]).toBe(23_432);
    // 91,725 taxable: 79,155; 7,540 + 41,455 x 40% = 24,122.
    expect(tax[8]).toBe(24_122);
    // 120,000 taxable: allowance 12,570 - 10,000 = 2,570; 117,430;
    // 7,540 + 79,730 x 40% = 39,432.
    expect(tax[9]).toBe(39_432);
  });
});

describe("the allowance reached exactly", () => {
  // Pension 1,073,100 over 10 years: 107,310 a year, 25% = 26,827.50. Ten years use exactly
  // 268,275, so the last year still gets its full 26,827.50.
  const result = plan({ accounts: [{ type: "Pension", balanceGbp: 1_073_100 }] });

  it("gives the full 25% in the last year", () => {
    expect(result.yearlySchedule[9]?.taxFreePensionYearly.middle).toBe(26_827.5);
    const total = result.yearlySchedule.reduce((s, r) => s + r.taxFreePensionYearly.middle, 0);
    expect(total).toBe(268_275);
  });
});

describe("a tax-free lump sum at retirement (the what-if)", () => {
  // Pension 400,000: lump sum 25% = 100,000; 300,000 left over 10 years = 30,000 a year, all
  // taxed. ISA 50,000 over 10 years = 5,000 a year, untaxed.
  const result = plan({
    accounts: [
      { type: "Pension", balanceGbp: 400_000 },
      { type: "ISA", balanceGbp: 50_000 },
    ],
    tax: { taxYear: "2026/27", withdrawalMethod: "lumpSum", region: "ENGLAND_NI_WALES" },
  });

  it("takes the lump sum outside yearly income and draws the rest down fully taxed", () => {
    expect(result.tax.taxFreeLumpSumGbp).toEqual(band(100_000));
    expect(result.tax.regionAssumed).toBe(false);
    expect(result.annualPensionWithdrawalGbp).toEqual(band(30_000));
    expect(result.annualOtherPotIncomeGbp).toEqual(band(5_000));
    expect(result.annualPotIncomeGbp).toEqual(band(35_000));
    const first = result.yearlySchedule[0];
    expect(first?.taxFreePensionYearly).toEqual(band(0));
    // (30,000 - 12,570) x 20% = 3,486; 35,000 - 3,486 = 31,514.
    expect(first?.incomeTaxYearly).toEqual(band(3_486));
    expect(result.estimatedYearlyIncomeAfterTaxGbp).toEqual(band(31_514));
  });

  it("caps the lump sum at the allowance", () => {
    // 25% x 1,500,000 = 375,000, capped at 268,275; (1,500,000 - 268,275) / 10 = 123,172.50.
    const big = plan({
      accounts: [{ type: "Pension", balanceGbp: 1_500_000 }],
      tax: { taxYear: "2026/27", withdrawalMethod: "lumpSum" },
    });
    expect(big.tax.taxFreeLumpSumGbp).toEqual(band(268_275));
    expect(big.annualPensionWithdrawalGbp).toEqual(band(123_172.5));
  });

  it("adds cash savings, untaxed, beside the lump sum drawdown", () => {
    // Pension 400,000 with a lump sum: 30,000 a year (as above). Savings 20,000 at 2% with 2%
    // inflation (real 0) over 10 years: 2,000 a year. Pots: 32,000; tax still 3,486.
    const result = plan({
      accounts: [
        { type: "Pension", balanceGbp: 400_000 },
        { type: "Savings", balanceGbp: 20_000 },
      ],
      tax: { taxYear: "2026/27", withdrawalMethod: "lumpSum" },
    });
    expect(result.annualPotIncomeGbp).toEqual(band(32_000));
    expect(result.annualOtherPotIncomeGbp).toEqual(band(2_000));
    expect(result.estimatedIncomeTaxYearlyGbp).toEqual(band(3_486));
  });

  it("draws investments at their real rate beside the pension", () => {
    // Real rate 0 on investments here too: the same ISA under UFPLS gives the same 5,000.
    const ufpls = plan({
      accounts: [
        { type: "Pension", balanceGbp: 400_000 },
        { type: "ISA", balanceGbp: 50_000 },
      ],
    });
    expect(ufpls.annualOtherPotIncomeGbp).toEqual(band(5_000));
    expect(ufpls.annualPensionWithdrawalGbp).toEqual(band(40_000));
  });
});

describe("edges", () => {
  it("a zero pension pot: ISAs untaxed, the State Pension taxed on its own", () => {
    // Retired at 68, State Pension from 66 (already started): ISA 100,000 / 10 = 10,000 untaxed.
    // State Pension 15,000: (15,000 - 12,570) x 20% = 486; 25,000 - 486 = 24,514.
    const result = plan({
      currentAge: 68,
      retirementAge: 68,
      planToAge: 78,
      accounts: [{ type: "ISA", balanceGbp: 100_000 }],
      statePension: { statePensionAge: 66, annualForecastGbp: 15_000 },
    });
    expect(result.yearlySchedule[0]?.incomeTaxYearly).toEqual(band(486));
    expect(result.estimatedYearlyIncomeAfterTaxGbp).toEqual(band(24_514));
    // Retirement after State Pension age: no "before" figure; "from" is the first year.
    expect(result.estimatedYearlyIncomeBeforeStatePensionAgeAfterTaxGbp).toBeNull();
    expect(result.estimatedYearlyIncomeFromStatePensionAgeAfterTaxGbp).toEqual(band(24_514));
    // The State Pension carries its own 486; nothing comes from pensions.
    expect(result.incomeAfterTaxBySource).toEqual({
      age: 68,
      statePensionGbp: 14_514,
      pensionsGbp: band(0),
      otherPotsGbp: band(10_000),
    });
  });

  it("splits the tax between the State Pension and pensions when both bear tax", () => {
    // Pension 200,000 / 10 = 20,000 (15,000 taxable), State Pension 15,000 from the start (66).
    // Total 30,000 taxable: (30,000 - 12,570) x 20% = 3,486. State Pension alone: 486.
    // Pensions: 20,000 - (3,486 - 486) = 17,000.
    const result = plan({
      currentAge: 66,
      retirementAge: 66,
      planToAge: 76,
      accounts: [{ type: "Pension", balanceGbp: 200_000 }],
      statePension: { statePensionAge: 66, annualForecastGbp: 15_000 },
    });
    expect(result.incomeAfterTaxBySource.statePensionGbp).toBe(14_514);
    expect(result.incomeAfterTaxBySource.pensionsGbp).toEqual(band(17_000));
  });

  it("a State Pension that starts after the plan still gets a from-State-Pension-age figure", () => {
    // Plan 60 to 65, State Pension from 67: pension 100,000 / 5 = 20,000 (15,000 taxable).
    // From 67: 15,000 + 12,547.60 = 27,547.60; tax 2,995.52; 32,547.60 - 2,995.52 = 29,552.08.
    const result = plan({
      planToAge: 65,
      accounts: [{ type: "Pension", balanceGbp: 100_000 }],
      statePension: { statePensionAge: 67, annualForecastGbp: 12_547.6 },
    });
    expect(result.yearlySchedule).toHaveLength(5);
    expect(result.estimatedYearlyIncomeFromStatePensionAgeAfterTaxGbp).toEqual(band(29_552.08));
    expect(result.incomeAfterTaxBySource.age).toBe(67);
  });

  it("a State Pension after the plan is taxed with the allowance left at the plan's end", () => {
    // Pension 800,000 from 60 to 64: 200,000 a year, 50,000 tax-free each year, 200,000 used,
    // 68,275 left. State Pension 12,547.60 from 67, after the plan. No withdrawals are assumed
    // at 64 to 66, so 67 still gets 50,000 tax-free: 150,000 + 12,547.60 = 162,547.60 taxed,
    // no allowance (above 125,140): 7,540 + 87,440 x 40% (34,976) + 37,407.60 x 45%
    // (16,833.42) = 59,349.42. Before tax 212,547.60; after tax 153,198.18.
    const result = plan({
      planToAge: 64,
      accounts: [{ type: "Pension", balanceGbp: 800_000 }],
      statePension: { statePensionAge: 67, annualForecastGbp: 12_547.6 },
    });
    expect(result.estimatedYearlyIncomeFromStatePensionAgeGbp).toEqual(band(212_547.6));
    expect(result.estimatedYearlyIncomeFromStatePensionAgeAfterTaxGbp).toEqual(band(153_198.18));
    // The by-source split for that year uses the same tax, the allowance left untouched:
    // the State Pension alone is under the allowance, so pensions carry all 59,349.42:
    // 200,000 - 59,349.42 = 140,650.58.
    expect(result.incomeAfterTaxBySource?.pensionsGbp).toEqual(band(140_650.58));
  });

  it("refuses income tax for a Scottish taxpayer in a year with no Scottish rates", () => {
    // 2027/28 is provisional and has no Scottish table: before-tax figures stand, tax is null.
    const result = plan({
      accounts: [{ type: "Pension", balanceGbp: 200_000 }],
      statePension: { statePensionAge: 67, annualForecastGbp: 12_547.6 },
      target: 20_000,
      tax: { taxYear: "2027/28", region: "SCOTLAND" },
    });
    expect(result.tax.refusal).toEqual({
      kind: "scottish-rates-not-published",
      taxYear: "2027/28",
      notice:
        "Scottish Income Tax rates for 2027/28 are not published yet, so there is no estimate for this year.",
    });
    // 200,000 / 10 = 20,000 before tax; from 67, 32,547.60.
    expect(result.estimatedYearlyIncomeGbp).toEqual(band(20_000));
    expect(result.estimatedYearlyIncomeFromStatePensionAgeGbp).toEqual(band(32_547.6));
    expect(result.differenceYearly).toEqual(band(0));
    expect(result.estimatedYearlyIncomeAfterTaxGbp).toBeNull();
    expect(result.estimatedYearlyIncomeBeforeStatePensionAgeAfterTaxGbp).toBeNull();
    expect(result.estimatedYearlyIncomeFromStatePensionAgeAfterTaxGbp).toBeNull();
    expect(result.estimatedIncomeTaxYearlyGbp).toBeNull();
    expect(result.incomeAfterTaxBySource).toBeNull();
    expect(result.differenceYearlyAfterTax).toBeNull();
    expect(result.summary.estimatedMiddleYearlyAfterTaxGbp).toBeNull();
    const first = result.yearlySchedule[0];
    expect(first?.grossYearlyIncome).toEqual(band(20_000));
    expect(first?.incomeTaxYearly).toBeNull();
    expect(first?.taxFreePensionYearly).toBeNull();
    expect(first?.taxableIncomeYearly).toBeNull();
    expect(first?.yearlyIncomeAfterTax).toBeNull();
    expect(first?.yearlyIncomeAfterTaxAndHousing).toBeNull();
  });

  it("does not refuse England, Wales and NI in the same provisional year", () => {
    // 2027/28 England, Wales and NI bands exist: 15,000 taxed, (15,000 - 12,570) x 20% = 486.
    const result = plan({
      accounts: [{ type: "Pension", balanceGbp: 200_000 }],
      tax: { taxYear: "2027/28", region: "ENGLAND_NI_WALES" },
    });
    expect(result.tax.refusal).toBeNull();
    expect(result.estimatedIncomeTaxYearlyGbp).toEqual(band(486));
  });

  it("uses Scottish bands for a Scottish taxpayer", () => {
    // Pension 400,000 / 10 = 40,000: 30,000 taxable, 17,430 above the allowance.
    // Starter 3,967 x 19% = 753.73; basic 12,989 x 20% = 2,597.80; intermediate
    // (17,430 - 16,956) 474 x 21% = 99.54; total 3,451.07.
    const result = plan({
      accounts: [{ type: "Pension", balanceGbp: 400_000 }],
      tax: { taxYear: "2026/27", region: "SCOTLAND" },
    });
    expect(result.tax.region).toBe("SCOTLAND");
    expect(result.tax.regionAssumed).toBe(false);
    expect(result.estimatedIncomeTaxYearlyGbp).toEqual(band(3_451.07));
  });

  it("defaults to UFPLS and an assumed England, Wales and NI region with no tax input", () => {
    // Pension 100,000 / 10 = 10,000: 7,500 taxable, under the allowance, so no tax.
    const result = calculateRetirementPlan({
      currentAge: 60,
      retirementAge: 60,
      planToAge: 70,
      accounts: [{ type: "Pension", balanceGbp: 100_000 }],
      assumptions: flat,
    });
    expect(result.tax.withdrawalMethod).toBe("ufpls");
    expect(result.tax.region).toBe("ENGLAND_NI_WALES");
    expect(result.tax.regionAssumed).toBe(true);
    expect(result.yearlySchedule[0]?.taxFreePensionYearly).toEqual(band(2_500));
    expect(result.estimatedIncomeTaxYearlyGbp).toEqual(band(0));
  });

  it("refuses a tax year with no lump sum allowance", () => {
    expect(() =>
      plan({
        accounts: [{ type: "Pension", balanceGbp: 100_000 }],
        tax: { taxYear: "2023/24" },
      }),
    ).toThrow(new RangeError("The 2023/24 tax year has no lump sum allowance."));
  });

  it("subtracts housing after tax", () => {
    // Renting 1,000 a month = 12,000 a year for life; 19,514 - 12,000 = 7,514 (case above).
    const result = plan({
      accounts: [{ type: "Pension", balanceGbp: 200_000 }],
      housing: { housingStatus: "renting", monthlyHousingCostGbp: 1_000 },
    });
    expect(result.yearlySchedule[0]?.yearlyIncomeAfterTaxAndHousing).toEqual(band(7_514));
  });
});
