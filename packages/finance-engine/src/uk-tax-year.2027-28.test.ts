/**
 * 2027/28 year tables (provisional: announced, not yet law).
 *
 * Expected values are typed in by hand from the sources, never read back from the tables:
 * - Finance Act 2026 (Royal Assent 18 March 2026): s.4 dividend rates, s.5 savings rates 22/42/47,
 *   s.7 property rates 22/42/47, s.9 starting rate limit, s.10 Personal Allowance and basic rate limit.
 * - Budget 2026 overview of tax legislation and rates (OOTLAR), updated 5 November 2026: 1.1 and 1.2
 *   (savings and property rates 24/44/49 in Finance Bill 2026-27), 1.3 (main rates), Annex A.
 * - DfE student loan threshold announcement, 12 November 2026.
 * Owner choice (19 November 2026, relayed by the coordinator): "Announced 24/44/49".
 */
import { describe, expect, it } from "vitest";
import {
  UK_CHILD_BENEFIT,
  UK_EMPLOYER_NI_RATES,
  UK_EWNI_INCOME_TAX,
  UK_NATIONAL_INSURANCE,
  UK_SCOTLAND_INCOME_TAX,
  UK_STUDENT_LOANS,
} from "./tax-rules.js";
import { PROVISIONAL_UK_TAX_YEARS, SUPPORTED_UK_TAX_YEARS } from "./types.js";
import {
  ruleAnnouncedNotes,
  UK_PROVISIONAL_RULE_SOURCES,
  UK_RULE_KEYS,
  UK_RULE_SOURCES,
} from "./uk-rule-sources.js";
import {
  calculateIncomeTaxOnTaxable,
  classifyUkTaxYear,
  financeCostCreditRate,
  getUkDividendRules,
  getUkPensionAllowances,
  getUkPropertyRates,
  getUkSavingsRates,
  getUkTaxYearContext,
  getUkTaxYearRules,
  isProvisionalUkTaxYear,
  isSupportedUkTaxYear,
  propertyRatesFor,
  ratesContextForYear,
  requireScottishRules,
  UnsupportedUkTaxYearError,
} from "./uk-tax-year.js";

const Y = "2027/28";

