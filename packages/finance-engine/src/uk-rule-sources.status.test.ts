import { describe, expect, it } from "vitest";
import {
  ruleUnverifiedNotes,
  UK_RULE_KEYS,
  UK_RULE_SOURCES,
  UK_STATE_PENSION_RULE_SOURCES,
  UK_STATE_PENSION_SOURCES,
  type UkRuleKey,
} from "./uk-rule-sources.js";
import { SUPPORTED_UK_TAX_YEARS } from "./uk-tax-year.js";

/**
 * Which figure groups are confirmed on the cited page, per year. The status is read by
 * uk-take-home.ts, uk-tax-thresholds.ts and uk-what-if.ts, which mark an assumption "not
 * confirmed" in the take-home and tax trap panels, and by getUkTaxYearRules (`verified`,
 * `unverified`, `sources`). The expected sets follow the evidence notes in tax-rules.ts and
 * docs/tax-sources/*.md: early NI Class 4 figures not on a page reached; 2022/23 and 2023/24 NI
 * rates are annual-method approximations; Plan 4 missing from the 2020/21 employer page; Plan 5
 * missing from the 2023/24 to 2025/26 employer pages; current-guidance-only allowances confirmed
 * for 2026/27 only.
 */
const ALWAYS_UNVERIFIED_BEFORE_2026: readonly UkRuleKey[] = [
  "savingsAllowance",
  "isaAllowance",
  "tradingAllowance",
  "propertyAllowance",
  "paymentsOnAccount",
];

const UNVERIFIED_BY_YEAR: Record<string, readonly UkRuleKey[]> = {
  "2020/21": [
    "personalAllowanceTaper",
    "niClass4",
    "studentLoan",
    "statePension",
    "childBenefit",
    ...ALWAYS_UNVERIFIED_BEFORE_2026,
  ],
  "2021/22": [
    "personalAllowanceTaper",
    "niClass4",
    "statePension",
    "childBenefit",
    ...ALWAYS_UNVERIFIED_BEFORE_2026,
  ],
  "2022/23": [
    "personalAllowanceTaper",
    "niClass1",
    "niClass4",
    "employerNi",
    "statePension",
    ...ALWAYS_UNVERIFIED_BEFORE_2026,
  ],
  "2023/24": ["niClass1", "studentLoan", ...ALWAYS_UNVERIFIED_BEFORE_2026],
  "2024/25": ["studentLoan", ...ALWAYS_UNVERIFIED_BEFORE_2026],
  "2025/26": ["studentLoan", ...ALWAYS_UNVERIFIED_BEFORE_2026],
  "2026/27": ["incomeTaxScotland"],
  // 2027/28 is provisional (buildProvisionalYear): no Scottish table is published, and the
  // trading, property and payments-on-account figures rest on current guidance only.
  "2027/28": ["incomeTaxScotland", "tradingAllowance", "propertyAllowance", "paymentsOnAccount"],
};

/**
 * Figure groups whose page is an announcement (Budget 2026 or the DfE threshold notice) rather
 * than enacted law. Only the provisional year 2027/28 has any; every earlier year has none.
 */
const ANNOUNCED_BY_YEAR: Record<string, readonly UkRuleKey[]> = {
  "2027/28": ["incomeTaxEwni", "niClass1", "niClass4", "employerNi", "studentLoan", "childBenefit"],
};

const OOTLAR_2026 =
  "https://www.gov.uk/government/publications/budget-2026-overview-of-tax-legislation-and-rates-ootlar/budget-2026-overview-of-tax-legislation-and-rates-ootlar";
const OOTLAR_2026_ANNEX_A =
  "https://www.gov.uk/government/publications/budget-2026-overview-of-tax-legislation-and-rates-ootlar/annex-a-rates-and-allowances";

const INCOME_TAX_PAST =
  "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past";
const INCOME_TAX_RATES = "https://www.gov.uk/income-tax-rates";
const NIC_RATES =
  "https://www.gov.uk/government/publications/rates-and-allowances-national-insurance-contributions/rates-and-allowances-national-insurance-contributions";
const ADJUSTED_NET_INCOME = "https://www.gov.uk/guidance/adjusted-net-income";
const CHILD_BENEFIT_RATES =
  "https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance";
const BENEFIT_RATES = "https://www.gov.uk/government/publications/benefit-and-pension-rates-";
const NEW_SP_WHAT_YOULL_GET = "https://www.gov.uk/new-state-pension/what-youll-get";

const employerPage = (from: number) =>
  `https://www.gov.uk/guidance/rates-and-thresholds-for-employers-${from}-to-${from + 1}`;

