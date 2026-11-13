/**
 * E25-T2 vector catalogue for the take-home, HICBC and what-if engine, written before the engine.
 *
 * Kept apart from `uk-tax.vectors.ts` so that file and every sign-off hash in it stay untouched
 * (E25 plan, T2). Every expected value is hand-derived band by band from figures read on GOV.UK
 * (see each vector's `source` and `derivation`); none is computed by the engine. The arithmetic was done
 * by an independent script that only reads the rule figures. Its own tax and NI arithmetic reproduced
 * every EWNI income tax, employee NI and Gift Aid vector in `uk-tax.vectors.ts` before it was used here.
 * Every vector starts with `signedOffBy: null`. A vector is UNVERIFIED when any figure it rests on is
 * UNVERIFIED in the sourced rules registry (`uk-rule-sources.ts`), or on a judgement call named in its reason.
 *
 * Kinds and inputs (money in pounds, expected to pence):
 * - hicbc: { adjustedNetIncome, children }; expected is the High Income Child Benefit Charge. Individual basis,
 *   claimant is the higher earner. Child Benefit is assumed to be 52 weeks (owner ruling pending).
 * - takeHome: { salary, pensionMethod, pensionAmount, studentLoanPlans, children }; expected is annual take-home.
 *   Convention: with children, take-home is net of the HICBC charge and excludes the Child Benefit received.
 * - whatIfDelta: { salary, deltaGross, children }; expected is the change in annual take-home.
 * - scottishMarginal: { salary, deltaGross }; expected is the change in take-home inside a Scottish band.
 * - studentLoanMulti: { grossIncome, plans }; plans joined with "+"; expected is total annual repayment.
 * - reliefAtSource: { grossIncome, netContribution }; expected is income tax after the band extension.
 * - salarySacrificeCap2029: { salary, sacrifice, cap, party }; expected is the extra NI the 6 April 2029
 *   2,000 cap would add. An illustration at 2026/27 rates, never applied implicitly.
 *
 * `feature` groups vectors for per-feature verification (DECISIONS round 4 addendum D1): `hicbc`, `whatIf`,
 * `scheduled`. `core` is the existing `uk-tax.vectors.ts` catalogue.
 */
import type { UkTaxVector, UkTaxVectorRegion, UkTaxVectorYear } from "./uk-tax.vectors.js";

export type UkWhatIfVectorKind =
  | "hicbc"
  | "takeHome"
  | "whatIfDelta"
  | "scottishMarginal"
  | "studentLoanMulti"
  | "reliefAtSource"
  | "salarySacrificeCap2029";

export type UkTaxFeature = "core" | "hicbc" | "whatIf" | "scheduled";

/** Same shape as `UkTaxVector`, with the E25 kinds and a verification feature. */
export interface UkWhatIfVector extends Omit<UkTaxVector, "kind"> {
  kind: UkWhatIfVectorKind;
  feature: Exclude<UkTaxFeature, "core">;
}

export const UK_WHATIF_VECTOR_KINDS: readonly UkWhatIfVectorKind[] = [
  "hicbc",
  "takeHome",
  "whatIfDelta",
  "scottishMarginal",
  "studentLoanMulti",
  "reliefAtSource",
  "salarySacrificeCap2029",
];

export function selectUkWhatIfVectors(
  filter: {
    taxYear?: UkTaxVectorYear;
    region?: UkTaxVectorRegion;
    kind?: UkWhatIfVectorKind;
    feature?: UkWhatIfVector["feature"];
  } = {},
  vectors: readonly UkWhatIfVector[] = UK_WHATIF_VECTORS,
): UkWhatIfVector[] {
  return vectors.filter(
    (v) =>
      (filter.taxYear === undefined || v.taxYear === filter.taxYear) &&
      (filter.region === undefined || v.region === filter.region) &&
      (filter.kind === undefined || v.kind === filter.kind) &&
      (filter.feature === undefined || v.feature === filter.feature),
  );
}

