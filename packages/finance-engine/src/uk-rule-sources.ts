/**
 * Sourced rules registry (E25-T1, claims E22 follow-up 6 without the GOV.UK drift workflow).
 *
 * Every figure group in every supported tax year has its own GOV.UK / gov.scot / legislation.gov.uk
 * source URL and a verification status. `getUkTaxYearRules` derives `sources` and `unverified`
 * from this registry, so the two can no longer drift apart.
 *
 * Status is about the figure being confirmed against the cited page, not about owner sign-off
 * (that lives in test-vectors/signoff.ts). A figure with status "unverified" carries a note that
 * starts with "UNVERIFIED: ". Evidence trail: packages/finance-engine/docs/tax-sources/*.md.
 *
 * Imports only types, so there is no cycle with uk-tax-year.ts.
 */

import { SUPPORTED_UK_TAX_YEARS, type UkTaxYear } from "./types.js";

export type UkRuleKey =
  | "personalAllowance"
  | "personalAllowanceTaper"
  | "incomeTaxEwni"
  | "incomeTaxScotland"
  | "niClass1"
  | "niClass4"
  | "employerNi"
  | "studentLoan"
  | "savingsAllowance"
  | "dividends"
  | "giftAid"
  | "pensionAnnualAllowance"
  | "isaAllowance";

export type UkRuleStatus = "verified" | "unverified";

export interface UkRuleSource {
  /** Primary page. Always https://www.gov.uk/, gov.scot or legislation.gov.uk. */
  url: string;
  /** Further pages the figure group also rests on. */
  additionalUrls?: readonly string[];
  status: UkRuleStatus;
  /** Present exactly when status is "unverified"; starts with "UNVERIFIED: ". */
  note?: string;
}

export type UkRuleSources = Record<UkRuleKey, UkRuleSource>;

/** Iteration order. Also the order of derived `unverified` notes. */
export const UK_RULE_KEYS: readonly UkRuleKey[] = [
  "personalAllowance",
  "personalAllowanceTaper",
  "incomeTaxEwni",
  "incomeTaxScotland",
  "niClass1",
  "niClass4",
  "employerNi",
  "studentLoan",
  "savingsAllowance",
  "dividends",
  "giftAid",
  "pensionAnnualAllowance",
  "isaAllowance",
];

const INCOME_TAX_PAST =
  "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past";
const INCOME_TAX_RATES = "https://www.gov.uk/income-tax-rates";
const NIC_RATES =
  "https://www.gov.uk/government/publications/rates-and-allowances-national-insurance-contributions/rates-and-allowances-national-insurance-contributions";
const ADJUSTED_NET_INCOME = "https://www.gov.uk/guidance/adjusted-net-income";
const TAX_ON_DIVIDENDS = "https://www.gov.uk/tax-on-dividends";
const GIFT_AID = "https://www.gov.uk/donating-to-charity/gift-aid";
// Current guidance, no tax year named: PSA 1,000 / 500 / 0.
const PSA = "https://www.gov.uk/apply-tax-free-interest-on-savings/how-much-is-tax-free";
// Page text read for E25-T1: "This is £60,000 this tax year." Current tax year only.
const ANNUAL_ALLOWANCE = "https://www.gov.uk/tax-on-your-private-pension/annual-allowance";
// Page text read for E25-T1: "In the 2026 to 2027 tax year, the maximum you can save in ISAs is £20,000".
const ISA = "https://www.gov.uk/individual-savings-accounts";

const PRE_2023: readonly UkTaxYear[] = ["2020/21", "2021/22", "2022/23"];

function employerPage(year: UkTaxYear): string {
  const [a, b] = year.split("/");
  return `https://www.gov.uk/guidance/rates-and-thresholds-for-employers-${a}-to-${(a?.slice(0, 2) ?? "20") + b}`;
}

const verified = (url: string, additionalUrls?: readonly string[]): UkRuleSource =>
  additionalUrls ? { url, additionalUrls, status: "verified" } : { url, status: "verified" };

const unverified = (
  url: string,
  note: string,
  additionalUrls?: readonly string[],
): UkRuleSource => ({
  url,
  ...(additionalUrls ? { additionalUrls } : {}),
  status: "unverified",
  note: `UNVERIFIED: ${note}`,
});

const NOTE_NI_EARLY =
  "Class 1 lower earnings limit 6,240 and all Class 4 figures (no GOV.UK page reached)";
const NOTE_NI_2022_23 =
  "Class 1 NI is a full-year approximation of mid-year changes. Primary threshold 11,908 and rates 12.73% / 2.73% are the annual-method figures GOV.UK prints for directors, applied to all employees; per-period figures are PT 9,880 then 12,570 and 13.25% then 12%. Employer 14.53% is likewise the directors' annual blend (15.05% then 13.8%). Class 4 unconfirmed";