describe("rule source status per year", () => {
  for (const year of SUPPORTED_UK_TAX_YEARS) {
    it(`flags exactly the expected figure groups as not confirmed for ${year}`, () => {
      const unverified = UK_RULE_KEYS.filter(
        (k) => UK_RULE_SOURCES[year][k].status === "unverified",
      );
      expect([...unverified].sort()).toEqual([...(UNVERIFIED_BY_YEAR[year] ?? [])].sort());
    });

    it(`flags exactly the expected figure groups as announced, not yet law, for ${year}`, () => {
      const announced = UK_RULE_KEYS.filter((k) => UK_RULE_SOURCES[year][k].status === "announced");
      expect([...announced].sort()).toEqual([...(ANNOUNCED_BY_YEAR[year] ?? [])].sort());
      for (const k of announced) {
        expect(UK_RULE_SOURCES[year][k].note, `${year} ${k}`).toMatch(/^ANNOUNCED, NOT YET LAW: /);
      }
    });
  }

  it("names the missing student loan plan in the note", () => {
    expect(UK_RULE_SOURCES["2020/21"].studentLoan.note).toMatch(/Plan 4/);
    for (const year of ["2023/24", "2024/25", "2025/26"] as const) {
      expect(UK_RULE_SOURCES[year].studentLoan.note, year).toMatch(/Plan 5/);
    }
  });

  it("gives the 2022/23 and 2023/24 NI approximations their own notes", () => {
    const n2022 = UK_RULE_SOURCES["2022/23"].niClass1.note;
    expect(n2022).toMatch(/11,908/);
    // Class 4 and employer NI in 2022/23 share the Class 1 note.
    expect(UK_RULE_SOURCES["2022/23"].niClass4.note).toBe(n2022);
    expect(UK_RULE_SOURCES["2022/23"].employerNi.note).toBe(n2022);
    expect(UK_RULE_SOURCES["2023/24"].niClass1.note).toMatch(/11\.5%/);
    expect(UK_RULE_SOURCES["2021/22"].niClass4.note).toMatch(/Class 4/);
  });

  it("lists a note shared by several figure groups only once", () => {
    // 2022/23: niClass1, niClass4 and employerNi share one note; the other unverified groups are
    // personalAllowanceTaper, statePension and the five current-guidance groups, each with its
    // own note. 3 groups -> 1 note, plus 1 + 1 + 5 = 8 notes in all.
    const notes = ruleUnverifiedNotes("2022/23");
    const shared = UK_RULE_SOURCES["2022/23"].niClass1.note;
    expect(notes.filter((n) => n === shared)).toHaveLength(1);
    expect(notes).toHaveLength(8);
  });

  it("has one note for 2026/27, where only Scottish income tax is not confirmed", () => {
    // 2026/27: only the Scottish income tax group is unverified, so one note.
    expect(ruleUnverifiedNotes("2026/27")).toHaveLength(1);
    expect(ruleUnverifiedNotes("2026/27")[0]).toMatch(/Scottish/);
  });
});

