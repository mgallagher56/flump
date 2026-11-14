import { afterEach, describe, expect, it, vi } from "vitest";
import {
  calculateUKTax,
  getMonthsForTaxYear,
  getRecordValueForMonth,
  getTaxYearForDate,
  type TaxRecord,
} from "./tax-calculator.js";
import { getCurrentUKTaxYear, UK_NATIONAL_INSURANCE } from "./tax-rules.js";
import { UK_TAX_VECTORS } from "./test-vectors/uk-tax.vectors.js";
import { SUPPORTED_UK_TAX_YEARS } from "./types.js";
import {
  calculateClass4Ni,
  calculateEmployeeNi,
  calculateEmployerNiSaving,
  calculateIncomeTaxOnTaxable,
  calculatePersonalAllowanceForYear,
  calculateStudentLoanRepayment,
  getCurrentUkTaxYear,
  getUkTaxYearForDate,
  getUkTaxYearRules,
  resolveUkTaxYear,
  roundPence,
  toMoney,
  type UkStudentLoanPlanKey,
  UnsupportedUkTaxYearError,
} from "./uk-tax-year.js";

afterEach(() => {
  vi.useRealTimers();
});

describe("getUkTaxYearForDate (6 April boundary, string based)", () => {
  it("2026-04-05 gives 2025/26 and 2026-04-06 gives 2026/27", () => {
    expect(getUkTaxYearForDate("2026-04-05")).toBe("2025/26");
    expect(getUkTaxYearForDate("2026-04-06")).toBe("2026/27");
  });

  it("handles year ends, 1 April and timestamps without using local time", () => {
    expect(getUkTaxYearForDate("2026-04-01")).toBe("2025/26");
    expect(getUkTaxYearForDate("2026-01-01")).toBe("2025/26");
    expect(getUkTaxYearForDate("2026-12-31")).toBe("2026/27");
    expect(getUkTaxYearForDate("2021-04-05T23:59:59")).toBe("2020/21");
    expect(getUkTaxYearForDate("2099-06-01")).toBe("2099/00");
  });

  it("rejects malformed or impossible dates", () => {
    expect(() => getUkTaxYearForDate("not a date")).toThrow(RangeError);
    expect(() => getUkTaxYearForDate("2026-13-01")).toThrow(RangeError);
    expect(() => getUkTaxYearForDate("2026-02-30")).toThrow(RangeError);
  });

  it("legacy getTaxYearForDate delegates to the same boundary and keeps its signature", () => {
    expect(getTaxYearForDate("2026-04-05")).toBe("2025/26");
    expect(getTaxYearForDate("2026-04-06")).toBe("2026/27");
  });
});

describe("month bucketing versus the 6 April date boundary (documented granularity)", () => {
  const rec = (date: string): TaxRecord => ({
    id: "r",
    userId: "u",
    name: "n",
    source: "employment",
    type: "income",
    category: "salary",
    amount: 100,
    frequency: "one-off",
    date,
    endDate: null,
    notes: null,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  });

  it("getMonthsForTaxYear treats the whole of April as the first month of the year", () => {
    const months = getMonthsForTaxYear("2024/25");
    expect(months[0]).toBe("2024-04");
    expect(months[11]).toBe("2025-03");
    expect(months).toHaveLength(12);
  });

  it("a record dated 1-5 April is bucketed into March, the last month of the year it is filed under", () => {
    expect(getTaxYearForDate("2024-04-05")).toBe("2023/24");
    expect(getTaxYearForDate("2024-04-06")).toBe("2024/25");
    // BE-08 M1: 1-5 April belongs to the earlier year, so it lands in that year's last bucket.
    expect(getRecordValueForMonth(rec("2024-04-05"), "2024-03")).toBe(100);
    expect(getRecordValueForMonth(rec("2024-04-05"), "2024-04")).toBe(0);
    expect(getRecordValueForMonth(rec("2024-04-06"), "2024-04")).toBe(100);
    expect(getMonthsForTaxYear("2023/24")).toContain("2024-03");
  });
});

