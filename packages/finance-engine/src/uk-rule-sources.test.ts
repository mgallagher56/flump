import { describe, expect, it } from "vitest";
import {
  selectUkTaxVectors,
  UK_TAX_VECTOR_YEARS,
  type UkTaxVectorKind,
  type UkTaxVectorRegion,
} from "./test-vectors/uk-tax.vectors.js";
import {
  selectUkWhatIfVectors,
  type UkWhatIfVectorKind,
} from "./test-vectors/uk-whatif.vectors.js";
import {
  ruleSourceUrls,
  ruleUnverifiedNotes,
  UK_RULE_KEYS,
  UK_RULE_SOURCES,
  UK_STATE_PENSION_RULE_SOURCES,
  UK_STATE_PENSION_SOURCES,
  UK_STATE_PENSION_YEARS,
  type UkRuleKey,
} from "./uk-rule-sources.js";
import { UK_TAX_CONSTANTS } from "./uk-tax.js";
import {
  calculateNewStatePensionAnnual,
  getUkStatePensionRules,
  getUkTaxYearRules,
  SUPPORTED_UK_TAX_YEARS,
  UK_STATE_PENSION_AGE,
} from "./uk-tax-year.js";

/** Same pattern as the vector catalogue (uk-tax.vectors.test.ts). */
const GOV_URL = /^https:\/\/www\.(gov\.(uk|scot)|legislation\.gov\.uk)\//;

/**
 * Which existing vector kind (and region) exercises each rule key. A map kept here so the vector
 * file (whose fields the sign-off hash covers) is not edited. Keys with no entry have no vector
 * yet and are listed in NO_VECTOR_YET; E25-T2 adds their vectors and empties that list.
 */
const VECTOR_FOR_KEY: Partial<
  Record<UkRuleKey, { kind: UkTaxVectorKind; region?: UkTaxVectorRegion }>
> = {
  personalAllowance: { kind: "incomeTax", region: "ENGLAND_NI_WALES" },
  personalAllowanceTaper: { kind: "incomeTax", region: "ENGLAND_NI_WALES" },
  incomeTaxEwni: { kind: "incomeTax", region: "ENGLAND_NI_WALES" },
  incomeTaxScotland: { kind: "incomeTax", region: "SCOTLAND" },
  niClass1: { kind: "employeeNi" },
  niClass4: { kind: "class4" },
  employerNi: { kind: "employerNiSaving" },
  studentLoan: { kind: "studentLoan" },
  giftAid: { kind: "giftAid" },
  dividends: { kind: "dividends" },
};

/** Keys exercised by the E25-T2 catalogue (`uk-whatif.vectors.ts`), which has its own kinds. */
const WHATIF_VECTOR_FOR_KEY: Partial<Record<UkRuleKey, UkWhatIfVectorKind>> = {
  hicbc: "hicbc",
  childBenefit: "hicbc",
};

const NO_VECTOR_YET: readonly UkRuleKey[] = [
  "savingsAllowance",
  "pensionAnnualAllowance",
  "isaAllowance",
  "statePension",
];