export const UK_WHATIF_VECTORS: readonly UkWhatIfVector[] = [
  {
    id: "hicbc.2020-21.ani49999.children1",
    taxYear: "2020/21",
    region: "ENGLAND_NI_WALES",
    kind: "hicbc",
    feature: "hicbc",
    input: { adjustedNetIncome: 49999, children: 1 },
    expected: 0,
    source: "https://www.gov.uk/child-benefit-tax-charge",
    additionalSources: [
      "https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
    ],
    derivation:
      "Individual basis, claimant is the higher earner. Child Benefit 21.05/week x 52 = 1094.6; charge percentage: ANI 49999 is not over 50000, so no steps over the threshold, 0%; charge 1094.6 x 0% = 0. Rule: 1% of Child Benefit per full 100 of ANI over 50,000, tax years up to 2023/24 (GOV.UK child-benefit-tax-charge). The percentage is floored to a whole number per full step and capped at 100%. Weekly rate for 1 child(ren): eldest 21.05.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Child Benefit is assumed to be paid for 52 weeks a year; some tax years contain 53 Mondays, so the annual figure and the charge may differ (owner ruling pending); Child Benefit weekly rate for this year is not on a GOV.UK page reached (rate recalled from the uprating chain, unconfirmed).",
    signedOffBy: null,
  },
  {
    id: "hicbc.2020-21.ani50100.children1",
    taxYear: "2020/21",
    region: "ENGLAND_NI_WALES",
    kind: "hicbc",
    feature: "hicbc",
    input: { adjustedNetIncome: 50100, children: 1 },
    expected: 10.95,
    source: "https://www.gov.uk/child-benefit-tax-charge",
    additionalSources: [
      "https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
    ],
    derivation:
      "Individual basis, claimant is the higher earner. Child Benefit 21.05/week x 52 = 1094.6; charge percentage min(100, floor((ANI 50100 - 50000) / 100)) = 1%; charge 1094.6 x 1% = 10.95. Rule: 1% of Child Benefit per full 100 of ANI over 50,000, tax years up to 2023/24 (GOV.UK child-benefit-tax-charge). The percentage is floored to a whole number per full step and capped at 100%. Weekly rate for 1 child(ren): eldest 21.05.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Child Benefit is assumed to be paid for 52 weeks a year; some tax years contain 53 Mondays, so the annual figure and the charge may differ (owner ruling pending); Child Benefit weekly rate for this year is not on a GOV.UK page reached (rate recalled from the uprating chain, unconfirmed).",
    signedOffBy: null,
  },
  {
    id: "hicbc.2020-21.ani55000.children2",
    taxYear: "2020/21",
    region: "ENGLAND_NI_WALES",
    kind: "hicbc",
    feature: "hicbc",
    input: { adjustedNetIncome: 55000, children: 2 },
    expected: 910,
    source: "https://www.gov.uk/child-benefit-tax-charge",
    additionalSources: [
      "https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
    ],
    derivation:
      "Individual basis, claimant is the higher earner. Child Benefit 35/week x 52 = 1820; charge percentage min(100, floor((ANI 55000 - 50000) / 100)) = 50%; charge 1820 x 50% = 910. Rule: 1% of Child Benefit per full 100 of ANI over 50,000, tax years up to 2023/24 (GOV.UK child-benefit-tax-charge). The percentage is floored to a whole number per full step and capped at 100%. Weekly rate for 2 child(ren): eldest 21.05 + 1 x 13.95.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Child Benefit is assumed to be paid for 52 weeks a year; some tax years contain 53 Mondays, so the annual figure and the charge may differ (owner ruling pending); Child Benefit weekly rate for this year is not on a GOV.UK page reached (rate recalled from the uprating chain, unconfirmed).",
    signedOffBy: null,
  },
  {
    id: "hicbc.2020-21.ani60000.children1",
    taxYear: "2020/21",
    region: "ENGLAND_NI_WALES",
    kind: "hicbc",
    feature: "hicbc",
    input: { adjustedNetIncome: 60000, children: 1 },
    expected: 1094.6,
    source: "https://www.gov.uk/child-benefit-tax-charge",
    additionalSources: [
      "https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
    ],
    derivation:
      "Individual basis, claimant is the higher earner. Child Benefit 21.05/week x 52 = 1094.6; charge percentage min(100, floor((ANI 60000 - 50000) / 100)) = 100%; charge 1094.6 x 100% = 1094.6. Rule: 1% of Child Benefit per full 100 of ANI over 50,000, tax years up to 2023/24 (GOV.UK child-benefit-tax-charge). The percentage is floored to a whole number per full step and capped at 100%. Weekly rate for 1 child(ren): eldest 21.05.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Child Benefit is assumed to be paid for 52 weeks a year; some tax years contain 53 Mondays, so the annual figure and the charge may differ (owner ruling pending); Child Benefit weekly rate for this year is not on a GOV.UK page reached (rate recalled from the uprating chain, unconfirmed).",
    signedOffBy: null,
  },
  {
    id: "hicbc.2020-21.ani70000.children3",
    taxYear: "2020/21",
    region: "ENGLAND_NI_WALES",
    kind: "hicbc",
    feature: "hicbc",
    input: { adjustedNetIncome: 70000, children: 3 },
    expected: 2545.4,
    source: "https://www.gov.uk/child-benefit-tax-charge",
    additionalSources: [
      "https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
    ],
    derivation:
      "Individual basis, claimant is the higher earner. Child Benefit 48.95/week x 52 = 2545.4; charge percentage min(100, floor((ANI 70000 - 50000) / 100)) = 100%; charge 2545.4 x 100% = 2545.4. Rule: 1% of Child Benefit per full 100 of ANI over 50,000, tax years up to 2023/24 (GOV.UK child-benefit-tax-charge). The percentage is floored to a whole number per full step and capped at 100%. Weekly rate for 3 child(ren): eldest 21.05 + 2 x 13.95.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Child Benefit is assumed to be paid for 52 weeks a year; some tax years contain 53 Mondays, so the annual figure and the charge may differ (owner ruling pending); Child Benefit weekly rate for this year is not on a GOV.UK page reached (rate recalled from the uprating chain, unconfirmed).",
    signedOffBy: null,
  },
  {
    id: "hicbc.2021-22.ani49999.children1",
    taxYear: "2021/22",
    region: "ENGLAND_NI_WALES",
    kind: "hicbc",
    feature: "hicbc",
    input: { adjustedNetIncome: 49999, children: 1 },
    expected: 0,
    source: "https://www.gov.uk/child-benefit-tax-charge",
    additionalSources: [
      "https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
    ],
    derivation:
      "Individual basis, claimant is the higher earner. Child Benefit 21.15/week x 52 = 1099.8; charge percentage: ANI 49999 is not over 50000, so no steps over the threshold, 0%; charge 1099.8 x 0% = 0. Rule: 1% of Child Benefit per full 100 of ANI over 50,000, tax years up to 2023/24 (GOV.UK child-benefit-tax-charge). The percentage is floored to a whole number per full step and capped at 100%. Weekly rate for 1 child(ren): eldest 21.15.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Child Benefit is assumed to be paid for 52 weeks a year; some tax years contain 53 Mondays, so the annual figure and the charge may differ (owner ruling pending); Child Benefit weekly rate for this year is not on a GOV.UK page reached (rate recalled from the uprating chain, unconfirmed).",
    signedOffBy: null,
  },
  {
    id: "hicbc.2021-22.ani50100.children1",
    taxYear: "2021/22",
    region: "ENGLAND_NI_WALES",
    kind: "hicbc",
    feature: "hicbc",
    input: { adjustedNetIncome: 50100, children: 1 },
    expected: 11,
    source: "https://www.gov.uk/child-benefit-tax-charge",
    additionalSources: [
      "https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
    ],
    derivation:
      "Individual basis, claimant is the higher earner. Child Benefit 21.15/week x 52 = 1099.8; charge percentage min(100, floor((ANI 50100 - 50000) / 100)) = 1%; charge 1099.8 x 1% = 11. Rule: 1% of Child Benefit per full 100 of ANI over 50,000, tax years up to 2023/24 (GOV.UK child-benefit-tax-charge). The percentage is floored to a whole number per full step and capped at 100%. Weekly rate for 1 child(ren): eldest 21.15.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Child Benefit is assumed to be paid for 52 weeks a year; some tax years contain 53 Mondays, so the annual figure and the charge may differ (owner ruling pending); Child Benefit weekly rate for this year is not on a GOV.UK page reached (rate recalled from the uprating chain, unconfirmed).",
    signedOffBy: null,
  },
  {
    id: "hicbc.2021-22.ani55000.children2",
    taxYear: "2021/22",
    region: "ENGLAND_NI_WALES",
    kind: "hicbc",
    feature: "hicbc",
    input: { adjustedNetIncome: 55000, children: 2 },
    expected: 913.9,
    source: "https://www.gov.uk/child-benefit-tax-charge",
    additionalSources: [
      "https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
    ],
    derivation:
      "Individual basis, claimant is the higher earner. Child Benefit 35.15/week x 52 = 1827.8; charge percentage min(100, floor((ANI 55000 - 50000) / 100)) = 50%; charge 1827.8 x 50% = 913.9. Rule: 1% of Child Benefit per full 100 of ANI over 50,000, tax years up to 2023/24 (GOV.UK child-benefit-tax-charge). The percentage is floored to a whole number per full step and capped at 100%. Weekly rate for 2 child(ren): eldest 21.15 + 1 x 14.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Child Benefit is assumed to be paid for 52 weeks a year; some tax years contain 53 Mondays, so the annual figure and the charge may differ (owner ruling pending); Child Benefit weekly rate for this year is not on a GOV.UK page reached (rate recalled from the uprating chain, unconfirmed).",
    signedOffBy: null,
  },
  {
    id: "hicbc.2021-22.ani60000.children1",
    taxYear: "2021/22",
    region: "ENGLAND_NI_WALES",
    kind: "hicbc",
    feature: "hicbc",
    input: { adjustedNetIncome: 60000, children: 1 },
    expected: 1099.8,
    source: "https://www.gov.uk/child-benefit-tax-charge",
    additionalSources: [
      "https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
    ],
    derivation:
      "Individual basis, claimant is the higher earner. Child Benefit 21.15/week x 52 = 1099.8; charge percentage min(100, floor((ANI 60000 - 50000) / 100)) = 100%; charge 1099.8 x 100% = 1099.8. Rule: 1% of Child Benefit per full 100 of ANI over 50,000, tax years up to 2023/24 (GOV.UK child-benefit-tax-charge). The percentage is floored to a whole number per full step and capped at 100%. Weekly rate for 1 child(ren): eldest 21.15.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Child Benefit is assumed to be paid for 52 weeks a year; some tax years contain 53 Mondays, so the annual figure and the charge may differ (owner ruling pending); Child Benefit weekly rate for this year is not on a GOV.UK page reached (rate recalled from the uprating chain, unconfirmed).",
    signedOffBy: null,
  },
  {
    id: "hicbc.2021-22.ani70000.children3",
    taxYear: "2021/22",
    region: "ENGLAND_NI_WALES",
    kind: "hicbc",
    feature: "hicbc",
    input: { adjustedNetIncome: 70000, children: 3 },
    expected: 2555.8,
    source: "https://www.gov.uk/child-benefit-tax-charge",
    additionalSources: [
      "https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
    ],
    derivation:
      "Individual basis, claimant is the higher earner. Child Benefit 49.15/week x 52 = 2555.8; charge percentage min(100, floor((ANI 70000 - 50000) / 100)) = 100%; charge 2555.8 x 100% = 2555.8. Rule: 1% of Child Benefit per full 100 of ANI over 50,000, tax years up to 2023/24 (GOV.UK child-benefit-tax-charge). The percentage is floored to a whole number per full step and capped at 100%. Weekly rate for 3 child(ren): eldest 21.15 + 2 x 14.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Child Benefit is assumed to be paid for 52 weeks a year; some tax years contain 53 Mondays, so the annual figure and the charge may differ (owner ruling pending); Child Benefit weekly rate for this year is not on a GOV.UK page reached (rate recalled from the uprating chain, unconfirmed).",
    signedOffBy: null,
  },
  {
    id: "hicbc.2022-23.ani49999.children1",
    taxYear: "2022/23",
    region: "ENGLAND_NI_WALES",
    kind: "hicbc",
    feature: "hicbc",
    input: { adjustedNetIncome: 49999, children: 1 },
    expected: 0,
    source: "https://www.gov.uk/child-benefit-tax-charge",
    additionalSources: [
      "https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
      "https://www.legislation.gov.uk/uksi/2023/237/made",
    ],
    derivation:
      "Individual basis, claimant is the higher earner. Child Benefit 21.8/week x 52 = 1133.6; charge percentage: ANI 49999 is not over 50000, so no steps over the threshold, 0%; charge 1133.6 x 0% = 0. Rule: 1% of Child Benefit per full 100 of ANI over 50,000, tax years up to 2023/24 (GOV.UK child-benefit-tax-charge). The percentage is floored to a whole number per full step and capped at 100%. Weekly rate for 1 child(ren): eldest 21.8.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Child Benefit is assumed to be paid for 52 weeks a year; some tax years contain 53 Mondays, so the annual figure and the charge may differ (owner ruling pending).",
    signedOffBy: null,
  },
  {
    id: "hicbc.2022-23.ani50100.children1",
    taxYear: "2022/23",
    region: "ENGLAND_NI_WALES",
    kind: "hicbc",
    feature: "hicbc",
    input: { adjustedNetIncome: 50100, children: 1 },
    expected: 11.34,
    source: "https://www.gov.uk/child-benefit-tax-charge",
    additionalSources: [
      "https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
      "https://www.legislation.gov.uk/uksi/2023/237/made",
    ],
    derivation:
      "Individual basis, claimant is the higher earner. Child Benefit 21.8/week x 52 = 1133.6; charge percentage min(100, floor((ANI 50100 - 50000) / 100)) = 1%; charge 1133.6 x 1% = 11.34. Rule: 1% of Child Benefit per full 100 of ANI over 50,000, tax years up to 2023/24 (GOV.UK child-benefit-tax-charge). The percentage is floored to a whole number per full step and capped at 100%. Weekly rate for 1 child(ren): eldest 21.8.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Child Benefit is assumed to be paid for 52 weeks a year; some tax years contain 53 Mondays, so the annual figure and the charge may differ (owner ruling pending).",
    signedOffBy: null,
  },
  {
    id: "hicbc.2022-23.ani55000.children2",
    taxYear: "2022/23",
    region: "ENGLAND_NI_WALES",
    kind: "hicbc",
    feature: "hicbc",
    input: { adjustedNetIncome: 55000, children: 2 },
    expected: 942.5,
    source: "https://www.gov.uk/child-benefit-tax-charge",
    additionalSources: [
      "https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
      "https://www.legislation.gov.uk/uksi/2023/237/made",
    ],
    derivation:
      "Individual basis, claimant is the higher earner. Child Benefit 36.25/week x 52 = 1885; charge percentage min(100, floor((ANI 55000 - 50000) / 100)) = 50%; charge 1885 x 50% = 942.5. Rule: 1% of Child Benefit per full 100 of ANI over 50,000, tax years up to 2023/24 (GOV.UK child-benefit-tax-charge). The percentage is floored to a whole number per full step and capped at 100%. Weekly rate for 2 child(ren): eldest 21.8 + 1 x 14.45.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Child Benefit is assumed to be paid for 52 weeks a year; some tax years contain 53 Mondays, so the annual figure and the charge may differ (owner ruling pending).",
    signedOffBy: null,
  },
  {
    id: "hicbc.2022-23.ani60000.children1",
    taxYear: "2022/23",
    region: "ENGLAND_NI_WALES",
    kind: "hicbc",
    feature: "hicbc",
    input: { adjustedNetIncome: 60000, children: 1 },
    expected: 1133.6,
    source: "https://www.gov.uk/child-benefit-tax-charge",
    additionalSources: [
      "https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
      "https://www.legislation.gov.uk/uksi/2023/237/made",
    ],
    derivation:
      "Individual basis, claimant is the higher earner. Child Benefit 21.8/week x 52 = 1133.6; charge percentage min(100, floor((ANI 60000 - 50000) / 100)) = 100%; charge 1133.6 x 100% = 1133.6. Rule: 1% of Child Benefit per full 100 of ANI over 50,000, tax years up to 2023/24 (GOV.UK child-benefit-tax-charge). The percentage is floored to a whole number per full step and capped at 100%. Weekly rate for 1 child(ren): eldest 21.8.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Child Benefit is assumed to be paid for 52 weeks a year; some tax years contain 53 Mondays, so the annual figure and the charge may differ (owner ruling pending).",
    signedOffBy: null,
  },
  {
    id: "hicbc.2022-23.ani70000.children3",
    taxYear: "2022/23",
    region: "ENGLAND_NI_WALES",
    kind: "hicbc",
    feature: "hicbc",
    input: { adjustedNetIncome: 70000, children: 3 },
    expected: 2636.4,
    source: "https://www.gov.uk/child-benefit-tax-charge",
    additionalSources: [
      "https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
      "https://www.legislation.gov.uk/uksi/2023/237/made",
    ],
    derivation:
      "Individual basis, claimant is the higher earner. Child Benefit 50.7/week x 52 = 2636.4; charge percentage min(100, floor((ANI 70000 - 50000) / 100)) = 100%; charge 2636.4 x 100% = 2636.4. Rule: 1% of Child Benefit per full 100 of ANI over 50,000, tax years up to 2023/24 (GOV.UK child-benefit-tax-charge). The percentage is floored to a whole number per full step and capped at 100%. Weekly rate for 3 child(ren): eldest 21.8 + 2 x 14.45.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Child Benefit is assumed to be paid for 52 weeks a year; some tax years contain 53 Mondays, so the annual figure and the charge may differ (owner ruling pending).",
    signedOffBy: null,
  },
  {
    id: "hicbc.2023-24.ani49999.children1",
    taxYear: "2023/24",
    region: "ENGLAND_NI_WALES",
    kind: "hicbc",
    feature: "hicbc",
    input: { adjustedNetIncome: 49999, children: 1 },
    expected: 0,
    source: "https://www.gov.uk/child-benefit-tax-charge",
    additionalSources: [
      "https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
      "https://www.legislation.gov.uk/uksi/2023/237/made",
    ],
    derivation:
      "Individual basis, claimant is the higher earner. Child Benefit 24/week x 52 = 1248; charge percentage: ANI 49999 is not over 50000, so no steps over the threshold, 0%; charge 1248 x 0% = 0. Rule: 1% of Child Benefit per full 100 of ANI over 50,000, tax years up to 2023/24 (GOV.UK child-benefit-tax-charge). The percentage is floored to a whole number per full step and capped at 100%. Weekly rate for 1 child(ren): eldest 24.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Child Benefit is assumed to be paid for 52 weeks a year; some tax years contain 53 Mondays, so the annual figure and the charge may differ (owner ruling pending).",
    signedOffBy: null,
  },
  {
    id: "hicbc.2023-24.ani50100.children1",
    taxYear: "2023/24",
    region: "ENGLAND_NI_WALES",
    kind: "hicbc",
    feature: "hicbc",
    input: { adjustedNetIncome: 50100, children: 1 },
    expected: 12.48,
    source: "https://www.gov.uk/child-benefit-tax-charge",
    additionalSources: [
      "https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
      "https://www.legislation.gov.uk/uksi/2023/237/made",
    ],
    derivation:
      "Individual basis, claimant is the higher earner. Child Benefit 24/week x 52 = 1248; charge percentage min(100, floor((ANI 50100 - 50000) / 100)) = 1%; charge 1248 x 1% = 12.48. Rule: 1% of Child Benefit per full 100 of ANI over 50,000, tax years up to 2023/24 (GOV.UK child-benefit-tax-charge). The percentage is floored to a whole number per full step and capped at 100%. Weekly rate for 1 child(ren): eldest 24.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Child Benefit is assumed to be paid for 52 weeks a year; some tax years contain 53 Mondays, so the annual figure and the charge may differ (owner ruling pending).",
    signedOffBy: null,
  },
  {
    id: "hicbc.2023-24.ani55000.children2",
    taxYear: "2023/24",
    region: "ENGLAND_NI_WALES",
    kind: "hicbc",
    feature: "hicbc",
    input: { adjustedNetIncome: 55000, children: 2 },
    expected: 1037.4,
    source: "https://www.gov.uk/child-benefit-tax-charge",
    additionalSources: [
      "https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
      "https://www.legislation.gov.uk/uksi/2023/237/made",
    ],
    derivation:
      "Individual basis, claimant is the higher earner. Child Benefit 39.9/week x 52 = 2074.8; charge percentage min(100, floor((ANI 55000 - 50000) / 100)) = 50%; charge 2074.8 x 50% = 1037.4. Rule: 1% of Child Benefit per full 100 of ANI over 50,000, tax years up to 2023/24 (GOV.UK child-benefit-tax-charge). The percentage is floored to a whole number per full step and capped at 100%. Weekly rate for 2 child(ren): eldest 24 + 1 x 15.9.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Child Benefit is assumed to be paid for 52 weeks a year; some tax years contain 53 Mondays, so the annual figure and the charge may differ (owner ruling pending).",
    signedOffBy: null,
  },
  {
    id: "hicbc.2023-24.ani60000.children1",
    taxYear: "2023/24",
    region: "ENGLAND_NI_WALES",
    kind: "hicbc",
    feature: "hicbc",
    input: { adjustedNetIncome: 60000, children: 1 },
    expected: 1248,
    source: "https://www.gov.uk/child-benefit-tax-charge",
    additionalSources: [
      "https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
      "https://www.legislation.gov.uk/uksi/2023/237/made",
    ],
    derivation:
      "Individual basis, claimant is the higher earner. Child Benefit 24/week x 52 = 1248; charge percentage min(100, floor((ANI 60000 - 50000) / 100)) = 100%; charge 1248 x 100% = 1248. Rule: 1% of Child Benefit per full 100 of ANI over 50,000, tax years up to 2023/24 (GOV.UK child-benefit-tax-charge). The percentage is floored to a whole number per full step and capped at 100%. Weekly rate for 1 child(ren): eldest 24.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Child Benefit is assumed to be paid for 52 weeks a year; some tax years contain 53 Mondays, so the annual figure and the charge may differ (owner ruling pending).",
    signedOffBy: null,
  },
  {
    id: "hicbc.2023-24.ani70000.children3",
    taxYear: "2023/24",
    region: "ENGLAND_NI_WALES",
    kind: "hicbc",
    feature: "hicbc",
    input: { adjustedNetIncome: 70000, children: 3 },
    expected: 2901.6,
    source: "https://www.gov.uk/child-benefit-tax-charge",
    additionalSources: [
      "https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
      "https://www.legislation.gov.uk/uksi/2023/237/made",
    ],
    derivation:
      "Individual basis, claimant is the higher earner. Child Benefit 55.8/week x 52 = 2901.6; charge percentage min(100, floor((ANI 70000 - 50000) / 100)) = 100%; charge 2901.6 x 100% = 2901.6. Rule: 1% of Child Benefit per full 100 of ANI over 50,000, tax years up to 2023/24 (GOV.UK child-benefit-tax-charge). The percentage is floored to a whole number per full step and capped at 100%. Weekly rate for 3 child(ren): eldest 24 + 2 x 15.9.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Child Benefit is assumed to be paid for 52 weeks a year; some tax years contain 53 Mondays, so the annual figure and the charge may differ (owner ruling pending).",
    signedOffBy: null,
  },
  {
    id: "hicbc.2024-25.ani59999.children1",
    taxYear: "2024/25",
    region: "ENGLAND_NI_WALES",
    kind: "hicbc",
    feature: "hicbc",
    input: { adjustedNetIncome: 59999, children: 1 },
    expected: 0,
    source: "https://www.gov.uk/child-benefit-tax-charge",
    additionalSources: [
      "https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
      "https://www.legislation.gov.uk/uksi/2024/247/made",
    ],
    derivation:
      "Individual basis, claimant is the higher earner. Child Benefit 25.6/week x 52 = 1331.2; charge percentage: ANI 59999 is not over 60000, so no steps over the threshold, 0%; charge 1331.2 x 0% = 0. Rule: 1% of Child Benefit per full 200 of ANI over 60,000, tax years from 2024/25 (GOV.UK child-benefit-tax-charge). The percentage is floored to a whole number per full step and capped at 100%. Weekly rate for 1 child(ren): eldest 25.6.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Child Benefit is assumed to be paid for 52 weeks a year; some tax years contain 53 Mondays, so the annual figure and the charge may differ (owner ruling pending).",
    signedOffBy: null,
  },
  {
    id: "hicbc.2024-25.ani60200.children1",
    taxYear: "2024/25",
    region: "ENGLAND_NI_WALES",
    kind: "hicbc",
    feature: "hicbc",
    input: { adjustedNetIncome: 60200, children: 1 },
    expected: 13.31,
    source: "https://www.gov.uk/child-benefit-tax-charge",
    additionalSources: [
      "https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
      "https://www.legislation.gov.uk/uksi/2024/247/made",
    ],
    derivation:
      "Individual basis, claimant is the higher earner. Child Benefit 25.6/week x 52 = 1331.2; charge percentage min(100, floor((ANI 60200 - 60000) / 200)) = 1%; charge 1331.2 x 1% = 13.31. Rule: 1% of Child Benefit per full 200 of ANI over 60,000, tax years from 2024/25 (GOV.UK child-benefit-tax-charge). The percentage is floored to a whole number per full step and capped at 100%. Weekly rate for 1 child(ren): eldest 25.6.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Child Benefit is assumed to be paid for 52 weeks a year; some tax years contain 53 Mondays, so the annual figure and the charge may differ (owner ruling pending).",
    signedOffBy: null,
  },
  {
    id: "hicbc.2024-25.ani70000.children2",
    taxYear: "2024/25",
    region: "ENGLAND_NI_WALES",
    kind: "hicbc",
    feature: "hicbc",
    input: { adjustedNetIncome: 70000, children: 2 },
    expected: 1106.3,
    source: "https://www.gov.uk/child-benefit-tax-charge",
    additionalSources: [
      "https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
      "https://www.legislation.gov.uk/uksi/2024/247/made",
    ],
    derivation:
      "Individual basis, claimant is the higher earner. Child Benefit 42.55/week x 52 = 2212.6; charge percentage min(100, floor((ANI 70000 - 60000) / 200)) = 50%; charge 2212.6 x 50% = 1106.3. Rule: 1% of Child Benefit per full 200 of ANI over 60,000, tax years from 2024/25 (GOV.UK child-benefit-tax-charge). The percentage is floored to a whole number per full step and capped at 100%. Weekly rate for 2 child(ren): eldest 25.6 + 1 x 16.95.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Child Benefit is assumed to be paid for 52 weeks a year; some tax years contain 53 Mondays, so the annual figure and the charge may differ (owner ruling pending).",
    signedOffBy: null,
  },
  {
    id: "hicbc.2024-25.ani79800.children1",
    taxYear: "2024/25",
    region: "ENGLAND_NI_WALES",
    kind: "hicbc",
    feature: "hicbc",
    input: { adjustedNetIncome: 79800, children: 1 },
    expected: 1317.89,
    source: "https://www.gov.uk/child-benefit-tax-charge",
    additionalSources: [
      "https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
      "https://www.legislation.gov.uk/uksi/2024/247/made",
    ],
    derivation:
      "Individual basis, claimant is the higher earner. Child Benefit 25.6/week x 52 = 1331.2; charge percentage min(100, floor((ANI 79800 - 60000) / 200)) = 99%; charge 1331.2 x 99% = 1317.89. Rule: 1% of Child Benefit per full 200 of ANI over 60,000, tax years from 2024/25 (GOV.UK child-benefit-tax-charge). The percentage is floored to a whole number per full step and capped at 100%. Weekly rate for 1 child(ren): eldest 25.6.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Child Benefit is assumed to be paid for 52 weeks a year; some tax years contain 53 Mondays, so the annual figure and the charge may differ (owner ruling pending).",
    signedOffBy: null,
  },
  {
    id: "hicbc.2024-25.ani80000.children3",
    taxYear: "2024/25",
    region: "ENGLAND_NI_WALES",
    kind: "hicbc",
    feature: "hicbc",
    input: { adjustedNetIncome: 80000, children: 3 },
    expected: 3094,
    source: "https://www.gov.uk/child-benefit-tax-charge",
    additionalSources: [
      "https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
      "https://www.legislation.gov.uk/uksi/2024/247/made",
    ],
    derivation:
      "Individual basis, claimant is the higher earner. Child Benefit 59.5/week x 52 = 3094; charge percentage min(100, floor((ANI 80000 - 60000) / 200)) = 100%; charge 3094 x 100% = 3094. Rule: 1% of Child Benefit per full 200 of ANI over 60,000, tax years from 2024/25 (GOV.UK child-benefit-tax-charge). The percentage is floored to a whole number per full step and capped at 100%. Weekly rate for 3 child(ren): eldest 25.6 + 2 x 16.95.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Child Benefit is assumed to be paid for 52 weeks a year; some tax years contain 53 Mondays, so the annual figure and the charge may differ (owner ruling pending).",
    signedOffBy: null,
  },
  {
    id: "hicbc.2025-26.ani59999.children1",
    taxYear: "2025/26",
    region: "ENGLAND_NI_WALES",
    kind: "hicbc",
    feature: "hicbc",
    input: { adjustedNetIncome: 59999, children: 1 },
    expected: 0,
    source: "https://www.gov.uk/child-benefit-tax-charge",
    additionalSources: [
      "https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
    ],
    derivation:
      "Individual basis, claimant is the higher earner. Child Benefit 26.05/week x 52 = 1354.6; charge percentage: ANI 59999 is not over 60000, so no steps over the threshold, 0%; charge 1354.6 x 0% = 0. Rule: 1% of Child Benefit per full 200 of ANI over 60,000, tax years from 2024/25 (GOV.UK child-benefit-tax-charge). The percentage is floored to a whole number per full step and capped at 100%. Weekly rate for 1 child(ren): eldest 26.05.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Child Benefit is assumed to be paid for 52 weeks a year; some tax years contain 53 Mondays, so the annual figure and the charge may differ (owner ruling pending).",
    signedOffBy: null,
  },
  {
    id: "hicbc.2025-26.ani60200.children1",
    taxYear: "2025/26",
    region: "ENGLAND_NI_WALES",
    kind: "hicbc",
    feature: "hicbc",
    input: { adjustedNetIncome: 60200, children: 1 },
    expected: 13.55,
    source: "https://www.gov.uk/child-benefit-tax-charge",
    additionalSources: [
      "https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
    ],
    derivation:
      "Individual basis, claimant is the higher earner. Child Benefit 26.05/week x 52 = 1354.6; charge percentage min(100, floor((ANI 60200 - 60000) / 200)) = 1%; charge 1354.6 x 1% = 13.55. Rule: 1% of Child Benefit per full 200 of ANI over 60,000, tax years from 2024/25 (GOV.UK child-benefit-tax-charge). The percentage is floored to a whole number per full step and capped at 100%. Weekly rate for 1 child(ren): eldest 26.05.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Child Benefit is assumed to be paid for 52 weeks a year; some tax years contain 53 Mondays, so the annual figure and the charge may differ (owner ruling pending).",
    signedOffBy: null,
  },
  {
    id: "hicbc.2025-26.ani70000.children2",
    taxYear: "2025/26",
    region: "ENGLAND_NI_WALES",
    kind: "hicbc",
    feature: "hicbc",
    input: { adjustedNetIncome: 70000, children: 2 },
    expected: 1125.8,
    source: "https://www.gov.uk/child-benefit-tax-charge",
    additionalSources: [
      "https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
    ],
    derivation:
      "Individual basis, claimant is the higher earner. Child Benefit 43.3/week x 52 = 2251.6; charge percentage min(100, floor((ANI 70000 - 60000) / 200)) = 50%; charge 2251.6 x 50% = 1125.8. Rule: 1% of Child Benefit per full 200 of ANI over 60,000, tax years from 2024/25 (GOV.UK child-benefit-tax-charge). The percentage is floored to a whole number per full step and capped at 100%. Weekly rate for 2 child(ren): eldest 26.05 + 1 x 17.25.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Child Benefit is assumed to be paid for 52 weeks a year; some tax years contain 53 Mondays, so the annual figure and the charge may differ (owner ruling pending).",
    signedOffBy: null,
  },
  {
    id: "hicbc.2025-26.ani79800.children1",
    taxYear: "2025/26",
    region: "ENGLAND_NI_WALES",
    kind: "hicbc",
    feature: "hicbc",
    input: { adjustedNetIncome: 79800, children: 1 },
    expected: 1341.05,
    source: "https://www.gov.uk/child-benefit-tax-charge",
    additionalSources: [
      "https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
    ],
    derivation:
      "Individual basis, claimant is the higher earner. Child Benefit 26.05/week x 52 = 1354.6; charge percentage min(100, floor((ANI 79800 - 60000) / 200)) = 99%; charge 1354.6 x 99% = 1341.05. Rule: 1% of Child Benefit per full 200 of ANI over 60,000, tax years from 2024/25 (GOV.UK child-benefit-tax-charge). The percentage is floored to a whole number per full step and capped at 100%. Weekly rate for 1 child(ren): eldest 26.05.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Child Benefit is assumed to be paid for 52 weeks a year; some tax years contain 53 Mondays, so the annual figure and the charge may differ (owner ruling pending).",
    signedOffBy: null,
  },
  {
    id: "hicbc.2025-26.ani80000.children3",
    taxYear: "2025/26",
    region: "ENGLAND_NI_WALES",
    kind: "hicbc",
    feature: "hicbc",
    input: { adjustedNetIncome: 80000, children: 3 },
    expected: 3148.6,
    source: "https://www.gov.uk/child-benefit-tax-charge",
    additionalSources: [
      "https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
    ],
    derivation:
      "Individual basis, claimant is the higher earner. Child Benefit 60.55/week x 52 = 3148.6; charge percentage min(100, floor((ANI 80000 - 60000) / 200)) = 100%; charge 3148.6 x 100% = 3148.6. Rule: 1% of Child Benefit per full 200 of ANI over 60,000, tax years from 2024/25 (GOV.UK child-benefit-tax-charge). The percentage is floored to a whole number per full step and capped at 100%. Weekly rate for 3 child(ren): eldest 26.05 + 2 x 17.25.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Child Benefit is assumed to be paid for 52 weeks a year; some tax years contain 53 Mondays, so the annual figure and the charge may differ (owner ruling pending).",
    signedOffBy: null,
  },
  {
    id: "hicbc.2026-27.ani59999.children1",
    taxYear: "2026/27",
    region: "ENGLAND_NI_WALES",
    kind: "hicbc",
    feature: "hicbc",
    input: { adjustedNetIncome: 59999, children: 1 },
    expected: 0,
    source: "https://www.gov.uk/child-benefit-tax-charge",
    additionalSources: [
      "https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
    ],
    derivation:
      "Individual basis, claimant is the higher earner. Child Benefit 27.05/week x 52 = 1406.6; charge percentage: ANI 59999 is not over 60000, so no steps over the threshold, 0%; charge 1406.6 x 0% = 0. Rule: 1% of Child Benefit per full 200 of ANI over 60,000, tax years from 2024/25 (GOV.UK child-benefit-tax-charge). The percentage is floored to a whole number per full step and capped at 100%. Weekly rate for 1 child(ren): eldest 27.05.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Child Benefit is assumed to be paid for 52 weeks a year; some tax years contain 53 Mondays, so the annual figure and the charge may differ (owner ruling pending).",
    signedOffBy: null,
  },
  {
    id: "hicbc.2026-27.ani60200.children1",
    taxYear: "2026/27",
    region: "ENGLAND_NI_WALES",
    kind: "hicbc",
    feature: "hicbc",
    input: { adjustedNetIncome: 60200, children: 1 },
    expected: 14.07,
    source: "https://www.gov.uk/child-benefit-tax-charge",
    additionalSources: [
      "https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
    ],
    derivation:
      "Individual basis, claimant is the higher earner. Child Benefit 27.05/week x 52 = 1406.6; charge percentage min(100, floor((ANI 60200 - 60000) / 200)) = 1%; charge 1406.6 x 1% = 14.07. Rule: 1% of Child Benefit per full 200 of ANI over 60,000, tax years from 2024/25 (GOV.UK child-benefit-tax-charge). The percentage is floored to a whole number per full step and capped at 100%. Weekly rate for 1 child(ren): eldest 27.05.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Child Benefit is assumed to be paid for 52 weeks a year; some tax years contain 53 Mondays, so the annual figure and the charge may differ (owner ruling pending).",
    signedOffBy: null,
  },
  {
    id: "hicbc.2026-27.ani70000.children2",
    taxYear: "2026/27",
    region: "ENGLAND_NI_WALES",
    kind: "hicbc",
    feature: "hicbc",
    input: { adjustedNetIncome: 70000, children: 2 },
    expected: 1168.7,
    source: "https://www.gov.uk/child-benefit-tax-charge",
    additionalSources: [
      "https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
    ],
    derivation:
      "Individual basis, claimant is the higher earner. Child Benefit 44.95/week x 52 = 2337.4; charge percentage min(100, floor((ANI 70000 - 60000) / 200)) = 50%; charge 2337.4 x 50% = 1168.7. Rule: 1% of Child Benefit per full 200 of ANI over 60,000, tax years from 2024/25 (GOV.UK child-benefit-tax-charge). The percentage is floored to a whole number per full step and capped at 100%. Weekly rate for 2 child(ren): eldest 27.05 + 1 x 17.9.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Child Benefit is assumed to be paid for 52 weeks a year; some tax years contain 53 Mondays, so the annual figure and the charge may differ (owner ruling pending).",
    signedOffBy: null,
  },
  {
    id: "hicbc.2026-27.ani79800.children1",
    taxYear: "2026/27",
    region: "ENGLAND_NI_WALES",
    kind: "hicbc",
    feature: "hicbc",
    input: { adjustedNetIncome: 79800, children: 1 },
    expected: 1392.53,
    source: "https://www.gov.uk/child-benefit-tax-charge",
    additionalSources: [
      "https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
    ],
    derivation:
      "Individual basis, claimant is the higher earner. Child Benefit 27.05/week x 52 = 1406.6; charge percentage min(100, floor((ANI 79800 - 60000) / 200)) = 99%; charge 1406.6 x 99% = 1392.53. Rule: 1% of Child Benefit per full 200 of ANI over 60,000, tax years from 2024/25 (GOV.UK child-benefit-tax-charge). The percentage is floored to a whole number per full step and capped at 100%. Weekly rate for 1 child(ren): eldest 27.05.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Child Benefit is assumed to be paid for 52 weeks a year; some tax years contain 53 Mondays, so the annual figure and the charge may differ (owner ruling pending).",
    signedOffBy: null,
  },
  {
    id: "hicbc.2026-27.ani80000.children3",
    taxYear: "2026/27",
    region: "ENGLAND_NI_WALES",
    kind: "hicbc",
    feature: "hicbc",
    input: { adjustedNetIncome: 80000, children: 3 },
    expected: 3268.2,
    source: "https://www.gov.uk/child-benefit-tax-charge",
    additionalSources: [
      "https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
    ],
    derivation:
      "Individual basis, claimant is the higher earner. Child Benefit 62.85/week x 52 = 3268.2; charge percentage min(100, floor((ANI 80000 - 60000) / 200)) = 100%; charge 3268.2 x 100% = 3268.2. Rule: 1% of Child Benefit per full 200 of ANI over 60,000, tax years from 2024/25 (GOV.UK child-benefit-tax-charge). The percentage is floored to a whole number per full step and capped at 100%. Weekly rate for 3 child(ren): eldest 27.05 + 2 x 17.9.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Child Benefit is assumed to be paid for 52 weeks a year; some tax years contain 53 Mondays, so the annual figure and the charge may differ (owner ruling pending).",
    signedOffBy: null,
  },
  {
    id: "takeHome.2026-27.ewni.30000.none0",
    taxYear: "2026/27",
    region: "ENGLAND_NI_WALES",
    kind: "takeHome",
    feature: "whatIf",
    input: {
      salary: 30000,
      pensionMethod: "none",
      pensionAmount: 0,
      studentLoanPlans: "",
      children: 0,
    },
    expected: 25119.6,
    source:
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    additionalSources: [
      "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027",
    ],
    derivation:
      "Annual method. PA 12570 (no taper at ANI 30000); taxable 30000 - 12570 = 17430; basic 17430 x 20% = 3486; higher 0 x 40% = 0; additional 0 x 45% = 0; income tax 3486; NI on 30000: 17430 x 8% + 0 x 2% = 1394.4. Take-home = 30000 - tax 3486 - NI 1394.4 = 25119.6.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "takeHome.2026-27.ewni.60000.salary-sacrifice3000",
    taxYear: "2026/27",
    region: "ENGLAND_NI_WALES",
    kind: "takeHome",
    feature: "whatIf",
    input: {
      salary: 60000,
      pensionMethod: "salary-sacrifice",
      pensionAmount: 3000,
      studentLoanPlans: "",
      children: 0,
    },
    expected: 43617.4,
    source:
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    additionalSources: [
      "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027",
    ],
    derivation:
      "Annual method. salary sacrifice 3000 reduces pay for tax, NI and student loan: 57000; PA 12570 (no taper at ANI 57000); taxable 57000 - 12570 = 44430; basic 37700 x 20% = 7540; higher 6730 x 40% = 2692; additional 0 x 45% = 0; income tax 10232; NI on 57000: 37700 x 8% + 6730 x 2% = 3150.6. Take-home = 60000 - pension 3000 - tax 10232 - NI 3150.6 = 43617.4.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "takeHome.2026-27.ewni.60000.net-pay3000",
    taxYear: "2026/27",
    region: "ENGLAND_NI_WALES",
    kind: "takeHome",
    feature: "whatIf",
    input: {
      salary: 60000,
      pensionMethod: "net-pay",
      pensionAmount: 3000,
      studentLoanPlans: "",
      children: 0,
    },
    expected: 43557.4,
    source:
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    additionalSources: [
      "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027",
    ],
    derivation:
      "Annual method. net-pay contribution 3000 deducted before tax: 57000; NI and student loan still on 60000; PA 12570 (no taper at ANI 57000); taxable 57000 - 12570 = 44430; basic 37700 x 20% = 7540; higher 6730 x 40% = 2692; additional 0 x 45% = 0; income tax 10232; NI on 60000: 37700 x 8% + 9730 x 2% = 3210.6. Take-home = 60000 - pension 3000 - tax 10232 - NI 3210.6 = 43557.4.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: net-pay treatment of the pension is the engine's pinned UNVERIFIED behaviour (UK_TAX_PENSION_TREATMENT).",
    signedOffBy: null,
  },
  {
    id: "takeHome.2026-27.ewni.60000.relief-at-source3000",
    taxYear: "2026/27",
    region: "ENGLAND_NI_WALES",
    kind: "takeHome",
    feature: "whatIf",
    input: {
      salary: 60000,
      pensionMethod: "relief-at-source",
      pensionAmount: 3000,
      studentLoanPlans: "",
      children: 0,
    },
    expected: 43107.4,
    source:
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    additionalSources: [
      "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027",
    ],
    derivation:
      "Annual method. relief at source: net 3000 grossed up x 1.25 = 3750; basic band extended and ANI reduced by it; 3000 paid from take-home; PA 12570 (no taper at ANI 56250); taxable 60000 - 12570 = 47430; basic 41450 x 20% = 8290; higher 5980 x 40% = 2392; additional 0 x 45% = 0; income tax 10682; NI on 60000: 37700 x 8% + 9730 x 2% = 3210.6. Take-home = 60000 - net contribution 3000 - tax 10682 - NI 3210.6 = 43107.4.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: relief-at-source band extension rests on ITA 2007 s.414, no GOV.UK page read for it.",
    signedOffBy: null,
  },
  {
    id: "takeHome.2026-27.ewni.70000.none0.plan2.children2",
    taxYear: "2026/27",
    region: "ENGLAND_NI_WALES",
    kind: "takeHome",
    feature: "whatIf",
    input: {
      salary: 70000,
      pensionMethod: "none",
      pensionAmount: 0,
      studentLoanPlans: "plan2",
      children: 2,
    },
    expected: 46333.35,
    source:
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    additionalSources: [
      "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027",
      "https://www.gov.uk/child-benefit-tax-charge",
      "https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
    ],
    derivation:
      "Annual method. PA 12570 (no taper at ANI 70000); taxable 70000 - 12570 = 57430; basic 37700 x 20% = 7540; higher 19730 x 40% = 7892; additional 0 x 45% = 0; income tax 15432; NI on 70000: 37700 x 8% + 19730 x 2% = 3410.6; student loan plan2 (70000 - 29385) x 9% = 3655.35 = 3655.35; HICBC Child Benefit 44.95/week x 52 = 2337.4; charge percentage min(100, floor((ANI 70000 - 60000) / 200)) = 50%; charge 2337.4 x 50% = 1168.7. Take-home = 70000 - tax 15432 - NI 3410.6 - student loan 3655.35 - HICBC 1168.7 = 46333.35.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Child Benefit is assumed to be paid for 52 weeks a year; some tax years contain 53 Mondays, so the annual figure and the charge may differ (owner ruling pending).",
    signedOffBy: null,
  },
  {
    id: "takeHome.2026-27.scot.45000.none0.plan4",
    taxYear: "2026/27",
    region: "SCOTLAND",
    kind: "takeHome",
    feature: "whatIf",
    input: {
      salary: 45000,
      pensionMethod: "none",
      pensionAmount: 0,
      studentLoanPlans: "plan4",
      children: 0,
    },
    expected: 34515.1,
    source: "https://www.gov.uk/income-tax-rates",
    additionalSources: [
      "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027",
    ],
    derivation:
      "Annual method. PA 12570 (no taper at ANI 45000); taxable 45000 - 12570 = 32430; starter 3967 x 19% = 753.73; basic 12989 x 20% = 2597.8; intermediate 14136 x 21% = 2968.56; higher 1338 x 42% = 561.96; advanced 0 x 45% = 0; top 0 x 48% = 0; income tax 6882.05; NI on 45000: 32430 x 8% + 0 x 2% = 2594.4; student loan plan4 (45000 - 33795) x 9% = 1008.45 = 1008.45. Take-home = 45000 - tax 6882.05 - NI 2594.4 - student loan 1008.45 = 34515.1.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Scottish advanced/top boundary 125,140 is a published figure but its frame (taxable vs gross) is ambiguous between GOV.UK pages.",
    signedOffBy: null,
  },
  {
    id: "takeHome.2025-26.ewni.60000.salary-sacrifice3000",
    taxYear: "2025/26",
    region: "ENGLAND_NI_WALES",
    kind: "takeHome",
    feature: "whatIf",
    input: {
      salary: 60000,
      pensionMethod: "salary-sacrifice",
      pensionAmount: 3000,
      studentLoanPlans: "",
      children: 0,
    },
    expected: 43617.4,
    source:
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    additionalSources: [
      "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2025-to-2026",
    ],
    derivation:
      "Annual method. salary sacrifice 3000 reduces pay for tax, NI and student loan: 57000; PA 12570 (no taper at ANI 57000); taxable 57000 - 12570 = 44430; basic 37700 x 20% = 7540; higher 6730 x 40% = 2692; additional 0 x 45% = 0; income tax 10232; NI on 57000: 37700 x 8% + 6730 x 2% = 3150.6. Take-home = 60000 - pension 3000 - tax 10232 - NI 3150.6 = 43617.4.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "takeHome.2025-26.ewni.60000.net-pay3000",
    taxYear: "2025/26",
    region: "ENGLAND_NI_WALES",
    kind: "takeHome",
    feature: "whatIf",
    input: {
      salary: 60000,
      pensionMethod: "net-pay",
      pensionAmount: 3000,
      studentLoanPlans: "",
      children: 0,
    },
    expected: 43557.4,
    source:
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    additionalSources: [
      "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2025-to-2026",
    ],
    derivation:
      "Annual method. net-pay contribution 3000 deducted before tax: 57000; NI and student loan still on 60000; PA 12570 (no taper at ANI 57000); taxable 57000 - 12570 = 44430; basic 37700 x 20% = 7540; higher 6730 x 40% = 2692; additional 0 x 45% = 0; income tax 10232; NI on 60000: 37700 x 8% + 9730 x 2% = 3210.6. Take-home = 60000 - pension 3000 - tax 10232 - NI 3210.6 = 43557.4.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: net-pay treatment of the pension is the engine's pinned UNVERIFIED behaviour (UK_TAX_PENSION_TREATMENT).",
    signedOffBy: null,
  },
  {
    id: "takeHome.2025-26.ewni.70000.none0.plan2+postgrad.children2",
    taxYear: "2025/26",
    region: "ENGLAND_NI_WALES",
    kind: "takeHome",
    feature: "whatIf",
    input: {
      salary: 70000,
      pensionMethod: "none",
      pensionAmount: 0,
      studentLoanPlans: "plan2+postgrad",
      children: 2,
    },
    expected: 43353.9,
    source:
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    additionalSources: [
      "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2025-to-2026",
      "https://www.gov.uk/child-benefit-tax-charge",
      "https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
    ],
    derivation:
      "Annual method. PA 12570 (no taper at ANI 70000); taxable 70000 - 12570 = 57430; basic 37700 x 20% = 7540; higher 19730 x 40% = 7892; additional 0 x 45% = 0; income tax 15432; NI on 70000: 37700 x 8% + 19730 x 2% = 3410.6; student loan plan2 (70000 - 28470) x 9% = 3737.7; postgrad (70000 - 21000) x 6% = 2940 = 6677.7; HICBC Child Benefit 43.3/week x 52 = 2251.6; charge percentage min(100, floor((ANI 70000 - 60000) / 200)) = 50%; charge 2251.6 x 50% = 1125.8. Take-home = 70000 - tax 15432 - NI 3410.6 - student loan 6677.7 - HICBC 1125.8 = 43353.9.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Child Benefit is assumed to be paid for 52 weeks a year; some tax years contain 53 Mondays, so the annual figure and the charge may differ (owner ruling pending).",
    signedOffBy: null,
  },
  {
    id: "takeHome.2025-26.scot.60000.none0",
    taxYear: "2025/26",
    region: "SCOTLAND",
    kind: "takeHome",
    feature: "whatIf",
    input: {
      salary: 60000,
      pensionMethod: "none",
      pensionAmount: 0,
      studentLoanPlans: "",
      children: 0,
    },
    expected: 43575.6,
    source: "https://www.gov.uk/income-tax-rates",
    additionalSources: [
      "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2025-to-2026",
    ],
    derivation:
      "Annual method. PA 12570 (no taper at ANI 60000); taxable 60000 - 12570 = 47430; starter 2827 x 19% = 537.13; basic 12094 x 20% = 2418.8; intermediate 16171 x 21% = 3395.91; higher 16338 x 42% = 6861.96; advanced 0 x 45% = 0; top 0 x 48% = 0; income tax 13213.8; NI on 60000: 37700 x 8% + 9730 x 2% = 3210.6. Take-home = 60000 - tax 13213.8 - NI 3210.6 = 43575.6.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "takeHome.2024-25.ewni.30000.none0",
    taxYear: "2024/25",
    region: "ENGLAND_NI_WALES",
    kind: "takeHome",
    feature: "whatIf",
    input: {
      salary: 30000,
      pensionMethod: "none",
      pensionAmount: 0,
      studentLoanPlans: "",
      children: 0,
    },
    expected: 25119.6,
    source:
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    additionalSources: [
      "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2024-to-2025",
    ],
    derivation:
      "Annual method. PA 12570 (no taper at ANI 30000); taxable 30000 - 12570 = 17430; basic 17430 x 20% = 3486; higher 0 x 40% = 0; additional 0 x 45% = 0; income tax 3486; NI on 30000: 17430 x 8% + 0 x 2% = 1394.4. Take-home = 30000 - tax 3486 - NI 1394.4 = 25119.6.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "takeHome.2024-25.ewni.60000.salary-sacrifice3000",
    taxYear: "2024/25",
    region: "ENGLAND_NI_WALES",
    kind: "takeHome",
    feature: "whatIf",
    input: {
      salary: 60000,
      pensionMethod: "salary-sacrifice",
      pensionAmount: 3000,
      studentLoanPlans: "",
      children: 0,
    },
    expected: 43617.4,
    source:
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    additionalSources: [
      "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2024-to-2025",
    ],
    derivation:
      "Annual method. salary sacrifice 3000 reduces pay for tax, NI and student loan: 57000; PA 12570 (no taper at ANI 57000); taxable 57000 - 12570 = 44430; basic 37700 x 20% = 7540; higher 6730 x 40% = 2692; additional 0 x 45% = 0; income tax 10232; NI on 57000: 37700 x 8% + 6730 x 2% = 3150.6. Take-home = 60000 - pension 3000 - tax 10232 - NI 3150.6 = 43617.4.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "whatIfDelta.2026-27.ewni.99500.plus1000",
    taxYear: "2026/27",
    region: "ENGLAND_NI_WALES",
    kind: "whatIfDelta",
    feature: "whatIf",
    input: { salary: 99500, deltaGross: 1000, children: 0 },
    expected: 480,
    source:
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    additionalSources: [
      "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027",
    ],
    derivation:
      "Change in annual take-home for +1000 gross. At 99500: PA 12570 (no taper at ANI 99500); taxable 99500 - 12570 = 86930; basic 37700 x 20% = 7540; higher 49230 x 40% = 19692; additional 0 x 45% = 0; income tax 27232; NI on 99500: 37700 x 8% + 49230 x 2% = 4000.6. Take-home = 99500 - tax 27232 - NI 4000.6 = 68267.4. At 100500: PA 12570 - floor((ANI 100500 - 100000) / 2) = 12570 - 250 = 12320; taxable 100500 - 12320 = 88180; basic 37700 x 20% = 7540; higher 50480 x 40% = 20192; additional 0 x 45% = 0; income tax 27732; NI on 100500: 37700 x 8% + 50230 x 2% = 4020.6. Take-home = 100500 - tax 27732 - NI 4020.6 = 68747.4. Delta = 1000 - tax change 500 - NI change 20 = 480 (effective marginal rate 52%).",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "whatIfDelta.2026-27.ewni.100000.plus1000",
    taxYear: "2026/27",
    region: "ENGLAND_NI_WALES",
    kind: "whatIfDelta",
    feature: "whatIf",
    input: { salary: 100000, deltaGross: 1000, children: 0 },
    expected: 380,
    source:
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    additionalSources: [
      "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027",
    ],
    derivation:
      "Change in annual take-home for +1000 gross. At 100000: PA 12570 (no taper at ANI 100000); taxable 100000 - 12570 = 87430; basic 37700 x 20% = 7540; higher 49730 x 40% = 19892; additional 0 x 45% = 0; income tax 27432; NI on 100000: 37700 x 8% + 49730 x 2% = 4010.6. Take-home = 100000 - tax 27432 - NI 4010.6 = 68557.4. At 101000: PA 12570 - floor((ANI 101000 - 100000) / 2) = 12570 - 500 = 12070; taxable 101000 - 12070 = 88930; basic 37700 x 20% = 7540; higher 51230 x 40% = 20492; additional 0 x 45% = 0; income tax 28032; NI on 101000: 37700 x 8% + 50730 x 2% = 4030.6. Take-home = 101000 - tax 28032 - NI 4030.6 = 68937.4. Delta = 1000 - tax change 600 - NI change 20 = 380 (effective marginal rate 62%).",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "whatIfDelta.2026-27.ewni.125000.plus1000",
    taxYear: "2026/27",
    region: "ENGLAND_NI_WALES",
    kind: "whatIfDelta",
    feature: "whatIf",
    input: { salary: 125000, deltaGross: 1000, children: 0 },
    expected: 509,
    source:
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    additionalSources: [
      "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027",
    ],
    derivation:
      "Change in annual take-home for +1000 gross. At 125000: PA 12570 - floor((ANI 125000 - 100000) / 2) = 12570 - 12500 = 70; taxable 125000 - 70 = 124930; basic 37700 x 20% = 7540; higher 87230 x 40% = 34892; additional 0 x 45% = 0; income tax 42432; NI on 125000: 37700 x 8% + 74730 x 2% = 4510.6. Take-home = 125000 - tax 42432 - NI 4510.6 = 78057.4. At 126000: PA 12570 - floor((ANI 126000 - 100000) / 2) = 12570 - 13000 = 0; taxable 126000 - 0 = 126000; basic 37700 x 20% = 7540; higher 87440 x 40% = 34976; additional 860 x 45% = 387; income tax 42903; NI on 126000: 37700 x 8% + 75730 x 2% = 4530.6. Take-home = 126000 - tax 42903 - NI 4530.6 = 78566.4. Delta = 1000 - tax change 471 - NI change 20 = 509 (effective marginal rate 49.1%).",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "whatIfDelta.2026-27.ewni.50270.plus1000",
    taxYear: "2026/27",
    region: "ENGLAND_NI_WALES",
    kind: "whatIfDelta",
    feature: "whatIf",
    input: { salary: 50270, deltaGross: 1000, children: 0 },
    expected: 580,
    source:
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    additionalSources: [
      "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027",
    ],
    derivation:
      "Change in annual take-home for +1000 gross. At 50270: PA 12570 (no taper at ANI 50270); taxable 50270 - 12570 = 37700; basic 37700 x 20% = 7540; higher 0 x 40% = 0; additional 0 x 45% = 0; income tax 7540; NI on 50270: 37700 x 8% + 0 x 2% = 3016. Take-home = 50270 - tax 7540 - NI 3016 = 39714. At 51270: PA 12570 (no taper at ANI 51270); taxable 51270 - 12570 = 38700; basic 37700 x 20% = 7540; higher 1000 x 40% = 400; additional 0 x 45% = 0; income tax 7940; NI on 51270: 37700 x 8% + 1000 x 2% = 3036. Take-home = 51270 - tax 7940 - NI 3036 = 40294. Delta = 1000 - tax change 400 - NI change 20 = 580 (effective marginal rate 42%).",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "whatIfDelta.2026-27.ewni.60000.plus1000",
    taxYear: "2026/27",
    region: "ENGLAND_NI_WALES",
    kind: "whatIfDelta",
    feature: "whatIf",
    input: { salary: 60000, deltaGross: 1000, children: 0 },
    expected: 580,
    source:
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    additionalSources: [
      "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027",
    ],
    derivation:
      "Change in annual take-home for +1000 gross. At 60000: PA 12570 (no taper at ANI 60000); taxable 60000 - 12570 = 47430; basic 37700 x 20% = 7540; higher 9730 x 40% = 3892; additional 0 x 45% = 0; income tax 11432; NI on 60000: 37700 x 8% + 9730 x 2% = 3210.6. Take-home = 60000 - tax 11432 - NI 3210.6 = 45357.4. At 61000: PA 12570 (no taper at ANI 61000); taxable 61000 - 12570 = 48430; basic 37700 x 20% = 7540; higher 10730 x 40% = 4292; additional 0 x 45% = 0; income tax 11832; NI on 61000: 37700 x 8% + 10730 x 2% = 3230.6. Take-home = 61000 - tax 11832 - NI 3230.6 = 45937.4. Delta = 1000 - tax change 400 - NI change 20 = 580 (effective marginal rate 42%).",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "whatIfDelta.2026-27.ewni.80000.plus1000",
    taxYear: "2026/27",
    region: "ENGLAND_NI_WALES",
    kind: "whatIfDelta",
    feature: "whatIf",
    input: { salary: 80000, deltaGross: 1000, children: 0 },
    expected: 580,
    source:
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    additionalSources: [
      "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027",
    ],
    derivation:
      "Change in annual take-home for +1000 gross. At 80000: PA 12570 (no taper at ANI 80000); taxable 80000 - 12570 = 67430; basic 37700 x 20% = 7540; higher 29730 x 40% = 11892; additional 0 x 45% = 0; income tax 19432; NI on 80000: 37700 x 8% + 29730 x 2% = 3610.6. Take-home = 80000 - tax 19432 - NI 3610.6 = 56957.4. At 81000: PA 12570 (no taper at ANI 81000); taxable 81000 - 12570 = 68430; basic 37700 x 20% = 7540; higher 30730 x 40% = 12292; additional 0 x 45% = 0; income tax 19832; NI on 81000: 37700 x 8% + 30730 x 2% = 3630.6. Take-home = 81000 - tax 19832 - NI 3630.6 = 57537.4. Delta = 1000 - tax change 400 - NI change 20 = 580 (effective marginal rate 42%).",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "whatIfDelta.2026-27.ewni.60000.plus1000.children1",
    taxYear: "2026/27",
    region: "ENGLAND_NI_WALES",
    kind: "whatIfDelta",
    feature: "whatIf",
    input: { salary: 60000, deltaGross: 1000, children: 1 },
    expected: 509.67,
    source:
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    additionalSources: [
      "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027",
      "https://www.gov.uk/child-benefit-tax-charge",
      "https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
    ],
    derivation:
      "Change in annual take-home for +1000 gross. At 60000: PA 12570 (no taper at ANI 60000); taxable 60000 - 12570 = 47430; basic 37700 x 20% = 7540; higher 9730 x 40% = 3892; additional 0 x 45% = 0; income tax 11432; NI on 60000: 37700 x 8% + 9730 x 2% = 3210.6; HICBC Child Benefit 27.05/week x 52 = 1406.6; charge percentage: ANI 60000 is not over 60000, so no steps over the threshold, 0%; charge 1406.6 x 0% = 0. Take-home = 60000 - tax 11432 - NI 3210.6 - HICBC 0 = 45357.4. At 61000: PA 12570 (no taper at ANI 61000); taxable 61000 - 12570 = 48430; basic 37700 x 20% = 7540; higher 10730 x 40% = 4292; additional 0 x 45% = 0; income tax 11832; NI on 61000: 37700 x 8% + 10730 x 2% = 3230.6; HICBC Child Benefit 27.05/week x 52 = 1406.6; charge percentage min(100, floor((ANI 61000 - 60000) / 200)) = 5%; charge 1406.6 x 5% = 70.33. Take-home = 61000 - tax 11832 - NI 3230.6 - HICBC 70.33 = 45867.07. Delta = 1000 - tax change 400 - NI change 20 - HICBC change 70.33 = 509.67 (effective marginal rate 49.03%).",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Child Benefit is assumed to be paid for 52 weeks a year; some tax years contain 53 Mondays, so the annual figure and the charge may differ (owner ruling pending).",
    signedOffBy: null,
  },
  {
    id: "whatIfDelta.2026-27.ewni.79500.plus1000.children1",
    taxYear: "2026/27",
    region: "ENGLAND_NI_WALES",
    kind: "whatIfDelta",
    feature: "whatIf",
    input: { salary: 79500, deltaGross: 1000, children: 1 },
    expected: 537.8,
    source:
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    additionalSources: [
      "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027",
      "https://www.gov.uk/child-benefit-tax-charge",
      "https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
    ],
    derivation:
      "Change in annual take-home for +1000 gross. At 79500: PA 12570 (no taper at ANI 79500); taxable 79500 - 12570 = 66930; basic 37700 x 20% = 7540; higher 29230 x 40% = 11692; additional 0 x 45% = 0; income tax 19232; NI on 79500: 37700 x 8% + 29230 x 2% = 3600.6; HICBC Child Benefit 27.05/week x 52 = 1406.6; charge percentage min(100, floor((ANI 79500 - 60000) / 200)) = 97%; charge 1406.6 x 97% = 1364.4. Take-home = 79500 - tax 19232 - NI 3600.6 - HICBC 1364.4 = 55303. At 80500: PA 12570 (no taper at ANI 80500); taxable 80500 - 12570 = 67930; basic 37700 x 20% = 7540; higher 30230 x 40% = 12092; additional 0 x 45% = 0; income tax 19632; NI on 80500: 37700 x 8% + 30230 x 2% = 3620.6; HICBC Child Benefit 27.05/week x 52 = 1406.6; charge percentage min(100, floor((ANI 80500 - 60000) / 200)) = 100%; charge 1406.6 x 100% = 1406.6. Take-home = 80500 - tax 19632 - NI 3620.6 - HICBC 1406.6 = 55840.8. Delta = 1000 - tax change 400 - NI change 20 - HICBC change 42.2 = 537.8 (effective marginal rate 46.22%).",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Child Benefit is assumed to be paid for 52 weeks a year; some tax years contain 53 Mondays, so the annual figure and the charge may differ (owner ruling pending).",
    signedOffBy: null,
  },
  {
    id: "scottishMarginal.2025-26.35000.plus1000",
    taxYear: "2025/26",
    region: "SCOTLAND",
    kind: "scottishMarginal",
    feature: "whatIf",
    input: { salary: 35000, deltaGross: 1000 },
    expected: 710,
    source: "https://www.gov.uk/income-tax-rates",
    additionalSources: [
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
      "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2025-to-2026",
    ],
    derivation:
      "Scottish band marginal check, +1000 gross. At 35000: PA 12570 (no taper at ANI 35000); taxable 35000 - 12570 = 22430; starter 2827 x 19% = 537.13; basic 12094 x 20% = 2418.8; intermediate 7509 x 21% = 1576.89; higher 0 x 42% = 0; advanced 0 x 45% = 0; top 0 x 48% = 0; income tax 4532.82; NI on 35000: 22430 x 8% + 0 x 2% = 1794.4. Take-home = 35000 - tax 4532.82 - NI 1794.4 = 28672.78. At 36000: PA 12570 (no taper at ANI 36000); taxable 36000 - 12570 = 23430; starter 2827 x 19% = 537.13; basic 12094 x 20% = 2418.8; intermediate 8509 x 21% = 1786.89; higher 0 x 42% = 0; advanced 0 x 45% = 0; top 0 x 48% = 0; income tax 4742.82; NI on 36000: 23430 x 8% + 0 x 2% = 1874.4. Take-home = 36000 - tax 4742.82 - NI 1874.4 = 29382.78. Delta = 710 (effective marginal rate 29%).",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "scottishMarginal.2025-26.45000.plus1000",
    taxYear: "2025/26",
    region: "SCOTLAND",
    kind: "scottishMarginal",
    feature: "whatIf",
    input: { salary: 45000, deltaGross: 1000 },
    expected: 500,
    source: "https://www.gov.uk/income-tax-rates",
    additionalSources: [
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
      "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2025-to-2026",
    ],
    derivation:
      "Scottish band marginal check, +1000 gross. At 45000: PA 12570 (no taper at ANI 45000); taxable 45000 - 12570 = 32430; starter 2827 x 19% = 537.13; basic 12094 x 20% = 2418.8; intermediate 16171 x 21% = 3395.91; higher 1338 x 42% = 561.96; advanced 0 x 45% = 0; top 0 x 48% = 0; income tax 6913.8; NI on 45000: 32430 x 8% + 0 x 2% = 2594.4. Take-home = 45000 - tax 6913.8 - NI 2594.4 = 35491.8. At 46000: PA 12570 (no taper at ANI 46000); taxable 46000 - 12570 = 33430; starter 2827 x 19% = 537.13; basic 12094 x 20% = 2418.8; intermediate 16171 x 21% = 3395.91; higher 2338 x 42% = 981.96; advanced 0 x 45% = 0; top 0 x 48% = 0; income tax 7333.8; NI on 46000: 33430 x 8% + 0 x 2% = 2674.4. Take-home = 46000 - tax 7333.8 - NI 2674.4 = 35991.8. Delta = 500 (effective marginal rate 50%).",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "scottishMarginal.2025-26.55000.plus1000",
    taxYear: "2025/26",
    region: "SCOTLAND",
    kind: "scottishMarginal",
    feature: "whatIf",
    input: { salary: 55000, deltaGross: 1000 },
    expected: 560,
    source: "https://www.gov.uk/income-tax-rates",
    additionalSources: [
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
      "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2025-to-2026",
    ],
    derivation:
      "Scottish band marginal check, +1000 gross. At 55000: PA 12570 (no taper at ANI 55000); taxable 55000 - 12570 = 42430; starter 2827 x 19% = 537.13; basic 12094 x 20% = 2418.8; intermediate 16171 x 21% = 3395.91; higher 11338 x 42% = 4761.96; advanced 0 x 45% = 0; top 0 x 48% = 0; income tax 11113.8; NI on 55000: 37700 x 8% + 4730 x 2% = 3110.6. Take-home = 55000 - tax 11113.8 - NI 3110.6 = 40775.6. At 56000: PA 12570 (no taper at ANI 56000); taxable 56000 - 12570 = 43430; starter 2827 x 19% = 537.13; basic 12094 x 20% = 2418.8; intermediate 16171 x 21% = 3395.91; higher 12338 x 42% = 5181.96; advanced 0 x 45% = 0; top 0 x 48% = 0; income tax 11533.8; NI on 56000: 37700 x 8% + 5730 x 2% = 3130.6. Take-home = 56000 - tax 11533.8 - NI 3130.6 = 41335.6. Delta = 560 (effective marginal rate 44%).",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "scottishMarginal.2025-26.85000.plus1000",
    taxYear: "2025/26",
    region: "SCOTLAND",
    kind: "scottishMarginal",
    feature: "whatIf",
    input: { salary: 85000, deltaGross: 1000 },
    expected: 530,
    source: "https://www.gov.uk/income-tax-rates",
    additionalSources: [
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
      "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2025-to-2026",
    ],
    derivation:
      "Scottish band marginal check, +1000 gross. At 85000: PA 12570 (no taper at ANI 85000); taxable 85000 - 12570 = 72430; starter 2827 x 19% = 537.13; basic 12094 x 20% = 2418.8; intermediate 16171 x 21% = 3395.91; higher 31338 x 42% = 13161.96; advanced 10000 x 45% = 4500; top 0 x 48% = 0; income tax 24013.8; NI on 85000: 37700 x 8% + 34730 x 2% = 3710.6. Take-home = 85000 - tax 24013.8 - NI 3710.6 = 57275.6. At 86000: PA 12570 (no taper at ANI 86000); taxable 86000 - 12570 = 73430; starter 2827 x 19% = 537.13; basic 12094 x 20% = 2418.8; intermediate 16171 x 21% = 3395.91; higher 31338 x 42% = 13161.96; advanced 11000 x 45% = 4950; top 0 x 48% = 0; income tax 24463.8; NI on 86000: 37700 x 8% + 35730 x 2% = 3730.6. Take-home = 86000 - tax 24463.8 - NI 3730.6 = 57805.6. Delta = 530 (effective marginal rate 47%).",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "scottishMarginal.2026-27.35000.plus1000",
    taxYear: "2026/27",
    region: "SCOTLAND",
    kind: "scottishMarginal",
    feature: "whatIf",
    input: { salary: 35000, deltaGross: 1000 },
    expected: 710,
    source: "https://www.gov.uk/income-tax-rates",
    additionalSources: [
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
      "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027",
    ],
    derivation:
      "Scottish band marginal check, +1000 gross. At 35000: PA 12570 (no taper at ANI 35000); taxable 35000 - 12570 = 22430; starter 3967 x 19% = 753.73; basic 12989 x 20% = 2597.8; intermediate 5474 x 21% = 1149.54; higher 0 x 42% = 0; advanced 0 x 45% = 0; top 0 x 48% = 0; income tax 4501.07; NI on 35000: 22430 x 8% + 0 x 2% = 1794.4. Take-home = 35000 - tax 4501.07 - NI 1794.4 = 28704.53. At 36000: PA 12570 (no taper at ANI 36000); taxable 36000 - 12570 = 23430; starter 3967 x 19% = 753.73; basic 12989 x 20% = 2597.8; intermediate 6474 x 21% = 1359.54; higher 0 x 42% = 0; advanced 0 x 45% = 0; top 0 x 48% = 0; income tax 4711.07; NI on 36000: 23430 x 8% + 0 x 2% = 1874.4. Take-home = 36000 - tax 4711.07 - NI 1874.4 = 29414.53. Delta = 710 (effective marginal rate 29%).",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Scottish advanced/top boundary 125,140 is a published figure but its frame (taxable vs gross) is ambiguous between GOV.UK pages.",
    signedOffBy: null,
  },
  {
    id: "scottishMarginal.2026-27.45000.plus1000",
    taxYear: "2026/27",
    region: "SCOTLAND",
    kind: "scottishMarginal",
    feature: "whatIf",
    input: { salary: 45000, deltaGross: 1000 },
    expected: 500,
    source: "https://www.gov.uk/income-tax-rates",
    additionalSources: [
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
      "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027",
    ],
    derivation:
      "Scottish band marginal check, +1000 gross. At 45000: PA 12570 (no taper at ANI 45000); taxable 45000 - 12570 = 32430; starter 3967 x 19% = 753.73; basic 12989 x 20% = 2597.8; intermediate 14136 x 21% = 2968.56; higher 1338 x 42% = 561.96; advanced 0 x 45% = 0; top 0 x 48% = 0; income tax 6882.05; NI on 45000: 32430 x 8% + 0 x 2% = 2594.4. Take-home = 45000 - tax 6882.05 - NI 2594.4 = 35523.55. At 46000: PA 12570 (no taper at ANI 46000); taxable 46000 - 12570 = 33430; starter 3967 x 19% = 753.73; basic 12989 x 20% = 2597.8; intermediate 14136 x 21% = 2968.56; higher 2338 x 42% = 981.96; advanced 0 x 45% = 0; top 0 x 48% = 0; income tax 7302.05; NI on 46000: 33430 x 8% + 0 x 2% = 2674.4. Take-home = 46000 - tax 7302.05 - NI 2674.4 = 36023.55. Delta = 500 (effective marginal rate 50%).",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Scottish advanced/top boundary 125,140 is a published figure but its frame (taxable vs gross) is ambiguous between GOV.UK pages.",
    signedOffBy: null,
  },
  {
    id: "scottishMarginal.2026-27.55000.plus1000",
    taxYear: "2026/27",
    region: "SCOTLAND",
    kind: "scottishMarginal",
    feature: "whatIf",
    input: { salary: 55000, deltaGross: 1000 },
    expected: 560,
    source: "https://www.gov.uk/income-tax-rates",
    additionalSources: [
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
      "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027",
    ],
    derivation:
      "Scottish band marginal check, +1000 gross. At 55000: PA 12570 (no taper at ANI 55000); taxable 55000 - 12570 = 42430; starter 3967 x 19% = 753.73; basic 12989 x 20% = 2597.8; intermediate 14136 x 21% = 2968.56; higher 11338 x 42% = 4761.96; advanced 0 x 45% = 0; top 0 x 48% = 0; income tax 11082.05; NI on 55000: 37700 x 8% + 4730 x 2% = 3110.6. Take-home = 55000 - tax 11082.05 - NI 3110.6 = 40807.35. At 56000: PA 12570 (no taper at ANI 56000); taxable 56000 - 12570 = 43430; starter 3967 x 19% = 753.73; basic 12989 x 20% = 2597.8; intermediate 14136 x 21% = 2968.56; higher 12338 x 42% = 5181.96; advanced 0 x 45% = 0; top 0 x 48% = 0; income tax 11502.05; NI on 56000: 37700 x 8% + 5730 x 2% = 3130.6. Take-home = 56000 - tax 11502.05 - NI 3130.6 = 41367.35. Delta = 560 (effective marginal rate 44%).",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Scottish advanced/top boundary 125,140 is a published figure but its frame (taxable vs gross) is ambiguous between GOV.UK pages.",
    signedOffBy: null,
  },
  {
    id: "scottishMarginal.2026-27.85000.plus1000",
    taxYear: "2026/27",
    region: "SCOTLAND",
    kind: "scottishMarginal",
    feature: "whatIf",
    input: { salary: 85000, deltaGross: 1000 },
    expected: 530,
    source: "https://www.gov.uk/income-tax-rates",
    additionalSources: [
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
      "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027",
    ],
    derivation:
      "Scottish band marginal check, +1000 gross. At 85000: PA 12570 (no taper at ANI 85000); taxable 85000 - 12570 = 72430; starter 3967 x 19% = 753.73; basic 12989 x 20% = 2597.8; intermediate 14136 x 21% = 2968.56; higher 31338 x 42% = 13161.96; advanced 10000 x 45% = 4500; top 0 x 48% = 0; income tax 23982.05; NI on 85000: 37700 x 8% + 34730 x 2% = 3710.6. Take-home = 85000 - tax 23982.05 - NI 3710.6 = 57307.35. At 86000: PA 12570 (no taper at ANI 86000); taxable 86000 - 12570 = 73430; starter 3967 x 19% = 753.73; basic 12989 x 20% = 2597.8; intermediate 14136 x 21% = 2968.56; higher 31338 x 42% = 13161.96; advanced 11000 x 45% = 4950; top 0 x 48% = 0; income tax 24432.05; NI on 86000: 37700 x 8% + 35730 x 2% = 3730.6. Take-home = 86000 - tax 24432.05 - NI 3730.6 = 57837.35. Delta = 530 (effective marginal rate 47%).",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Scottish advanced/top boundary 125,140 is a published figure but its frame (taxable vs gross) is ambiguous between GOV.UK pages.",
    signedOffBy: null,
  },
  {
    id: "studentLoanMulti.2020-21.plan2+postgrad.45000",
    taxYear: "2020/21",
    region: "ENGLAND_NI_WALES",
    kind: "studentLoanMulti",
    feature: "whatIf",
    input: { grossIncome: 45000, plans: "plan2+postgrad" },
    expected: 3098.25,
    source: "https://www.gov.uk/repaying-your-student-loan/what-you-pay",
    additionalSources: [
      "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2020-to-2021",
    ],
    derivation:
      "Undergraduate Plan 2 (9% over its threshold) and Postgraduate Loan (6% over 21,000) are repaid together: plan2 (45000 - 26575) x 9% = 1658.25; postgrad (45000 - 21000) x 6% = 1440. Total 3098.25.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "studentLoanMulti.2021-22.plan2+postgrad.45000",
    taxYear: "2021/22",
    region: "ENGLAND_NI_WALES",
    kind: "studentLoanMulti",
    feature: "whatIf",
    input: { grossIncome: 45000, plans: "plan2+postgrad" },
    expected: 3033.45,
    source: "https://www.gov.uk/repaying-your-student-loan/what-you-pay",
    additionalSources: [
      "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2021-to-2022",
    ],
    derivation:
      "Undergraduate Plan 2 (9% over its threshold) and Postgraduate Loan (6% over 21,000) are repaid together: plan2 (45000 - 27295) x 9% = 1593.45; postgrad (45000 - 21000) x 6% = 1440. Total 3033.45.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "studentLoanMulti.2022-23.plan2+postgrad.45000",
    taxYear: "2022/23",
    region: "ENGLAND_NI_WALES",
    kind: "studentLoanMulti",
    feature: "whatIf",
    input: { grossIncome: 45000, plans: "plan2+postgrad" },
    expected: 3033.45,
    source: "https://www.gov.uk/repaying-your-student-loan/what-you-pay",
    additionalSources: [
      "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2022-to-2023",
    ],
    derivation:
      "Undergraduate Plan 2 (9% over its threshold) and Postgraduate Loan (6% over 21,000) are repaid together: plan2 (45000 - 27295) x 9% = 1593.45; postgrad (45000 - 21000) x 6% = 1440. Total 3033.45.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "studentLoanMulti.2023-24.plan2+postgrad.45000",
    taxYear: "2023/24",
    region: "ENGLAND_NI_WALES",
    kind: "studentLoanMulti",
    feature: "whatIf",
    input: { grossIncome: 45000, plans: "plan2+postgrad" },
    expected: 3033.45,
    source: "https://www.gov.uk/repaying-your-student-loan/what-you-pay",
    additionalSources: [
      "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2023-to-2024",
    ],
    derivation:
      "Undergraduate Plan 2 (9% over its threshold) and Postgraduate Loan (6% over 21,000) are repaid together: plan2 (45000 - 27295) x 9% = 1593.45; postgrad (45000 - 21000) x 6% = 1440. Total 3033.45.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "studentLoanMulti.2024-25.plan2+postgrad.45000",
    taxYear: "2024/25",
    region: "ENGLAND_NI_WALES",
    kind: "studentLoanMulti",
    feature: "whatIf",
    input: { grossIncome: 45000, plans: "plan2+postgrad" },
    expected: 3033.45,
    source: "https://www.gov.uk/repaying-your-student-loan/what-you-pay",
    additionalSources: [
      "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2024-to-2025",
    ],
    derivation:
      "Undergraduate Plan 2 (9% over its threshold) and Postgraduate Loan (6% over 21,000) are repaid together: plan2 (45000 - 27295) x 9% = 1593.45; postgrad (45000 - 21000) x 6% = 1440. Total 3033.45.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "studentLoanMulti.2025-26.plan2+postgrad.45000",
    taxYear: "2025/26",
    region: "ENGLAND_NI_WALES",
    kind: "studentLoanMulti",
    feature: "whatIf",
    input: { grossIncome: 45000, plans: "plan2+postgrad" },
    expected: 2927.7,
    source: "https://www.gov.uk/repaying-your-student-loan/what-you-pay",
    additionalSources: [
      "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2025-to-2026",
    ],
    derivation:
      "Undergraduate Plan 2 (9% over its threshold) and Postgraduate Loan (6% over 21,000) are repaid together: plan2 (45000 - 28470) x 9% = 1487.7; postgrad (45000 - 21000) x 6% = 1440. Total 2927.7.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "studentLoanMulti.2026-27.plan2+postgrad.45000",
    taxYear: "2026/27",
    region: "ENGLAND_NI_WALES",
    kind: "studentLoanMulti",
    feature: "whatIf",
    input: { grossIncome: 45000, plans: "plan2+postgrad" },
    expected: 2845.35,
    source: "https://www.gov.uk/repaying-your-student-loan/what-you-pay",
    additionalSources: [
      "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027",
    ],
    derivation:
      "Undergraduate Plan 2 (9% over its threshold) and Postgraduate Loan (6% over 21,000) are repaid together: plan2 (45000 - 29385) x 9% = 1405.35; postgrad (45000 - 21000) x 6% = 1440. Total 2845.35.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "studentLoanMulti.2026-27.plan5+postgrad.24000",
    taxYear: "2026/27",
    region: "ENGLAND_NI_WALES",
    kind: "studentLoanMulti",
    feature: "whatIf",
    input: { grossIncome: 24000, plans: "plan5+postgrad" },
    expected: 180,
    source: "https://www.gov.uk/repaying-your-student-loan/what-you-pay",
    additionalSources: [
      "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027",
    ],
    derivation:
      "Plan 5 (9% over 25,000) and Postgraduate Loan (6% over 21,000) are repaid together: plan5 (24000 - 25000) x 9% = 0; postgrad (24000 - 21000) x 6% = 180. Total 180.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "studentLoanMulti.2026-27.plan5+postgrad.30000",
    taxYear: "2026/27",
    region: "ENGLAND_NI_WALES",
    kind: "studentLoanMulti",
    feature: "whatIf",
    input: { grossIncome: 30000, plans: "plan5+postgrad" },
    expected: 990,
    source: "https://www.gov.uk/repaying-your-student-loan/what-you-pay",
    additionalSources: [
      "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027",
    ],
    derivation:
      "Plan 5 (9% over 25,000) and Postgraduate Loan (6% over 21,000) are repaid together: plan5 (30000 - 25000) x 9% = 450; postgrad (30000 - 21000) x 6% = 540. Total 990.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "studentLoanMulti.2026-27.plan5+postgrad.45000",
    taxYear: "2026/27",
    region: "ENGLAND_NI_WALES",
    kind: "studentLoanMulti",
    feature: "whatIf",
    input: { grossIncome: 45000, plans: "plan5+postgrad" },
    expected: 3240,
    source: "https://www.gov.uk/repaying-your-student-loan/what-you-pay",
    additionalSources: [
      "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027",
    ],
    derivation:
      "Plan 5 (9% over 25,000) and Postgraduate Loan (6% over 21,000) are repaid together: plan5 (45000 - 25000) x 9% = 1800; postgrad (45000 - 21000) x 6% = 1440. Total 3240.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "reliefAtSource.ewni.2020-21.60000.net4000",
    taxYear: "2020/21",
    region: "ENGLAND_NI_WALES",
    kind: "reliefAtSource",
    feature: "whatIf",
    input: { grossIncome: 60000, netContribution: 4000 },
    expected: 10500,
    source: "https://www.gov.uk/guidance/adjusted-net-income",
    additionalSources: [
      "https://www.gov.uk/tax-on-your-private-pension/pension-tax-relief",
      "https://www.legislation.gov.uk/ukpga/2007/3/section/414",
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    ],
    derivation:
      "Relief at source: net contribution 4000 grossed up x 1.25 = 5000. ANI = 60000 - 5000 = 55000 (GOV.UK adjusted-net-income step 3). Basic-rate band and all limits above it extended by 5000 (ITA 2007 s.414). Income tax on salary 60000: PA 12500 (no taper at ANI 55000); taxable 60000 - 12500 = 47500; basic 42500 x 20% = 8500; higher 5000 x 40% = 2000; additional 0 x 45% = 0; income tax 10500. Expected is income tax only.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: band extension for relief-at-source pension contributions rests on ITA 2007 s.414; no GOV.UK page read states it.",
    signedOffBy: null,
  },
  {
    id: "reliefAtSource.ewni.2020-21.110000.net8000",
    taxYear: "2020/21",
    region: "ENGLAND_NI_WALES",
    kind: "reliefAtSource",
    feature: "whatIf",
    input: { grossIncome: 110000, netContribution: 8000 },
    expected: 29500,
    source: "https://www.gov.uk/guidance/adjusted-net-income",
    additionalSources: [
      "https://www.gov.uk/tax-on-your-private-pension/pension-tax-relief",
      "https://www.legislation.gov.uk/ukpga/2007/3/section/414",
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    ],
    derivation:
      "Relief at source: net contribution 8000 grossed up x 1.25 = 10000. ANI = 110000 - 10000 = 100000 (GOV.UK adjusted-net-income step 3). Basic-rate band and all limits above it extended by 10000 (ITA 2007 s.414). Income tax on salary 110000: PA 12500 (no taper at ANI 100000); taxable 110000 - 12500 = 97500; basic 47500 x 20% = 9500; higher 50000 x 40% = 20000; additional 0 x 45% = 0; income tax 29500. Expected is income tax only.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: band extension for relief-at-source pension contributions rests on ITA 2007 s.414; no GOV.UK page read states it; personal allowance taper rate (GBP1 per GBP2) is not stated on the archived GOV.UK pages.",
    signedOffBy: null,
  },
  {
    id: "reliefAtSource.ewni.2021-22.60000.net4000",
    taxYear: "2021/22",
    region: "ENGLAND_NI_WALES",
    kind: "reliefAtSource",
    feature: "whatIf",
    input: { grossIncome: 60000, netContribution: 4000 },
    expected: 10432,
    source: "https://www.gov.uk/guidance/adjusted-net-income",
    additionalSources: [
      "https://www.gov.uk/tax-on-your-private-pension/pension-tax-relief",
      "https://www.legislation.gov.uk/ukpga/2007/3/section/414",
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    ],
    derivation:
      "Relief at source: net contribution 4000 grossed up x 1.25 = 5000. ANI = 60000 - 5000 = 55000 (GOV.UK adjusted-net-income step 3). Basic-rate band and all limits above it extended by 5000 (ITA 2007 s.414). Income tax on salary 60000: PA 12570 (no taper at ANI 55000); taxable 60000 - 12570 = 47430; basic 42700 x 20% = 8540; higher 4730 x 40% = 1892; additional 0 x 45% = 0; income tax 10432. Expected is income tax only.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: band extension for relief-at-source pension contributions rests on ITA 2007 s.414; no GOV.UK page read states it.",
    signedOffBy: null,
  },
  {
    id: "reliefAtSource.ewni.2021-22.110000.net8000",
    taxYear: "2021/22",
    region: "ENGLAND_NI_WALES",
    kind: "reliefAtSource",
    feature: "whatIf",
    input: { grossIncome: 110000, netContribution: 8000 },
    expected: 29432,
    source: "https://www.gov.uk/guidance/adjusted-net-income",
    additionalSources: [
      "https://www.gov.uk/tax-on-your-private-pension/pension-tax-relief",
      "https://www.legislation.gov.uk/ukpga/2007/3/section/414",
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    ],
    derivation:
      "Relief at source: net contribution 8000 grossed up x 1.25 = 10000. ANI = 110000 - 10000 = 100000 (GOV.UK adjusted-net-income step 3). Basic-rate band and all limits above it extended by 10000 (ITA 2007 s.414). Income tax on salary 110000: PA 12570 (no taper at ANI 100000); taxable 110000 - 12570 = 97430; basic 47700 x 20% = 9540; higher 49730 x 40% = 19892; additional 0 x 45% = 0; income tax 29432. Expected is income tax only.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: band extension for relief-at-source pension contributions rests on ITA 2007 s.414; no GOV.UK page read states it; personal allowance taper rate (GBP1 per GBP2) is not stated on the archived GOV.UK pages.",
    signedOffBy: null,
  },
  {
    id: "reliefAtSource.ewni.2022-23.60000.net4000",
    taxYear: "2022/23",
    region: "ENGLAND_NI_WALES",
    kind: "reliefAtSource",
    feature: "whatIf",
    input: { grossIncome: 60000, netContribution: 4000 },
    expected: 10432,
    source: "https://www.gov.uk/guidance/adjusted-net-income",
    additionalSources: [
      "https://www.gov.uk/tax-on-your-private-pension/pension-tax-relief",
      "https://www.legislation.gov.uk/ukpga/2007/3/section/414",
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    ],
    derivation:
      "Relief at source: net contribution 4000 grossed up x 1.25 = 5000. ANI = 60000 - 5000 = 55000 (GOV.UK adjusted-net-income step 3). Basic-rate band and all limits above it extended by 5000 (ITA 2007 s.414). Income tax on salary 60000: PA 12570 (no taper at ANI 55000); taxable 60000 - 12570 = 47430; basic 42700 x 20% = 8540; higher 4730 x 40% = 1892; additional 0 x 45% = 0; income tax 10432. Expected is income tax only.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: band extension for relief-at-source pension contributions rests on ITA 2007 s.414; no GOV.UK page read states it.",
    signedOffBy: null,
  },
  {
    id: "reliefAtSource.ewni.2022-23.110000.net8000",
    taxYear: "2022/23",
    region: "ENGLAND_NI_WALES",
    kind: "reliefAtSource",
    feature: "whatIf",
    input: { grossIncome: 110000, netContribution: 8000 },
    expected: 29432,
    source: "https://www.gov.uk/guidance/adjusted-net-income",
    additionalSources: [
      "https://www.gov.uk/tax-on-your-private-pension/pension-tax-relief",
      "https://www.legislation.gov.uk/ukpga/2007/3/section/414",
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    ],
    derivation:
      "Relief at source: net contribution 8000 grossed up x 1.25 = 10000. ANI = 110000 - 10000 = 100000 (GOV.UK adjusted-net-income step 3). Basic-rate band and all limits above it extended by 10000 (ITA 2007 s.414). Income tax on salary 110000: PA 12570 (no taper at ANI 100000); taxable 110000 - 12570 = 97430; basic 47700 x 20% = 9540; higher 49730 x 40% = 19892; additional 0 x 45% = 0; income tax 29432. Expected is income tax only.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: band extension for relief-at-source pension contributions rests on ITA 2007 s.414; no GOV.UK page read states it; personal allowance taper rate (GBP1 per GBP2) is not stated on the archived GOV.UK pages.",
    signedOffBy: null,
  },
  {
    id: "reliefAtSource.ewni.2023-24.60000.net4000",
    taxYear: "2023/24",
    region: "ENGLAND_NI_WALES",
    kind: "reliefAtSource",
    feature: "whatIf",
    input: { grossIncome: 60000, netContribution: 4000 },
    expected: 10432,
    source: "https://www.gov.uk/guidance/adjusted-net-income",
    additionalSources: [
      "https://www.gov.uk/tax-on-your-private-pension/pension-tax-relief",
      "https://www.legislation.gov.uk/ukpga/2007/3/section/414",
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    ],
    derivation:
      "Relief at source: net contribution 4000 grossed up x 1.25 = 5000. ANI = 60000 - 5000 = 55000 (GOV.UK adjusted-net-income step 3). Basic-rate band and all limits above it extended by 5000 (ITA 2007 s.414). Income tax on salary 60000: PA 12570 (no taper at ANI 55000); taxable 60000 - 12570 = 47430; basic 42700 x 20% = 8540; higher 4730 x 40% = 1892; additional 0 x 45% = 0; income tax 10432. Expected is income tax only.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: band extension for relief-at-source pension contributions rests on ITA 2007 s.414; no GOV.UK page read states it.",
    signedOffBy: null,
  },
  {
    id: "reliefAtSource.ewni.2023-24.110000.net8000",
    taxYear: "2023/24",
    region: "ENGLAND_NI_WALES",
    kind: "reliefAtSource",
    feature: "whatIf",
    input: { grossIncome: 110000, netContribution: 8000 },
    expected: 29432,
    source: "https://www.gov.uk/guidance/adjusted-net-income",
    additionalSources: [
      "https://www.gov.uk/tax-on-your-private-pension/pension-tax-relief",
      "https://www.legislation.gov.uk/ukpga/2007/3/section/414",
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    ],
    derivation:
      "Relief at source: net contribution 8000 grossed up x 1.25 = 10000. ANI = 110000 - 10000 = 100000 (GOV.UK adjusted-net-income step 3). Basic-rate band and all limits above it extended by 10000 (ITA 2007 s.414). Income tax on salary 110000: PA 12570 (no taper at ANI 100000); taxable 110000 - 12570 = 97430; basic 47700 x 20% = 9540; higher 49730 x 40% = 19892; additional 0 x 45% = 0; income tax 29432. Expected is income tax only.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: band extension for relief-at-source pension contributions rests on ITA 2007 s.414; no GOV.UK page read states it.",
    signedOffBy: null,
  },
  {
    id: "reliefAtSource.ewni.2024-25.60000.net4000",
    taxYear: "2024/25",
    region: "ENGLAND_NI_WALES",
    kind: "reliefAtSource",
    feature: "whatIf",
    input: { grossIncome: 60000, netContribution: 4000 },
    expected: 10432,
    source: "https://www.gov.uk/guidance/adjusted-net-income",
    additionalSources: [
      "https://www.gov.uk/tax-on-your-private-pension/pension-tax-relief",
      "https://www.legislation.gov.uk/ukpga/2007/3/section/414",
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    ],
    derivation:
      "Relief at source: net contribution 4000 grossed up x 1.25 = 5000. ANI = 60000 - 5000 = 55000 (GOV.UK adjusted-net-income step 3). Basic-rate band and all limits above it extended by 5000 (ITA 2007 s.414). Income tax on salary 60000: PA 12570 (no taper at ANI 55000); taxable 60000 - 12570 = 47430; basic 42700 x 20% = 8540; higher 4730 x 40% = 1892; additional 0 x 45% = 0; income tax 10432. Expected is income tax only.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: band extension for relief-at-source pension contributions rests on ITA 2007 s.414; no GOV.UK page read states it.",
    signedOffBy: null,
  },
  {
    id: "reliefAtSource.ewni.2024-25.110000.net8000",
    taxYear: "2024/25",
    region: "ENGLAND_NI_WALES",
    kind: "reliefAtSource",
    feature: "whatIf",
    input: { grossIncome: 110000, netContribution: 8000 },
    expected: 29432,
    source: "https://www.gov.uk/guidance/adjusted-net-income",
    additionalSources: [
      "https://www.gov.uk/tax-on-your-private-pension/pension-tax-relief",
      "https://www.legislation.gov.uk/ukpga/2007/3/section/414",
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    ],
    derivation:
      "Relief at source: net contribution 8000 grossed up x 1.25 = 10000. ANI = 110000 - 10000 = 100000 (GOV.UK adjusted-net-income step 3). Basic-rate band and all limits above it extended by 10000 (ITA 2007 s.414). Income tax on salary 110000: PA 12570 (no taper at ANI 100000); taxable 110000 - 12570 = 97430; basic 47700 x 20% = 9540; higher 49730 x 40% = 19892; additional 0 x 45% = 0; income tax 29432. Expected is income tax only.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: band extension for relief-at-source pension contributions rests on ITA 2007 s.414; no GOV.UK page read states it.",
    signedOffBy: null,
  },
  {
    id: "reliefAtSource.ewni.2025-26.60000.net4000",
    taxYear: "2025/26",
    region: "ENGLAND_NI_WALES",
    kind: "reliefAtSource",
    feature: "whatIf",
    input: { grossIncome: 60000, netContribution: 4000 },
    expected: 10432,
    source: "https://www.gov.uk/guidance/adjusted-net-income",
    additionalSources: [
      "https://www.gov.uk/tax-on-your-private-pension/pension-tax-relief",
      "https://www.legislation.gov.uk/ukpga/2007/3/section/414",
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    ],
    derivation:
      "Relief at source: net contribution 4000 grossed up x 1.25 = 5000. ANI = 60000 - 5000 = 55000 (GOV.UK adjusted-net-income step 3). Basic-rate band and all limits above it extended by 5000 (ITA 2007 s.414). Income tax on salary 60000: PA 12570 (no taper at ANI 55000); taxable 60000 - 12570 = 47430; basic 42700 x 20% = 8540; higher 4730 x 40% = 1892; additional 0 x 45% = 0; income tax 10432. Expected is income tax only.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: band extension for relief-at-source pension contributions rests on ITA 2007 s.414; no GOV.UK page read states it.",
    signedOffBy: null,
  },
  {
    id: "reliefAtSource.ewni.2025-26.110000.net8000",
    taxYear: "2025/26",
    region: "ENGLAND_NI_WALES",
    kind: "reliefAtSource",
    feature: "whatIf",
    input: { grossIncome: 110000, netContribution: 8000 },
    expected: 29432,
    source: "https://www.gov.uk/guidance/adjusted-net-income",
    additionalSources: [
      "https://www.gov.uk/tax-on-your-private-pension/pension-tax-relief",
      "https://www.legislation.gov.uk/ukpga/2007/3/section/414",
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    ],
    derivation:
      "Relief at source: net contribution 8000 grossed up x 1.25 = 10000. ANI = 110000 - 10000 = 100000 (GOV.UK adjusted-net-income step 3). Basic-rate band and all limits above it extended by 10000 (ITA 2007 s.414). Income tax on salary 110000: PA 12570 (no taper at ANI 100000); taxable 110000 - 12570 = 97430; basic 47700 x 20% = 9540; higher 49730 x 40% = 19892; additional 0 x 45% = 0; income tax 29432. Expected is income tax only.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: band extension for relief-at-source pension contributions rests on ITA 2007 s.414; no GOV.UK page read states it.",
    signedOffBy: null,
  },
  {
    id: "reliefAtSource.ewni.2026-27.60000.net4000",
    taxYear: "2026/27",
    region: "ENGLAND_NI_WALES",
    kind: "reliefAtSource",
    feature: "whatIf",
    input: { grossIncome: 60000, netContribution: 4000 },
    expected: 10432,
    source: "https://www.gov.uk/guidance/adjusted-net-income",
    additionalSources: [
      "https://www.gov.uk/tax-on-your-private-pension/pension-tax-relief",
      "https://www.legislation.gov.uk/ukpga/2007/3/section/414",
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    ],
    derivation:
      "Relief at source: net contribution 4000 grossed up x 1.25 = 5000. ANI = 60000 - 5000 = 55000 (GOV.UK adjusted-net-income step 3). Basic-rate band and all limits above it extended by 5000 (ITA 2007 s.414). Income tax on salary 60000: PA 12570 (no taper at ANI 55000); taxable 60000 - 12570 = 47430; basic 42700 x 20% = 8540; higher 4730 x 40% = 1892; additional 0 x 45% = 0; income tax 10432. Expected is income tax only.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: band extension for relief-at-source pension contributions rests on ITA 2007 s.414; no GOV.UK page read states it.",
    signedOffBy: null,
  },
  {
    id: "reliefAtSource.ewni.2026-27.110000.net8000",
    taxYear: "2026/27",
    region: "ENGLAND_NI_WALES",
    kind: "reliefAtSource",
    feature: "whatIf",
    input: { grossIncome: 110000, netContribution: 8000 },
    expected: 29432,
    source: "https://www.gov.uk/guidance/adjusted-net-income",
    additionalSources: [
      "https://www.gov.uk/tax-on-your-private-pension/pension-tax-relief",
      "https://www.legislation.gov.uk/ukpga/2007/3/section/414",
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    ],
    derivation:
      "Relief at source: net contribution 8000 grossed up x 1.25 = 10000. ANI = 110000 - 10000 = 100000 (GOV.UK adjusted-net-income step 3). Basic-rate band and all limits above it extended by 10000 (ITA 2007 s.414). Income tax on salary 110000: PA 12570 (no taper at ANI 100000); taxable 110000 - 12570 = 97430; basic 47700 x 20% = 9540; higher 49730 x 40% = 19892; additional 0 x 45% = 0; income tax 29432. Expected is income tax only.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: band extension for relief-at-source pension contributions rests on ITA 2007 s.414; no GOV.UK page read states it.",
    signedOffBy: null,
  },
  {
    id: "reliefAtSource.scot.2025-26.60000.net4000",
    taxYear: "2025/26",
    region: "SCOTLAND",
    kind: "reliefAtSource",
    feature: "whatIf",
    input: { grossIncome: 60000, netContribution: 4000 },
    expected: 12113.8,
    source: "https://www.gov.uk/guidance/adjusted-net-income",
    additionalSources: [
      "https://www.gov.uk/tax-on-your-private-pension/pension-tax-relief",
      "https://www.legislation.gov.uk/ukpga/2007/3/section/414",
      "https://www.gov.uk/income-tax-rates",
    ],
    derivation:
      "Relief at source: net 4000 grossed up x 1.25 = 5000. Scottish basic band limit and every limit above it extended by 5000; starter band unchanged (ITA 2007 s.414(2)(b)). Income tax on 60000: PA 12570 (no taper at ANI 55000); taxable 60000 - 12570 = 47430; starter 2827 x 19% = 537.13; basic 17094 x 20% = 3418.8; intermediate 16171 x 21% = 3395.91; higher 11338 x 42% = 4761.96; advanced 0 x 45% = 0; top 0 x 48% = 0; income tax 12113.8. Expected is income tax only.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Scottish band extension for relief-at-source pension contributions rests on ITA 2007 s.414(2)(b); no GOV.UK page read states it.",
    signedOffBy: null,
  },
  {
    id: "reliefAtSource.scot.2026-27.60000.net4000",
    taxYear: "2026/27",
    region: "SCOTLAND",
    kind: "reliefAtSource",
    feature: "whatIf",
    input: { grossIncome: 60000, netContribution: 4000 },
    expected: 12082.05,
    source: "https://www.gov.uk/guidance/adjusted-net-income",
    additionalSources: [
      "https://www.gov.uk/tax-on-your-private-pension/pension-tax-relief",
      "https://www.legislation.gov.uk/ukpga/2007/3/section/414",
      "https://www.gov.uk/income-tax-rates",
    ],
    derivation:
      "Relief at source: net 4000 grossed up x 1.25 = 5000. Scottish basic band limit and every limit above it extended by 5000; starter band unchanged (ITA 2007 s.414(2)(b)). Income tax on 60000: PA 12570 (no taper at ANI 55000); taxable 60000 - 12570 = 47430; starter 3967 x 19% = 753.73; basic 17989 x 20% = 3597.8; intermediate 14136 x 21% = 2968.56; higher 11338 x 42% = 4761.96; advanced 0 x 45% = 0; top 0 x 48% = 0; income tax 12082.05. Expected is income tax only.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Scottish band extension for relief-at-source pension contributions rests on ITA 2007 s.414(2)(b); no GOV.UK page read states it; Scottish advanced/top boundary 125,140 is a published figure but its frame (taxable vs gross) is ambiguous between GOV.UK pages.",
    signedOffBy: null,
  },
  {
    id: "salarySacrificeCap2029.employee.40000.sacrifice5000",
    taxYear: "2026/27",
    region: "ENGLAND_NI_WALES",
    kind: "salarySacrificeCap2029",
    feature: "scheduled",
    input: { salary: 40000, sacrifice: 5000, cap: 2000, party: "employee" },
    expected: 240,
    source:
      "https://www.gov.uk/government/publications/changes-to-salary-sacrifice-for-pensions-from-april-2029/changes-to-salary-sacrifice-for-pensions-from-april-2029",
    derivation:
      "From 6 April 2029 NI applies to employee pension salary sacrifice above 2,000 a year; the excess is 5000 - 2000 = 3000 (floored at 0). post-sacrifice pay 35000; NI on 35000 = 1794.4; with the excess 3000 charged, NI on 38000 = 2034.4; employee extra NI = 240 (2026/27 rates 8% / 2% used as an illustration). Illustration only: not a supported tax year, not yet in force.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: the 2029 cap is announced policy; the design of the 2,000 limit and the rates for 2029/30 are not yet in secondary legislation, so every figure is an illustration.",
    signedOffBy: null,
  },
  {
    id: "salarySacrificeCap2029.employee.70000.sacrifice10000",
    taxYear: "2026/27",
    region: "ENGLAND_NI_WALES",
    kind: "salarySacrificeCap2029",
    feature: "scheduled",
    input: { salary: 70000, sacrifice: 10000, cap: 2000, party: "employee" },
    expected: 160,
    source:
      "https://www.gov.uk/government/publications/changes-to-salary-sacrifice-for-pensions-from-april-2029/changes-to-salary-sacrifice-for-pensions-from-april-2029",
    derivation:
      "From 6 April 2029 NI applies to employee pension salary sacrifice above 2,000 a year; the excess is 10000 - 2000 = 8000 (floored at 0). post-sacrifice pay 60000; NI on 60000 = 3210.6; with the excess 8000 charged, NI on 68000 = 3370.6; employee extra NI = 160 (2026/27 rates 8% / 2% used as an illustration). Illustration only: not a supported tax year, not yet in force.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: the 2029 cap is announced policy; the design of the 2,000 limit and the rates for 2029/30 are not yet in secondary legislation, so every figure is an illustration.",
    signedOffBy: null,
  },
  {
    id: "salarySacrificeCap2029.employee.55000.sacrifice8000",
    taxYear: "2026/27",
    region: "ENGLAND_NI_WALES",
    kind: "salarySacrificeCap2029",
    feature: "scheduled",
    input: { salary: 55000, sacrifice: 8000, cap: 2000, party: "employee" },
    expected: 316.2,
    source:
      "https://www.gov.uk/government/publications/changes-to-salary-sacrifice-for-pensions-from-april-2029/changes-to-salary-sacrifice-for-pensions-from-april-2029",
    derivation:
      "From 6 April 2029 NI applies to employee pension salary sacrifice above 2,000 a year; the excess is 8000 - 2000 = 6000 (floored at 0). post-sacrifice pay 47000; NI on 47000 = 2754.4; with the excess 6000 charged, NI on 53000 = 3070.6; employee extra NI = 316.2 (2026/27 rates 8% / 2% used as an illustration). Illustration only: not a supported tax year, not yet in force.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: the 2029 cap is announced policy; the design of the 2,000 limit and the rates for 2029/30 are not yet in secondary legislation, so every figure is an illustration.",
    signedOffBy: null,
  },
  {
    id: "salarySacrificeCap2029.employee.40000.sacrifice2000",
    taxYear: "2026/27",
    region: "ENGLAND_NI_WALES",
    kind: "salarySacrificeCap2029",
    feature: "scheduled",
    input: { salary: 40000, sacrifice: 2000, cap: 2000, party: "employee" },
    expected: 0,
    source:
      "https://www.gov.uk/government/publications/changes-to-salary-sacrifice-for-pensions-from-april-2029/changes-to-salary-sacrifice-for-pensions-from-april-2029",
    derivation:
      "From 6 April 2029 NI applies to employee pension salary sacrifice above 2,000 a year; the excess is 2000 - 2000 = 0 (floored at 0). post-sacrifice pay 38000; NI on 38000 = 2034.4; with the excess 0 charged, NI on 38000 = 2034.4; employee extra NI = 0 (2026/27 rates 8% / 2% used as an illustration). Illustration only: not a supported tax year, not yet in force.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: the 2029 cap is announced policy; the design of the 2,000 limit and the rates for 2029/30 are not yet in secondary legislation, so every figure is an illustration.",
    signedOffBy: null,
  },
  {
    id: "salarySacrificeCap2029.employer.40000.sacrifice5000",
    taxYear: "2026/27",
    region: "ENGLAND_NI_WALES",
    kind: "salarySacrificeCap2029",
    feature: "scheduled",
    input: { salary: 40000, sacrifice: 5000, cap: 2000, party: "employer" },
    expected: 450,
    source:
      "https://www.gov.uk/government/publications/changes-to-salary-sacrifice-for-pensions-from-april-2029/changes-to-salary-sacrifice-for-pensions-from-april-2029",
    derivation:
      "From 6 April 2029 NI applies to employee pension salary sacrifice above 2,000 a year; the excess is 5000 - 2000 = 3000 (floored at 0). employer Class 1 secondary NI on the excess: 3000 x 15% = 450 (2026/27 rate 15% used as an illustration). Illustration only: not a supported tax year, not yet in force.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: the 2029 cap is announced policy; the design of the 2,000 limit and the rates for 2029/30 are not yet in secondary legislation, so every figure is an illustration.",
    signedOffBy: null,
  },
  {
    id: "salarySacrificeCap2029.employer.70000.sacrifice10000",
    taxYear: "2026/27",
    region: "ENGLAND_NI_WALES",
    kind: "salarySacrificeCap2029",
    feature: "scheduled",
    input: { salary: 70000, sacrifice: 10000, cap: 2000, party: "employer" },
    expected: 1200,
    source:
      "https://www.gov.uk/government/publications/changes-to-salary-sacrifice-for-pensions-from-april-2029/changes-to-salary-sacrifice-for-pensions-from-april-2029",
    derivation:
      "From 6 April 2029 NI applies to employee pension salary sacrifice above 2,000 a year; the excess is 10000 - 2000 = 8000 (floored at 0). employer Class 1 secondary NI on the excess: 8000 x 15% = 1200 (2026/27 rate 15% used as an illustration). Illustration only: not a supported tax year, not yet in force.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: the 2029 cap is announced policy; the design of the 2,000 limit and the rates for 2029/30 are not yet in secondary legislation, so every figure is an illustration.",
    signedOffBy: null,
  },
];