describe("2027/28 is supported and provisional", () => {
  it("is the latest supported year and the only provisional one", () => {
    expect([...PROVISIONAL_UK_TAX_YEARS]).toEqual(["2027/28"]);
    expect(isProvisionalUkTaxYear(Y)).toBe(true);
    expect(isProvisionalUkTaxYear("2026/27")).toBe(false);
    expect(isProvisionalUkTaxYear("2028/29")).toBe(false);
    expect(isSupportedUkTaxYear(Y)).toBe(true);
    expect(SUPPORTED_UK_TAX_YEARS.at(-1)).toBe(Y);
  });

  it("its rules say provisional and list the announced figure groups", () => {
    const r = getUkTaxYearRules(Y);
    expect(r.provisional).toBe(true);
    expect(r.verified).toBe(false);
    expect(r.announced).toEqual(ruleAnnouncedNotes(Y));
    expect(r.announced.length).toBeGreaterThan(0);
    expect(r.scotland).toBeNull();
    const before = getUkTaxYearRules("2026/27");
    expect(before.provisional).toBe(false);
    expect(before.announced).toEqual([]);
  });

  it("today's context says provisional during 2027/28, and 2028/29 falls back to it", () => {
    expect(getUkTaxYearContext(new Date("2026-11-20T12:00:00Z"))).toEqual({
      calendarYear: "2026/27",
      ratesYear: "2026/27",
      isFallback: false,
    });
    expect(getUkTaxYearContext(new Date("2027-04-06T12:00:00Z"))).toEqual({
      calendarYear: "2027/28",
      ratesYear: "2027/28",
      isFallback: false,
      kind: "provisional",
    });
    expect(getUkTaxYearContext(new Date("2028-06-01T12:00:00Z"))).toEqual({
      calendarYear: "2028/29",
      ratesYear: "2027/28",
      isFallback: true,
      reason: "after-latest-supported",
    });
    expect(classifyUkTaxYear("2028/29")).toEqual({ kind: "fallback", ratesYear: "2027/28" });
  });

  it("a page showing 2027/28 says provisional; today's year keeps today's notice; any other year has none", () => {
    const today = getUkTaxYearContext(new Date("2026-11-20T12:00:00Z"));
    expect(ratesContextForYear(Y, today)).toEqual({
      calendarYear: "2027/28",
      ratesYear: "2027/28",
      isFallback: false,
      kind: "provisional",
    });
    // Another year shows its own rates, so no notice: { year, year, not a fallback }.
    expect(ratesContextForYear("2025/26", today)).toEqual({
      calendarYear: "2025/26",
      ratesYear: "2025/26",
      isFallback: false,
    });
    // Today's own year keeps today's context.
    expect(ratesContextForYear("2026/27", today)).toBe(today);
    // Once today is 2027/28 (provisional), viewing 2026/27 shows no provisional notice.
    const in2027 = getUkTaxYearContext(new Date("2027-06-01T12:00:00Z"));
    expect(ratesContextForYear("2026/27", in2027)).toEqual({
      calendarYear: "2026/27",
      ratesYear: "2026/27",
      isFallback: false,
    });
    // In 2028/29 the latest rates year is a fallback: viewing it keeps the fallback notice.
    const in2028 = getUkTaxYearContext(new Date("2028-06-01T12:00:00Z"));
    expect(ratesContextForYear("2027/28", in2028)).toBe(in2028);
  });

  it("the finance-cost credit rate is the property basic rate from 2027/28, 20% before", () => {
    expect(financeCostCreditRate(getUkTaxYearRules(Y))).toBe(0.24);
    expect(financeCostCreditRate(getUkTaxYearRules("2026/27"))).toBe(0.2);
    expect(financeCostCreditRate(getUkTaxYearRules("2020/21"))).toBe(0.2);
  });

  it("refuses Scottish bands for 2027/28 and reads them for 2026/27", () => {
    expect(() => requireScottishRules(getUkTaxYearRules(Y))).toThrow(UnsupportedUkTaxYearError);
    expect(requireScottishRules(getUkTaxYearRules("2026/27")).bands.length).toBe(6);
  });

  it("charges the England, Wales and NI bands at other rates when asked", () => {
    const r = getUkTaxYearRules(Y);
    const property = { basicRate: 0.24, higherRate: 0.44, additionalRate: 0.49 };
    // 37,700 x 24% = 9,048; 87,440 x 44% = 38,473.60; 14,860 x 49% = 7,281.40. Total 54,803.
    expect(
      calculateIncomeTaxOnTaxable(140000, r, "ENGLAND_NI_WALES", { rates: property }).total,
    ).toBe(54803);
    // Main rates: 7,540 + 34,976 + 6,687 = 49,203.
    expect(calculateIncomeTaxOnTaxable(140000, r, "ENGLAND_NI_WALES").total).toBe(49203);
  });
});

