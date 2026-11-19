import { describe, expect, it } from "vitest";
import type { UkTaxYear } from "./types.js";
import {
  calculateEmployerNiSaving,
  calculateIncomeTaxOnTaxable,
  calculatePensionQualifyingEarnings,
  calculateStudentLoanRepayment,
  getUkStatePensionRules,
  getUkTaxYearRules,
  toMoney,
  UnsupportedUkTaxYearError,
} from "./uk-tax-year.js";

function caught(fn: () => unknown): unknown {
  try {
    fn();
  } catch (err) {
    return err;
  }
  throw new Error("expected the call to throw");
}

describe("toMoney", () => {
  it("reads undefined as 0", () => {
    expect(toMoney(undefined)).toBe(0);
  });
});

describe("getUkTaxYearRules for an unsupported year", () => {
  it("throws for the whole year, not for one missing table", () => {
    const err = caught(() => getUkTaxYearRules("2019/20" as UkTaxYear));
    expect(err).toBeInstanceOf(UnsupportedUkTaxYearError);
    expect((err as UnsupportedUkTaxYearError).year).toBe("2019/20");
    expect((err as UnsupportedUkTaxYearError).table).toBeUndefined();
  });
});

describe("getUkStatePensionRules, 2020/21 to 2022/23", () => {
  // Weekly rates from GOV.UK "Benefit and pension rates" for each year (new State Pension and
  // basic State Pension, category A or B). Annual = weekly x 52, as the module documents.
  it("2020/21: full new 175.20 a week (9,110.40 a year), basic 134.25", () => {
    const r = getUkStatePensionRules("2020/21");
    expect(r.fullNewWeekly).toBe(175.2);
    // 175 x 52 = 9,100; 0.20 x 52 = 10.40; total 9,110.40.
    expect(r.fullNewAnnual).toBe(9110.4);
    expect(r.basicWeekly).toBe(134.25);
  });

  it("2021/22: full new 179.60 a week (9,339.20 a year), basic 137.60", () => {
    const r = getUkStatePensionRules("2021/22");
    expect(r.fullNewWeekly).toBe(179.6);
    // 179 x 52 = 9,308; 0.60 x 52 = 31.20; total 9,339.20.
    expect(r.fullNewAnnual).toBe(9339.2);
    expect(r.basicWeekly).toBe(137.6);
  });

  it("2022/23: full new 185.15 a week (9,627.80 a year), basic 141.85", () => {
    const r = getUkStatePensionRules("2022/23");
    expect(r.fullNewWeekly).toBe(185.15);
    // 185 x 52 = 9,620; 0.15 x 52 = 7.80; total 9,627.80.
    expect(r.fullNewAnnual).toBe(9627.8);
    expect(r.basicWeekly).toBe(141.85);
  });

  it("throws a State Pension table error for a year with no rates", () => {
    for (const year of ["2019/20", "2028/29"]) {
      const err = caught(() => getUkStatePensionRules(year));
      expect(err, year).toBeInstanceOf(UnsupportedUkTaxYearError);
      expect((err as UnsupportedUkTaxYearError).table, year).toBe("State Pension");
      expect((err as UnsupportedUkTaxYearError).year, year).toBe(year);
    }
  });
});

describe("calculateIncomeTaxOnTaxable, England, Wales and Northern Ireland with Gift Aid", () => {
  it("raises the additional rate threshold by the band extension too (2025/26)", () => {
    // GOV.UK Income Tax rates and Personal Allowances, 2025/26: basic 20% on the first 37,700
    // of taxable income, higher 40% up to 125,140, additional 45% above. ITA 2007 s.414(2)
    // raises both limits by grossed-up Gift Aid, here 10,000.
    // Basic top 37,700 + 10,000 = 47,700; additional threshold 125,140 + 10,000 = 135,140.
    // Taxable 140,000: basic 47,700 x 20% = 9,540; higher 135,140 - 47,700 = 87,440 x 40% =
    // 34,976; additional 140,000 - 135,140 = 4,860 x 45% = 2,187. Total 46,703.
    const res = calculateIncomeTaxOnTaxable(
      140000,
      getUkTaxYearRules("2025/26"),
      "ENGLAND_NI_WALES",
      {
        bandExtension: 10000,
      },
    );
    expect(res.bands.map((b) => b.taxable)).toEqual([47700, 87440, 4860]);
    expect(res.bands.map((b) => b.tax)).toEqual([9540, 34976, 2187]);
    expect(res.total).toBe(46703);
  });
});

describe("calculateIncomeTaxOnTaxable, Scottish bands with the 20% band first", () => {
  it("still applies the band extension when there is no starter band", () => {
    // A made-up two-band table (not a published year), to check the extension is keyed on the
    // 20% band even when it is the first band: 20% from 0 to 10,000, 40% above.
    // With extension 5,000 the 20% band ends at 15,000 and the 40% band starts there.
    // Taxable 20,000: 15,000 x 20% = 3,000; 5,000 x 40% = 2,000. Total 5,000.
    const base = getUkTaxYearRules("2026/27");
    const rules = {
      ...base,
      scotland: {
        ...base.scotland,
        bands: [
          { name: "Basic", from: 0, to: 10000, rate: 0.2 },
          { name: "Higher", from: 10000, to: null, rate: 0.4 },
        ],
      },
    };
    const res = calculateIncomeTaxOnTaxable(20000, rules, "SCOTLAND", { bandExtension: 5000 });
    expect(res.bands.map((b) => b.taxable)).toEqual([15000, 5000]);
    expect(res.total).toBe(5000);
  });
});

describe("calculatePensionQualifyingEarnings guards", () => {
  it("treats non-finite pay as no pay", () => {
    expect(calculatePensionQualifyingEarnings(Number.POSITIVE_INFINITY)).toBe(0);
    expect(calculatePensionQualifyingEarnings(Number.NaN)).toBe(0);
  });
});

describe("calculateEmployerNiSaving guards", () => {
  it("is never negative when the sacrifice is negative", () => {
    expect(calculateEmployerNiSaving(50000, -1000, getUkTaxYearRules("2025/26"))).toBe(0);
  });
});

describe("calculateStudentLoanRepayment for a plan the year lacks", () => {
  it("names the plan in the error's table", () => {
    // Plan 4 has no entry for 2020/21 in the engine's tables.
    const err = caught(() =>
      calculateStudentLoanRepayment(30000, "plan4", getUkTaxYearRules("2020/21")),
    );
    expect(err).toBeInstanceOf(UnsupportedUkTaxYearError);
    expect((err as UnsupportedUkTaxYearError).table).toBe("student loan plan4");
  });
});
