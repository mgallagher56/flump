import { describe, expect, it } from "vitest";
import { UK_NATIONAL_INSURANCE } from "./tax-rules.js";
import { calculateIncomeTaxOnTaxable, getUkTaxYearRules } from "./uk-tax-year.js";

/**
 * Published table checks for parts of tax-rules.ts that callers read but no figure test pinned.
 *
 * Scottish band names are read: calculateIncomeTaxOnTaxable copies each band's name into its
 * result (the MCP getTaxYearPosition tool sends it to the model), and uk-tax-thresholds.ts puts it
 * on each "scottishBand" threshold.
 */
describe("Scottish income tax band names per year", () => {
  // Source: GOV.UK "Income Tax rates and Personal Allowances" (Scottish taxpayers table) and
  // gov.scot "Scottish Income Tax" for each year. Five bands (starter, basic, intermediate, higher,
  // top) up to 2023/24; the advanced rate (45%) is added from 2024/25.
  const FIVE = ["Starter", "Basic", "Intermediate", "Higher", "Top"];
  const SIX = ["Starter", "Basic", "Intermediate", "Higher", "Advanced", "Top"];
  const expected: Record<string, string[]> = {
    "2020/21": FIVE,
    "2021/22": FIVE,
    "2022/23": FIVE,
    "2023/24": FIVE,
    "2024/25": SIX,
    "2025/26": SIX,
    "2026/27": SIX,
  };

  for (const [year, names] of Object.entries(expected)) {
    it(`names the ${names.length} Scottish bands in order for ${year}`, () => {
      const rules = getUkTaxYearRules(year);
      expect(rules.scotland.bands.map((b) => b.name)).toEqual(names);
      // The engine's band breakdown carries the same names, in the same order.
      const result = calculateIncomeTaxOnTaxable(200000, rules, "SCOTLAND");
      expect(result.bands.map((b) => b.name)).toEqual(names);
    });
  }
});

describe("Class 2 National Insurance per year", () => {
  // Source: GOV.UK "Rates and allowances: National Insurance contributions", Class 2 table for each
  // year. Compulsory Class 2 for the self-employed ended from 6 April 2024 (2024/25), so the engine
  // marks it abolished from that year with no weekly rate.
  it("holds the published Class 2 weekly rate and small profits threshold up to 2023/24", () => {
    // 2020/21: 3.05 a week, small profits threshold 6,475
    expect(UK_NATIONAL_INSURANCE["2020/21"]?.class2).toEqual({
      abolished: false,
      weeklyRate: 3.05,
      smallProfitsThreshold: 6475,
    });
    // 2021/22: 3.05 a week, small profits threshold 6,515
    expect(UK_NATIONAL_INSURANCE["2021/22"]?.class2).toEqual({
      abolished: false,
      weeklyRate: 3.05,
      smallProfitsThreshold: 6515,
    });
    // 2022/23: 3.15 a week, small profits threshold 6,725
    expect(UK_NATIONAL_INSURANCE["2022/23"]?.class2).toEqual({
      abolished: false,
      weeklyRate: 3.15,
      smallProfitsThreshold: 6725,
    });
    // 2023/24: 3.45 a week, small profits threshold 6,725
    expect(UK_NATIONAL_INSURANCE["2023/24"]?.class2).toEqual({
      abolished: false,
      weeklyRate: 3.45,
      smallProfitsThreshold: 6725,
    });
  });

  it("marks compulsory Class 2 as ended from 2024/25", () => {
    for (const year of ["2024/25", "2025/26", "2026/27"]) {
      expect(UK_NATIONAL_INSURANCE[year]?.class2, year).toEqual({
        abolished: true,
        weeklyRate: 0,
        smallProfitsThreshold: 0,
      });
    }
  });
});