describe("2027/28 income tax tables", () => {
  it("England, Wales and NI: allowance and bands frozen, main rates 20/40/45", () => {
    // PA 12,570 and basic rate limit 37,700: FA 2021 s.5 as amended by FA 2026 s.10.
    // Higher-rate threshold 12,570 + 37,700 = 50,270. Additional 125,140 and taper 100,000: Annex A.
    expect(UK_EWNI_INCOME_TAX[Y]).toEqual({
      description: "England, Wales and Northern Ireland, 2027/28",
      personalAllowance: 12570,
      basicRateBandWidth: 37700,
      basicRate: 0.2,
      higherRateThreshold: 50270,
      higherRate: 0.4,
      additionalRateThreshold: 125140,
      additionalRate: 0.45,
      personalAllowanceTaperStart: 100000,
    });
  });

  it("has no Scottish table: the 2027/28 Scottish rates are not published", () => {
    expect(UK_SCOTLAND_INCOME_TAX[Y]).toBeUndefined();
  });

  it("savings rates: 24/44/49 from 2027/28, the main rates before", () => {
    expect(getUkSavingsRates(Y)).toEqual({
      basicRate: 0.24,
      higherRate: 0.44,
      additionalRate: 0.49,
    });
    expect(getUkSavingsRates("2026/27")).toEqual({
      basicRate: 0.2,
      higherRate: 0.4,
      additionalRate: 0.45,
    });
    expect(getUkSavingsRates("2020/21")).toEqual({
      basicRate: 0.2,
      higherRate: 0.4,
      additionalRate: 0.45,
    });
  });

  it("property rates: 24/44/49 from 2027/28; none before (property income took the main rates)", () => {
    expect(getUkPropertyRates(Y)).toEqual({
      basicRate: 0.24,
      higherRate: 0.44,
      additionalRate: 0.49,
    });
    for (const year of SUPPORTED_UK_TAX_YEARS.filter((y) => y !== Y)) {
      expect(getUkPropertyRates(year), year).toBeNull();
    }
  });

  it("dividends: allowance 500 and 10.75/35.75/39.35 carry into 2027/28 (FA 2026 s.4)", () => {
    expect(getUkDividendRules(Y)).toEqual({
      allowance: 500,
      basicRate: 0.1075,
      higherRate: 0.3575,
      additionalRate: 0.3935,
    });
  });

  it("supported years' rules carry the savings and property rate groups", () => {
    const r = getUkTaxYearRules("2026/27");
    expect(r.savingsRates).toEqual({ basicRate: 0.2, higherRate: 0.4, additionalRate: 0.45 });
    expect(r.propertyRates).toBeNull();
  });

  it("unknown years are refused, not substituted", () => {
    expect(() => getUkSavingsRates("2028/29")).toThrow(/2028\/29/);
    expect(() => getUkPropertyRates("2028/29")).toThrow(/2028\/29/);
    expect(() => getUkDividendRules("2028/29")).toThrow(/2028\/29/);
    expect(() => getUkPensionAllowances("2028/29")).toThrow(/2028\/29/);
  });
});

describe("2027/28 National Insurance", () => {
  it("employee and Class 4: thresholds frozen, LEL 133 a week", () => {
    // Annex A: LEL 133/wk, so 133 x 52 = 6,916. PT 242/wk and UEL 967/wk are the frozen
    // 12,570 and 50,270 annual figures. Rates 8% / 2%; Class 4 6% / 2% on 12,570 to 50,270.
    expect(UK_NATIONAL_INSURANCE[Y]).toEqual({
      description: "UK National Insurance, 2027/28",
      class1: {
        lowerEarningsLimit: 6916,
        primaryThreshold: 12570,
        upperEarningsLimit: 50270,
        mainRate: 0.08,
        upperRate: 0.02,
      },
      class4: {
        lowerProfitsLimit: 12570,
        upperProfitsLimit: 50270,
        mainRate: 0.06,
        upperRate: 0.02,
      },
      class2: { abolished: true, weeklyRate: 0, smallProfitsThreshold: 0 },
    });
  });

  it("employer: 15% above the secondary threshold, unchanged", () => {
    expect(UK_EMPLOYER_NI_RATES[Y]).toEqual({ secondaryThreshold: 5000, rate: 0.15 });
  });
});

describe("2027/28 student loans", () => {
  it("Plan 2, Plan 5 and postgraduate from the DfE announcement; Plan 1 and Plan 4 absent", () => {
    const plans = UK_STUDENT_LOANS[Y]?.plans;
    expect(plans?.plan2).toEqual({ name: "Plan 2", threshold: 29385, rate: 0.09 });
    expect(plans?.plan5).toEqual({ name: "Plan 5", threshold: 26025, rate: 0.09 });
    expect(plans?.postgrad).toEqual({ name: "Postgrad", threshold: 21000, rate: 0.06 });
    expect(plans?.plan1).toBeUndefined();
    expect(plans?.plan4).toBeUndefined();
  });
});

