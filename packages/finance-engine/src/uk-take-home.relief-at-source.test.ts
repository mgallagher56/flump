/**
 * How a relief-at-source pension contribution is read (owner decisions, 19 November 2026).
 *
 * - A percentage is the total going into the pension, including tax relief (owner: "Yes,
 *   including relief"). 5% of £30,000 is £1,500 in the pension: the member pays £1,200 from
 *   take-home and the scheme claims £300 of basic-rate relief.
 * - A £ amount is what the member pays from take-home; relief is added on top (owner: "Yes, what
 *   you pay"). £3,000 paid is £3,750 in the pension.
 *
 * Either way the gross contribution extends the basic rate band and lowers adjusted net income
 * (ITA 2007 s.414 by analogy with Gift Aid; the engine's existing treatment). Basic-rate relief is
 * 20%, so net = gross x 0.8 and gross = net x 1.25 (FA 2004 s.192).
 *
 * Rates, GOV.UK "Income Tax rates and Personal Allowances" and "Rates and thresholds for employers",
 * 2025/26: Personal Allowance £12,570; basic rate 20% on the first £37,700 of taxable income,
 * higher rate 40%; employee Class 1 NI 8% from £12,570 to £50,270 and 2% above. Scottish rates
 * 2025/26 (GOV.UK "Scottish Income Tax 2025 to 2026"), on taxable income: starter 19% to £2,827,
 * basic 20% to £14,921, intermediate 21% to £31,092, higher 42% to £62,430.
 */
import { describe, expect, it } from "vitest";
import { computeUkTakeHome } from "./uk-take-home.js";
import { calculateUkTax } from "./uk-tax.js";
import { whatIfSacrificeChange } from "./uk-what-if.js";

const england = { taxYear: "2025/26", region: "ENGLAND_NI_WALES" as const };

describe("relief at source given as a percentage: the total including relief", () => {
  it("puts 5% of £30,000 in the pension, of which the member pays 80% from take-home", () => {
    // Gross 5% x 30,000 = 1,500; net paid 1,500 x 0.8 = 1,200.
    // Income tax is on the full pay: (30,000 - 12,570) x 20% = 3,486 (the band extension does not
    // matter below the higher rate). NI (30,000 - 12,570) x 8% = 1,394.40.
    // Take-home 30,000 - 3,486 - 1,394.40 - 1,200 = 23,919.60.
    const b = computeUkTakeHome({
      ...england,
      salary: 30_000,
      pension: { method: "relief-at-source", pct: 5 },
    });
    expect(b.pensionGross).toBe(1_500);
    expect(b.pensionEmployee).toBe(1_200);
    expect(b.incomeTax).toBe(3_486);
    expect(b.takeHome).toBeCloseTo(23_919.6, 2); // toBeCloseTo: pence in floating point
  });

  it("extends the basic rate band by the gross percentage for a higher-rate taxpayer", () => {
    // £60,000, 5%: gross 3,000, net 2,400, band extension 3,000.
    // Taxable 60,000 - 12,570 = 47,430. Basic band 37,700 + 3,000 = 40,700 x 20% = 8,140;
    // 47,430 - 40,700 = 6,730 x 40% = 2,692. Income tax 10,832.
    // NI 37,700 x 8% = 3,016 + (60,000 - 50,270) x 2% = 194.60, total 3,210.60.
    // Take-home 60,000 - 10,832 - 3,210.60 - 2,400 = 43,557.40.
    const b = computeUkTakeHome({
      ...england,
      salary: 60_000,
      pension: { method: "relief-at-source", pct: 5 },
    });
    expect(b.pensionGross).toBe(3_000);
    expect(b.pensionEmployee).toBe(2_400);
    expect(b.bandExtension).toBe(3_000);
    expect(b.incomeTax).toBe(10_832);
    expect(b.takeHome).toBeCloseTo(43_557.4, 2);
  });

  it("extends the Scottish bands above the starter band by the gross percentage", () => {
    // Scotland, £60,000, 5%: gross 3,000, extension 3,000. Taxable 47,430.
    // Starter 2,827 x 19% = 537.13.
    // Basic 2,827 to 14,921 + 3,000 = 17,921: 15,094 x 20% = 3,018.80.
    // Intermediate 17,921 to 31,092 + 3,000 = 34,092: 16,171 x 21% = 3,395.91.
    // Higher 34,092 to 47,430: 13,338 x 42% = 5,601.96.
    // Income tax 537.13 + 3,018.80 + 3,395.91 + 5,601.96 = 12,553.80.
    const b = computeUkTakeHome({
      taxYear: "2025/26",
      region: "SCOTLAND",
      salary: 60_000,
      pension: { method: "relief-at-source", pct: 5 },
    });
    expect(b.bandExtension).toBe(3_000);
    expect(b.incomeTax).toBeCloseTo(12_553.8, 2);
  });

  it("counts the gross percentage towards the pension annual allowance", () => {
    // £60,000, 5% relief at source, no employer contribution: 3,000 goes in, so 3,000 is used.
    const r = calculateUkTax({
      taxYear: "2025/26",
      region: "ENGLAND_NI_WALES",
      grossSalary: 60_000,
      pensionContributionPct: 5,
      pensionMethod: "relief-at-source",
    });
    expect(r.allowances.pensionAllowanceUsedGbp).toBe(3_000);
    expect(r.employeePensionDeductionGbp).toBe(2_400);
  });
});

describe("relief at source given as a £ amount: what the member pays", () => {
  it("adds 25% relief on top of the amount paid, as before", () => {
    // £60,000, £3,000 paid: gross 3,000 x 1.25 = 3,750, band extension 3,750.
    // Basic band 37,700 + 3,750 = 41,450 x 20% = 8,290; 47,430 - 41,450 = 5,980 x 40% = 2,392.
    // Income tax 10,682. Take-home 60,000 - 10,682 - 3,210.60 - 3,000 = 43,107.40.
    const b = computeUkTakeHome({
      ...england,
      salary: 60_000,
      pension: { method: "relief-at-source", amount: 3_000 },
    });
    expect(b.pensionGross).toBe(3_750);
    expect(b.pensionEmployee).toBe(3_000);
    expect(b.incomeTax).toBe(10_682);
    expect(b.takeHome).toBeCloseTo(43_107.4, 2);
  });
});

describe("what-if on a relief-at-source percentage", () => {
  it("starts from the net 80% and treats the change as an extra amount paid", () => {
    // Before: £60,000 at 5% as above, take-home 43,557.40, net 2,400.
    // Pay £1,000 more from take-home: net 3,400, gross 3,400 x 1.25 = 4,250.
    // Basic band 37,700 + 4,250 = 41,950 x 20% = 8,390; 47,430 - 41,950 = 5,480 x 40% = 2,192.
    // Income tax 10,582. Take-home 60,000 - 10,582 - 3,210.60 - 3,400 = 42,807.40.
    const r = whatIfSacrificeChange(
      { ...england, salary: 60_000, pension: { method: "relief-at-source", pct: 5 } },
      1_000,
    );
    expect(r.before.takeHome).toBeCloseTo(43_557.4, 2);
    expect(r.after.pensionEmployee).toBe(3_400);
    expect(r.after.pensionGross).toBe(4_250);
    expect(r.after.takeHome).toBeCloseTo(42_807.4, 2);
  });
});