const NOTE_NI_2023_24 =
  "Class 1 main rate 11.5% is printed on the GOV.UK 2023 to 2024 employer page as the directors' whole-year rate; applying it to ordinary employees (12% to 5 Jan 2024, then 10%) is an approximation";

function buildYear(year: UkTaxYear): UkRuleSources {
  const employer = employerPage(year);
  const is2026 = year === "2026/27";
  const pre2023 = PRE_2023.includes(year);

  const niClass1 =
    year === "2022/23"
      ? unverified(employer, NOTE_NI_2022_23, [NIC_RATES])
      : year === "2023/24"
        ? unverified(employer, NOTE_NI_2023_24, [NIC_RATES])
        : verified(employer, [NIC_RATES]);

  const niClass4 =
    year === "2020/21" || year === "2021/22"
      ? unverified(employer, NOTE_NI_EARLY, [NIC_RATES])
      : year === "2022/23"
        ? unverified(employer, NOTE_NI_2022_23, [NIC_RATES])
        : verified(employer, [NIC_RATES]);

  const studentLoan =
    year === "2020/21"
      ? unverified(
          employer,
          "Plan 4 student loan threshold is not on the 2020 to 2021 employer page",
        )
      : year === "2023/24" || year === "2024/25" || year === "2025/26"
        ? unverified(
            employer,
            "Plan 5 threshold 25,000 is not listed on this year's GOV.UK employer page",
          )
        : verified(employer);

  return {
    personalAllowance: verified(pre2023 ? INCOME_TAX_RATES : INCOME_TAX_PAST, [INCOME_TAX_RATES]),
    personalAllowanceTaper: pre2023
      ? unverified(
          INCOME_TAX_RATES,
          "personal allowance taper rate (GBP1 per GBP2) is not stated on the archived GOV.UK pages",
          [ADJUSTED_NET_INCOME],
        )
      : verified(INCOME_TAX_PAST, [ADJUSTED_NET_INCOME]),
    incomeTaxEwni: verified(INCOME_TAX_PAST, [INCOME_TAX_RATES]),
    incomeTaxScotland: is2026
      ? unverified(
          INCOME_TAX_RATES,
          "Scottish advanced/top boundary 125,140 is a published figure but its frame (taxable vs gross) is ambiguous between GOV.UK pages",
          [INCOME_TAX_PAST],
        )
      : verified(INCOME_TAX_RATES, [INCOME_TAX_PAST]),
    niClass1,
    niClass4,
    employerNi:
      year === "2022/23"
        ? unverified(employer, NOTE_NI_2022_23, [NIC_RATES])
        : verified(employer, [NIC_RATES]),
    studentLoan,
    savingsAllowance: is2026
      ? verified(PSA)
      : unverified(
          PSA,
          "personal savings allowance 1,000 / 500 / 0 is only confirmed as current guidance, not for this year",
        ),
    // Pre-2023 dividends are verified from ITA 2007 s.8 and s.13A point-in-time versions
    // (see the DIVIDENDS table comment in uk-tax-year.ts).
    dividends: verified(TAX_ON_DIVIDENDS, [INCOME_TAX_PAST]),
    giftAid: verified(GIFT_AID, [ADJUSTED_NET_INCOME]),
    pensionAnnualAllowance: is2026
      ? verified(ANNUAL_ALLOWANCE)
      : unverified(
          ANNUAL_ALLOWANCE,
          pre2023
            ? "pension annual allowance 40,000 is from memory (60,000 applies from 2023/24); the GOV.UK page states the current year only, so the owner must confirm it"
            : "pension annual allowance 60,000 is only confirmed as current guidance (this tax year), not for this year",
        ),
    isaAllowance: is2026
      ? verified(ISA)
      : unverified(
          ISA,
          "ISA allowance 20,000 is only confirmed for 2026/27 on GOV.UK, not for this year",
        ),
  };
}

export const UK_RULE_SOURCES: Record<UkTaxYear, UkRuleSources> = Object.fromEntries(
  SUPPORTED_UK_TAX_YEARS.map((y) => [y, buildYear(y)]),
) as Record<UkTaxYear, UkRuleSources>;

/** Unique source URLs for a year: primary pages first, then additional ones, in key order. */
export function ruleSourceUrls(year: UkTaxYear): string[] {
  const entries = UK_RULE_KEYS.map((k) => UK_RULE_SOURCES[year][k]);
  return [
    ...new Set([...entries.map((e) => e.url), ...entries.flatMap((e) => e.additionalUrls ?? [])]),
  ];
}

/** Unique "UNVERIFIED: <reason>" lines for a year, in key order. */
export function ruleUnverifiedNotes(year: UkTaxYear): string[] {
  const notes: string[] = [];
  for (const key of UK_RULE_KEYS) {
    const e = UK_RULE_SOURCES[year][key];
    if (e.status === "unverified" && e.note && !notes.includes(e.note)) notes.push(e.note);
  }
  return notes;
}