describe("2027/28 Child Benefit, pensions", () => {
  it("Child Benefit 28.00 / 18.55 a week; HICBC from 60,000, 1% per 200", () => {
    expect(UK_CHILD_BENEFIT[Y]).toEqual({
      eldestWeekly: 28,
      otherWeekly: 18.55,
      hicbcThresholdStart: 60000,
      hicbcStepWidth: 200,
    });
  });

  it("annual allowance 60,000, lump sum allowance 268,275, ISA 20,000", () => {
    expect(getUkPensionAllowances(Y)).toEqual({
      pensionAnnualAllowance: 60000,
      pensionLumpSumAllowance: 268275,
      isaAllowance: 20000,
    });
  });
});

describe("2027/28 rule sources", () => {
  const OFFICIAL = /^https:\/\/www\.(gov\.(uk|scot)|legislation\.gov\.uk)\//;
  const sources = UK_PROVISIONAL_RULE_SOURCES[Y];
  const keys = [...UK_RULE_KEYS, "propertyRates", "savingsRates"] as const;

  it("the supported registry uses the provisional registry for 2027/28", () => {
    expect(UK_RULE_SOURCES[Y]).toBe(sources);
    expect(Object.keys(UK_PROVISIONAL_RULE_SOURCES)).toEqual(["2027/28"]);
  });

  it("every figure group has an official URL and a note that matches its status", () => {
    for (const key of keys) {
      const e = sources[key];
      expect(e.url, key).toMatch(OFFICIAL);
      for (const u of e.additionalUrls ?? []) expect(u, key).toMatch(OFFICIAL);
      if (e.status === "verified") expect(e.note, key).toBeUndefined();
      if (e.status === "unverified") expect(e.note, key).toMatch(/^UNVERIFIED: .{10,}/);
      if (e.status === "announced") expect(e.note, key).toMatch(/^ANNOUNCED, NOT YET LAW: .{10,}/);
    }
  });

  it("property and savings rates are announced, and record the enacted 22/42/47 and the Bill", () => {
    for (const key of ["propertyRates", "savingsRates"] as const) {
      const e = sources[key];
      expect(e.status, key).toBe("announced");
      expect(e.note, key).toContain("24/44/49");
      expect(e.note, key).toContain("22/42/47");
      expect(e.note, key).toContain("Finance Bill 2026-27");
    }
    expect(sources.propertyRates.additionalUrls).toContain(
      "https://www.legislation.gov.uk/ukpga/2026/11/section/7/enacted",
    );
    expect(sources.savingsRates.additionalUrls).toContain(
      "https://www.legislation.gov.uk/ukpga/2026/11/section/5/enacted",
    );
  });

  it("enacted figure groups are verified against the Act", () => {
    expect(sources.personalAllowance).toMatchObject({
      status: "verified",
      url: "https://www.legislation.gov.uk/ukpga/2026/11/section/10/enacted",
    });
    expect(sources.dividends).toMatchObject({
      status: "verified",
      url: "https://www.legislation.gov.uk/ukpga/2026/11/section/4/enacted",
    });
  });

  it("figures set only by the Budget or a department are announced", () => {
    for (const key of [
      "incomeTaxEwni",
      "niClass1",
      "niClass4",
      "employerNi",
      "studentLoan",
      "childBenefit",
    ] as const) {
      expect(sources[key].status, key).toBe("announced");
    }
  });

  it("Scottish rates and student loan Plans 1 and 4 say they are not published", () => {
    expect(sources.incomeTaxScotland.status).toBe("unverified");
    expect(sources.incomeTaxScotland.note).toContain("not published");
    expect(sources.studentLoan.note).toContain("Plan 1 and Plan 4");
  });

  it("lists each announced note once, in key order", () => {
    const notes = ruleAnnouncedNotes(Y);
    expect(notes).toHaveLength(new Set(notes).size);
    expect(notes[0]).toBe(sources.incomeTaxEwni.note);
    expect(notes.at(-2)).toBe(sources.propertyRates.note);
    expect(notes.at(-1)).toBe(sources.savingsRates.note);
    for (const n of notes) expect(n).toMatch(/^ANNOUNCED, NOT YET LAW: /);
  });
});

