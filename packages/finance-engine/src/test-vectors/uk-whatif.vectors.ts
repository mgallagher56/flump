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
 *   claimant is the higher earner. Child Benefit weeks are the Mondays in the tax year (52 or 53, ITEPA 2003 s.681H(3)).
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
      "https://www.legislation.gov.uk/uksi/2020/298/made",
    ],
    archiveUrl:
      "https://webarchive.nationalarchives.gov.uk/ukgwa/20220531182920/https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
    derivation:
      "Individual basis, claimant is the higher earner. Child Benefit 21.05/week x 53 weeks = 1115.65 (weeks: the Mondays from 6 April to 5 April, ITEPA 2003 s.681H(3), https://www.legislation.gov.uk/ukpga/2003/1/section/681H; one weekly rate for the whole year); charge percentage: ANI 49999 is not over 50000, so no steps over the threshold, 0%; charge: total 1115.65 rounded down to 1115; 1115 x 0% = 0. Rule: 1% of Child Benefit per full 100 of ANI over 50,000, tax years up to 2023/24 (GOV.UK child-benefit-tax-charge). The step rule is from GOV.UK because the ITEPA 2003 s.681C(2)(b) formula is an image on legislation.gov.uk. The percentage is capped at 100%. ITEPA 2003 s.681C(3) (https://www.legislation.gov.uk/ukpga/2003/1/section/681C) rounds down the total Child Benefit to whole pounds, the percentage to a whole number and the charge to whole pounds, in that order. Weekly rate for 1 child(ren): eldest 21.05. Weekly rates: SI 2020/298 reg 5 (21.05 and 13.95 from 6 April 2020, read on legislation.gov.uk on 20 Nov 2026, https://www.legislation.gov.uk/uksi/2020/298/made); archived GOV.UK rates table captured 31 May 2022 (2020 to 2021 column), https://webarchive.nationalarchives.gov.uk/ukgwa/20220531182920/https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Child Benefit weeks are the Mondays in the tax year (ITEPA 2003 s.681H(3), decider ruling adopted 20 Nov 2026), at that year's single weekly rate because uprating starts on the first Monday on or after 6 April.",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:db93e9e73bd7c70e61787dcceea0362b6a71872b04f4e497e7af6432bd901454",
    rulingRef:
      "ITEPA 2003 s.681B(1)(a) (as at 06/04/2020) charges only where ANI exceeds 50,000; s.681H(3) gives 53 Mondays 6 Apr 2020 to 5 Apr 2021; SI 2020/298 reg 5 rate 21.05; read 2026-11-24. Charge 0.",
  },
  {
    id: "hicbc.2020-21.ani50100.children1",
    taxYear: "2020/21",
    region: "ENGLAND_NI_WALES",
    kind: "hicbc",
    feature: "hicbc",
    input: { adjustedNetIncome: 50100, children: 1 },
    expected: 11,
    source: "https://www.gov.uk/child-benefit-tax-charge",
    additionalSources: [
      "https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
      "https://www.legislation.gov.uk/uksi/2020/298/made",
    ],
    archiveUrl:
      "https://webarchive.nationalarchives.gov.uk/ukgwa/20220531182920/https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
    derivation:
      "Individual basis, claimant is the higher earner. Child Benefit 21.05/week x 53 weeks = 1115.65 (weeks: the Mondays from 6 April to 5 April, ITEPA 2003 s.681H(3), https://www.legislation.gov.uk/ukpga/2003/1/section/681H; one weekly rate for the whole year); charge percentage min(100, floor((ANI 50100 - 50000) / 100)) = 1%; charge: total 1115.65 rounded down to 1115; 1115 x 1% = 11.15, rounded down to 11. Rule: 1% of Child Benefit per full 100 of ANI over 50,000, tax years up to 2023/24 (GOV.UK child-benefit-tax-charge). The step rule is from GOV.UK because the ITEPA 2003 s.681C(2)(b) formula is an image on legislation.gov.uk. The percentage is capped at 100%. ITEPA 2003 s.681C(3) (https://www.legislation.gov.uk/ukpga/2003/1/section/681C) rounds down the total Child Benefit to whole pounds, the percentage to a whole number and the charge to whole pounds, in that order. Weekly rate for 1 child(ren): eldest 21.05. Weekly rates: SI 2020/298 reg 5 (21.05 and 13.95 from 6 April 2020, read on legislation.gov.uk on 20 Nov 2026, https://www.legislation.gov.uk/uksi/2020/298/made); archived GOV.UK rates table captured 31 May 2022 (2020 to 2021 column), https://webarchive.nationalarchives.gov.uk/ukgwa/20220531182920/https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Child Benefit weeks are the Mondays in the tax year (ITEPA 2003 s.681H(3), decider ruling adopted 20 Nov 2026), at that year's single weekly rate because uprating starts on the first Monday on or after 6 April.",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-20",
    signedOffHash: "v2:d0f0ef41c5d60ccfdcb924e1b21c29931345d8624da43e9eb3b694a22a1fa504",
    rulingRef:
      "Child Benefit weeks are the Mondays in the tax year (ITEPA 2003 s.681H(3)): 53 in 2020/21 and 2026/27, at that year's single weekly rate because uprating starts on the first Monday on or after 6 April; total, percentage and charge rounded down under s.681C(3); figure re-derived by the decider on 20 Nov 2026.",
  },
  {
    id: "hicbc.2020-21.ani55000.children2",
    taxYear: "2020/21",
    region: "ENGLAND_NI_WALES",
    kind: "hicbc",
    feature: "hicbc",
    input: { adjustedNetIncome: 55000, children: 2 },
    expected: 927,
    source: "https://www.gov.uk/child-benefit-tax-charge",
    additionalSources: [
      "https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
      "https://www.legislation.gov.uk/uksi/2020/298/made",
    ],
    archiveUrl:
      "https://webarchive.nationalarchives.gov.uk/ukgwa/20220531182920/https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
    derivation:
      "Individual basis, claimant is the higher earner. Child Benefit 35/week x 53 weeks = 1855 (weeks: the Mondays from 6 April to 5 April, ITEPA 2003 s.681H(3), https://www.legislation.gov.uk/ukpga/2003/1/section/681H; one weekly rate for the whole year); charge percentage min(100, floor((ANI 55000 - 50000) / 100)) = 50%; charge 1855 x 50% = 927.50, rounded down to 927. Rule: 1% of Child Benefit per full 100 of ANI over 50,000, tax years up to 2023/24 (GOV.UK child-benefit-tax-charge). The step rule is from GOV.UK because the ITEPA 2003 s.681C(2)(b) formula is an image on legislation.gov.uk. The percentage is capped at 100%. ITEPA 2003 s.681C(3) (https://www.legislation.gov.uk/ukpga/2003/1/section/681C) rounds down the total Child Benefit to whole pounds, the percentage to a whole number and the charge to whole pounds, in that order. Weekly rate for 2 child(ren): eldest 21.05 + 1 x 13.95. Weekly rates: SI 2020/298 reg 5 (21.05 and 13.95 from 6 April 2020, read on legislation.gov.uk on 20 Nov 2026, https://www.legislation.gov.uk/uksi/2020/298/made); archived GOV.UK rates table captured 31 May 2022 (2020 to 2021 column), https://webarchive.nationalarchives.gov.uk/ukgwa/20220531182920/https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Child Benefit weeks are the Mondays in the tax year (ITEPA 2003 s.681H(3), decider ruling adopted 20 Nov 2026), at that year's single weekly rate because uprating starts on the first Monday on or after 6 April.",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-20",
    signedOffHash: "v2:b088a37ed3cd328721ec95a0ad99a221c316a14c079b321b383c0583bea874f0",
    rulingRef:
      "Child Benefit weeks are the Mondays in the tax year (ITEPA 2003 s.681H(3)): 53 in 2020/21 and 2026/27, at that year's single weekly rate because uprating starts on the first Monday on or after 6 April; total, percentage and charge rounded down under s.681C(3); figure re-derived by the decider on 20 Nov 2026.",
  },
  {
    id: "hicbc.2020-21.ani60000.children1",
    taxYear: "2020/21",
    region: "ENGLAND_NI_WALES",
    kind: "hicbc",
    feature: "hicbc",
    input: { adjustedNetIncome: 60000, children: 1 },
    expected: 1115,
    source: "https://www.gov.uk/child-benefit-tax-charge",
    additionalSources: [
      "https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
      "https://www.legislation.gov.uk/uksi/2020/298/made",
    ],
    archiveUrl:
      "https://webarchive.nationalarchives.gov.uk/ukgwa/20220531182920/https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
    derivation:
      "Individual basis, claimant is the higher earner. Child Benefit 21.05/week x 53 weeks = 1115.65 (weeks: the Mondays from 6 April to 5 April, ITEPA 2003 s.681H(3), https://www.legislation.gov.uk/ukpga/2003/1/section/681H; one weekly rate for the whole year); charge percentage min(100, floor((ANI 60000 - 50000) / 100)) = 100%; charge: total 1115.65 rounded down to 1115; 1115 x 100% = 1115. Rule: 1% of Child Benefit per full 100 of ANI over 50,000, tax years up to 2023/24 (GOV.UK child-benefit-tax-charge). The step rule is from GOV.UK because the ITEPA 2003 s.681C(2)(b) formula is an image on legislation.gov.uk. The percentage is capped at 100%. ITEPA 2003 s.681C(3) (https://www.legislation.gov.uk/ukpga/2003/1/section/681C) rounds down the total Child Benefit to whole pounds, the percentage to a whole number and the charge to whole pounds, in that order. Weekly rate for 1 child(ren): eldest 21.05. Weekly rates: SI 2020/298 reg 5 (21.05 and 13.95 from 6 April 2020, read on legislation.gov.uk on 20 Nov 2026, https://www.legislation.gov.uk/uksi/2020/298/made); archived GOV.UK rates table captured 31 May 2022 (2020 to 2021 column), https://webarchive.nationalarchives.gov.uk/ukgwa/20220531182920/https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Child Benefit weeks are the Mondays in the tax year (ITEPA 2003 s.681H(3), decider ruling adopted 20 Nov 2026), at that year's single weekly rate because uprating starts on the first Monday on or after 6 April.",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-20",
    signedOffHash: "v2:e018366e93b4c2adaf6b4f374030e2b8bb78a100a65c009fda69347d23e6d852",
    rulingRef:
      "Child Benefit weeks are the Mondays in the tax year (ITEPA 2003 s.681H(3)): 53 in 2020/21 and 2026/27, at that year's single weekly rate because uprating starts on the first Monday on or after 6 April; total, percentage and charge rounded down under s.681C(3); figure re-derived by the decider on 20 Nov 2026.",
  },
  {
    id: "hicbc.2020-21.ani70000.children3",
    taxYear: "2020/21",
    region: "ENGLAND_NI_WALES",
    kind: "hicbc",
    feature: "hicbc",
    input: { adjustedNetIncome: 70000, children: 3 },
    expected: 2594,
    source: "https://www.gov.uk/child-benefit-tax-charge",
    additionalSources: [
      "https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
      "https://www.legislation.gov.uk/uksi/2020/298/made",
    ],
    archiveUrl:
      "https://webarchive.nationalarchives.gov.uk/ukgwa/20220531182920/https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
    derivation:
      "Individual basis, claimant is the higher earner. Child Benefit 48.95/week x 53 weeks = 2594.35 (weeks: the Mondays from 6 April to 5 April, ITEPA 2003 s.681H(3), https://www.legislation.gov.uk/ukpga/2003/1/section/681H; one weekly rate for the whole year); charge percentage min(100, floor((ANI 70000 - 50000) / 100)) = 100%; charge: total 2594.35 rounded down to 2594; 2594 x 100% = 2594. Rule: 1% of Child Benefit per full 100 of ANI over 50,000, tax years up to 2023/24 (GOV.UK child-benefit-tax-charge). The step rule is from GOV.UK because the ITEPA 2003 s.681C(2)(b) formula is an image on legislation.gov.uk. The percentage is capped at 100%. ITEPA 2003 s.681C(3) (https://www.legislation.gov.uk/ukpga/2003/1/section/681C) rounds down the total Child Benefit to whole pounds, the percentage to a whole number and the charge to whole pounds, in that order. Weekly rate for 3 child(ren): eldest 21.05 + 2 x 13.95. Weekly rates: SI 2020/298 reg 5 (21.05 and 13.95 from 6 April 2020, read on legislation.gov.uk on 20 Nov 2026, https://www.legislation.gov.uk/uksi/2020/298/made); archived GOV.UK rates table captured 31 May 2022 (2020 to 2021 column), https://webarchive.nationalarchives.gov.uk/ukgwa/20220531182920/https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Child Benefit weeks are the Mondays in the tax year (ITEPA 2003 s.681H(3), decider ruling adopted 20 Nov 2026), at that year's single weekly rate because uprating starts on the first Monday on or after 6 April.",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-20",
    signedOffHash: "v2:4f56ec73b9f6dfbce08c717a28f0223f3a309186c634231058ca2e940e295495",
    rulingRef:
      "Child Benefit weeks are the Mondays in the tax year (ITEPA 2003 s.681H(3)): 53 in 2020/21 and 2026/27, at that year's single weekly rate because uprating starts on the first Monday on or after 6 April; total, percentage and charge rounded down under s.681C(3); figure re-derived by the decider on 20 Nov 2026.",
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
    archiveUrl:
      "https://webarchive.nationalarchives.gov.uk/ukgwa/20220531182920/https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
    derivation:
      "Individual basis, claimant is the higher earner. Child Benefit 21.15/week x 52 weeks = 1099.8 (weeks: the Mondays from 6 April to 5 April, ITEPA 2003 s.681H(3), https://www.legislation.gov.uk/ukpga/2003/1/section/681H; one weekly rate for the whole year); charge percentage: ANI 49999 is not over 50000, so no steps over the threshold, 0%; charge: total 1099.8 rounded down to 1099; 1099 x 0% = 0. Rule: 1% of Child Benefit per full 100 of ANI over 50,000, tax years up to 2023/24 (GOV.UK child-benefit-tax-charge). The step rule is from GOV.UK because the ITEPA 2003 s.681C(2)(b) formula is an image on legislation.gov.uk. The percentage is capped at 100%. ITEPA 2003 s.681C(3) (https://www.legislation.gov.uk/ukpga/2003/1/section/681C) rounds down the total Child Benefit to whole pounds, the percentage to a whole number and the charge to whole pounds, in that order. Weekly rate for 1 child(ren): eldest 21.15. Weekly rates: archived GOV.UK rates table captured 31 May 2022 (2021 to 2022 column), https://webarchive.nationalarchives.gov.uk/ukgwa/20220531182920/https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Child Benefit weeks are the Mondays in the tax year (ITEPA 2003 s.681H(3), decider ruling adopted 20 Nov 2026), at that year's single weekly rate because uprating starts on the first Monday on or after 6 April; Child Benefit weekly rate for this year is not on a GOV.UK page reached (rate recalled from the uprating chain, unconfirmed).",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:95fdcff2523b5afee0308c18b6c8606964b95bbfe013e46952abaef44d8fca57",
    rulingRef:
      "SI 2021/156 reg 5 sets Child Benefit at 21.15 and 14.00 from 12 April 2021; ITEPA 2003 s.681H(3) gives 52 Monday-weeks at that rate (1,099.80); the charge is nil because adjusted net income does not exceed 50,000 (s.681B as in force for 2021/22).",
  },
  {
    id: "hicbc.2021-22.ani50100.children1",
    taxYear: "2021/22",
    region: "ENGLAND_NI_WALES",
    kind: "hicbc",
    feature: "hicbc",
    input: { adjustedNetIncome: 50100, children: 1 },
    expected: 10,
    source: "https://www.gov.uk/child-benefit-tax-charge",
    additionalSources: [
      "https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
    ],
    archiveUrl:
      "https://webarchive.nationalarchives.gov.uk/ukgwa/20220531182920/https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
    derivation:
      "Individual basis, claimant is the higher earner. Child Benefit 21.15/week x 52 weeks = 1099.8 (weeks: the Mondays from 6 April to 5 April, ITEPA 2003 s.681H(3), https://www.legislation.gov.uk/ukpga/2003/1/section/681H; one weekly rate for the whole year); charge percentage min(100, floor((ANI 50100 - 50000) / 100)) = 1%; charge: total 1099.8 rounded down to 1099; 1099 x 1% = 10.99, rounded down to 10. Rule: 1% of Child Benefit per full 100 of ANI over 50,000, tax years up to 2023/24 (GOV.UK child-benefit-tax-charge). The step rule is from GOV.UK because the ITEPA 2003 s.681C(2)(b) formula is an image on legislation.gov.uk. The percentage is capped at 100%. ITEPA 2003 s.681C(3) (https://www.legislation.gov.uk/ukpga/2003/1/section/681C) rounds down the total Child Benefit to whole pounds, the percentage to a whole number and the charge to whole pounds, in that order. Weekly rate for 1 child(ren): eldest 21.15. Weekly rates: archived GOV.UK rates table captured 31 May 2022 (2021 to 2022 column), https://webarchive.nationalarchives.gov.uk/ukgwa/20220531182920/https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Child Benefit weeks are the Mondays in the tax year (ITEPA 2003 s.681H(3), decider ruling adopted 20 Nov 2026), at that year's single weekly rate because uprating starts on the first Monday on or after 6 April; Child Benefit weekly rate for this year is not on a GOV.UK page reached (rate recalled from the uprating chain, unconfirmed).",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:ca39ae91a8f838c89ac7b8bd28907969e05423bc05e1d65c8ab064cb38e4aaee",
    rulingRef:
      "SI 2021/156 reg 5 confirms 21.15 from 12 April 2021 and s.681H(3) gives 52 weeks (1,099.80, rounded down to 1,099); with 50,000 and 100 (s.681C before F(No.2)A 2024 s.5) the charge is 1%, 10 after s.681C(3) rounding.",
  },
  {
    id: "hicbc.2021-22.ani55000.children2",
    taxYear: "2021/22",
    region: "ENGLAND_NI_WALES",
    kind: "hicbc",
    feature: "hicbc",
    input: { adjustedNetIncome: 55000, children: 2 },
    expected: 913,
    source: "https://www.gov.uk/child-benefit-tax-charge",
    additionalSources: [
      "https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
    ],
    archiveUrl:
      "https://webarchive.nationalarchives.gov.uk/ukgwa/20220531182920/https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
    derivation:
      "Individual basis, claimant is the higher earner. Child Benefit 35.15/week x 52 weeks = 1827.8 (weeks: the Mondays from 6 April to 5 April, ITEPA 2003 s.681H(3), https://www.legislation.gov.uk/ukpga/2003/1/section/681H; one weekly rate for the whole year); charge percentage min(100, floor((ANI 55000 - 50000) / 100)) = 50%; charge: total 1827.8 rounded down to 1827; 1827 x 50% = 913.50, rounded down to 913. Rule: 1% of Child Benefit per full 100 of ANI over 50,000, tax years up to 2023/24 (GOV.UK child-benefit-tax-charge). The step rule is from GOV.UK because the ITEPA 2003 s.681C(2)(b) formula is an image on legislation.gov.uk. The percentage is capped at 100%. ITEPA 2003 s.681C(3) (https://www.legislation.gov.uk/ukpga/2003/1/section/681C) rounds down the total Child Benefit to whole pounds, the percentage to a whole number and the charge to whole pounds, in that order. Weekly rate for 2 child(ren): eldest 21.15 + 1 x 14. Weekly rates: archived GOV.UK rates table captured 31 May 2022 (2021 to 2022 column), https://webarchive.nationalarchives.gov.uk/ukgwa/20220531182920/https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Child Benefit weeks are the Mondays in the tax year (ITEPA 2003 s.681H(3), decider ruling adopted 20 Nov 2026), at that year's single weekly rate because uprating starts on the first Monday on or after 6 April; Child Benefit weekly rate for this year is not on a GOV.UK page reached (rate recalled from the uprating chain, unconfirmed).",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:be038be885f0d3a23eb987c4771c0f39d424ee698b3720da622727748b31e04e",
    rulingRef:
      "SI 2021/156 reg 5 confirms 21.15 plus 14.00 from 12 April 2021 and s.681H(3) gives 52 weeks (1,827.80, rounded down to 1,827); 50% under the pre-2024 s.681C formula gives 913.50, rounded down to 913.",
  },
  {
    id: "hicbc.2021-22.ani60000.children1",
    taxYear: "2021/22",
    region: "ENGLAND_NI_WALES",
    kind: "hicbc",
    feature: "hicbc",
    input: { adjustedNetIncome: 60000, children: 1 },
    expected: 1099,
    source: "https://www.gov.uk/child-benefit-tax-charge",
    additionalSources: [
      "https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
    ],
    archiveUrl:
      "https://webarchive.nationalarchives.gov.uk/ukgwa/20220531182920/https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
    derivation:
      "Individual basis, claimant is the higher earner. Child Benefit 21.15/week x 52 weeks = 1099.8 (weeks: the Mondays from 6 April to 5 April, ITEPA 2003 s.681H(3), https://www.legislation.gov.uk/ukpga/2003/1/section/681H; one weekly rate for the whole year); charge percentage min(100, floor((ANI 60000 - 50000) / 100)) = 100%; charge: total 1099.8 rounded down to 1099; 1099 x 100% = 1099. Rule: 1% of Child Benefit per full 100 of ANI over 50,000, tax years up to 2023/24 (GOV.UK child-benefit-tax-charge). The step rule is from GOV.UK because the ITEPA 2003 s.681C(2)(b) formula is an image on legislation.gov.uk. The percentage is capped at 100%. ITEPA 2003 s.681C(3) (https://www.legislation.gov.uk/ukpga/2003/1/section/681C) rounds down the total Child Benefit to whole pounds, the percentage to a whole number and the charge to whole pounds, in that order. Weekly rate for 1 child(ren): eldest 21.15. Weekly rates: archived GOV.UK rates table captured 31 May 2022 (2021 to 2022 column), https://webarchive.nationalarchives.gov.uk/ukgwa/20220531182920/https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Child Benefit weeks are the Mondays in the tax year (ITEPA 2003 s.681H(3), decider ruling adopted 20 Nov 2026), at that year's single weekly rate because uprating starts on the first Monday on or after 6 April; Child Benefit weekly rate for this year is not on a GOV.UK page reached (rate recalled from the uprating chain, unconfirmed).",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:31a6fe30d63dc20d141aa23fae8c8fc348ae491eb8f8c2c565e62a162216ad49",
    rulingRef:
      "SI 2021/156 reg 5 confirms 21.15 from 12 April 2021 and s.681H(3) gives 52 weeks (1,099.80, rounded down to 1,099); the pre-2024 s.681C formula gives (60,000 less 50,000) / 100 = 100%, so the charge is 1,099.",
  },
  {
    id: "hicbc.2021-22.ani70000.children3",
    taxYear: "2021/22",
    region: "ENGLAND_NI_WALES",
    kind: "hicbc",
    feature: "hicbc",
    input: { adjustedNetIncome: 70000, children: 3 },
    expected: 2555,
    source: "https://www.gov.uk/child-benefit-tax-charge",
    additionalSources: [
      "https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
    ],
    archiveUrl:
      "https://webarchive.nationalarchives.gov.uk/ukgwa/20220531182920/https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
    derivation:
      "Individual basis, claimant is the higher earner. Child Benefit 49.15/week x 52 weeks = 2555.8 (weeks: the Mondays from 6 April to 5 April, ITEPA 2003 s.681H(3), https://www.legislation.gov.uk/ukpga/2003/1/section/681H; one weekly rate for the whole year); charge percentage min(100, floor((ANI 70000 - 50000) / 100)) = 100%; charge: total 2555.8 rounded down to 2555; 2555 x 100% = 2555. Rule: 1% of Child Benefit per full 100 of ANI over 50,000, tax years up to 2023/24 (GOV.UK child-benefit-tax-charge). The step rule is from GOV.UK because the ITEPA 2003 s.681C(2)(b) formula is an image on legislation.gov.uk. The percentage is capped at 100%. ITEPA 2003 s.681C(3) (https://www.legislation.gov.uk/ukpga/2003/1/section/681C) rounds down the total Child Benefit to whole pounds, the percentage to a whole number and the charge to whole pounds, in that order. Weekly rate for 3 child(ren): eldest 21.15 + 2 x 14. Weekly rates: archived GOV.UK rates table captured 31 May 2022 (2021 to 2022 column), https://webarchive.nationalarchives.gov.uk/ukgwa/20220531182920/https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Child Benefit weeks are the Mondays in the tax year (ITEPA 2003 s.681H(3), decider ruling adopted 20 Nov 2026), at that year's single weekly rate because uprating starts on the first Monday on or after 6 April; Child Benefit weekly rate for this year is not on a GOV.UK page reached (rate recalled from the uprating chain, unconfirmed).",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:24ec23e289f32ef3193448f411f0ea6888c385edac7d9405226c99aefc77335d",
    rulingRef:
      "SI 2021/156 reg 5 confirms 21.15 plus two at 14.00 from 12 April 2021 and s.681H(3) gives 52 weeks (2,555.80, rounded down to 2,555); the percentage is capped at 100% by s.681C(2)(a), so the charge is 2,555.",
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
    archiveUrl:
      "https://webarchive.nationalarchives.gov.uk/ukgwa/20220531182920/https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
    derivation:
      "Individual basis, claimant is the higher earner. Child Benefit 21.8/week x 52 weeks = 1133.6 (weeks: the Mondays from 6 April to 5 April, ITEPA 2003 s.681H(3), https://www.legislation.gov.uk/ukpga/2003/1/section/681H; one weekly rate for the whole year); charge percentage: ANI 49999 is not over 50000, so no steps over the threshold, 0%; charge: total 1133.6 rounded down to 1133; 1133 x 0% = 0. Rule: 1% of Child Benefit per full 100 of ANI over 50,000, tax years up to 2023/24 (GOV.UK child-benefit-tax-charge). The step rule is from GOV.UK because the ITEPA 2003 s.681C(2)(b) formula is an image on legislation.gov.uk. The percentage is capped at 100%. ITEPA 2003 s.681C(3) (https://www.legislation.gov.uk/ukpga/2003/1/section/681C) rounds down the total Child Benefit to whole pounds, the percentage to a whole number and the charge to whole pounds, in that order. Weekly rate for 1 child(ren): eldest 21.8. Weekly rates: archived GOV.UK rates table captured 31 May 2022 (2022 to 2023 column); SI 2023/237 uprates from these figures, https://webarchive.nationalarchives.gov.uk/ukgwa/20220531182920/https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Child Benefit weeks are the Mondays in the tax year (ITEPA 2003 s.681H(3), decider ruling adopted 20 Nov 2026), at that year's single weekly rate because uprating starts on the first Monday on or after 6 April.",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:d726c6f7ec4724574e616c11d84a0e2cee44ec0698a35875c28427f7d40a3c45",
    rulingRef:
      "ITEPA 2003 s.681C(2) as at 2022-04-06 (L 50,000, X 100) and s.681H(3), read 2026-11-24: ANI 49,999 does not exceed L, so the charge is 0. 52 Mondays fall in 2022/23, all at 21.80 (SI 2022/231 reg 5, in force 11 April 2022).",
  },
  {
    id: "hicbc.2022-23.ani50100.children1",
    taxYear: "2022/23",
    region: "ENGLAND_NI_WALES",
    kind: "hicbc",
    feature: "hicbc",
    input: { adjustedNetIncome: 50100, children: 1 },
    expected: 11,
    source: "https://www.gov.uk/child-benefit-tax-charge",
    additionalSources: [
      "https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
      "https://www.legislation.gov.uk/uksi/2023/237/made",
    ],
    archiveUrl:
      "https://webarchive.nationalarchives.gov.uk/ukgwa/20220531182920/https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
    derivation:
      "Individual basis, claimant is the higher earner. Child Benefit 21.8/week x 52 weeks = 1133.6 (weeks: the Mondays from 6 April to 5 April, ITEPA 2003 s.681H(3), https://www.legislation.gov.uk/ukpga/2003/1/section/681H; one weekly rate for the whole year); charge percentage min(100, floor((ANI 50100 - 50000) / 100)) = 1%; charge: total 1133.6 rounded down to 1133; 1133 x 1% = 11.33, rounded down to 11. Rule: 1% of Child Benefit per full 100 of ANI over 50,000, tax years up to 2023/24 (GOV.UK child-benefit-tax-charge). The step rule is from GOV.UK because the ITEPA 2003 s.681C(2)(b) formula is an image on legislation.gov.uk. The percentage is capped at 100%. ITEPA 2003 s.681C(3) (https://www.legislation.gov.uk/ukpga/2003/1/section/681C) rounds down the total Child Benefit to whole pounds, the percentage to a whole number and the charge to whole pounds, in that order. Weekly rate for 1 child(ren): eldest 21.8. Weekly rates: archived GOV.UK rates table captured 31 May 2022 (2022 to 2023 column); SI 2023/237 uprates from these figures, https://webarchive.nationalarchives.gov.uk/ukgwa/20220531182920/https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Child Benefit weeks are the Mondays in the tax year (ITEPA 2003 s.681H(3), decider ruling adopted 20 Nov 2026), at that year's single weekly rate because uprating starts on the first Monday on or after 6 April.",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-20",
    signedOffHash: "v2:df90c8b2d3ae994e7655392150960487b3e010e7da291d28645875aa1fbdf45d",
    rulingRef:
      "Total Child Benefit, percentage and charge rounded down under ITEPA 2003 s.681C(3); weeks are the Mondays in the tax year (s.681H(3)), 52 in this year, at that year's single weekly rate; figure approved by the decider on 20 Nov 2026.",
  },
  {
    id: "hicbc.2022-23.ani55000.children2",
    taxYear: "2022/23",
    region: "ENGLAND_NI_WALES",
    kind: "hicbc",
    feature: "hicbc",
    input: { adjustedNetIncome: 55000, children: 2 },
    expected: 942,
    source: "https://www.gov.uk/child-benefit-tax-charge",
    additionalSources: [
      "https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
      "https://www.legislation.gov.uk/uksi/2023/237/made",
    ],
    archiveUrl:
      "https://webarchive.nationalarchives.gov.uk/ukgwa/20220531182920/https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
    derivation:
      "Individual basis, claimant is the higher earner. Child Benefit 36.25/week x 52 weeks = 1885 (weeks: the Mondays from 6 April to 5 April, ITEPA 2003 s.681H(3), https://www.legislation.gov.uk/ukpga/2003/1/section/681H; one weekly rate for the whole year); charge percentage min(100, floor((ANI 55000 - 50000) / 100)) = 50%; charge 1885 x 50% = 942.50, rounded down to 942. Rule: 1% of Child Benefit per full 100 of ANI over 50,000, tax years up to 2023/24 (GOV.UK child-benefit-tax-charge). The step rule is from GOV.UK because the ITEPA 2003 s.681C(2)(b) formula is an image on legislation.gov.uk. The percentage is capped at 100%. ITEPA 2003 s.681C(3) (https://www.legislation.gov.uk/ukpga/2003/1/section/681C) rounds down the total Child Benefit to whole pounds, the percentage to a whole number and the charge to whole pounds, in that order. Weekly rate for 2 child(ren): eldest 21.8 + 1 x 14.45. Weekly rates: archived GOV.UK rates table captured 31 May 2022 (2022 to 2023 column); SI 2023/237 uprates from these figures, https://webarchive.nationalarchives.gov.uk/ukgwa/20220531182920/https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Child Benefit weeks are the Mondays in the tax year (ITEPA 2003 s.681H(3), decider ruling adopted 20 Nov 2026), at that year's single weekly rate because uprating starts on the first Monday on or after 6 April.",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-20",
    signedOffHash: "v2:783ad95ed96e31751b22135a41ab4dbb669e59f5dfd0e9bc67634b6cdbe59b5f",
    rulingRef:
      "Total Child Benefit, percentage and charge rounded down under ITEPA 2003 s.681C(3); weeks are the Mondays in the tax year (s.681H(3)), 52 in this year, at that year's single weekly rate; figure approved by the decider on 20 Nov 2026.",
  },
  {
    id: "hicbc.2022-23.ani60000.children1",
    taxYear: "2022/23",
    region: "ENGLAND_NI_WALES",
    kind: "hicbc",
    feature: "hicbc",
    input: { adjustedNetIncome: 60000, children: 1 },
    expected: 1133,
    source: "https://www.gov.uk/child-benefit-tax-charge",
    additionalSources: [
      "https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
      "https://www.legislation.gov.uk/uksi/2023/237/made",
    ],
    archiveUrl:
      "https://webarchive.nationalarchives.gov.uk/ukgwa/20220531182920/https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
    derivation:
      "Individual basis, claimant is the higher earner. Child Benefit 21.8/week x 52 weeks = 1133.6 (weeks: the Mondays from 6 April to 5 April, ITEPA 2003 s.681H(3), https://www.legislation.gov.uk/ukpga/2003/1/section/681H; one weekly rate for the whole year); charge percentage min(100, floor((ANI 60000 - 50000) / 100)) = 100%; charge: total 1133.6 rounded down to 1133; 1133 x 100% = 1133. Rule: 1% of Child Benefit per full 100 of ANI over 50,000, tax years up to 2023/24 (GOV.UK child-benefit-tax-charge). The step rule is from GOV.UK because the ITEPA 2003 s.681C(2)(b) formula is an image on legislation.gov.uk. The percentage is capped at 100%. ITEPA 2003 s.681C(3) (https://www.legislation.gov.uk/ukpga/2003/1/section/681C) rounds down the total Child Benefit to whole pounds, the percentage to a whole number and the charge to whole pounds, in that order. Weekly rate for 1 child(ren): eldest 21.8. Weekly rates: archived GOV.UK rates table captured 31 May 2022 (2022 to 2023 column); SI 2023/237 uprates from these figures, https://webarchive.nationalarchives.gov.uk/ukgwa/20220531182920/https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Child Benefit weeks are the Mondays in the tax year (ITEPA 2003 s.681H(3), decider ruling adopted 20 Nov 2026), at that year's single weekly rate because uprating starts on the first Monday on or after 6 April.",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-20",
    signedOffHash: "v2:064b629c625e27bbbc77163263d21a58e423a42f3994d14676659172b6010114",
    rulingRef:
      "Total Child Benefit, percentage and charge rounded down under ITEPA 2003 s.681C(3); weeks are the Mondays in the tax year (s.681H(3)), 52 in this year, at that year's single weekly rate; figure approved by the decider on 20 Nov 2026.",
  },
  {
    id: "hicbc.2022-23.ani70000.children3",
    taxYear: "2022/23",
    region: "ENGLAND_NI_WALES",
    kind: "hicbc",
    feature: "hicbc",
    input: { adjustedNetIncome: 70000, children: 3 },
    expected: 2636,
    source: "https://www.gov.uk/child-benefit-tax-charge",
    additionalSources: [
      "https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
      "https://www.legislation.gov.uk/uksi/2023/237/made",
    ],
    archiveUrl:
      "https://webarchive.nationalarchives.gov.uk/ukgwa/20220531182920/https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
    derivation:
      "Individual basis, claimant is the higher earner. Child Benefit 50.7/week x 52 weeks = 2636.4 (weeks: the Mondays from 6 April to 5 April, ITEPA 2003 s.681H(3), https://www.legislation.gov.uk/ukpga/2003/1/section/681H; one weekly rate for the whole year); charge percentage min(100, floor((ANI 70000 - 50000) / 100)) = 100%; charge: total 2636.4 rounded down to 2636; 2636 x 100% = 2636. Rule: 1% of Child Benefit per full 100 of ANI over 50,000, tax years up to 2023/24 (GOV.UK child-benefit-tax-charge). The step rule is from GOV.UK because the ITEPA 2003 s.681C(2)(b) formula is an image on legislation.gov.uk. The percentage is capped at 100%. ITEPA 2003 s.681C(3) (https://www.legislation.gov.uk/ukpga/2003/1/section/681C) rounds down the total Child Benefit to whole pounds, the percentage to a whole number and the charge to whole pounds, in that order. Weekly rate for 3 child(ren): eldest 21.8 + 2 x 14.45. Weekly rates: archived GOV.UK rates table captured 31 May 2022 (2022 to 2023 column); SI 2023/237 uprates from these figures, https://webarchive.nationalarchives.gov.uk/ukgwa/20220531182920/https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Child Benefit weeks are the Mondays in the tax year (ITEPA 2003 s.681H(3), decider ruling adopted 20 Nov 2026), at that year's single weekly rate because uprating starts on the first Monday on or after 6 April.",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-20",
    signedOffHash: "v2:9b35e0138fd78e1891abdd712c04b41b5513a3736f83276c1375e728805da50a",
    rulingRef:
      "Total Child Benefit, percentage and charge rounded down under ITEPA 2003 s.681C(3); weeks are the Mondays in the tax year (s.681H(3)), 52 in this year, at that year's single weekly rate; figure approved by the decider on 20 Nov 2026.",
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
    archiveUrl:
      "https://webarchive.nationalarchives.gov.uk/ukgwa/20240607003115/https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
    derivation:
      "Individual basis, claimant is the higher earner. Child Benefit 24/week x 52 weeks = 1248 (weeks: the Mondays from 6 April to 5 April, ITEPA 2003 s.681H(3), https://www.legislation.gov.uk/ukpga/2003/1/section/681H; one weekly rate for the whole year); charge percentage: ANI 49999 is not over 50000, so no steps over the threshold, 0%; charge 1248 x 0% = 0. Rule: 1% of Child Benefit per full 100 of ANI over 50,000, tax years up to 2023/24 (GOV.UK child-benefit-tax-charge). The step rule is from GOV.UK because the ITEPA 2003 s.681C(2)(b) formula is an image on legislation.gov.uk. The percentage is capped at 100%. ITEPA 2003 s.681C(3) (https://www.legislation.gov.uk/ukpga/2003/1/section/681C) rounds down the total Child Benefit to whole pounds, the percentage to a whole number and the charge to whole pounds, in that order. Weekly rate for 1 child(ren): eldest 24. Weekly rates: SI 2023/237; archived GOV.UK rates table captured 7 June 2024 (2023 to 2024 column), https://webarchive.nationalarchives.gov.uk/ukgwa/20240607003115/https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Child Benefit weeks are the Mondays in the tax year (ITEPA 2003 s.681H(3), decider ruling adopted 20 Nov 2026), at that year's single weekly rate because uprating starts on the first Monday on or after 6 April.",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:dc51a97793470964606af7bc7dbeee9899d19c73b4985393e9d60e916aa97d36",
    rulingRef:
      "ITEPA 2003 s.681H(3) counts weeks by their Monday; 52 Mondays fall in 2023/24 (2023-04-10 to 2024-04-01), all at 24.00 (SI 2023/237 reg 5 from 2023-04-10; SI 2024/247 from 2024-04-08). ANI not over L 50,000 (s.681C, 2013 version): charge 0. Read 2026-11-24.",
  },
  {
    id: "hicbc.2023-24.ani50100.children1",
    taxYear: "2023/24",
    region: "ENGLAND_NI_WALES",
    kind: "hicbc",
    feature: "hicbc",
    input: { adjustedNetIncome: 50100, children: 1 },
    expected: 12,
    source: "https://www.gov.uk/child-benefit-tax-charge",
    additionalSources: [
      "https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
      "https://www.legislation.gov.uk/uksi/2023/237/made",
    ],
    archiveUrl:
      "https://webarchive.nationalarchives.gov.uk/ukgwa/20240607003115/https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
    derivation:
      "Individual basis, claimant is the higher earner. Child Benefit 24/week x 52 weeks = 1248 (weeks: the Mondays from 6 April to 5 April, ITEPA 2003 s.681H(3), https://www.legislation.gov.uk/ukpga/2003/1/section/681H; one weekly rate for the whole year); charge percentage min(100, floor((ANI 50100 - 50000) / 100)) = 1%; charge 1248 x 1% = 12.48, rounded down to 12. Rule: 1% of Child Benefit per full 100 of ANI over 50,000, tax years up to 2023/24 (GOV.UK child-benefit-tax-charge). The step rule is from GOV.UK because the ITEPA 2003 s.681C(2)(b) formula is an image on legislation.gov.uk. The percentage is capped at 100%. ITEPA 2003 s.681C(3) (https://www.legislation.gov.uk/ukpga/2003/1/section/681C) rounds down the total Child Benefit to whole pounds, the percentage to a whole number and the charge to whole pounds, in that order. Weekly rate for 1 child(ren): eldest 24. Weekly rates: SI 2023/237; archived GOV.UK rates table captured 7 June 2024 (2023 to 2024 column), https://webarchive.nationalarchives.gov.uk/ukgwa/20240607003115/https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Child Benefit weeks are the Mondays in the tax year (ITEPA 2003 s.681H(3), decider ruling adopted 20 Nov 2026), at that year's single weekly rate because uprating starts on the first Monday on or after 6 April.",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-20",
    signedOffHash: "v2:a6500fa0bb4caf16c821a9b87a36544603cb7ec773e93100b179ad8d1d60baa9",
    rulingRef:
      "Total Child Benefit, percentage and charge rounded down under ITEPA 2003 s.681C(3); weeks are the Mondays in the tax year (s.681H(3)), 52 in this year, at that year's single weekly rate; figure approved by the decider on 20 Nov 2026.",
  },
  {
    id: "hicbc.2023-24.ani55000.children2",
    taxYear: "2023/24",
    region: "ENGLAND_NI_WALES",
    kind: "hicbc",
    feature: "hicbc",
    input: { adjustedNetIncome: 55000, children: 2 },
    expected: 1037,
    source: "https://www.gov.uk/child-benefit-tax-charge",
    additionalSources: [
      "https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
      "https://www.legislation.gov.uk/uksi/2023/237/made",
    ],
    archiveUrl:
      "https://webarchive.nationalarchives.gov.uk/ukgwa/20240607003115/https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
    derivation:
      "Individual basis, claimant is the higher earner. Child Benefit 39.9/week x 52 weeks = 2074.8 (weeks: the Mondays from 6 April to 5 April, ITEPA 2003 s.681H(3), https://www.legislation.gov.uk/ukpga/2003/1/section/681H; one weekly rate for the whole year); charge percentage min(100, floor((ANI 55000 - 50000) / 100)) = 50%; charge: total 2074.8 rounded down to 2074; 2074 x 50% = 1037. Rule: 1% of Child Benefit per full 100 of ANI over 50,000, tax years up to 2023/24 (GOV.UK child-benefit-tax-charge). The step rule is from GOV.UK because the ITEPA 2003 s.681C(2)(b) formula is an image on legislation.gov.uk. The percentage is capped at 100%. ITEPA 2003 s.681C(3) (https://www.legislation.gov.uk/ukpga/2003/1/section/681C) rounds down the total Child Benefit to whole pounds, the percentage to a whole number and the charge to whole pounds, in that order. Weekly rate for 2 child(ren): eldest 24 + 1 x 15.9. Weekly rates: SI 2023/237; archived GOV.UK rates table captured 7 June 2024 (2023 to 2024 column), https://webarchive.nationalarchives.gov.uk/ukgwa/20240607003115/https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Child Benefit weeks are the Mondays in the tax year (ITEPA 2003 s.681H(3), decider ruling adopted 20 Nov 2026), at that year's single weekly rate because uprating starts on the first Monday on or after 6 April.",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-20",
    signedOffHash: "v2:f1132c251560ffd50e2bedc6541d0ace9500f3a2498bd2da7d184cfea36d778d",
    rulingRef:
      "Total Child Benefit, percentage and charge rounded down under ITEPA 2003 s.681C(3); weeks are the Mondays in the tax year (s.681H(3)), 52 in this year, at that year's single weekly rate; figure approved by the decider on 20 Nov 2026.",
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
    archiveUrl:
      "https://webarchive.nationalarchives.gov.uk/ukgwa/20240607003115/https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
    derivation:
      "Individual basis, claimant is the higher earner. Child Benefit 24/week x 52 weeks = 1248 (weeks: the Mondays from 6 April to 5 April, ITEPA 2003 s.681H(3), https://www.legislation.gov.uk/ukpga/2003/1/section/681H; one weekly rate for the whole year); charge percentage min(100, floor((ANI 60000 - 50000) / 100)) = 100%; charge 1248 x 100% = 1248. Rule: 1% of Child Benefit per full 100 of ANI over 50,000, tax years up to 2023/24 (GOV.UK child-benefit-tax-charge). The step rule is from GOV.UK because the ITEPA 2003 s.681C(2)(b) formula is an image on legislation.gov.uk. The percentage is capped at 100%. ITEPA 2003 s.681C(3) (https://www.legislation.gov.uk/ukpga/2003/1/section/681C) rounds down the total Child Benefit to whole pounds, the percentage to a whole number and the charge to whole pounds, in that order. Weekly rate for 1 child(ren): eldest 24. Weekly rates: SI 2023/237; archived GOV.UK rates table captured 7 June 2024 (2023 to 2024 column), https://webarchive.nationalarchives.gov.uk/ukgwa/20240607003115/https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Child Benefit weeks are the Mondays in the tax year (ITEPA 2003 s.681H(3), decider ruling adopted 20 Nov 2026), at that year's single weekly rate because uprating starts on the first Monday on or after 6 April.",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:ad8d45ee997fd7afbc14748bd0d1391225980fe4ec70bf712a2251dbbacea259",
    rulingRef:
      "ITEPA 2003 s.681H(3): 52 Monday-weeks x 24.00 (SI 2023/237 reg 5) = 1,248. s.681C as in force for 2023/24 has L 50,000 and X 100, so ANI 60,000 gives 100%: charge 1,248. Read on legislation.gov.uk 2026-11-24.",
  },
  {
    id: "hicbc.2023-24.ani70000.children3",
    taxYear: "2023/24",
    region: "ENGLAND_NI_WALES",
    kind: "hicbc",
    feature: "hicbc",
    input: { adjustedNetIncome: 70000, children: 3 },
    expected: 2901,
    source: "https://www.gov.uk/child-benefit-tax-charge",
    additionalSources: [
      "https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
      "https://www.legislation.gov.uk/uksi/2023/237/made",
    ],
    archiveUrl:
      "https://webarchive.nationalarchives.gov.uk/ukgwa/20240607003115/https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
    derivation:
      "Individual basis, claimant is the higher earner. Child Benefit 55.8/week x 52 weeks = 2901.6 (weeks: the Mondays from 6 April to 5 April, ITEPA 2003 s.681H(3), https://www.legislation.gov.uk/ukpga/2003/1/section/681H; one weekly rate for the whole year); charge percentage min(100, floor((ANI 70000 - 50000) / 100)) = 100%; charge: total 2901.6 rounded down to 2901; 2901 x 100% = 2901. Rule: 1% of Child Benefit per full 100 of ANI over 50,000, tax years up to 2023/24 (GOV.UK child-benefit-tax-charge). The step rule is from GOV.UK because the ITEPA 2003 s.681C(2)(b) formula is an image on legislation.gov.uk. The percentage is capped at 100%. ITEPA 2003 s.681C(3) (https://www.legislation.gov.uk/ukpga/2003/1/section/681C) rounds down the total Child Benefit to whole pounds, the percentage to a whole number and the charge to whole pounds, in that order. Weekly rate for 3 child(ren): eldest 24 + 2 x 15.9. Weekly rates: SI 2023/237; archived GOV.UK rates table captured 7 June 2024 (2023 to 2024 column), https://webarchive.nationalarchives.gov.uk/ukgwa/20240607003115/https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Child Benefit weeks are the Mondays in the tax year (ITEPA 2003 s.681H(3), decider ruling adopted 20 Nov 2026), at that year's single weekly rate because uprating starts on the first Monday on or after 6 April.",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-20",
    signedOffHash: "v2:4a346199f24645b541c556218fa6f2737da2f210a772a668921877b50c1b0e8e",
    rulingRef:
      "Total Child Benefit, percentage and charge rounded down under ITEPA 2003 s.681C(3); weeks are the Mondays in the tax year (s.681H(3)), 52 in this year, at that year's single weekly rate; figure approved by the decider on 20 Nov 2026.",
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
    archiveUrl:
      "https://webarchive.nationalarchives.gov.uk/ukgwa/20240607003115/https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
    derivation:
      "Individual basis, claimant is the higher earner. Child Benefit 25.6/week x 52 weeks = 1331.2 (weeks: the Mondays from 6 April to 5 April, ITEPA 2003 s.681H(3), https://www.legislation.gov.uk/ukpga/2003/1/section/681H; one weekly rate for the whole year); charge percentage: ANI 59999 is not over 60000, so no steps over the threshold, 0%; charge: total 1331.2 rounded down to 1331; 1331 x 0% = 0. Rule: 1% of Child Benefit per full 200 of ANI over 60,000, tax years from 2024/25 (GOV.UK child-benefit-tax-charge). The step rule is from GOV.UK because the ITEPA 2003 s.681C(2)(b) formula is an image on legislation.gov.uk. The percentage is capped at 100%. ITEPA 2003 s.681C(3) (https://www.legislation.gov.uk/ukpga/2003/1/section/681C) rounds down the total Child Benefit to whole pounds, the percentage to a whole number and the charge to whole pounds, in that order. Weekly rate for 1 child(ren): eldest 25.6. Weekly rates: SI 2024/247; archived GOV.UK rates table captured 7 June 2024 (2024 to 2025 column), https://webarchive.nationalarchives.gov.uk/ukgwa/20240607003115/https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Child Benefit weeks are the Mondays in the tax year (ITEPA 2003 s.681H(3), decider ruling adopted 20 Nov 2026), at that year's single weekly rate because uprating starts on the first Monday on or after 6 April.",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:ecf66bbdcea861f74d6bc9e0e5905c67d47c5d8e23870d8d83c19131f24479a7",
    rulingRef:
      "ITEPA 2003 s.681H(3) (week = 7 days from a Monday, in the year only if that Monday is) and s.681C(2) (L £60,000, X £200 from 2024-25, FA (No.2) 2024 s.5), read on legislation.gov.uk 2026-11-24: ANI 59,999 is not over 60,000, so 0%, charge 0.",
  },
  {
    id: "hicbc.2024-25.ani60200.children1",
    taxYear: "2024/25",
    region: "ENGLAND_NI_WALES",
    kind: "hicbc",
    feature: "hicbc",
    input: { adjustedNetIncome: 60200, children: 1 },
    expected: 13,
    source: "https://www.gov.uk/child-benefit-tax-charge",
    additionalSources: [
      "https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
      "https://www.legislation.gov.uk/uksi/2024/247/made",
    ],
    archiveUrl:
      "https://webarchive.nationalarchives.gov.uk/ukgwa/20240607003115/https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
    derivation:
      "Individual basis, claimant is the higher earner. Child Benefit 25.6/week x 52 weeks = 1331.2 (weeks: the Mondays from 6 April to 5 April, ITEPA 2003 s.681H(3), https://www.legislation.gov.uk/ukpga/2003/1/section/681H; one weekly rate for the whole year); charge percentage min(100, floor((ANI 60200 - 60000) / 200)) = 1%; charge: total 1331.2 rounded down to 1331; 1331 x 1% = 13.31, rounded down to 13. Rule: 1% of Child Benefit per full 200 of ANI over 60,000, tax years from 2024/25 (GOV.UK child-benefit-tax-charge). The step rule is from GOV.UK because the ITEPA 2003 s.681C(2)(b) formula is an image on legislation.gov.uk. The percentage is capped at 100%. ITEPA 2003 s.681C(3) (https://www.legislation.gov.uk/ukpga/2003/1/section/681C) rounds down the total Child Benefit to whole pounds, the percentage to a whole number and the charge to whole pounds, in that order. Weekly rate for 1 child(ren): eldest 25.6. Weekly rates: SI 2024/247; archived GOV.UK rates table captured 7 June 2024 (2024 to 2025 column), https://webarchive.nationalarchives.gov.uk/ukgwa/20240607003115/https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Child Benefit weeks are the Mondays in the tax year (ITEPA 2003 s.681H(3), decider ruling adopted 20 Nov 2026), at that year's single weekly rate because uprating starts on the first Monday on or after 6 April.",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-20",
    signedOffHash: "v2:9fd36631aaa3859f9af77d9919f9619ae5a2b73a9cbb5b40e3cf847cf9141fba",
    rulingRef:
      "Total Child Benefit, percentage and charge rounded down under ITEPA 2003 s.681C(3); weeks are the Mondays in the tax year (s.681H(3)), 52 in this year, at that year's single weekly rate; figure approved by the decider on 20 Nov 2026.",
  },
  {
    id: "hicbc.2024-25.ani70000.children2",
    taxYear: "2024/25",
    region: "ENGLAND_NI_WALES",
    kind: "hicbc",
    feature: "hicbc",
    input: { adjustedNetIncome: 70000, children: 2 },
    expected: 1106,
    source: "https://www.gov.uk/child-benefit-tax-charge",
    additionalSources: [
      "https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
      "https://www.legislation.gov.uk/uksi/2024/247/made",
    ],
    archiveUrl:
      "https://webarchive.nationalarchives.gov.uk/ukgwa/20240607003115/https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
    derivation:
      "Individual basis, claimant is the higher earner. Child Benefit 42.55/week x 52 weeks = 2212.6 (weeks: the Mondays from 6 April to 5 April, ITEPA 2003 s.681H(3), https://www.legislation.gov.uk/ukpga/2003/1/section/681H; one weekly rate for the whole year); charge percentage min(100, floor((ANI 70000 - 60000) / 200)) = 50%; charge: total 2212.6 rounded down to 2212; 2212 x 50% = 1106. Rule: 1% of Child Benefit per full 200 of ANI over 60,000, tax years from 2024/25 (GOV.UK child-benefit-tax-charge). The step rule is from GOV.UK because the ITEPA 2003 s.681C(2)(b) formula is an image on legislation.gov.uk. The percentage is capped at 100%. ITEPA 2003 s.681C(3) (https://www.legislation.gov.uk/ukpga/2003/1/section/681C) rounds down the total Child Benefit to whole pounds, the percentage to a whole number and the charge to whole pounds, in that order. Weekly rate for 2 child(ren): eldest 25.6 + 1 x 16.95. Weekly rates: SI 2024/247; archived GOV.UK rates table captured 7 June 2024 (2024 to 2025 column), https://webarchive.nationalarchives.gov.uk/ukgwa/20240607003115/https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Child Benefit weeks are the Mondays in the tax year (ITEPA 2003 s.681H(3), decider ruling adopted 20 Nov 2026), at that year's single weekly rate because uprating starts on the first Monday on or after 6 April.",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-20",
    signedOffHash: "v2:b2a749d0c7aaddb425cf35be90be273571abd23c5edae57d561f28d7eb72cb8a",
    rulingRef:
      "Total Child Benefit, percentage and charge rounded down under ITEPA 2003 s.681C(3); weeks are the Mondays in the tax year (s.681H(3)), 52 in this year, at that year's single weekly rate; figure approved by the decider on 20 Nov 2026.",
  },
  {
    id: "hicbc.2024-25.ani79800.children1",
    taxYear: "2024/25",
    region: "ENGLAND_NI_WALES",
    kind: "hicbc",
    feature: "hicbc",
    input: { adjustedNetIncome: 79800, children: 1 },
    expected: 1317,
    source: "https://www.gov.uk/child-benefit-tax-charge",
    additionalSources: [
      "https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
      "https://www.legislation.gov.uk/uksi/2024/247/made",
    ],
    archiveUrl:
      "https://webarchive.nationalarchives.gov.uk/ukgwa/20240607003115/https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
    derivation:
      "Individual basis, claimant is the higher earner. Child Benefit 25.6/week x 52 weeks = 1331.2 (weeks: the Mondays from 6 April to 5 April, ITEPA 2003 s.681H(3), https://www.legislation.gov.uk/ukpga/2003/1/section/681H; one weekly rate for the whole year); charge percentage min(100, floor((ANI 79800 - 60000) / 200)) = 99%; charge: total 1331.2 rounded down to 1331; 1331 x 99% = 1317.69, rounded down to 1317. Rule: 1% of Child Benefit per full 200 of ANI over 60,000, tax years from 2024/25 (GOV.UK child-benefit-tax-charge). The step rule is from GOV.UK because the ITEPA 2003 s.681C(2)(b) formula is an image on legislation.gov.uk. The percentage is capped at 100%. ITEPA 2003 s.681C(3) (https://www.legislation.gov.uk/ukpga/2003/1/section/681C) rounds down the total Child Benefit to whole pounds, the percentage to a whole number and the charge to whole pounds, in that order. Weekly rate for 1 child(ren): eldest 25.6. Weekly rates: SI 2024/247; archived GOV.UK rates table captured 7 June 2024 (2024 to 2025 column), https://webarchive.nationalarchives.gov.uk/ukgwa/20240607003115/https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Child Benefit weeks are the Mondays in the tax year (ITEPA 2003 s.681H(3), decider ruling adopted 20 Nov 2026), at that year's single weekly rate because uprating starts on the first Monday on or after 6 April.",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-20",
    signedOffHash: "v2:cad69c0049b32bd0883d9f0e951d4388a11a18a9783c917182594d81155fea10",
    rulingRef:
      "Total Child Benefit, percentage and charge rounded down under ITEPA 2003 s.681C(3); weeks are the Mondays in the tax year (s.681H(3)), 52 in this year, at that year's single weekly rate; figure approved by the decider on 20 Nov 2026.",
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
    archiveUrl:
      "https://webarchive.nationalarchives.gov.uk/ukgwa/20240607003115/https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
    derivation:
      "Individual basis, claimant is the higher earner. Child Benefit 59.5/week x 52 weeks = 3094 (weeks: the Mondays from 6 April to 5 April, ITEPA 2003 s.681H(3), https://www.legislation.gov.uk/ukpga/2003/1/section/681H; one weekly rate for the whole year); charge percentage min(100, floor((ANI 80000 - 60000) / 200)) = 100%; charge 3094 x 100% = 3094. Rule: 1% of Child Benefit per full 200 of ANI over 60,000, tax years from 2024/25 (GOV.UK child-benefit-tax-charge). The step rule is from GOV.UK because the ITEPA 2003 s.681C(2)(b) formula is an image on legislation.gov.uk. The percentage is capped at 100%. ITEPA 2003 s.681C(3) (https://www.legislation.gov.uk/ukpga/2003/1/section/681C) rounds down the total Child Benefit to whole pounds, the percentage to a whole number and the charge to whole pounds, in that order. Weekly rate for 3 child(ren): eldest 25.6 + 2 x 16.95. Weekly rates: SI 2024/247; archived GOV.UK rates table captured 7 June 2024 (2024 to 2025 column), https://webarchive.nationalarchives.gov.uk/ukgwa/20240607003115/https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Child Benefit weeks are the Mondays in the tax year (ITEPA 2003 s.681H(3), decider ruling adopted 20 Nov 2026), at that year's single weekly rate because uprating starts on the first Monday on or after 6 April.",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:6496ed6cdf0b28f24a41e59b17cd1bd9d412a10dc4f064d31d2c194ed3c379ef",
    rulingRef:
      "ITEPA 2003 s.681H(3) and s.681C, with SI 2024/247 reg 5 (25.60/16.95 in force 8 April 2024, the first Monday of 2024/25), read on legislation.gov.uk 2026-11-24: 52 Mondays (8 Apr 2024 to 31 Mar 2025) x 59.50 = 3,094; 20,000/200 = 100%; charge 3,094.",
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
      "Individual basis, claimant is the higher earner. Child Benefit 26.05/week x 52 weeks = 1354.6 (weeks: the Mondays from 6 April to 5 April, ITEPA 2003 s.681H(3), https://www.legislation.gov.uk/ukpga/2003/1/section/681H; one weekly rate for the whole year); charge percentage: ANI 59999 is not over 60000, so no steps over the threshold, 0%; charge: total 1354.6 rounded down to 1354; 1354 x 0% = 0. Rule: 1% of Child Benefit per full 200 of ANI over 60,000, tax years from 2024/25 (GOV.UK child-benefit-tax-charge). The step rule is from GOV.UK because the ITEPA 2003 s.681C(2)(b) formula is an image on legislation.gov.uk. The percentage is capped at 100%. ITEPA 2003 s.681C(3) (https://www.legislation.gov.uk/ukpga/2003/1/section/681C) rounds down the total Child Benefit to whole pounds, the percentage to a whole number and the charge to whole pounds, in that order. Weekly rate for 1 child(ren): eldest 26.05.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Child Benefit weeks are the Mondays in the tax year (ITEPA 2003 s.681H(3), decider ruling adopted 20 Nov 2026), at that year's single weekly rate because uprating starts on the first Monday on or after 6 April.",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:f76fdfcb0b56f5473eb2fc5626c1da57a9e89c7a4e9f32d2d93f7c1946bc08ae",
    rulingRef:
      "ITEPA 2003 s.681H(3) gives 52 Monday-weeks in 2025/26 at the GOV.UK rate of 26.05; the charge is nil in any case because s.681B(1)(a) requires adjusted net income over 60,000.",
  },
  {
    id: "hicbc.2025-26.ani60200.children1",
    taxYear: "2025/26",
    region: "ENGLAND_NI_WALES",
    kind: "hicbc",
    feature: "hicbc",
    input: { adjustedNetIncome: 60200, children: 1 },
    expected: 13,
    source: "https://www.gov.uk/child-benefit-tax-charge",
    additionalSources: [
      "https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
    ],
    derivation:
      "Individual basis, claimant is the higher earner. Child Benefit 26.05/week x 52 weeks = 1354.6 (weeks: the Mondays from 6 April to 5 April, ITEPA 2003 s.681H(3), https://www.legislation.gov.uk/ukpga/2003/1/section/681H; one weekly rate for the whole year); charge percentage min(100, floor((ANI 60200 - 60000) / 200)) = 1%; charge: total 1354.6 rounded down to 1354; 1354 x 1% = 13.54, rounded down to 13. Rule: 1% of Child Benefit per full 200 of ANI over 60,000, tax years from 2024/25 (GOV.UK child-benefit-tax-charge). The step rule is from GOV.UK because the ITEPA 2003 s.681C(2)(b) formula is an image on legislation.gov.uk. The percentage is capped at 100%. ITEPA 2003 s.681C(3) (https://www.legislation.gov.uk/ukpga/2003/1/section/681C) rounds down the total Child Benefit to whole pounds, the percentage to a whole number and the charge to whole pounds, in that order. Weekly rate for 1 child(ren): eldest 26.05.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Child Benefit weeks are the Mondays in the tax year (ITEPA 2003 s.681H(3), decider ruling adopted 20 Nov 2026), at that year's single weekly rate because uprating starts on the first Monday on or after 6 April.",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-20",
    signedOffHash: "v2:4eeba8a8b9e74ecf96e5f446df10c90f6f3077c898f12d9afa7a2070b155321e",
    rulingRef:
      "Total Child Benefit, percentage and charge rounded down under ITEPA 2003 s.681C(3); weeks are the Mondays in the tax year (s.681H(3)), 52 in this year, at that year's single weekly rate; figure approved by the decider on 20 Nov 2026.",
  },
  {
    id: "hicbc.2025-26.ani70000.children2",
    taxYear: "2025/26",
    region: "ENGLAND_NI_WALES",
    kind: "hicbc",
    feature: "hicbc",
    input: { adjustedNetIncome: 70000, children: 2 },
    expected: 1125,
    source: "https://www.gov.uk/child-benefit-tax-charge",
    additionalSources: [
      "https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
    ],
    derivation:
      "Individual basis, claimant is the higher earner. Child Benefit 43.3/week x 52 weeks = 2251.6 (weeks: the Mondays from 6 April to 5 April, ITEPA 2003 s.681H(3), https://www.legislation.gov.uk/ukpga/2003/1/section/681H; one weekly rate for the whole year); charge percentage min(100, floor((ANI 70000 - 60000) / 200)) = 50%; charge: total 2251.6 rounded down to 2251; 2251 x 50% = 1125.50, rounded down to 1125. Rule: 1% of Child Benefit per full 200 of ANI over 60,000, tax years from 2024/25 (GOV.UK child-benefit-tax-charge). The step rule is from GOV.UK because the ITEPA 2003 s.681C(2)(b) formula is an image on legislation.gov.uk. The percentage is capped at 100%. ITEPA 2003 s.681C(3) (https://www.legislation.gov.uk/ukpga/2003/1/section/681C) rounds down the total Child Benefit to whole pounds, the percentage to a whole number and the charge to whole pounds, in that order. Weekly rate for 2 child(ren): eldest 26.05 + 1 x 17.25.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Child Benefit weeks are the Mondays in the tax year (ITEPA 2003 s.681H(3), decider ruling adopted 20 Nov 2026), at that year's single weekly rate because uprating starts on the first Monday on or after 6 April.",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-20",
    signedOffHash: "v2:2a3f0f229022e6829da6ac5bc604d6530f2f73a99ba09a35a36d973df100d9ea",
    rulingRef:
      "Total Child Benefit, percentage and charge rounded down under ITEPA 2003 s.681C(3); weeks are the Mondays in the tax year (s.681H(3)), 52 in this year, at that year's single weekly rate; figure approved by the decider on 20 Nov 2026.",
  },
  {
    id: "hicbc.2025-26.ani79800.children1",
    taxYear: "2025/26",
    region: "ENGLAND_NI_WALES",
    kind: "hicbc",
    feature: "hicbc",
    input: { adjustedNetIncome: 79800, children: 1 },
    expected: 1340,
    source: "https://www.gov.uk/child-benefit-tax-charge",
    additionalSources: [
      "https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
    ],
    derivation:
      "Individual basis, claimant is the higher earner. Child Benefit 26.05/week x 52 weeks = 1354.6 (weeks: the Mondays from 6 April to 5 April, ITEPA 2003 s.681H(3), https://www.legislation.gov.uk/ukpga/2003/1/section/681H; one weekly rate for the whole year); charge percentage min(100, floor((ANI 79800 - 60000) / 200)) = 99%; charge: total 1354.6 rounded down to 1354; 1354 x 99% = 1340.46, rounded down to 1340. Rule: 1% of Child Benefit per full 200 of ANI over 60,000, tax years from 2024/25 (GOV.UK child-benefit-tax-charge). The step rule is from GOV.UK because the ITEPA 2003 s.681C(2)(b) formula is an image on legislation.gov.uk. The percentage is capped at 100%. ITEPA 2003 s.681C(3) (https://www.legislation.gov.uk/ukpga/2003/1/section/681C) rounds down the total Child Benefit to whole pounds, the percentage to a whole number and the charge to whole pounds, in that order. Weekly rate for 1 child(ren): eldest 26.05.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Child Benefit weeks are the Mondays in the tax year (ITEPA 2003 s.681H(3), decider ruling adopted 20 Nov 2026), at that year's single weekly rate because uprating starts on the first Monday on or after 6 April.",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-20",
    signedOffHash: "v2:4b1fd989c785025ff3dd199a665e05873ff51e02e99c662a5e81d3d8f748ff1c",
    rulingRef:
      "Total Child Benefit, percentage and charge rounded down under ITEPA 2003 s.681C(3); weeks are the Mondays in the tax year (s.681H(3)), 52 in this year, at that year's single weekly rate; figure approved by the decider on 20 Nov 2026.",
  },
  {
    id: "hicbc.2025-26.ani80000.children3",
    taxYear: "2025/26",
    region: "ENGLAND_NI_WALES",
    kind: "hicbc",
    feature: "hicbc",
    input: { adjustedNetIncome: 80000, children: 3 },
    expected: 3148,
    source: "https://www.gov.uk/child-benefit-tax-charge",
    additionalSources: [
      "https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
    ],
    derivation:
      "Individual basis, claimant is the higher earner. Child Benefit 60.55/week x 52 weeks = 3148.6 (weeks: the Mondays from 6 April to 5 April, ITEPA 2003 s.681H(3), https://www.legislation.gov.uk/ukpga/2003/1/section/681H; one weekly rate for the whole year); charge percentage min(100, floor((ANI 80000 - 60000) / 200)) = 100%; charge: total 3148.6 rounded down to 3148; 3148 x 100% = 3148. Rule: 1% of Child Benefit per full 200 of ANI over 60,000, tax years from 2024/25 (GOV.UK child-benefit-tax-charge). The step rule is from GOV.UK because the ITEPA 2003 s.681C(2)(b) formula is an image on legislation.gov.uk. The percentage is capped at 100%. ITEPA 2003 s.681C(3) (https://www.legislation.gov.uk/ukpga/2003/1/section/681C) rounds down the total Child Benefit to whole pounds, the percentage to a whole number and the charge to whole pounds, in that order. Weekly rate for 3 child(ren): eldest 26.05 + 2 x 17.25.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Child Benefit weeks are the Mondays in the tax year (ITEPA 2003 s.681H(3), decider ruling adopted 20 Nov 2026), at that year's single weekly rate because uprating starts on the first Monday on or after 6 April.",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-20",
    signedOffHash: "v2:4f9e349b694244c4e0ef82ac1c229ce6b848a453e3f66c4735a7b2f6d92bff29",
    rulingRef:
      "Total Child Benefit, percentage and charge rounded down under ITEPA 2003 s.681C(3); weeks are the Mondays in the tax year (s.681H(3)), 52 in this year, at that year's single weekly rate; figure approved by the decider on 20 Nov 2026.",
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
      "Individual basis, claimant is the higher earner. Child Benefit 27.05/week x 53 weeks = 1433.65 (weeks: the Mondays from 6 April to 5 April, ITEPA 2003 s.681H(3), https://www.legislation.gov.uk/ukpga/2003/1/section/681H; one weekly rate for the whole year); charge percentage: ANI 59999 is not over 60000, so no steps over the threshold, 0%; charge: total 1433.65 rounded down to 1433; 1433 x 0% = 0. Rule: 1% of Child Benefit per full 200 of ANI over 60,000, tax years from 2024/25 (GOV.UK child-benefit-tax-charge). The step rule is from GOV.UK because the ITEPA 2003 s.681C(2)(b) formula is an image on legislation.gov.uk. The percentage is capped at 100%. ITEPA 2003 s.681C(3) (https://www.legislation.gov.uk/ukpga/2003/1/section/681C) rounds down the total Child Benefit to whole pounds, the percentage to a whole number and the charge to whole pounds, in that order. Weekly rate for 1 child(ren): eldest 27.05.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Child Benefit weeks are the Mondays in the tax year (ITEPA 2003 s.681H(3), decider ruling adopted 20 Nov 2026), at that year's single weekly rate because uprating starts on the first Monday on or after 6 April.",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:647f9a30e38bca4c002cd9d46b9ed1b3fd99f88b72e85d8d9efa03476bc4ecb8",
    rulingRef:
      "ITEPA 2003 s.681H(3) counts weeks by Monday (53 in 2026/27) and GOV.UK gives 27.05 a week; the result does not depend on the week count because adjusted net income 59,999 is not over the 60,000 threshold (s.681C(2)), so the charge is 0.",
  },
  {
    id: "hicbc.2026-27.ani60200.children1",
    taxYear: "2026/27",
    region: "ENGLAND_NI_WALES",
    kind: "hicbc",
    feature: "hicbc",
    input: { adjustedNetIncome: 60200, children: 1 },
    expected: 14,
    source: "https://www.gov.uk/child-benefit-tax-charge",
    additionalSources: [
      "https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
    ],
    derivation:
      "Individual basis, claimant is the higher earner. Child Benefit 27.05/week x 53 weeks = 1433.65 (weeks: the Mondays from 6 April to 5 April, ITEPA 2003 s.681H(3), https://www.legislation.gov.uk/ukpga/2003/1/section/681H; one weekly rate for the whole year); charge percentage min(100, floor((ANI 60200 - 60000) / 200)) = 1%; charge: total 1433.65 rounded down to 1433; 1433 x 1% = 14.33, rounded down to 14. Rule: 1% of Child Benefit per full 200 of ANI over 60,000, tax years from 2024/25 (GOV.UK child-benefit-tax-charge). The step rule is from GOV.UK because the ITEPA 2003 s.681C(2)(b) formula is an image on legislation.gov.uk. The percentage is capped at 100%. ITEPA 2003 s.681C(3) (https://www.legislation.gov.uk/ukpga/2003/1/section/681C) rounds down the total Child Benefit to whole pounds, the percentage to a whole number and the charge to whole pounds, in that order. Weekly rate for 1 child(ren): eldest 27.05.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Child Benefit weeks are the Mondays in the tax year (ITEPA 2003 s.681H(3), decider ruling adopted 20 Nov 2026), at that year's single weekly rate because uprating starts on the first Monday on or after 6 April.",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-20",
    signedOffHash: "v2:6c73b4138a2483d2ca438ab2995911756c223871754f9e5f1a79c96c01d661b4",
    rulingRef:
      "Child Benefit weeks are the Mondays in the tax year (ITEPA 2003 s.681H(3)): 53 in 2020/21 and 2026/27, at that year's single weekly rate because uprating starts on the first Monday on or after 6 April; total, percentage and charge rounded down under s.681C(3); figure re-derived by the decider on 20 Nov 2026.",
  },
  {
    id: "hicbc.2026-27.ani70000.children2",
    taxYear: "2026/27",
    region: "ENGLAND_NI_WALES",
    kind: "hicbc",
    feature: "hicbc",
    input: { adjustedNetIncome: 70000, children: 2 },
    expected: 1191,
    source: "https://www.gov.uk/child-benefit-tax-charge",
    additionalSources: [
      "https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
    ],
    derivation:
      "Individual basis, claimant is the higher earner. Child Benefit 44.95/week x 53 weeks = 2382.35 (weeks: the Mondays from 6 April to 5 April, ITEPA 2003 s.681H(3), https://www.legislation.gov.uk/ukpga/2003/1/section/681H; one weekly rate for the whole year); charge percentage min(100, floor((ANI 70000 - 60000) / 200)) = 50%; charge: total 2382.35 rounded down to 2382; 2382 x 50% = 1191. Rule: 1% of Child Benefit per full 200 of ANI over 60,000, tax years from 2024/25 (GOV.UK child-benefit-tax-charge). The step rule is from GOV.UK because the ITEPA 2003 s.681C(2)(b) formula is an image on legislation.gov.uk. The percentage is capped at 100%. ITEPA 2003 s.681C(3) (https://www.legislation.gov.uk/ukpga/2003/1/section/681C) rounds down the total Child Benefit to whole pounds, the percentage to a whole number and the charge to whole pounds, in that order. Weekly rate for 2 child(ren): eldest 27.05 + 1 x 17.9.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Child Benefit weeks are the Mondays in the tax year (ITEPA 2003 s.681H(3), decider ruling adopted 20 Nov 2026), at that year's single weekly rate because uprating starts on the first Monday on or after 6 April.",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-20",
    signedOffHash: "v2:0fc407d6aac2be3e78315f8427aa0fcd5934d828a31a6628e340249d26376932",
    rulingRef:
      "Child Benefit weeks are the Mondays in the tax year (ITEPA 2003 s.681H(3)): 53 in 2020/21 and 2026/27, at that year's single weekly rate because uprating starts on the first Monday on or after 6 April; total, percentage and charge rounded down under s.681C(3); figure re-derived by the decider on 20 Nov 2026.",
  },
  {
    id: "hicbc.2026-27.ani79800.children1",
    taxYear: "2026/27",
    region: "ENGLAND_NI_WALES",
    kind: "hicbc",
    feature: "hicbc",
    input: { adjustedNetIncome: 79800, children: 1 },
    expected: 1418,
    source: "https://www.gov.uk/child-benefit-tax-charge",
    additionalSources: [
      "https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
    ],
    derivation:
      "Individual basis, claimant is the higher earner. Child Benefit 27.05/week x 53 weeks = 1433.65 (weeks: the Mondays from 6 April to 5 April, ITEPA 2003 s.681H(3), https://www.legislation.gov.uk/ukpga/2003/1/section/681H; one weekly rate for the whole year); charge percentage min(100, floor((ANI 79800 - 60000) / 200)) = 99%; charge: total 1433.65 rounded down to 1433; 1433 x 99% = 1418.67, rounded down to 1418. Rule: 1% of Child Benefit per full 200 of ANI over 60,000, tax years from 2024/25 (GOV.UK child-benefit-tax-charge). The step rule is from GOV.UK because the ITEPA 2003 s.681C(2)(b) formula is an image on legislation.gov.uk. The percentage is capped at 100%. ITEPA 2003 s.681C(3) (https://www.legislation.gov.uk/ukpga/2003/1/section/681C) rounds down the total Child Benefit to whole pounds, the percentage to a whole number and the charge to whole pounds, in that order. Weekly rate for 1 child(ren): eldest 27.05.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Child Benefit weeks are the Mondays in the tax year (ITEPA 2003 s.681H(3), decider ruling adopted 20 Nov 2026), at that year's single weekly rate because uprating starts on the first Monday on or after 6 April.",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-20",
    signedOffHash: "v2:3f745492380732154d68bf01a405af811c4f60e0b24778218ce36495c8e712ca",
    rulingRef:
      "Child Benefit weeks are the Mondays in the tax year (ITEPA 2003 s.681H(3)): 53 in 2020/21 and 2026/27, at that year's single weekly rate because uprating starts on the first Monday on or after 6 April; total, percentage and charge rounded down under s.681C(3); figure re-derived by the decider on 20 Nov 2026.",
  },
  {
    id: "hicbc.2026-27.ani80000.children3",
    taxYear: "2026/27",
    region: "ENGLAND_NI_WALES",
    kind: "hicbc",
    feature: "hicbc",
    input: { adjustedNetIncome: 80000, children: 3 },
    expected: 3331,
    source: "https://www.gov.uk/child-benefit-tax-charge",
    additionalSources: [
      "https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
    ],
    derivation:
      "Individual basis, claimant is the higher earner. Child Benefit 62.85/week x 53 weeks = 3331.05 (weeks: the Mondays from 6 April to 5 April, ITEPA 2003 s.681H(3), https://www.legislation.gov.uk/ukpga/2003/1/section/681H; one weekly rate for the whole year); charge percentage min(100, floor((ANI 80000 - 60000) / 200)) = 100%; charge: total 3331.05 rounded down to 3331; 3331 x 100% = 3331. Rule: 1% of Child Benefit per full 200 of ANI over 60,000, tax years from 2024/25 (GOV.UK child-benefit-tax-charge). The step rule is from GOV.UK because the ITEPA 2003 s.681C(2)(b) formula is an image on legislation.gov.uk. The percentage is capped at 100%. ITEPA 2003 s.681C(3) (https://www.legislation.gov.uk/ukpga/2003/1/section/681C) rounds down the total Child Benefit to whole pounds, the percentage to a whole number and the charge to whole pounds, in that order. Weekly rate for 3 child(ren): eldest 27.05 + 2 x 17.9.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Child Benefit weeks are the Mondays in the tax year (ITEPA 2003 s.681H(3), decider ruling adopted 20 Nov 2026), at that year's single weekly rate because uprating starts on the first Monday on or after 6 April.",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-20",
    signedOffHash: "v2:cf868005bcce945b7d0244a0b3004321373cd48fa1b22a9691928f52b19eb08b",
    rulingRef:
      "Child Benefit weeks are the Mondays in the tax year (ITEPA 2003 s.681H(3)): 53 in 2020/21 and 2026/27, at that year's single weekly rate because uprating starts on the first Monday on or after 6 April; total, percentage and charge rounded down under s.681C(3); figure re-derived by the decider on 20 Nov 2026.",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:ac2128fa58c0d3eba039ae2ad9c9bc69772d6e72c170fe19c6b56344382c4e9d",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:3eedbd7df6c0a250174e309b56558018eda3df96f6f04defeeb64f3a9c0d20e9",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:e2d635b48112092dfd5e00b90212d68b7c0be3d7b7ca8bf47ed43500c3bb7670",
    rulingRef:
      "GOV.UK pension tax relief: under net pay the contribution comes out before Income Tax, so tax is on 57,000; the GOV.UK salary sacrifice policy paper confirms ordinary employee contributions bear employee NICs, so NI is on 60,000.",
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
      "https://www.legislation.gov.uk/ukpga/2004/12/section/192",
    ],
    derivation:
      "Annual method. relief at source: net 3000 grossed up x 1.25 = 3750; basic rate limit and higher rate limit increased by the gross contribution (FA 2004 s.192(4)) and ANI reduced by it; assumes the higher-rate relief has been claimed (FA 2004 s.192(4)); 3000 paid from take-home; PA 12570 (no taper at ANI 56250); taxable 60000 - 12570 = 47430; basic 41450 x 20% = 8290; higher 5980 x 40% = 2392; additional 0 x 45% = 0; income tax 10682; NI on 60000: 37700 x 8% + 9730 x 2% = 3210.6. Take-home = 60000 - net contribution 3000 - tax 10682 - NI 3210.6 = 43107.4.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:961cb05f43d0b95b2f81ff2211cb07292b666ffafcc19e08c58c85ec025d9997",
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
    expected: 46311.05,
    source:
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    additionalSources: [
      "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027",
      "https://www.gov.uk/child-benefit-tax-charge",
      "https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
    ],
    derivation:
      "Annual method. PA 12570 (no taper at ANI 70000); taxable 70000 - 12570 = 57430; basic 37700 x 20% = 7540; higher 19730 x 40% = 7892; additional 0 x 45% = 0; income tax 15432; NI on 70000: 37700 x 8% + 19730 x 2% = 3410.6; student loan plan2 (70000 - 29385) x 9% = 3655.35 = 3655.35; HICBC Child Benefit 44.95/week x 53 weeks = 2382.35 (weeks: the Mondays from 6 April to 5 April, ITEPA 2003 s.681H(3), https://www.legislation.gov.uk/ukpga/2003/1/section/681H); charge percentage min(100, floor((ANI 70000 - 60000) / 200)) = 50%; charge: total 2382.35 rounded down to 2382; 2382 x 50% = 1191 (ITEPA 2003 s.681C(3), https://www.legislation.gov.uk/ukpga/2003/1/section/681C). Take-home = 70000 - tax 15432 - NI 3410.6 - student loan 3655.35 - HICBC 1191 = 46311.05.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Child Benefit weeks are the Mondays in the tax year (ITEPA 2003 s.681H(3), decider ruling adopted 20 Nov 2026), at that year's single weekly rate because uprating starts on the first Monday on or after 6 April.",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-20",
    signedOffHash: "v2:f387b49534882d122d45c30404d7b8e126ded95947062f6e7db306dfa61fa838",
    rulingRef:
      "Child Benefit weeks are the Mondays in the tax year (ITEPA 2003 s.681H(3)): 53 in 2020/21 and 2026/27, at that year's single weekly rate because uprating starts on the first Monday on or after 6 April; total, percentage and charge rounded down under s.681C(3); figure re-derived by the decider on 20 Nov 2026.",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:372607ea7df426301d77e1395eda7ffded4ed72de35aa1f990ec9991806552d8",
    rulingRef:
      "Scottish bands are in taxable income after the Personal Allowance: GOV.UK rates and allowances page and the 2026 to 2027 employer page both give 3,967/16,956/31,092/62,430/125,140; this vector is well below the 125,140 boundary.",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:eb9e1ead3c25138627eb69e4e8246bf1948fda33672e68e2f08c600bb532d774",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:e82e5b414800acc180d3177e2b6694d9c144c7edab50c04ac1d7a028cbd0e45c",
    rulingRef:
      "GOV.UK workplace pensions and tax on private pension contributions: under net pay the contribution is taken before Income Tax with no NI reduction, so tax on 57,000 and NI on 60,000 is correct.",
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
    expected: 43354.7,
    source:
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    additionalSources: [
      "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2025-to-2026",
      "https://www.gov.uk/child-benefit-tax-charge",
      "https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
    ],
    derivation:
      "Annual method. PA 12570 (no taper at ANI 70000); taxable 70000 - 12570 = 57430; basic 37700 x 20% = 7540; higher 19730 x 40% = 7892; additional 0 x 45% = 0; income tax 15432; NI on 70000: 37700 x 8% + 19730 x 2% = 3410.6; student loan plan2 (70000 - 28470) x 9% = 3737.7; postgrad (70000 - 21000) x 6% = 2940 = 6677.7; HICBC Child Benefit 43.3/week x 52 weeks = 2251.6 (weeks: the Mondays from 6 April to 5 April, ITEPA 2003 s.681H(3), https://www.legislation.gov.uk/ukpga/2003/1/section/681H); charge percentage min(100, floor((ANI 70000 - 60000) / 200)) = 50%; charge: total 2251.6 rounded down to 2251; 2251 x 50% = 1125.50, rounded down to 1125 (ITEPA 2003 s.681C(3), https://www.legislation.gov.uk/ukpga/2003/1/section/681C). Take-home = 70000 - tax 15432 - NI 3410.6 - student loan 6677.7 - HICBC 1125 = 43354.7.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Child Benefit weeks are the Mondays in the tax year (ITEPA 2003 s.681H(3), decider ruling adopted 20 Nov 2026), at that year's single weekly rate because uprating starts on the first Monday on or after 6 April.",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-20",
    signedOffHash: "v2:8dc7cf16ee2047da12dbeedbab064fc00fc36f51c429f7330e64a04bae6c2c5e",
    rulingRef:
      "Total Child Benefit, percentage and charge rounded down under ITEPA 2003 s.681C(3); weeks are the Mondays in the tax year (s.681H(3)), 52 in this year, at that year's single weekly rate; figure approved by the decider on 20 Nov 2026.",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:cc7239303b8812af2fa9a641e0862932ab5a26de13d1fbdd0a2952e0d869c505",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:2a5bb6ab5e478a6d3434f63881a5ec7113ef750359b8816e2ca011130754fe10",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:452156ee21ac3e1df5ffedf7b7c3c0b9332f2a83185fd4f4a2b745982249c8e6",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:8e290dd25b43b67dd4a622d85ad4bdd32045b31725e543bdea9dadbdf2cc9bda",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:fe40d3ca0e9f00e750fc20c913d8b73a8ab0d3db1265ffce141d0c4281b1d220",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:5ab06de2e1b59a4a7d8791cd02510b4f4bcd6135d7d07e50eb93cf2c109cbd84",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:6b76fa10dd0220ce7bb33ea9928c79339efe6a38b3d107ffd39761f0a96ce41e",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:b4921af63d3302c920c09821592907507e929d94aaf1327aaeb3f63df78de107",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:d21efd6c4e7b18ac4c48f9b66b0ab6c5270321fa8249e454b33afc0e29688d6b",
  },
  {
    id: "whatIfDelta.2026-27.ewni.60000.plus1000.children1",
    taxYear: "2026/27",
    region: "ENGLAND_NI_WALES",
    kind: "whatIfDelta",
    feature: "whatIf",
    input: { salary: 60000, deltaGross: 1000, children: 1 },
    expected: 509,
    source:
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    additionalSources: [
      "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027",
      "https://www.gov.uk/child-benefit-tax-charge",
      "https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
    ],
    derivation:
      "Change in annual take-home for +1000 gross. At 60000: PA 12570 (no taper at ANI 60000); taxable 60000 - 12570 = 47430; basic 37700 x 20% = 7540; higher 9730 x 40% = 3892; additional 0 x 45% = 0; income tax 11432; NI on 60000: 37700 x 8% + 9730 x 2% = 3210.6; HICBC Child Benefit 27.05/week x 53 weeks = 1433.65 (weeks: the Mondays from 6 April to 5 April, ITEPA 2003 s.681H(3), https://www.legislation.gov.uk/ukpga/2003/1/section/681H); charge percentage: ANI 60000 is not over 60000, so no steps over the threshold, 0%; charge 0. Take-home = 60000 - tax 11432 - NI 3210.6 - HICBC 0 = 45357.4. At 61000: PA 12570 (no taper at ANI 61000); taxable 61000 - 12570 = 48430; basic 37700 x 20% = 7540; higher 10730 x 40% = 4292; additional 0 x 45% = 0; income tax 11832; NI on 61000: 37700 x 8% + 10730 x 2% = 3230.6; HICBC Child Benefit 27.05/week x 53 weeks = 1433.65; charge percentage min(100, floor((ANI 61000 - 60000) / 200)) = 5%; charge: total 1433.65 rounded down to 1433; 1433 x 5% = 71.65, rounded down to 71 (ITEPA 2003 s.681C(3), https://www.legislation.gov.uk/ukpga/2003/1/section/681C). Take-home = 61000 - tax 11832 - NI 3230.6 - HICBC 71 = 45866.4. Delta = 1000 - tax change 400 - NI change 20 - HICBC change 71 = 509 (effective marginal rate 49.1%).",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Child Benefit weeks are the Mondays in the tax year (ITEPA 2003 s.681H(3), decider ruling adopted 20 Nov 2026), at that year's single weekly rate because uprating starts on the first Monday on or after 6 April.",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-20",
    signedOffHash: "v2:06d42b0ad5a10c61f6f0e8b12ba5154f7977d08f80de5d98e874aa7f35cebebe",
    rulingRef:
      "Child Benefit weeks are the Mondays in the tax year (ITEPA 2003 s.681H(3)): 53 in 2020/21 and 2026/27, at that year's single weekly rate because uprating starts on the first Monday on or after 6 April; total, percentage and charge rounded down under s.681C(3); figure re-derived by the decider on 20 Nov 2026.",
  },
  {
    id: "whatIfDelta.2026-27.ewni.79500.plus1000.children1",
    taxYear: "2026/27",
    region: "ENGLAND_NI_WALES",
    kind: "whatIfDelta",
    feature: "whatIf",
    input: { salary: 79500, deltaGross: 1000, children: 1 },
    expected: 537,
    source:
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    additionalSources: [
      "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027",
      "https://www.gov.uk/child-benefit-tax-charge",
      "https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance",
    ],
    derivation:
      "Change in annual take-home for +1000 gross. At 79500: PA 12570 (no taper at ANI 79500); taxable 79500 - 12570 = 66930; basic 37700 x 20% = 7540; higher 29230 x 40% = 11692; additional 0 x 45% = 0; income tax 19232; NI on 79500: 37700 x 8% + 29230 x 2% = 3600.6; HICBC Child Benefit 27.05/week x 53 weeks = 1433.65 (weeks: the Mondays from 6 April to 5 April, ITEPA 2003 s.681H(3), https://www.legislation.gov.uk/ukpga/2003/1/section/681H); charge percentage min(100, floor((ANI 79500 - 60000) / 200)) = 97%; charge: total 1433.65 rounded down to 1433; 1433 x 97% = 1390.01, rounded down to 1390 (ITEPA 2003 s.681C(3), https://www.legislation.gov.uk/ukpga/2003/1/section/681C). Take-home = 79500 - tax 19232 - NI 3600.6 - HICBC 1390 = 55277.4. At 80500: PA 12570 (no taper at ANI 80500); taxable 80500 - 12570 = 67930; basic 37700 x 20% = 7540; higher 30230 x 40% = 12092; additional 0 x 45% = 0; income tax 19632; NI on 80500: 37700 x 8% + 30230 x 2% = 3620.6; HICBC Child Benefit 27.05/week x 53 weeks = 1433.65; charge percentage min(100, floor((ANI 80500 - 60000) / 200)) = 100%; charge: total 1433.65 rounded down to 1433; 1433 x 100% = 1433. Take-home = 80500 - tax 19632 - NI 3620.6 - HICBC 1433 = 55814.4. Delta = 1000 - tax change 400 - NI change 20 - HICBC change 43 = 537 (effective marginal rate 46.3%).",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Child Benefit weeks are the Mondays in the tax year (ITEPA 2003 s.681H(3), decider ruling adopted 20 Nov 2026), at that year's single weekly rate because uprating starts on the first Monday on or after 6 April.",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-20",
    signedOffHash: "v2:6a6a9df0155699df52b3a81a14e1a4c6976ef374d317873991d74a5c21efa5a5",
    rulingRef:
      "Child Benefit weeks are the Mondays in the tax year (ITEPA 2003 s.681H(3)): 53 in 2020/21 and 2026/27, at that year's single weekly rate because uprating starts on the first Monday on or after 6 April; total, percentage and charge rounded down under s.681C(3); figure re-derived by the decider on 20 Nov 2026.",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:a24b32eb40417c1e176a032c9c60a7467332332b3afcb75359af591b9b8606f3",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:5f63aeb29bf964a437d1c6889ae08b388632ddc2f6b3ebdc0af04c6d9e9a2518",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:589bf0ee67608a75b70e1315211c657cbe683929b4cb97e7a849932e56753f85",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:6b95d8afcbd24c59c6fbbcfe1f4b53f138c3f3602d2590e7c8f8f653c53f2da5",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:dcb06b42e8a39082b34c137bae386b46dad45ad1843a5e1cf2692dc8ea22648f",
    rulingRef:
      "Bands are in taxable income after the Personal Allowance (GOV.UK rates and allowances page, 2026 to 2027 employer page); 125,140 is not reached; 21% intermediate plus 8% NI gives 29%.",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:2ae62772a4f2d20ce9f7b181e12457899ca282711406fd2197441308e1ec1e2e",
    rulingRef:
      "Bands are in taxable income after the Personal Allowance (GOV.UK rates and allowances page, 2026 to 2027 employer page); 125,140 is not reached; 42% higher plus 8% NI gives 50%.",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:97b5d2c170ac42f904cbf2572bd42c87f96995088bd31b44fb95572da71f37ec",
    rulingRef:
      "Bands are in taxable income after the Personal Allowance (GOV.UK rates and allowances page, 2026 to 2027 employer page); 125,140 is not reached; 42% plus 2% NI above the 50,270 upper earnings limit gives 44%.",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:69cc8d02e6d92b6b80841a38b502267fc53d24851d78353ba4cda6a56da247e3",
    rulingRef:
      "Bands are in taxable income after the Personal Allowance; the advanced rate starts at taxable 62,431 (gross 75,001, as on the GOV.UK Scottish income tax page); 45% plus 2% NI gives 47%.",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:c36db37c0e8e9df411b55db280f90905a96391e9f5b3a8038b67e117a4992e5b",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:3dd13c1db51f5bb011e85a433e78a57d38c3413ff51303b09e29b3baa792ab79",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:c84aecb705d570c90b2a98c6daf1ab39a06cf74b6aa699840a3767f07bbac68d",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:9ad43a2a39321ea61001a29d37be07713ee06eea93b65c10146a9e19ca95a5a6",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:6797079cce024fbd4b00602548dc1230b1124c61d6d8b041ee2fa61387ebe4ca",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:b3cdf6f6eb64b44e01591e3b97e0b9654f54b713d782ca89fd685e335cde1b02",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:84a568d3d65ed669e9dfc8a1e56f455e6f8448405211b997ef3c0c0cee8d6748",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:821c80968497c6b14abaa679520e5b585873c691d529117c76a935e4dcca03f7",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:7b55f6707b5d2ee61968c418abd723a4ef1405366e8969cf6042f11427b2117a",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:09ed31c23646f02c0e6e558b270fc9eac9463146978058436221e409e688b1db",
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
      "https://www.legislation.gov.uk/ukpga/2004/12/section/192",
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    ],
    derivation:
      "Relief at source: net contribution 4000 grossed up x 1.25 = 5000. ANI = 60000 - 5000 = 55000 (GOV.UK adjusted-net-income step 3). Basic rate limit and higher rate limit increased by the gross contribution, 5000 (FA 2004 s.192(4)). Assumes the higher-rate relief has been claimed (FA 2004 s.192(4)). Income tax on salary 60000: PA 12500 (no taper at ANI 55000); taxable 60000 - 12500 = 47500; basic 42500 x 20% = 8500; higher 5000 x 40% = 2000; additional 0 x 45% = 0; income tax 10500. Expected is income tax only.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:7f0464eeeff8244eff1350c2b6e0cd34149bff3f7f36558620222880f6c879db",
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
      "https://www.legislation.gov.uk/ukpga/2004/12/section/192",
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    ],
    derivation:
      "Relief at source: net contribution 8000 grossed up x 1.25 = 10000. ANI = 110000 - 10000 = 100000 (GOV.UK adjusted-net-income step 3). Basic rate limit and higher rate limit increased by the gross contribution, 10000 (FA 2004 s.192(4)). Assumes the higher-rate relief has been claimed (FA 2004 s.192(4)). Income tax on salary 110000: PA 12500 (no taper at ANI 100000); taxable 110000 - 12500 = 97500; basic 47500 x 20% = 9500; higher 50000 x 40% = 20000; additional 0 x 45% = 0; income tax 29500. Expected is income tax only.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: personal allowance taper rate (GBP1 per GBP2) is not stated on the archived GOV.UK pages.",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:54f386c94565cc1ea7d100d1f018a0d98660be77de903a50829fcfa7c6caf5c1",
    rulingRef:
      "ITA 2007 s.35(2) (as at 06/04/2020) reduces PA by one-half of ANI over 100,000; s.58 Step 3 deducts the gross contribution, ANI exactly 100,000, no reduction; FA 2004 s.192(4) lifts limits 10,000. Read 2026-11-24. 29,500.",
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
      "https://www.legislation.gov.uk/ukpga/2004/12/section/192",
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    ],
    derivation:
      "Relief at source: net contribution 4000 grossed up x 1.25 = 5000. ANI = 60000 - 5000 = 55000 (GOV.UK adjusted-net-income step 3). Basic rate limit and higher rate limit increased by the gross contribution, 5000 (FA 2004 s.192(4)). Assumes the higher-rate relief has been claimed (FA 2004 s.192(4)). Income tax on salary 60000: PA 12570 (no taper at ANI 55000); taxable 60000 - 12570 = 47430; basic 42700 x 20% = 8540; higher 4730 x 40% = 1892; additional 0 x 45% = 0; income tax 10432. Expected is income tax only.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:0ca6b1394b1e7265e350bbfd6306b1d51fb8f869e73e82c55c71131f935fd6b4",
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
      "https://www.legislation.gov.uk/ukpga/2004/12/section/192",
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    ],
    derivation:
      "Relief at source: net contribution 8000 grossed up x 1.25 = 10000. ANI = 110000 - 10000 = 100000 (GOV.UK adjusted-net-income step 3). Basic rate limit and higher rate limit increased by the gross contribution, 10000 (FA 2004 s.192(4)). Assumes the higher-rate relief has been claimed (FA 2004 s.192(4)). Income tax on salary 110000: PA 12570 (no taper at ANI 100000); taxable 110000 - 12570 = 97430; basic 47700 x 20% = 9540; higher 49730 x 40% = 19892; additional 0 x 45% = 0; income tax 29432. Expected is income tax only.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: personal allowance taper rate (GBP1 per GBP2) is not stated on the archived GOV.UK pages.",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:52e3f8ca9a006f41d488bb13f8849900c581a9a8cb5ecfead9175eab23ac4088",
    rulingRef:
      "ITA 2007 s.35(2) (06/04/2021 version, read 2026-11-24) reduces the 12,570 allowance by one-half of adjusted net income over 100,000; s.58 Step 3 deducts the gross contribution, so ANI is exactly 100,000, no taper. FA 2004 s.192(4) lifts both limits by 10,000. Tax 29,432.",
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
      "https://www.legislation.gov.uk/ukpga/2004/12/section/192",
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    ],
    derivation:
      "Relief at source: net contribution 4000 grossed up x 1.25 = 5000. ANI = 60000 - 5000 = 55000 (GOV.UK adjusted-net-income step 3). Basic rate limit and higher rate limit increased by the gross contribution, 5000 (FA 2004 s.192(4)). Assumes the higher-rate relief has been claimed (FA 2004 s.192(4)). Income tax on salary 60000: PA 12570 (no taper at ANI 55000); taxable 60000 - 12570 = 47430; basic 42700 x 20% = 8540; higher 4730 x 40% = 1892; additional 0 x 45% = 0; income tax 10432. Expected is income tax only.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:1cccb326becf1b310c2fc5e6066a3a3ac729e1366e1f145f1620a97dff77cebe",
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
      "https://www.legislation.gov.uk/ukpga/2004/12/section/192",
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    ],
    derivation:
      "Relief at source: net contribution 8000 grossed up x 1.25 = 10000. ANI = 110000 - 10000 = 100000 (GOV.UK adjusted-net-income step 3). Basic rate limit and higher rate limit increased by the gross contribution, 10000 (FA 2004 s.192(4)). Assumes the higher-rate relief has been claimed (FA 2004 s.192(4)). Income tax on salary 110000: PA 12570 (no taper at ANI 100000); taxable 110000 - 12570 = 97430; basic 47700 x 20% = 9540; higher 49730 x 40% = 19892; additional 0 x 45% = 0; income tax 29432. Expected is income tax only.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: personal allowance taper rate (GBP1 per GBP2) is not stated on the archived GOV.UK pages.",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:b2d0a46309bd5097fd0901db2fdff8806856b2122208a42f210f529fa11ead78",
    rulingRef:
      "ITA 2007 s.35(2) as at 2022-04-06, read on legislation.gov.uk 2026-11-24, reduces the allowance by one-half of ANI over 100,000; ANI is exactly 100,000, so PA stays 12,570. FA 2004 s.192(4) raises both limits by 10,000, giving 29,432.",
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
      "https://www.legislation.gov.uk/ukpga/2004/12/section/192",
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    ],
    derivation:
      "Relief at source: net contribution 4000 grossed up x 1.25 = 5000. ANI = 60000 - 5000 = 55000 (GOV.UK adjusted-net-income step 3). Basic rate limit and higher rate limit increased by the gross contribution, 5000 (FA 2004 s.192(4)). Assumes the higher-rate relief has been claimed (FA 2004 s.192(4)). Income tax on salary 60000: PA 12570 (no taper at ANI 55000); taxable 60000 - 12570 = 47430; basic 42700 x 20% = 8540; higher 4730 x 40% = 1892; additional 0 x 45% = 0; income tax 10432. Expected is income tax only.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:5628e74052f14c31d1cd3e3b2b0a4bfb3981d3b1a4d79b31c0108292f17dac63",
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
      "https://www.legislation.gov.uk/ukpga/2004/12/section/192",
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    ],
    derivation:
      "Relief at source: net contribution 8000 grossed up x 1.25 = 10000. ANI = 110000 - 10000 = 100000 (GOV.UK adjusted-net-income step 3). Basic rate limit and higher rate limit increased by the gross contribution, 10000 (FA 2004 s.192(4)). Assumes the higher-rate relief has been claimed (FA 2004 s.192(4)). Income tax on salary 110000: PA 12570 (no taper at ANI 100000); taxable 110000 - 12570 = 97430; basic 47700 x 20% = 9540; higher 49730 x 40% = 19892; additional 0 x 45% = 0; income tax 29432. Expected is income tax only.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:7acf7b77da876514e9a92ae509ee567cede97ee9640c6581a7f80354a89580ce",
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
      "https://www.legislation.gov.uk/ukpga/2004/12/section/192",
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    ],
    derivation:
      "Relief at source: net contribution 4000 grossed up x 1.25 = 5000. ANI = 60000 - 5000 = 55000 (GOV.UK adjusted-net-income step 3). Basic rate limit and higher rate limit increased by the gross contribution, 5000 (FA 2004 s.192(4)). Assumes the higher-rate relief has been claimed (FA 2004 s.192(4)). Income tax on salary 60000: PA 12570 (no taper at ANI 55000); taxable 60000 - 12570 = 47430; basic 42700 x 20% = 8540; higher 4730 x 40% = 1892; additional 0 x 45% = 0; income tax 10432. Expected is income tax only.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:70ca152837d5be9b638005260f0877faac094934bf4788511c096da7bd1759f8",
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
      "https://www.legislation.gov.uk/ukpga/2004/12/section/192",
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    ],
    derivation:
      "Relief at source: net contribution 8000 grossed up x 1.25 = 10000. ANI = 110000 - 10000 = 100000 (GOV.UK adjusted-net-income step 3). Basic rate limit and higher rate limit increased by the gross contribution, 10000 (FA 2004 s.192(4)). Assumes the higher-rate relief has been claimed (FA 2004 s.192(4)). Income tax on salary 110000: PA 12570 (no taper at ANI 100000); taxable 110000 - 12570 = 97430; basic 47700 x 20% = 9540; higher 49730 x 40% = 19892; additional 0 x 45% = 0; income tax 29432. Expected is income tax only.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:cb3bd7511589b43bf748547e6736ccceb16a1d925692164165e4380e2657660a",
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
      "https://www.legislation.gov.uk/ukpga/2004/12/section/192",
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    ],
    derivation:
      "Relief at source: net contribution 4000 grossed up x 1.25 = 5000. ANI = 60000 - 5000 = 55000 (GOV.UK adjusted-net-income step 3). Basic rate limit and higher rate limit increased by the gross contribution, 5000 (FA 2004 s.192(4)). Assumes the higher-rate relief has been claimed (FA 2004 s.192(4)). Income tax on salary 60000: PA 12570 (no taper at ANI 55000); taxable 60000 - 12570 = 47430; basic 42700 x 20% = 8540; higher 4730 x 40% = 1892; additional 0 x 45% = 0; income tax 10432. Expected is income tax only.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:3083c22b16b6ccb2a4f6c0f8262bf8e80e2631488c71cd82e1bb00c25957b8b4",
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
      "https://www.legislation.gov.uk/ukpga/2004/12/section/192",
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    ],
    derivation:
      "Relief at source: net contribution 8000 grossed up x 1.25 = 10000. ANI = 110000 - 10000 = 100000 (GOV.UK adjusted-net-income step 3). Basic rate limit and higher rate limit increased by the gross contribution, 10000 (FA 2004 s.192(4)). Assumes the higher-rate relief has been claimed (FA 2004 s.192(4)). Income tax on salary 110000: PA 12570 (no taper at ANI 100000); taxable 110000 - 12570 = 97430; basic 47700 x 20% = 9540; higher 49730 x 40% = 19892; additional 0 x 45% = 0; income tax 29432. Expected is income tax only.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:9ec99f1b6e1ffc9a56506f9d65c67e374b591d7d60795aa3fcaa91b83c6bf0e4",
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
      "https://www.legislation.gov.uk/ukpga/2004/12/section/192",
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    ],
    derivation:
      "Relief at source: net contribution 4000 grossed up x 1.25 = 5000. ANI = 60000 - 5000 = 55000 (GOV.UK adjusted-net-income step 3). Basic rate limit and higher rate limit increased by the gross contribution, 5000 (FA 2004 s.192(4)). Assumes the higher-rate relief has been claimed (FA 2004 s.192(4)). Income tax on salary 60000: PA 12570 (no taper at ANI 55000); taxable 60000 - 12570 = 47430; basic 42700 x 20% = 8540; higher 4730 x 40% = 1892; additional 0 x 45% = 0; income tax 10432. Expected is income tax only.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:4e8436ee92679e0014c7e48e2b5fb84c452de639cd293110b81f057b41009b13",
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
      "https://www.legislation.gov.uk/ukpga/2004/12/section/192",
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    ],
    derivation:
      "Relief at source: net contribution 8000 grossed up x 1.25 = 10000. ANI = 110000 - 10000 = 100000 (GOV.UK adjusted-net-income step 3). Basic rate limit and higher rate limit increased by the gross contribution, 10000 (FA 2004 s.192(4)). Assumes the higher-rate relief has been claimed (FA 2004 s.192(4)). Income tax on salary 110000: PA 12570 (no taper at ANI 100000); taxable 110000 - 12570 = 97430; basic 47700 x 20% = 9540; higher 49730 x 40% = 19892; additional 0 x 45% = 0; income tax 29432. Expected is income tax only.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:c694ce13518630a671b2f438da4c507b13b7a7c25b70724cee527526c8ad197d",
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
      "https://www.legislation.gov.uk/ukpga/2004/12/section/192",
      "https://www.gov.uk/income-tax-rates",
    ],
    derivation:
      "Relief at source: net 4000 grossed up x 1.25 = 5000. The Scottish basic rate limit and every Scottish limit above it increased by the gross contribution, 5000; starter band unchanged (FA 2004 s.192(4A)). Assumes the higher-rate relief has been claimed (FA 2004 s.192(4A)). Income tax on 60000: PA 12570 (no taper at ANI 55000); taxable 60000 - 12570 = 47430; starter 2827 x 19% = 537.13; basic 17094 x 20% = 3418.8; intermediate 16171 x 21% = 3395.91; higher 11338 x 42% = 4761.96; advanced 0 x 45% = 0; top 0 x 48% = 0; income tax 12113.8. Expected is income tax only.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:9f7e614e6d9a4a6587bf6def41e210f0756fcaa5c5ec168c5d36350e60fb8b8a",
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
      "https://www.legislation.gov.uk/ukpga/2004/12/section/192",
      "https://www.gov.uk/income-tax-rates",
    ],
    derivation:
      "Relief at source: net 4000 grossed up x 1.25 = 5000. The Scottish basic rate limit and every Scottish limit above it increased by the gross contribution, 5000; starter band unchanged (FA 2004 s.192(4A)). Assumes the higher-rate relief has been claimed (FA 2004 s.192(4A)). Income tax on 60000: PA 12570 (no taper at ANI 55000); taxable 60000 - 12570 = 47430; starter 3967 x 19% = 753.73; basic 17989 x 20% = 3597.8; intermediate 14136 x 21% = 2968.56; higher 11338 x 42% = 4761.96; advanced 0 x 45% = 0; top 0 x 48% = 0; income tax 12082.05. Expected is income tax only.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Scottish advanced/top boundary 125,140 is a published figure but its frame (taxable vs gross) is ambiguous between GOV.UK pages.",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:839be0d94958a00aca80c95586ac55d443d35b8f0448073f0011b2d41168f1e0",
    rulingRef:
      "FA 2004 s.192(4A) raises the Scottish basic rate limit and the limits above it by the gross contribution, so the starter band is unchanged and the basic band widens to 17,989; band frame per the GOV.UK rates and allowances page.",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:9f88393957ce8300a1c6313e91380e72138555be3e5121b97ef6d7e08ac57058",
    rulingRef:
      "The 2026 Act on employer pension contributions (c. 15) s.1 sets the 2,000 limit from 2029-30, matching the GOV.UK policy paper; 2029/30 rates do not exist yet, so accepted only as an illustration at verified 2026/27 employee rates 8% and 2%.",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:321c8a3596337cfd9b5342dfb0310aadc87aaa3fdd4efa25fa71d45ea73fde70",
    rulingRef:
      "Act 2026 (c. 15) s.1(3)-(4) fixes the 2,000 limit and the 2029-30 start; illustration at verified 2026/27 employee rates; the 8,000 excess is above the upper earnings limit at 2%, giving 160.",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:7341a258efa0c83791e09b16745ee9e3a46b7cd793f53691cdb7882f2d91c459",
    rulingRef:
      "Act 2026 (c. 15) s.1(3)-(4) fixes the 2,000 limit and the 2029-30 start; illustration at verified 2026/27 employee rates; the 6,000 excess straddles the upper earnings limit (3,270 at 8% plus 2,730 at 2%), giving 316.20.",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:7f963b223607d8beca08a61c58b1191d87bfd4a512de247ca5c3572c80b2169c",
    rulingRef:
      "Act 2026 (c. 15) and the GOV.UK policy paper exempt the first 2,000, so a 2,000 sacrifice has no excess and no extra NI; illustration only.",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:6d1a91d2e02b1065b3c05648365c4c11b455e60ff7cd30f9ab0811794b624ef5",
    rulingRef:
      "Act 2026 (c. 15) and the GOV.UK policy paper make contributions above 2,000 subject to employer NICs from 2029-30; illustration at the verified 2026/27 secondary rate of 15% on the 3,000 excess.",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:600635d205aaa7c7fb4af5cf4f5a7ba54f8f549f311531526d7ec6add428f948",
    rulingRef:
      "Act 2026 (c. 15) and the GOV.UK policy paper; illustration at the verified 2026/27 secondary rate of 15% on the 8,000 excess; the 2029/30 rate is not yet set.",
  },
  {
    id: "hicbc.2027-28.ani59999.children1",
    taxYear: "2027/28",
    region: "ENGLAND_NI_WALES",
    kind: "hicbc",
    feature: "hicbc",
    input: { adjustedNetIncome: 59999, children: 1 },
    expected: 0,
    source: "https://www.gov.uk/child-benefit-tax-charge",
    additionalSources: [
      "https://www.gov.uk/government/publications/budget-2026-overview-of-tax-legislation-and-rates-ootlar/annex-a-rates-and-allowances",
    ],
    derivation:
      "Individual basis, claimant is the higher earner. Child Benefit 28/week x 52 weeks = 1456 (weeks: the Mondays from 6 April to 5 April, ITEPA 2003 s.681H(3), https://www.legislation.gov.uk/ukpga/2003/1/section/681H; one weekly rate for the whole year); charge percentage: ANI 59999 is not over 60000, so no steps over the threshold, 0%; charge 1456 x 0% = 0. Rule: 1% of Child Benefit per full 200 of ANI over 60,000, tax years from 2024/25 (GOV.UK child-benefit-tax-charge). The step rule is from GOV.UK because the ITEPA 2003 s.681C(2)(b) formula is an image on legislation.gov.uk. The percentage is capped at 100%. ITEPA 2003 s.681C(3) (https://www.legislation.gov.uk/ukpga/2003/1/section/681C) rounds down the total Child Benefit to whole pounds, the percentage to a whole number and the charge to whole pounds, in that order. Weekly rate for 1 child(ren): eldest 28. 2027/28 figures: Child Benefit weekly rates 28.00 (eldest) and 18.55 (each other child) are announced, not yet law.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Child Benefit weeks are the Mondays in the tax year (ITEPA 2003 s.681H(3), decider ruling adopted 20 Nov 2026), at that year's single weekly rate because uprating starts on the first Monday on or after 6 April.",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-20",
    signedOffHash: "v2:7a0ec563ac7257ba979c0ea364c29d5a078be2d3e45505082abef7819eefdb0b",
    rulingRef:
      "ITEPA 2003 s.681B(1)(a) charges only where adjusted net income exceeds 60,000, so the charge is 0 regardless of week count or weekly rate.",
  },
  {
    id: "hicbc.2027-28.ani60200.children1",
    taxYear: "2027/28",
    region: "ENGLAND_NI_WALES",
    kind: "hicbc",
    feature: "hicbc",
    input: { adjustedNetIncome: 60200, children: 1 },
    expected: 14,
    source: "https://www.gov.uk/child-benefit-tax-charge",
    additionalSources: [
      "https://www.gov.uk/government/publications/budget-2026-overview-of-tax-legislation-and-rates-ootlar/annex-a-rates-and-allowances",
    ],
    derivation:
      "Individual basis, claimant is the higher earner. Child Benefit 28/week x 52 weeks = 1456 (weeks: the Mondays from 6 April to 5 April, ITEPA 2003 s.681H(3), https://www.legislation.gov.uk/ukpga/2003/1/section/681H; one weekly rate for the whole year); charge percentage min(100, floor((ANI 60200 - 60000) / 200)) = 1%; charge 1456 x 1% = 14.56, rounded down to 14. Rule: 1% of Child Benefit per full 200 of ANI over 60,000, tax years from 2024/25 (GOV.UK child-benefit-tax-charge). The step rule is from GOV.UK because the ITEPA 2003 s.681C(2)(b) formula is an image on legislation.gov.uk. The percentage is capped at 100%. ITEPA 2003 s.681C(3) (https://www.legislation.gov.uk/ukpga/2003/1/section/681C) rounds down the total Child Benefit to whole pounds, the percentage to a whole number and the charge to whole pounds, in that order. Weekly rate for 1 child(ren): eldest 28. 2027/28 figures: Child Benefit weekly rates 28.00 (eldest) and 18.55 (each other child) are announced, not yet law.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Child Benefit weeks are the Mondays in the tax year (ITEPA 2003 s.681H(3), decider ruling adopted 20 Nov 2026), at that year's single weekly rate because uprating starts on the first Monday on or after 6 April.",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-20",
    signedOffHash: "v2:e3fec5bff8435bdd7faa442da39ceb0debfef549b93063e6ab82e93b58b922a4",
    rulingRef:
      "Total Child Benefit, percentage and charge rounded down under ITEPA 2003 s.681C(3); weeks are the Mondays in the tax year (s.681H(3)), 52 in this year, at that year's single weekly rate; figure approved by the decider on 20 Nov 2026.",
  },
  {
    id: "hicbc.2027-28.ani70000.children2",
    taxYear: "2027/28",
    region: "ENGLAND_NI_WALES",
    kind: "hicbc",
    feature: "hicbc",
    input: { adjustedNetIncome: 70000, children: 2 },
    expected: 1210,
    source: "https://www.gov.uk/child-benefit-tax-charge",
    additionalSources: [
      "https://www.gov.uk/government/publications/budget-2026-overview-of-tax-legislation-and-rates-ootlar/annex-a-rates-and-allowances",
    ],
    derivation:
      "Individual basis, claimant is the higher earner. Child Benefit 46.55/week x 52 weeks = 2420.6 (weeks: the Mondays from 6 April to 5 April, ITEPA 2003 s.681H(3), https://www.legislation.gov.uk/ukpga/2003/1/section/681H; one weekly rate for the whole year); charge percentage min(100, floor((ANI 70000 - 60000) / 200)) = 50%; charge: total 2420.6 rounded down to 2420; 2420 x 50% = 1210. Rule: 1% of Child Benefit per full 200 of ANI over 60,000, tax years from 2024/25 (GOV.UK child-benefit-tax-charge). The step rule is from GOV.UK because the ITEPA 2003 s.681C(2)(b) formula is an image on legislation.gov.uk. The percentage is capped at 100%. ITEPA 2003 s.681C(3) (https://www.legislation.gov.uk/ukpga/2003/1/section/681C) rounds down the total Child Benefit to whole pounds, the percentage to a whole number and the charge to whole pounds, in that order. Weekly rate for 2 child(ren): eldest 28 + 1 x 18.55. 2027/28 figures: Child Benefit weekly rates 28.00 (eldest) and 18.55 (each other child) are announced, not yet law.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Child Benefit weeks are the Mondays in the tax year (ITEPA 2003 s.681H(3), decider ruling adopted 20 Nov 2026), at that year's single weekly rate because uprating starts on the first Monday on or after 6 April.",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-20",
    signedOffHash: "v2:f2fd01e7be51b1dc2918154abdffb3937065aeee97a07d2c7da789ff28705a13",
    rulingRef:
      "Total Child Benefit, percentage and charge rounded down under ITEPA 2003 s.681C(3); weeks are the Mondays in the tax year (s.681H(3)), 52 in this year, at that year's single weekly rate; figure approved by the decider on 20 Nov 2026.",
  },
  {
    id: "hicbc.2027-28.ani79800.children1",
    taxYear: "2027/28",
    region: "ENGLAND_NI_WALES",
    kind: "hicbc",
    feature: "hicbc",
    input: { adjustedNetIncome: 79800, children: 1 },
    expected: 1441,
    source: "https://www.gov.uk/child-benefit-tax-charge",
    additionalSources: [
      "https://www.gov.uk/government/publications/budget-2026-overview-of-tax-legislation-and-rates-ootlar/annex-a-rates-and-allowances",
    ],
    derivation:
      "Individual basis, claimant is the higher earner. Child Benefit 28/week x 52 weeks = 1456 (weeks: the Mondays from 6 April to 5 April, ITEPA 2003 s.681H(3), https://www.legislation.gov.uk/ukpga/2003/1/section/681H; one weekly rate for the whole year); charge percentage min(100, floor((ANI 79800 - 60000) / 200)) = 99%; charge 1456 x 99% = 1441.44, rounded down to 1441. Rule: 1% of Child Benefit per full 200 of ANI over 60,000, tax years from 2024/25 (GOV.UK child-benefit-tax-charge). The step rule is from GOV.UK because the ITEPA 2003 s.681C(2)(b) formula is an image on legislation.gov.uk. The percentage is capped at 100%. ITEPA 2003 s.681C(3) (https://www.legislation.gov.uk/ukpga/2003/1/section/681C) rounds down the total Child Benefit to whole pounds, the percentage to a whole number and the charge to whole pounds, in that order. Weekly rate for 1 child(ren): eldest 28. 2027/28 figures: Child Benefit weekly rates 28.00 (eldest) and 18.55 (each other child) are announced, not yet law.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Child Benefit weeks are the Mondays in the tax year (ITEPA 2003 s.681H(3), decider ruling adopted 20 Nov 2026), at that year's single weekly rate because uprating starts on the first Monday on or after 6 April.",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-20",
    signedOffHash: "v2:9c7278590082d75ac6f0510768aa677d60edff40fb7d6ddca1c95f8e1e177eaf",
    rulingRef:
      "Total Child Benefit, percentage and charge rounded down under ITEPA 2003 s.681C(3); weeks are the Mondays in the tax year (s.681H(3)), 52 in this year, at that year's single weekly rate; figure approved by the decider on 20 Nov 2026.",
  },
  {
    id: "hicbc.2027-28.ani80000.children3",
    taxYear: "2027/28",
    region: "ENGLAND_NI_WALES",
    kind: "hicbc",
    feature: "hicbc",
    input: { adjustedNetIncome: 80000, children: 3 },
    expected: 3385,
    source: "https://www.gov.uk/child-benefit-tax-charge",
    additionalSources: [
      "https://www.gov.uk/government/publications/budget-2026-overview-of-tax-legislation-and-rates-ootlar/annex-a-rates-and-allowances",
    ],
    derivation:
      "Individual basis, claimant is the higher earner. Child Benefit 65.1/week x 52 weeks = 3385.2 (weeks: the Mondays from 6 April to 5 April, ITEPA 2003 s.681H(3), https://www.legislation.gov.uk/ukpga/2003/1/section/681H; one weekly rate for the whole year); charge percentage min(100, floor((ANI 80000 - 60000) / 200)) = 100%; charge: total 3385.2 rounded down to 3385; 3385 x 100% = 3385. Rule: 1% of Child Benefit per full 200 of ANI over 60,000, tax years from 2024/25 (GOV.UK child-benefit-tax-charge). The step rule is from GOV.UK because the ITEPA 2003 s.681C(2)(b) formula is an image on legislation.gov.uk. The percentage is capped at 100%. ITEPA 2003 s.681C(3) (https://www.legislation.gov.uk/ukpga/2003/1/section/681C) rounds down the total Child Benefit to whole pounds, the percentage to a whole number and the charge to whole pounds, in that order. Weekly rate for 3 child(ren): eldest 28 + 2 x 18.55. 2027/28 figures: Child Benefit weekly rates 28.00 (eldest) and 18.55 (each other child) are announced, not yet law.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Child Benefit weeks are the Mondays in the tax year (ITEPA 2003 s.681H(3), decider ruling adopted 20 Nov 2026), at that year's single weekly rate because uprating starts on the first Monday on or after 6 April.",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-20",
    signedOffHash: "v2:a8874be1920d558f8a76384f7726207fca0a024e57e03226cd128a535ac64e44",
    rulingRef:
      "Total Child Benefit, percentage and charge rounded down under ITEPA 2003 s.681C(3); weeks are the Mondays in the tax year (s.681H(3)), 52 in this year, at that year's single weekly rate; figure approved by the decider on 20 Nov 2026.",
  },
  {
    id: "studentLoanMulti.2027-28.plan2+postgrad.45000",
    taxYear: "2027/28",
    region: "ENGLAND_NI_WALES",
    kind: "studentLoanMulti",
    feature: "whatIf",
    input: { grossIncome: 45000, plans: "plan2+postgrad" },
    expected: 2845.35,
    source: "https://www.gov.uk/government/news/student-loans-repayment-threshold-announcement",
    additionalSources: ["https://www.gov.uk/repaying-your-student-loan/what-you-pay"],
    derivation:
      "Undergraduate Plan 2 (9% over 29,385) and Postgraduate Loan (6% over 21,000) are repaid together: plan2 (45000 - 29385) = 15615 x 9% = 1405.35; postgrad (45000 - 21000) = 24000 x 6% = 1440. Total 2845.35. 2027/28 figures: Plan 2 threshold 29385 and postgraduate threshold 21000 are announced, not yet law.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "owner",
    signedOffAt: "2026-11-20",
    signedOffHash: "1de628338dc997acae023e478697b6274119430e0d8f3fc188ad9ed0bd2ff4ea",
  },
  {
    id: "studentLoanMulti.2027-28.plan5+postgrad.24000",
    taxYear: "2027/28",
    region: "ENGLAND_NI_WALES",
    kind: "studentLoanMulti",
    feature: "whatIf",
    input: { grossIncome: 24000, plans: "plan5+postgrad" },
    expected: 180,
    source: "https://www.gov.uk/government/news/student-loans-repayment-threshold-announcement",
    additionalSources: ["https://www.gov.uk/repaying-your-student-loan/what-you-pay"],
    derivation:
      "Plan 5 (9% over 26,025) and Postgraduate Loan (6% over 21,000) are repaid together: plan5 income 24000 is below 26025, so 0; postgrad (24000 - 21000) = 3000 x 6% = 180. Total 180. 2027/28 figures: Plan 5 threshold 26025 and postgraduate threshold 21000 are announced, not yet law.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "owner",
    signedOffAt: "2026-11-20",
    signedOffHash: "2f1bc21511fcadad33cf7190d7732d8eda866b634b81ec30212217c3b4d9bea7",
  },
  {
    id: "studentLoanMulti.2027-28.plan5+postgrad.30000",
    taxYear: "2027/28",
    region: "ENGLAND_NI_WALES",
    kind: "studentLoanMulti",
    feature: "whatIf",
    input: { grossIncome: 30000, plans: "plan5+postgrad" },
    expected: 897.75,
    source: "https://www.gov.uk/government/news/student-loans-repayment-threshold-announcement",
    additionalSources: ["https://www.gov.uk/repaying-your-student-loan/what-you-pay"],
    derivation:
      "Plan 5 (9% over 26,025) and Postgraduate Loan (6% over 21,000) are repaid together: plan5 (30000 - 26025) = 3975 x 9% = 357.75; postgrad (30000 - 21000) = 9000 x 6% = 540. Total 897.75. 2027/28 figures: Plan 5 threshold 26025 and postgraduate threshold 21000 are announced, not yet law.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "owner",
    signedOffAt: "2026-11-20",
    signedOffHash: "26224c3f573ea9042bd3963ed523c3d8347f56346e3b57f53f8eded46bf4cb32",
  },
  {
    id: "studentLoanMulti.2027-28.plan5+postgrad.45000",
    taxYear: "2027/28",
    region: "ENGLAND_NI_WALES",
    kind: "studentLoanMulti",
    feature: "whatIf",
    input: { grossIncome: 45000, plans: "plan5+postgrad" },
    expected: 3147.75,
    source: "https://www.gov.uk/government/news/student-loans-repayment-threshold-announcement",
    additionalSources: ["https://www.gov.uk/repaying-your-student-loan/what-you-pay"],
    derivation:
      "Plan 5 (9% over 26,025) and Postgraduate Loan (6% over 21,000) are repaid together: plan5 (45000 - 26025) = 18975 x 9% = 1707.75; postgrad (45000 - 21000) = 24000 x 6% = 1440. Total 3147.75. 2027/28 figures: Plan 5 threshold 26025 and postgraduate threshold 21000 are announced, not yet law.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "owner",
    signedOffAt: "2026-11-20",
    signedOffHash: "7b8198f2f2a362ace09375eb4f6606d8caf9aa8fc56f2141c5990f081826a60a",
  },
  {
    id: "reliefAtSource.ewni.2027-28.60000.net4000",
    taxYear: "2027/28",
    region: "ENGLAND_NI_WALES",
    kind: "reliefAtSource",
    feature: "whatIf",
    input: { grossIncome: 60000, netContribution: 4000 },
    expected: 10432,
    source:
      "https://www.gov.uk/government/publications/budget-2026-overview-of-tax-legislation-and-rates-ootlar/annex-a-rates-and-allowances",
    additionalSources: [
      "https://www.legislation.gov.uk/ukpga/2026/11/section/10/enacted",
      "https://www.gov.uk/guidance/adjusted-net-income",
      "https://www.gov.uk/tax-on-your-private-pension/pension-tax-relief",
      "https://www.legislation.gov.uk/ukpga/2004/12/section/192",
    ],
    derivation:
      "Relief at source: net contribution 4000 grossed up x 1.25 = 5000. ANI = 60000 - 5000 = 55000 (GOV.UK adjusted-net-income step 3). Basic rate limit and higher rate limit increased by the gross contribution, 5000 (FA 2004 s.192(4)): 37700 + 5000 = 42700. Assumes the higher-rate relief has been claimed (FA 2004 s.192(4)). Income tax on salary 60000: PA 12570 (no taper at ANI 55000); taxable 60000 - 12570 = 47430; basic 42700 x 20% = 8540; higher 4730 x 40% = 1892; additional 0 x 45% = 0; income tax 10432. Expected is income tax only. 2027/28 figures: main rates 20%, 40% and 45% are announced, not yet law.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-20",
    signedOffHash: "v2:bb70a059f4300be5b44cb446747c10ce2fcb576514ce0fd603ae60933ccb2469",
    rulingRef:
      "FA 2004 s.192(4), read on legislation.gov.uk on 20 Nov 2026, raises the basic and higher rate limits by the gross contribution on a claim where higher-rate tax is otherwise chargeable; this vector meets that condition and assumes the claim is made.",
  },
  {
    id: "reliefAtSource.ewni.2027-28.110000.net8000",
    taxYear: "2027/28",
    region: "ENGLAND_NI_WALES",
    kind: "reliefAtSource",
    feature: "whatIf",
    input: { grossIncome: 110000, netContribution: 8000 },
    expected: 29432,
    source:
      "https://www.gov.uk/government/publications/budget-2026-overview-of-tax-legislation-and-rates-ootlar/annex-a-rates-and-allowances",
    additionalSources: [
      "https://www.legislation.gov.uk/ukpga/2026/11/section/10/enacted",
      "https://www.gov.uk/guidance/adjusted-net-income",
      "https://www.gov.uk/tax-on-your-private-pension/pension-tax-relief",
      "https://www.legislation.gov.uk/ukpga/2004/12/section/192",
    ],
    derivation:
      "Relief at source: net contribution 8000 grossed up x 1.25 = 10000. ANI = 110000 - 10000 = 100000 (GOV.UK adjusted-net-income step 3). Basic rate limit and higher rate limit increased by the gross contribution, 10000 (FA 2004 s.192(4)): 37700 + 10000 = 47700. Assumes the higher-rate relief has been claimed (FA 2004 s.192(4)). Income tax on salary 110000: PA 12570 (no taper at ANI 100000); taxable 110000 - 12570 = 97430; basic 47700 x 20% = 9540; higher 49730 x 40% = 19892; additional 0 x 45% = 0; income tax 29432. Expected is income tax only. 2027/28 figures: main rates 20%, 40% and 45% are announced, not yet law.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-20",
    signedOffHash: "v2:0c899c6f2654a241f11c89417724ced03b7a19ab40b82ecaa8a9d1b9de749a1f",
    rulingRef:
      "FA 2004 s.192(4), read on legislation.gov.uk on 20 Nov 2026, raises the basic and higher rate limits by the gross contribution on a claim where higher-rate tax is otherwise chargeable; this vector meets that condition and assumes the claim is made.",
  },
];