describe("rule source pages per year", () => {
  it("cites the current income tax page from 2023/24 and the rates page before", () => {
    for (const year of ["2020/21", "2021/22", "2022/23"] as const) {
      const s = UK_RULE_SOURCES[year];
      expect(s.personalAllowance.url, year).toBe(INCOME_TAX_RATES);
      expect(s.personalAllowanceTaper.url, year).toBe(INCOME_TAX_RATES);
      expect(s.personalAllowanceTaper.additionalUrls, year).toEqual([ADJUSTED_NET_INCOME]);
    }
    for (const year of ["2023/24", "2024/25", "2025/26", "2026/27"] as const) {
      const s = UK_RULE_SOURCES[year];
      expect(s.personalAllowance.url, year).toBe(INCOME_TAX_PAST);
      expect(s.personalAllowanceTaper.url, year).toBe(INCOME_TAX_PAST);
      expect(s.personalAllowanceTaper.additionalUrls, year).toEqual([ADJUSTED_NET_INCOME]);
    }
  });

  it("lists the further pages each figure group rests on", () => {
    // 2027/28 cites the Budget 2026 papers instead; its pages are pinned in the next test.
    for (const year of SUPPORTED_UK_TAX_YEARS.filter((y) => y !== "2027/28")) {
      const s = UK_RULE_SOURCES[year];
      const from = Number(year.slice(0, 4));
      expect(s.personalAllowance.additionalUrls, year).toEqual([INCOME_TAX_RATES]);
      expect(s.incomeTaxEwni.url, year).toBe(INCOME_TAX_PAST);
      expect(s.incomeTaxEwni.additionalUrls, year).toEqual([INCOME_TAX_RATES]);
      expect(s.incomeTaxScotland.url, year).toBe(INCOME_TAX_RATES);
      expect(s.incomeTaxScotland.additionalUrls, year).toEqual([INCOME_TAX_PAST]);
      for (const key of ["niClass1", "niClass4", "employerNi"] as const) {
        expect(s[key].url, `${year} ${key}`).toBe(employerPage(from));
        expect(s[key].additionalUrls, `${year} ${key}`).toEqual([NIC_RATES]);
      }
      expect(s.studentLoan.url, year).toBe(employerPage(from));
      expect(s.dividends.additionalUrls, year).toEqual([INCOME_TAX_PAST]);
      expect(s.giftAid.additionalUrls, year).toEqual([ADJUSTED_NET_INCOME]);
    }
  });

  it("cites the Budget 2026 papers for the provisional year 2027/28", () => {
    const s = UK_RULE_SOURCES["2027/28"];
    expect(s.personalAllowance.additionalUrls).toEqual([OOTLAR_2026_ANNEX_A]);
    expect(s.incomeTaxEwni.url).toBe(OOTLAR_2026);
    expect(s.incomeTaxScotland.url).toBe(INCOME_TAX_RATES);
    for (const key of ["niClass1", "niClass4", "employerNi"] as const) {
      expect(s[key].url, key).toBe(OOTLAR_2026_ANNEX_A);
      expect(s[key].additionalUrls, key).toEqual([NIC_RATES]);
    }
    expect(s.giftAid.additionalUrls).toEqual([ADJUSTED_NET_INCOME]);
  });

  it("cites the uprating regulations for Child Benefit 2022/23 to 2024/25", () => {
    const regs2023 = "https://www.legislation.gov.uk/uksi/2023/237/made";
    const regs2024 = "https://www.legislation.gov.uk/uksi/2024/247/made";
    expect(UK_RULE_SOURCES["2022/23"].childBenefit).toEqual({
      url: regs2023,
      additionalUrls: [CHILD_BENEFIT_RATES],
      status: "verified",
    });
    expect(UK_RULE_SOURCES["2023/24"].childBenefit).toEqual({
      url: regs2023,
      additionalUrls: [CHILD_BENEFIT_RATES],
      status: "verified",
    });
    expect(UK_RULE_SOURCES["2024/25"].childBenefit).toEqual({
      url: regs2024,
      additionalUrls: [CHILD_BENEFIT_RATES],
      status: "verified",
    });
    expect(UK_RULE_SOURCES["2025/26"].childBenefit).toEqual({
      url: CHILD_BENEFIT_RATES,
      status: "verified",
    });
  });

  it("cites the benefit and pension rates page that prints each State Pension year", () => {
    expect(UK_STATE_PENSION_SOURCES["2022/23"].url).toBe(NEW_SP_WHAT_YOULL_GET);
    expect(UK_STATE_PENSION_SOURCES["2022/23"].additionalUrls).toEqual([
      `${BENEFIT_RATES}2023-to-2024`,
    ]);
    // The 2024 to 2025 page prints both the 2023/24 and 2024/25 columns.
    for (const year of ["2023/24", "2024/25"] as const) {
      expect(UK_STATE_PENSION_SOURCES[year].url, year).toBe(
        `${BENEFIT_RATES}2024-to-2025/benefit-and-pension-rates-2024-to-2025`,
      );
    }
    expect(UK_STATE_PENSION_SOURCES["2025/26"].url).toBe(
      `${BENEFIT_RATES}2025-to-2026/benefit-and-pension-rates-2025-to-2026`,
    );
    expect(UK_STATE_PENSION_SOURCES["2026/27"].url).toBe(NEW_SP_WHAT_YOULL_GET);
    expect(UK_STATE_PENSION_SOURCES["2026/27"].additionalUrls).toEqual([
      `${BENEFIT_RATES}2026-to-2027/proposed-benefit-and-pension-rates-2026-to-2027`,
    ]);
    expect(UK_STATE_PENSION_SOURCES["2027/28"].url).toBe(
      `${BENEFIT_RATES}2027-to-2028/proposed-benefit-and-pension-rates-2027-to-2028`,
    );
  });

  it("cites the eligibility and State Pension age pages", () => {
    expect(UK_STATE_PENSION_RULE_SOURCES.qualifyingYears.additionalUrls).toEqual([
      "https://www.gov.uk/new-state-pension/eligibility",
    ]);
    expect(UK_STATE_PENSION_RULE_SOURCES.statePensionAge.url).toBe(
      "https://www.gov.uk/state-pension-age",
    );
  });
});