describe("2027/28 details that the mutation run pins", () => {
  it("names the missing table in each refusal", () => {
    expect(() => getUkSavingsRates("2028/29")).toThrow(/savings rates/);
    expect(() => getUkPropertyRates("2028/29")).toThrow(/property rates/);
    expect(() => getUkDividendRules("2028/29")).toThrow(/dividend/);
    expect(() => getUkPensionAllowances("2028/29")).toThrow(/pension and ISA allowance/);
  });

  it("labels the bands the same when charged at other rates", () => {
    const property = { basicRate: 0.24, higherRate: 0.44, additionalRate: 0.49 };
    const bands = calculateIncomeTaxOnTaxable(140000, getUkTaxYearRules(Y), "ENGLAND_NI_WALES", {
      rates: property,
    }).bands;
    expect(bands.map((b) => [b.name, b.rate])).toEqual([
      ["Basic", 0.24],
      ["Higher", 0.44],
      ["Additional", 0.49],
    ]);
  });

  it("property rates apply in England, Wales and NI only; Scottish property income keeps Scottish rates", () => {
    const rules = getUkTaxYearRules(Y);
    expect(propertyRatesFor(rules, "ENGLAND_NI_WALES")).toEqual({
      basicRate: 0.24,
      higherRate: 0.44,
      additionalRate: 0.49,
    });
    // Even with a property rate group, a Scottish taxpayer gets none (Scotland Act 1998 s.80C(2B)).
    expect(propertyRatesFor(rules, "SCOTLAND")).toBeNull();
    expect(propertyRatesFor(getUkTaxYearRules("2026/27"), "ENGLAND_NI_WALES")).toBeNull();
  });

  it("student loans row is labelled for 2027/28", () => {
    expect(UK_STUDENT_LOANS[Y]?.description).toBe("Student loans, 2027/28");
  });

  it("each figure group cites its further pages", () => {
    const s = UK_PROVISIONAL_RULE_SOURCES[Y];
    const ANNEX =
      "https://www.gov.uk/government/publications/budget-2026-overview-of-tax-legislation-and-rates-ootlar/annex-a-rates-and-allowances";
    const NIC =
      "https://www.gov.uk/government/publications/rates-and-allowances-national-insurance-contributions/rates-and-allowances-national-insurance-contributions";
    const FA = (n: number) => `https://www.legislation.gov.uk/ukpga/2026/11/section/${n}/enacted`;
    expect(s.personalAllowance.additionalUrls).toEqual([ANNEX]);
    expect(s.personalAllowanceTaper.additionalUrls).toEqual([
      "https://www.gov.uk/guidance/adjusted-net-income",
    ]);
    expect(s.incomeTaxEwni.additionalUrls).toEqual([ANNEX, FA(10)]);
    expect(s.niClass1.additionalUrls).toEqual([NIC]);
    expect(s.niClass4.additionalUrls).toEqual([NIC]);
    expect(s.employerNi.additionalUrls).toEqual([NIC]);
    expect(s.savingsAllowance.additionalUrls).toEqual([
      FA(9),
      "https://www.gov.uk/apply-tax-free-interest-on-savings/how-much-is-tax-free",
    ]);
    expect(s.dividends.additionalUrls).toEqual([ANNEX, "https://www.gov.uk/tax-on-dividends"]);
    expect(s.pensionAnnualAllowance.additionalUrls).toEqual([
      "https://www.gov.uk/government/publications/rates-and-allowances-pension-schemes/pension-schemes-rates",
    ]);
    expect(s.isaAllowance.additionalUrls).toEqual([
      "https://www.gov.uk/individual-savings-accounts",
    ]);
    expect(s.childBenefit.additionalUrls).toEqual([
      "https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
    ]);
    expect(s.tradingAllowance.note).toBe(
      "UNVERIFIED: trading allowance 1,000 is only confirmed as current guidance, not for this year",
    );
    expect(s.propertyAllowance.note).toBe(
      "UNVERIFIED: property allowance 1,000 is only confirmed as current guidance, not for this year",
    );
    expect(s.paymentsOnAccount.note).toBe(
      "UNVERIFIED: payments on account thresholds (1,000 and 80%) are only confirmed as current guidance, not for this year",
    );
  });
});