describe("resolveUkTaxYear / UnsupportedUkTaxYearError", () => {
  it("throws UnsupportedUkTaxYearError for 2027/28 and 1999/00", () => {
    expect(() => resolveUkTaxYear("2027/28")).toThrow(UnsupportedUkTaxYearError);
    expect(() => resolveUkTaxYear("1999/00")).toThrow(UnsupportedUkTaxYearError);
    expect(() => resolveUkTaxYear("2019/20")).toThrow(UnsupportedUkTaxYearError);
    try {
      resolveUkTaxYear("2027/28");
    } catch (e) {
      expect(e).toBeInstanceOf(Error);
      expect((e as UnsupportedUkTaxYearError).year).toBe("2027/28");
    }
  });

  it("returns supported years unchanged and resolves undefined to the current year", () => {
    for (const y of SUPPORTED_UK_TAX_YEARS) expect(resolveUkTaxYear(y)).toBe(y);
    expect(resolveUkTaxYear(undefined, new Date("2025-07-01T12:00:00Z"))).toBe("2025/26");
  });

  it("supports exactly 2020/21 to 2026/27", () => {
    expect([...SUPPORTED_UK_TAX_YEARS]).toEqual([
      "2020/21",
      "2021/22",
      "2022/23",
      "2023/24",
      "2024/25",
      "2025/26",
      "2026/27",
    ]);
  });

  it("getUkTaxYearRules throws for an unsupported year", () => {
    expect(() => getUkTaxYearRules("2027/28" as never)).toThrow(UnsupportedUkTaxYearError);
  });
});

describe("getCurrentUkTaxYear", () => {
  it("at 5 and 6 April of each supported year resolves to a supported year with every table present", () => {
    vi.useFakeTimers();
    for (const year of SUPPORTED_UK_TAX_YEARS) {
      const start = Number.parseInt(year.slice(0, 4), 10);
      const startYear = `${start}/${String(start + 1).slice(-2)}`;
      // Midday UTC keeps the UK calendar date equal to the UTC date in both GMT and BST.
      vi.setSystemTime(new Date(`${start}-04-06T12:00:00Z`));
      expect(getCurrentUkTaxYear()).toBe(startYear);
      expect(getCurrentUKTaxYear()).toBe(startYear);
      expect(getUkTaxYearRules(getCurrentUkTaxYear()).year).toBe(startYear);

      vi.setSystemTime(new Date(`${start + 1}-04-05T12:00:00Z`));
      if (start + 1 <= 2026) {
        expect(getCurrentUkTaxYear()).toBe(startYear);
        expect(getUkTaxYearRules(getCurrentUkTaxYear()).year).toBe(startYear);
      }
      expect(getCurrentUKTaxYear()).toBe(startYear);
    }
  });

  it("uses the UK calendar date, not the server's UTC date", () => {
    // 2026-04-05T23:30:00Z is 00:30 on 6 April in BST (UTC+1).
    expect(getCurrentUkTaxYear(new Date("2026-04-05T23:30:00Z"))).toBe("2026/27");
    expect(getCurrentUkTaxYear(new Date("2026-04-05T22:30:00Z"))).toBe("2025/26");
  });

  it("throws rather than silently falling back when the current year is unsupported", () => {
    expect(() => getCurrentUkTaxYear(new Date("2027-04-06T12:00:00Z"))).toThrow(
      UnsupportedUkTaxYearError,
    );
    expect(() => getCurrentUkTaxYear(new Date("2019-06-01T12:00:00Z"))).toThrow(
      UnsupportedUkTaxYearError,
    );
  });
});

