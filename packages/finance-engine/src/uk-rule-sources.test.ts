import { describe, expect, it } from "vitest";
import {
  selectUkTaxVectors,
  UK_TAX_VECTOR_YEARS,
  type UkTaxVectorKind,
  type UkTaxVectorRegion,
} from "./test-vectors/uk-tax.vectors.js";
import {
  ruleSourceUrls,
  ruleUnverifiedNotes,
  UK_RULE_KEYS,
  UK_RULE_SOURCES,
  type UkRuleKey,
} from "./uk-rule-sources.js";
import { UK_TAX_CONSTANTS } from "./uk-tax.js";
import { getUkTaxYearRules, SUPPORTED_UK_TAX_YEARS } from "./uk-tax-year.js";

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

const NO_VECTOR_YET: readonly UkRuleKey[] = [
  "savingsAllowance",
  "pensionAnnualAllowance",
  "isaAllowance",
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