describe("UK rule sources registry (E25-T1)", () => {
  it("covers the same years as the vectors and the rules", () => {
    expect(Object.keys(UK_RULE_SOURCES)).toEqual([...SUPPORTED_UK_TAX_YEARS]);
    expect([...UK_TAX_VECTOR_YEARS]).toEqual([...SUPPORTED_UK_TAX_YEARS]);
  });

  it("every key in every year has an official URL and a consistent status", () => {
    for (const year of SUPPORTED_UK_TAX_YEARS) {
      for (const key of UK_RULE_KEYS) {
        const e = UK_RULE_SOURCES[year][key];
        const label = `${year} ${key}`;
        expect(e.url, label).toMatch(GOV_URL);
        for (const u of e.additionalUrls ?? []) expect(u, label).toMatch(GOV_URL);
        expect(["verified", "unverified"], label).toContain(e.status);
        if (e.status === "unverified") {
          expect(e.note, label).toMatch(/^UNVERIFIED: .{10,}/);
        } else {
          expect(e.note, label).toBeUndefined();
        }
      }
    }
  });

  it("every key maps to a vector kind that has vectors for every year, or is listed as pending", () => {
    for (const key of UK_RULE_KEYS) {
      const whatIfKind = WHATIF_VECTOR_FOR_KEY[key];
      if (whatIfKind) {
        expect(NO_VECTOR_YET, key).not.toContain(key);
        for (const taxYear of UK_TAX_VECTOR_YEARS) {
          expect(
            selectUkWhatIfVectors({ taxYear, kind: whatIfKind }).length,
            `${taxYear} ${key}`,
          ).toBeGreaterThan(0);
        }
        continue;
      }
      const link = VECTOR_FOR_KEY[key];
      if (!link) {
        expect(NO_VECTOR_YET, key).toContain(key);
        continue;
      }
      expect(NO_VECTOR_YET, key).not.toContain(key);
      for (const taxYear of UK_TAX_VECTOR_YEARS) {
        expect(
          selectUkTaxVectors({ taxYear, kind: link.kind, region: link.region }).length,
          `${taxYear} ${key}`,
        ).toBeGreaterThan(0);
      }
    }
  });

  it("HICBC thresholds are verified for every year; Child Benefit rates are unverified for 2020/21 and 2021/22 only (E25-T2)", () => {
    for (const year of SUPPORTED_UK_TAX_YEARS) {
      expect(UK_RULE_SOURCES[year].hicbc.status, year).toBe("verified");
      expect(UK_RULE_SOURCES[year].hicbc.url, year).toBe(
        "https://www.gov.uk/child-benefit-tax-charge",
      );
      const expected = year === "2020/21" || year === "2021/22" ? "unverified" : "verified";
      expect(UK_RULE_SOURCES[year].childBenefit.status, year).toBe(expected);
    }
  });

  it("the employer page URL is per year", () => {
    expect(UK_RULE_SOURCES["2022/23"].niClass1.url).toBe(
      "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2022-to-2023",
    );
    expect(UK_RULE_SOURCES["2026/27"].studentLoan.url).toBe(
      "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027",
    );
  });

  it("the annual allowance is verified for every year against the per-year HMRC table", () => {
    for (const year of SUPPORTED_UK_TAX_YEARS) {
      const src = UK_RULE_SOURCES[year].pensionAnnualAllowance;
      expect(src.status, year).toBe("verified");
      expect(src.url, year).toBe(
        "https://www.gov.uk/government/publications/rates-and-allowances-pension-schemes/pension-schemes-rates",
      );
    }
    for (const year of ["2020/21", "2021/22", "2022/23"] as const) {
      expect(getUkTaxYearRules(year).pensionAnnualAllowance, year).toBe(40000);
    }
    for (const year of ["2023/24", "2024/25", "2025/26", "2026/27"] as const) {
      expect(getUkTaxYearRules(year).pensionAnnualAllowance, year).toBe(60000);
    }
  });

  it("rules expose registry-derived sources, notes and ruleSources", () => {
    for (const year of SUPPORTED_UK_TAX_YEARS) {
      const r = getUkTaxYearRules(year);
      expect(r.ruleSources).toBe(UK_RULE_SOURCES[year]);
      expect(r.sources).toEqual(ruleSourceUrls(year));
      expect(r.unverified).toEqual(ruleUnverifiedNotes(year));
      expect(r.verified, year).toBe(r.unverified.length === 0);
      expect(new Set(r.sources).size, year).toBe(r.sources.length);
      for (const s of r.sources) expect(s, year).toMatch(GOV_URL);
    }
  });

  it("keeps the six generic sources the rules listed before the registry", () => {
    const r = getUkTaxYearRules("2025/26");
    for (const url of [
      "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2025-to-2026",
      "https://www.gov.uk/income-tax-rates",
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
      "https://www.gov.uk/government/publications/rates-and-allowances-national-insurance-contributions/rates-and-allowances-national-insurance-contributions",
      "https://www.gov.uk/tax-on-dividends",
      "https://www.gov.uk/guidance/adjusted-net-income",
    ]) {
      expect(r.sources).toContain(url);
    }
  });

  it("taperEnd is taper start plus twice the personal allowance", () => {
    // 2020/21: 100,000 + 2 x 12,500 = 125,000 (the year-less 125,140 was wrong here).
    expect(getUkTaxYearRules("2020/21").taperEnd).toBe(125000);
    // 12,570 allowance from 2021/22 onwards: 100,000 + 2 x 12,570 = 125,140.
    for (const year of SUPPORTED_UK_TAX_YEARS.filter((y) => y !== "2020/21")) {
      expect(getUkTaxYearRules(year).taperEnd, year).toBe(125140);
    }
  });

  it("ISA allowance is 20,000, verified for 2026/27 only", () => {
    for (const year of SUPPORTED_UK_TAX_YEARS) {
      expect(getUkTaxYearRules(year).isaAllowance, year).toBe(20000);
      expect(UK_RULE_SOURCES[year].isaAllowance.status, year).toBe(
        year === "2026/27" ? "verified" : "unverified",
      );
    }
  });

  it("State Pension rates are per year, weekly x 52", () => {
    const expected: Record<string, [number, number, number]> = {
      "2023/24": [203.85, 10600.2, 156.2],
      "2024/25": [221.2, 11502.4, 169.5],
      "2025/26": [230.25, 11973, 176.45],
      "2026/27": [241.3, 12547.6, 184.9],
      "2027/28": [250.7, 13036.4, 192.1],
    };
    for (const [year, [weekly, annual, basic]] of Object.entries(expected)) {
      const r = getUkStatePensionRules(year);
      expect(r.fullNewWeekly, year).toBe(weekly);
      expect(r.fullNewAnnual, year).toBe(annual);
      expect(r.basicWeekly, year).toBe(basic);
      expect(UK_STATE_PENSION_SOURCES[year as keyof typeof UK_STATE_PENSION_SOURCES].status).toBe(
        "verified",
      );
    }
    expect(getUkTaxYearRules("2026/27").statePension.fullNewAnnual).toBe(12547.6);
    expect(getUkTaxYearRules("2025/26").statePension.fullNewAnnual).toBe(11973);
    expect(() => getUkStatePensionRules("2028/29")).toThrow();
  });

  it("State Pension for 2020/21 to 2022/23 is flagged UNVERIFIED and surfaced on the rules", () => {
    for (const year of ["2020/21", "2021/22", "2022/23"] as const) {
      expect(UK_RULE_SOURCES[year].statePension.status, year).toBe("unverified");
      expect(getUkTaxYearRules(year).unverified.join("\n"), year).toMatch(/State Pension/);
    }
    expect(UK_STATE_PENSION_YEARS).toHaveLength(8);
  });

  it("qualifying years: 35 for full, 10 minimum, pro rata between", () => {
    expect(UK_STATE_PENSION_RULE_SOURCES.qualifyingYears.status).toBe("verified");
    expect(UK_STATE_PENSION_RULE_SOURCES.statePensionAge.status).toBe("unverified");
    expect(UK_STATE_PENSION_AGE).toBe(67);
    expect(calculateNewStatePensionAnnual(35, "2026/27")).toBe(12547.6);
    expect(calculateNewStatePensionAnnual(40, "2026/27")).toBe(12547.6);
    expect(calculateNewStatePensionAnnual(9, "2026/27")).toBe(0);
    expect(calculateNewStatePensionAnnual(Number.NaN, "2026/27")).toBe(0);
    expect(calculateNewStatePensionAnnual(-3, "2026/27")).toBe(0);
    expect(calculateNewStatePensionAnnual(10, "2026/27")).toBe(3585.03);
    expect(calculateNewStatePensionAnnual(35, "2027/28")).toBe(13036.4);
  });

  it("deprecated UK_TAX_CONSTANTS keep their values, now derived from the latest year's rules", () => {
    expect(UK_TAX_CONSTANTS).toEqual({
      PERSONAL_ALLOWANCE_DEFAULT: 12570,
      TAX_TRAP_LOWER_THRESHOLD: 100000,
      TAX_TRAP_UPPER_THRESHOLD: 125140,
      ISA_ANNUAL_ALLOWANCE: 20000,
      PENSION_ANNUAL_ALLOWANCE: 60000,
      PSA_BASIC_RATE: 1000,
      PSA_HIGHER_RATE: 500,
      PSA_ADDITIONAL_RATE: 0,
      NI_PRIMARY_THRESHOLD: 12570,
      NI_UPPER_EARNINGS_LIMIT: 50270,
      NI_MAIN_RATE: 0.08,
      NI_HIGHER_RATE: 0.02,
    });
  });
});