describe("getUkTaxYearRules", () => {
  it("every supported year has ewni, scotland, ni, employerNi, studentLoans, savings and dividends tables", () => {
    for (const year of SUPPORTED_UK_TAX_YEARS) {
      const r = getUkTaxYearRules(year);
      expect(r.year).toBe(year);
      expect(r.ewni.personalAllowance, year).toBeGreaterThan(0);
      expect(r.scotland.bands.length, year).toBeGreaterThan(0);
      expect(r.ni.class1.primaryThreshold, year).toBeGreaterThan(0);
      expect(r.employerNi.rate, year).toBeGreaterThan(0);
      expect(r.studentLoans.plans.plan1.threshold, year).toBeGreaterThan(0);
      expect(r.studentLoans.plans.plan2.threshold, year).toBeGreaterThan(0);
      expect(r.studentLoans.plans.postgrad.threshold, year).toBeGreaterThan(0);
      expect(r.savings.psaBasic, year).toBe(1000);
      expect(r.savings.psaHigher, year).toBe(500);
      expect(r.savings.psaAdditional, year).toBe(0);
      expect(r.dividends.allowance, year).toBeGreaterThan(0);
      expect(r.dividends.additionalRate, year).toBeGreaterThan(0);
      expect(r.giftAidGrossUp).toBe(1.25);
      expect(r.sources.length, year).toBeGreaterThan(0);
      for (const s of r.sources)
        expect(s, year).toMatch(/^https:\/\/www\.(gov\.uk|legislation\.gov\.uk)\//);
    }
  });

  it("dividend table: 2023/24 to 2026/27 match GOV.UK (tax-on-dividends)", () => {
    const d = (y: (typeof SUPPORTED_UK_TAX_YEARS)[number]) => getUkTaxYearRules(y).dividends;
    expect(d("2023/24")).toMatchObject({ allowance: 1000, basicRate: 0.0875, higherRate: 0.3375 });
    expect(d("2024/25")).toMatchObject({ allowance: 500, basicRate: 0.0875, higherRate: 0.3375 });
    expect(d("2025/26")).toMatchObject({ allowance: 500, basicRate: 0.0875, higherRate: 0.3375 });
    expect(d("2026/27")).toMatchObject({ allowance: 500, basicRate: 0.1075, higherRate: 0.3575 });
    for (const y of ["2023/24", "2024/25", "2025/26", "2026/27"] as const) {
      expect(d(y).additionalRate).toBe(0.3935);
    }
  });

  it("dividend table: 2020/21 to 2022/23 match ITA 2007 s.8 and s.13A point-in-time versions", () => {
    const d = (y: (typeof SUPPORTED_UK_TAX_YEARS)[number]) => getUkTaxYearRules(y).dividends;
    expect(d("2020/21")).toEqual({
      allowance: 2000,
      basicRate: 0.075,
      higherRate: 0.325,
      additionalRate: 0.381,
    });
    expect(d("2021/22")).toEqual({
      allowance: 2000,
      basicRate: 0.075,
      higherRate: 0.325,
      additionalRate: 0.381,
    });
    expect(d("2022/23")).toEqual({
      allowance: 2000,
      basicRate: 0.0875,
      higherRate: 0.3375,
      additionalRate: 0.3935,
    });
  });

  it("flags years with unverified figures instead of claiming they are verified", () => {
    for (const year of SUPPORTED_UK_TAX_YEARS) {
      const r = getUkTaxYearRules(year);
      expect(r.verified, year).toBe(r.unverified.length === 0);
      // PSA is only verified as current guidance, never per year, before 2026/27.
      if (year !== "2026/27") expect(r.verified, year).toBe(false);
      for (const note of r.unverified) expect(note, year).toMatch(/^UNVERIFIED: /);
    }
    // Pre-2023 dividends are verified from ITA 2007 s.8 / s.13A, so no dividend note remains.
    for (const year of ["2020/21", "2021/22", "2022/23"] as const) {
      expect(getUkTaxYearRules(year).unverified.join("\n"), year).not.toMatch(/dividend/i);
    }
  });

  it("adds student loan tables for 2020/21 to 2022/23 from GOV.UK employer pages", () => {
    const p = (y: (typeof SUPPORTED_UK_TAX_YEARS)[number]) =>
      getUkTaxYearRules(y).studentLoans.plans;
    expect(p("2020/21").plan1.threshold).toBe(19390);
    expect(p("2020/21").plan2.threshold).toBe(26575);
    expect(p("2020/21").postgrad.threshold).toBe(21000);
    expect(p("2021/22").plan1.threshold).toBe(19895);
    expect(p("2021/22").plan2.threshold).toBe(27295);
    expect(p("2021/22").plan4?.threshold).toBe(25000);
    expect(p("2022/23").plan1.threshold).toBe(20195);
    expect(p("2022/23").plan2.threshold).toBe(27295);
    expect(p("2022/23").plan4?.threshold).toBe(25375);
    // Not on the page / did not exist: absent, never invented.
    expect(p("2020/21").plan4).toBeUndefined();
    expect(p("2020/21").plan5).toBeUndefined();
    expect(p("2022/23").plan5).toBeUndefined();
  });
});

describe("roundPence / toMoney", () => {
  it("roundPence(0.1+0.2) === 0.3", () => {
    expect(roundPence(0.1 + 0.2)).toBe(0.3);
    expect(roundPence(1.005)).toBe(1.01);
    expect(roundPence(-2.345)).toBe(-2.34);
  });

  it('toMoney("1500.50") === 1500.5 and toMoney(null) === 0', () => {
    expect(toMoney("1500.50")).toBe(1500.5);
    expect(toMoney(null)).toBe(0);
    expect(toMoney(12.5)).toBe(12.5);
    expect(toMoney("")).toBe(0);
    expect(toMoney("abc")).toBe(0);
    expect(toMoney(Number.NaN)).toBe(0);
  });
});

describe("calculatePersonalAllowanceForYear", () => {
  const r = getUkTaxYearRules("2025/26");
  it("is the full allowance at or below 100,000", () => {
    expect(calculatePersonalAllowanceForYear(60000, r)).toBe(12570);
    expect(calculatePersonalAllowanceForYear(100000, r)).toBe(12570);
  });
  it("tapers GBP1 per GBP2 above 100,000 and floors the taper", () => {
    // 105,000: excess 5,000, taper 2,500, 12,570 - 2,500 = 10,070
    expect(calculatePersonalAllowanceForYear(105000, r)).toBe(10070);
    // 100,001: excess 1, floor(0.5) = 0, allowance unchanged
    expect(calculatePersonalAllowanceForYear(100001, r)).toBe(12570);
    // 125,140: excess 25,140, taper 12,570, allowance 0
    expect(calculatePersonalAllowanceForYear(125140, r)).toBe(0);
    expect(calculatePersonalAllowanceForYear(200000, r)).toBe(0);
  });
  it("uses the 2020/21 allowance of 12,500", () => {
    expect(calculatePersonalAllowanceForYear(50000, getUkTaxYearRules("2020/21"))).toBe(12500);
  });
});

describe("calculateIncomeTaxOnTaxable", () => {
  const r = getUkTaxYearRules("2025/26");

  it("EWNI matches vectors at taxable 87430 / 102430 / 125140 / 150000", () => {
    // Derivation (GOV.UK income-tax-rates, 2025/26): 20% to 37,700; 40% to 125,140; 45% above.
    // 87,430: 37,700*.2 = 7,540 + 49,730*.4 = 19,892 => 27,432
    // 102,430: 7,540 + 64,730*.4 = 25,892 => 33,432
    // 125,140: 7,540 + 87,440*.4 = 34,976 => 42,516
    // 150,000: 42,516 + 24,860*.45 = 11,187 => 53,703
    const tax = (t: number) => calculateIncomeTaxOnTaxable(t, r, "ENGLAND_NI_WALES").total;
    expect(tax(87430)).toBeCloseTo(27432, 2);
    expect(tax(102430)).toBeCloseTo(33432, 2);
    expect(tax(125140)).toBeCloseTo(42516, 2);
    expect(tax(150000)).toBeCloseTo(53703, 2);
  });

  it("returns a per-band breakdown summing to the total", () => {
    for (const region of ["ENGLAND_NI_WALES", "SCOTLAND"] as const) {
      const res = calculateIncomeTaxOnTaxable(150000, r, region);
      expect(res.bands.length).toBeGreaterThan(2);
      const sum = res.bands.reduce((s, b) => s + b.tax, 0);
      expect(res.total).toBeCloseTo(sum, 2);
      const taxed = res.bands.reduce((s, b) => s + b.taxable, 0);
      expect(taxed).toBeCloseTo(150000, 2);
    }
  });

  it("is zero for zero or negative taxable income", () => {
    expect(calculateIncomeTaxOnTaxable(0, r, "ENGLAND_NI_WALES").total).toBe(0);
    expect(calculateIncomeTaxOnTaxable(-5, r, "SCOTLAND").total).toBe(0);
  });

  it("EWNI bandExtension widens basic and higher bands (Gift Aid)", () => {
    // 60,000 taxable-equivalent case from vector ewni.giftAid 2025/26 60000 net 1000:
    // taxable = 60,000 - 12,570 = 47,430; gross gift 1,250 extends the basic band to 38,950.
    // 38,950*.2 = 7,790 + (47,430 - 38,950)*.4 = 3,392 => 11,182
    const res = calculateIncomeTaxOnTaxable(47430, r, "ENGLAND_NI_WALES", { bandExtension: 1250 });
    expect(res.total).toBeCloseTo(11182, 2);
  });

  it("uses the 150,000 additional threshold for 2020/21 to 2022/23", () => {
    // 2021/22: 37,700*.2 = 7,540 + (150,000-37,700)*.4 = 44,920 => 52,460 (vector ewni.incomeTax.2021-22.150000)
    const r21 = getUkTaxYearRules("2021/22");
    expect(calculateIncomeTaxOnTaxable(150000, r21, "ENGLAND_NI_WALES").total).toBeCloseTo(
      52460,
      2,
    );
  });

  it("Scotland walks the per-year bands (2026/27, gross 50,000 => taxable 37,430)", () => {
    // Bands 2026/27 (taxable above PA): 19% to 3,967; 20% to 16,956; 21% to 31,092; 42% to 62,430.
    // 3,967*.19 = 753.73; (16,956-3,967)*.2 = 2,597.80; (31,092-16,956)*.21 = 2,968.56;
    // (37,430-31,092)*.42 = 2,661.96; total 8,982.05 (vector scotland.incomeTax.2026-27.50000)
    const r27 = getUkTaxYearRules("2026/27");
    expect(calculateIncomeTaxOnTaxable(37430, r27, "SCOTLAND").total).toBeCloseTo(8982.05, 2);
  });

  it("Scotland bandExtension widens Basic and every band above it, not Starter (s.414(2)(b))", () => {
    const r27 = getUkTaxYearRules("2026/27");
    // limits 3967 / 16956 / 31092 / 62430 become 3967 / 21956 / 36092 / 67430 with ext 5000.
    // 753.73 + (21956 - 3967)*.2 (3597.8) + (36092 - 21956)*.21 (2968.56)
    //   + (37430 - 36092)*.42 (561.96) = 7882.05
    const res = calculateIncomeTaxOnTaxable(37430, r27, "SCOTLAND", { bandExtension: 5000 });
    expect(res.total).toBeCloseTo(7882.05, 2);
    expect(res.bands[0]?.taxable).toBe(3967);
    expect(res.bands[1]?.taxable).toBe(17989);
    expect(res.bands[2]?.taxable).toBe(14136);
    expect(res.bands[3]?.taxable).toBe(1338);
  });
});

describe("calculateIncomeTaxOnTaxable Scottish band lookup", () => {
  it("keys the extension on the 20% rate, so renaming the Basic band does not silently disable it", () => {
    const r27 = getUkTaxYearRules("2026/27");
    const renamed = {
      ...r27,
      scotland: {
        ...r27.scotland,
        bands: r27.scotland.bands.map((b) => (b.name === "Basic" ? { ...b, name: "Standard" } : b)),
      },
    };
    // Same expected value as the s.414(2)(b) test above (ext 5000 => 7,882.05).
    const res = calculateIncomeTaxOnTaxable(37430, renamed, "SCOTLAND", { bandExtension: 5000 });
    expect(res.total).toBeCloseTo(7882.05, 2);
  });

  it("throws when no Scottish band carries the 20% rate", () => {
    const r27 = getUkTaxYearRules("2026/27");
    const broken = {
      ...r27,
      scotland: {
        ...r27.scotland,
        bands: r27.scotland.bands.map((b) => ({ ...b, rate: b.rate === 0.2 ? 0.25 : b.rate })),
      },
    };
    expect(() => calculateIncomeTaxOnTaxable(37430, broken, "SCOTLAND")).toThrow(/20%/);
  });
});

describe("NI, Class 4, employer NI and student loan calculators", () => {
  const r = getUkTaxYearRules("2025/26");

  it("calculateEmployeeNi matches vector employeeNi 2025/26 60000", () => {
    // (50,270-12,570)*.08 = 3,016 + (60,000-50,270)*.02 = 194.60 => 3,210.60
    expect(calculateEmployeeNi(60000, r)).toBeCloseTo(3210.6, 2);
    expect(calculateEmployeeNi(12570, r)).toBe(0);
    expect(calculateEmployeeNi(0, r)).toBe(0);
  });

  it("calculateClass4Ni uses the class 4 limits and rates", () => {
    // 2025/26: (50,270-12,570)*.06 = 2,262 + (60,000-50,270)*.02 = 194.60 => 2,456.60
    expect(calculateClass4Ni(60000, r)).toBeCloseTo(2456.6, 2);
    expect(calculateClass4Ni(10000, r)).toBe(0);
  });

  it("calculateEmployerNiSaving reads the year's rate and secondary threshold", () => {
    // vector employerNiSaving 2025/26 60000/3000: 3,000*.15 = 450
    expect(calculateEmployerNiSaving(60000, 3000, r)).toBeCloseTo(450, 2);
    // sacrifice above earnings over the secondary threshold is capped: (5,500-5,000)*.15 = 75
    expect(calculateEmployerNiSaving(5500, 3000, r)).toBeCloseTo(75, 2);
    expect(calculateEmployerNiSaving(0, 3000, r)).toBe(0);
  });

  it("calculateStudentLoanRepayment is 9% / 6% above the plan threshold", () => {
    // 2026/27 plan 2 threshold 29,385: (35,000-29,385)*.09 = 505.35 (vector studentLoan.2026-27.plan2.35000)
    const r27 = getUkTaxYearRules("2026/27");
    expect(calculateStudentLoanRepayment(35000, "plan2", r27)).toBeCloseTo(505.35, 2);
    expect(calculateStudentLoanRepayment(20000, "plan2", r27)).toBe(0);
    // postgrad 21,000 at 6%: (35,000-21,000)*.06 = 840
    expect(calculateStudentLoanRepayment(35000, "postgrad", r27)).toBeCloseTo(840, 2);
  });

  it("2025/26 and 2026/27 thresholds match GOV.UK employer pages (T3a)", () => {
    // Sources: https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2025-to-2026
    // and ...-2026-to-2027. 2025/26 previously held the 2026/27 figures.
    const p25 = getUkTaxYearRules("2025/26").studentLoans.plans;
    expect(p25.plan1.threshold).toBe(26065);
    expect(p25.plan2.threshold).toBe(28470);
    expect(p25.plan4?.threshold).toBe(32745);
    expect(p25.postgrad.threshold).toBe(21000);
    const p26 = getUkTaxYearRules("2026/27").studentLoans.plans;
    expect(p26.plan1.threshold).toBe(26900);
    expect(p26.plan2.threshold).toBe(29385);
    expect(p26.plan4?.threshold).toBe(33795);
    expect(p26.plan5?.threshold).toBe(25000);
  });

  it("calculateStudentLoanRepayment matches every VERIFIED studentLoan vector", () => {
    for (const v of UK_TAX_VECTORS) {
      if (v.kind !== "studentLoan" || v.status !== "VERIFIED") continue;
      const input = v.input as { grossIncome: number; plan: UkStudentLoanPlanKey };
      const actual = calculateStudentLoanRepayment(
        input.grossIncome,
        input.plan,
        getUkTaxYearRules(v.taxYear),
      );
      expect(actual, v.id).toBeCloseTo(v.expected, 2);
    }
  });

  it("2025/26 no longer reports the student loan thresholds as unverified", () => {
    expect(getUkTaxYearRules("2025/26").unverified.join("\n")).not.toContain(
      "student loan thresholds",
    );
  });

  it("throws for a plan that has no verified entry for the year", () => {
    expect(() =>
      calculateStudentLoanRepayment(35000, "plan5", getUkTaxYearRules("2022/23")),
    ).toThrow(UnsupportedUkTaxYearError);
  });
});

describe("T3b NI table data: mid-year changes use the documented annual approach", () => {
  it("Class 1 lower earnings limit: 2024/25 6,396, 2025/26 6,500 (125/wk), 2026/27 6,708 (129/wk); Class 2 2023/24 SPT 6,725", () => {
    // GOV.UK employer pages 2024 to 2025 / 2025 to 2026 / 2026 to 2027.
    expect(getUkTaxYearRules("2024/25").ni.class1.lowerEarningsLimit).toBe(6396);
    expect(getUkTaxYearRules("2025/26").ni.class1.lowerEarningsLimit).toBe(6500);
    expect(getUkTaxYearRules("2026/27").ni.class1.lowerEarningsLimit).toBe(6708);
    expect(UK_NATIONAL_INSURANCE["2023/24"].class2.smallProfitsThreshold).toBe(6725);
  });

  it("UK_NATIONAL_INSURANCE 2023/24 class1 mainRate is not 0.08", () => {
    // 2023/24: 12% to 5 Jan 2024, 10% from 6 Jan 2024 (GOV.UK employer page 2023 to 2024).
    // Derived annual blend (9*12 + 3*10)/12 = 11.5%. 8% is the 2024/25 rate.
    const c = getUkTaxYearRules("2023/24").ni.class1;
    expect(c.mainRate).not.toBe(0.08);
    expect(c.mainRate).toBeCloseTo(0.115, 10);
    expect(c.upperRate).toBe(0.02);
  });

  it("2022/23 class1 uses the E2022 annual-method figures (PT 11,908, 12.73% / 2.73%)", () => {
    // https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2022-to-2023 (directors, whole year).
    const c = getUkTaxYearRules("2022/23").ni.class1;
    expect(c.primaryThreshold).toBe(11908);
    expect(c.mainRate).toBeCloseTo(0.1273, 10);
    expect(c.upperRate).toBeCloseTo(0.0273, 10);
    expect(c.upperEarningsLimit).toBe(50270);
  });

  it("blended years are labelled as approximations and never verified", () => {
    for (const y of ["2022/23", "2023/24"] as const) {
      const r = getUkTaxYearRules(y);
      expect(r.verified, y).toBe(false);
      expect(r.unverified.join("\n"), y).toMatch(/approximation/i);
    }
    expect(getUkTaxYearRules("2023/24").unverified.join("\n")).not.toContain("is wrong");
  });

  it("calculateEmployeeNi matches every employeeNi vector for every year", () => {
    let checked = 0;
    for (const v of UK_TAX_VECTORS) {
      if (v.kind !== "employeeNi") continue;
      const input = v.input as { grossEarnings: number };
      const actual = calculateEmployeeNi(input.grossEarnings, getUkTaxYearRules(v.taxYear));
      expect(actual, v.id).toBeCloseTo(v.expected, 2);
      checked++;
    }
    expect(checked).toBe(SUPPORTED_UK_TAX_YEARS.length * 2);
  });

  it("calculateEmployerNiSaving and calculateClass4Ni match their vectors for every year", () => {
    for (const v of UK_TAX_VECTORS) {
      const rules = getUkTaxYearRules(v.taxYear);
      if (v.kind === "employerNiSaving") {
        const i = v.input as { grossSalary: number; salarySacrifice: number };
        expect(
          calculateEmployerNiSaving(i.grossSalary, i.salarySacrifice, rules),
          v.id,
        ).toBeCloseTo(v.expected, 2);
      }
      if (v.kind === "class4") {
        const i = v.input as { profits: number };
        expect(calculateClass4Ni(i.profits, rules), v.id).toBeCloseTo(v.expected, 2);
      }
    }
  });
});

describe("calculateUKTax dividend rates come from the per-year table", () => {
  const dividendRecord: TaxRecord = {
    id: "d1",
    userId: "u",
    type: "income",
    source: "savings",
    category: "dividend_income",
    name: "Dividends",
    amount: 10000,
    frequency: "annual",
    date: "2025-06-01",
    endDate: null,
    notes: null,
    receiptFilename: null,
    receiptMimeType: null,
    receiptData: null,
    createdAt: "",
    updatedAt: "",
  };

  it("2025/26 uses 8.75% and 2026/27 uses 10.75% on basic-band dividends", () => {
    // salary 30,000 -> taxable 17,430; dividends 10,000 - 500 allowance = 9,500, all in the basic band.
    const r25 = calculateUKTax("2025/26", [{ ...dividendRecord, date: "2025-06-01" }], 30000, 100);
    expect(r25.dividendAllowance).toBe(500);
    expect(r25.dividendTaxDue).toBeCloseTo(9500 * 0.0875, 2); // 831.25
    const r26 = calculateUKTax("2026/27", [{ ...dividendRecord, date: "2026-06-01" }], 30000, 100);
    expect(r26.dividendTaxDue).toBeCloseTo(9500 * 0.1075, 2); // 1,021.25
  });

  it("dividend allowance by year: 2023/24 is 1,000", () => {
    const r23 = calculateUKTax("2023/24", [{ ...dividendRecord, date: "2023-06-01" }], 30000, 100);
    expect(r23.dividendAllowance).toBe(1000);
  });
});
