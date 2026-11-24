/**
 * E33 S6 vector catalogue: income tax in retirement (UFPLS, the tax-free lump sum and income tax on
 * pension withdrawals with the State Pension). Vectors RV10 onwards of the E33 plan, section 9.
 *
 * Every expected value is worked by hand, band by band, from figures read on GOV.UK on the date in
 * `sourceReadOn` (see each vector's `source` and `derivation`); none is computed by the engine.
 * Every vector starts with `signedOffBy: null` until an independent decider signs it with
 * `bun run tax:signoff`, so figures that rest on these rules stay labelled as unverified estimates.
 *
 * Inputs by kind (money in pounds, expected to pence):
 * - ufplsTaxFreePart: { withdrawal, remainingLumpSumAllowance }; expected is the tax-free part of
 *   one uncrystallised funds pension lump sum (25% of it, at most the allowance left).
 * - taxFreeLumpSum: { pot, lumpSumAllowance }; expected is the tax-free lump sum from the whole pot
 *   (25% of it, at most the lump sum allowance).
 * - retirementYearTax: { pensionWithdrawal, remainingLumpSumAllowance, statePension, method };
 *   expected is the year's income tax on the taxable pension plus the State Pension. With method
 *   "ufpls" the tax-free part of the withdrawal (as ufplsTaxFreePart) is not taxed; with
 *   "lumpSum" the tax-free cash was taken at retirement, so the whole withdrawal is taxed.
 */
import type { UkTaxVector, UkTaxVectorRegion, UkTaxVectorYear } from "./uk-tax.vectors.js";

export type UkRetirementVectorKind = "ufplsTaxFreePart" | "taxFreeLumpSum" | "retirementYearTax";

export type UkRetirementVector = Omit<UkTaxVector, "kind"> & {
  kind: UkRetirementVectorKind;
  /** ISO date the sources were read. */
  sourceReadOn: string;
};

export const UK_RETIREMENT_VECTOR_KINDS: readonly UkRetirementVectorKind[] = [
  "ufplsTaxFreePart",
  "taxFreeLumpSum",
  "retirementYearTax",
];

export function selectUkRetirementVectors(
  filter: {
    taxYear?: UkTaxVectorYear;
    region?: UkTaxVectorRegion;
    kind?: UkRetirementVectorKind;
  } = {},
  vectors: readonly UkRetirementVector[] = UK_RETIREMENT_VECTORS,
): UkRetirementVector[] {
  return vectors.filter(
    (v) =>
      (filter.taxYear === undefined || v.taxYear === filter.taxYear) &&
      (filter.region === undefined || v.region === filter.region) &&
      (filter.kind === undefined || v.kind === filter.kind),
  );
}

const TAX_FREE = "https://www.gov.uk/tax-on-pension/tax-free";
const LUMP_SUM_ALLOWANCE = "https://www.gov.uk/tax-on-your-private-pension/lump-sum-allowance";
const TAXED = "https://www.gov.uk/tax-on-pension/taxed";
const TAX_ON_PENSION = "https://www.gov.uk/tax-on-pension";
const INCOME_TAX_RATES = "https://www.gov.uk/income-tax-rates";
const SCOTTISH_RATES = "https://www.gov.uk/scottish-income-tax";
const STATE_PENSION = "https://www.gov.uk/new-state-pension/what-youll-get";
const READ_ON = "2026-11-24";

const ITEPA_637D = "https://www.legislation.gov.uk/ukpga/2003/1/section/637D";

export const UK_RETIREMENT_VECTORS: readonly UkRetirementVector[] = [
  {
    id: "retirementYearTax.RV10.2026-27.ewni.ufpls30000.sp12547.60",
    taxYear: "2026/27",
    region: "ENGLAND_NI_WALES",
    kind: "retirementYearTax",
    input: {
      pensionWithdrawal: 30000,
      remainingLumpSumAllowance: 268275,
      statePension: 12547.6,
      method: "ufpls",
    },
    expected: 4495.52,
    source: INCOME_TAX_RATES,
    additionalSources: [TAX_FREE, LUMP_SUM_ALLOWANCE, TAX_ON_PENSION, STATE_PENSION],
    sourceReadOn: READ_ON,
    derivation:
      "RV10, a withdrawal above the personal allowance with the State Pension, 2026/27, England, Wales and NI. Tax-free part of the 30,000 uncrystallised funds pension lump sum: 25% x 30,000 = 7,500, below the 268,275 allowance left (GOV.UK tax-on-pension/tax-free: up to 25% tax-free; lump-sum-allowance: 268,275). Taxable pension 30,000 - 7,500 = 22,500. State Pension 12,547.60 (full new rate 241.30 a week x 52) is taxable income (GOV.UK tax-on-pension). Total income 22,500 + 12,547.60 = 35,047.60, under 100,000 so the personal allowance is the full 12,570 (GOV.UK income-tax-rates). Taxable income 35,047.60 - 12,570 = 22,477.60, all inside the 37,700 basic rate band (12,571 to 50,270). Basic rate 20%: 22,477.60 x 0.20 = 4,495.52. Higher and additional rate: 0. Total 4,495.52.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:2bff1e68198eba538fa03230de98bcdf8c154e01d6b1925eeb451f0e8be37aba",
  },
  {
    id: "ufplsTaxFreePart.RV11.2026-27.20000.allowance268275",
    taxYear: "2026/27",
    region: "ENGLAND_NI_WALES",
    kind: "ufplsTaxFreePart",
    input: { withdrawal: 20000, remainingLumpSumAllowance: 268275 },
    expected: 5000,
    source: TAX_FREE,
    additionalSources: [LUMP_SUM_ALLOWANCE],
    sourceReadOn: READ_ON,
    derivation:
      "RV11, the 25%/75% split below the allowance. GOV.UK tax-on-pension/tax-free: you can usually take up to 25% of a pension tax-free; lump-sum-allowance lists an uncrystallised funds pension lump sum's 25% tax-free part as counting towards the 268,275 allowance. 25% x 20,000 = 5,000 tax-free; the allowance left (268,275) is larger, so it does not limit it. The other 75%, 20,000 - 5,000 = 15,000, is taxed as income.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:ae47092ce48193e65568306961cfb0f7f1cc3667d25ef586ccedbbf556f7caf1",
  },
  {
    id: "ufplsTaxFreePart.RV12.2026-27.20000.allowance3000",
    taxYear: "2026/27",
    region: "ENGLAND_NI_WALES",
    kind: "ufplsTaxFreePart",
    input: { withdrawal: 20000, remainingLumpSumAllowance: 3000 },
    expected: 3000,
    source: LUMP_SUM_ALLOWANCE,
    additionalSources: [TAX_FREE, TAXED, ITEPA_637D],
    sourceReadOn: READ_ON,
    derivation:
      "RV12, a withdrawal as the lump sum allowance runs out. 25% x 20,000 = 5,000, but only 3,000 of the 268,275 allowance is left (GOV.UK lump-sum-allowance: the most you can take is 268,275 across all pensions). Tax-free part: the lower of 5,000 and 3,000 = 3,000. GOV.UK tax-on-pension/taxed: Income Tax is paid on any part of a lump sum above the allowance, so 20,000 - 3,000 = 17,000 is taxed as income. ITEPA 2003 s.637D: 25% of the lump sum is exempt, except any part above the permitted maximum (the lower of the available lump sum allowance and lump sum and death benefit allowance), which is pension income.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:ab87c4fc46bc79c62a13333da9261810e254de404093c4d5724813b4927306ab",
  },
  {
    id: "ufplsTaxFreePart.RV12b.2026-27.20000.allowance0",
    taxYear: "2026/27",
    region: "ENGLAND_NI_WALES",
    kind: "ufplsTaxFreePart",
    input: { withdrawal: 20000, remainingLumpSumAllowance: 0 },
    expected: 0,
    source: LUMP_SUM_ALLOWANCE,
    additionalSources: [TAX_FREE, TAXED, ITEPA_637D],
    sourceReadOn: READ_ON,
    derivation:
      "RV12b, a withdrawal once the lump sum allowance is used. 25% x 20,000 = 5,000, but none of the 268,275 allowance is left. Tax-free part: the lower of 5,000 and 0 = 0. GOV.UK tax-on-pension/taxed: Income Tax is paid on any part above the allowance, so all 20,000 is taxed as income. ITEPA 2003 s.637D: 25% of the lump sum is exempt, except any part above the permitted maximum (the lower of the available lump sum allowance and lump sum and death benefit allowance), which is pension income.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:25cfa1288521b16802e2f5492d3146f4ebcf512b7e55f6529f7b9a8fba096c05",
  },
  {
    id: "taxFreeLumpSum.RV13.2026-27.pot400000",
    taxYear: "2026/27",
    region: "ENGLAND_NI_WALES",
    kind: "taxFreeLumpSum",
    input: { pot: 400000, lumpSumAllowance: 268275 },
    expected: 100000,
    source: TAX_FREE,
    additionalSources: [LUMP_SUM_ALLOWANCE],
    sourceReadOn: READ_ON,
    derivation:
      "RV13, the tax-free lump sum below the cap. GOV.UK tax-on-pension/tax-free: up to 25% of the amount built up in a pension can be taken as a tax-free lump sum. 25% x 400,000 = 100,000, below the 268,275 lump sum allowance (GOV.UK lump-sum-allowance), so the lump sum is 100,000.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:62c7ec21d5a0e6cdfb62b9b48a36ef2570123e6a7635bc4d2bffc85d1e064876",
  },
  {
    id: "taxFreeLumpSum.RV13b.2026-27.pot1073100",
    taxYear: "2026/27",
    region: "ENGLAND_NI_WALES",
    kind: "taxFreeLumpSum",
    input: { pot: 1073100, lumpSumAllowance: 268275 },
    expected: 268275,
    source: LUMP_SUM_ALLOWANCE,
    additionalSources: [TAX_FREE],
    sourceReadOn: READ_ON,
    derivation:
      "RV13b, the tax-free lump sum exactly at the cap. 25% x 1,073,100 = 268,275, equal to the lump sum allowance of 268,275 (GOV.UK lump-sum-allowance: the most you can take is 268,275). The lower of the two is 268,275.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:84e7ae34f81d5f81ea19c633c23515db3d283d214ab964856e6dd8eee7fb467b",
  },
  {
    id: "taxFreeLumpSum.RV13c.2026-27.pot1500000",
    taxYear: "2026/27",
    region: "ENGLAND_NI_WALES",
    kind: "taxFreeLumpSum",
    input: { pot: 1500000, lumpSumAllowance: 268275 },
    expected: 268275,
    source: LUMP_SUM_ALLOWANCE,
    additionalSources: [TAX_FREE, TAXED],
    sourceReadOn: READ_ON,
    derivation:
      "RV13c, the tax-free lump sum above the cap. 25% x 1,500,000 = 375,000, more than the 268,275 lump sum allowance (GOV.UK lump-sum-allowance). The tax-free lump sum is the lower, 268,275. The rest of the 25% stays in the pot and is taxed as income when it is drawn, with the remaining pot.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:5f9aeba13d772ae350bec2bf5e52b3288ae4c65d1ad3164a6b7d003d8ce3aba3",
  },
  {
    id: "retirementYearTax.RV14.2026-27.ewni.sp12547.60",
    taxYear: "2026/27",
    region: "ENGLAND_NI_WALES",
    kind: "retirementYearTax",
    input: {
      pensionWithdrawal: 0,
      remainingLumpSumAllowance: 268275,
      statePension: 12547.6,
      method: "ufpls",
    },
    expected: 0,
    source: INCOME_TAX_RATES,
    additionalSources: [TAX_ON_PENSION, STATE_PENSION],
    sourceReadOn: READ_ON,
    derivation:
      "RV14, the State Pension alone under the personal allowance, 2026/27. No pension withdrawal. State Pension 241.30 a week x 52 = 12,547.60 (GOV.UK new-state-pension/what-youll-get), taxable income (GOV.UK tax-on-pension). Total income 12,547.60 is below the 12,570 personal allowance (GOV.UK income-tax-rates), so taxable income is 0 and the tax is 0.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:89c5fefdccc79827110c1c37674cf28994569e291875b3bad8d484b79fc7ed4a",
  },
  {
    id: "retirementYearTax.RV15.2026-27.scotland.ufpls40000.sp12547.60",
    taxYear: "2026/27",
    region: "SCOTLAND",
    kind: "retirementYearTax",
    input: {
      pensionWithdrawal: 40000,
      remainingLumpSumAllowance: 268275,
      statePension: 12547.6,
      method: "ufpls",
    },
    expected: 6086.07,
    source: SCOTTISH_RATES,
    additionalSources: [TAX_FREE, LUMP_SUM_ALLOWANCE, TAX_ON_PENSION, STATE_PENSION],
    sourceReadOn: READ_ON,
    derivation:
      "RV15, a Scottish taxpayer, 2026/27. Tax-free part 25% x 40,000 = 10,000 (below the 268,275 allowance left); taxable pension 30,000. Total income 30,000 + 12,547.60 State Pension = 42,547.60; personal allowance 12,570 (under 100,000). GOV.UK scottish-income-tax 2026 to 2027: starter 12,571 to 16,537 at 19%, basic 16,538 to 29,526 at 20%, intermediate 29,527 to 43,662 at 21%, higher 43,663 to 75,000 at 42%. As taxable income above the allowance: starter 0 to 3,967, basic 3,967 to 16,956, intermediate 16,956 to 31,092. Taxable income 42,547.60 - 12,570 = 29,977.60. Starter 3,967 x 0.19 = 753.73. Basic (16,956 - 3,967) = 12,989 x 0.20 = 2,597.80. Intermediate (29,977.60 - 16,956) = 13,021.60 x 0.21 = 2,734.536. Total 753.73 + 2,597.80 + 2,734.536 = 6,086.066, to the penny 6,086.07.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:3c03397db7389fc3524ffc511069947e1c7556fe40550521be82a4658c93f098",
  },
  {
    id: "retirementYearTax.RV16.2026-27.ewni.lumpSum100452.40.sp12547.60",
    taxYear: "2026/27",
    region: "ENGLAND_NI_WALES",
    kind: "retirementYearTax",
    input: {
      pensionWithdrawal: 100452.4,
      remainingLumpSumAllowance: 0,
      statePension: 12547.6,
      method: "lumpSum",
    },
    expected: 35232,
    source: INCOME_TAX_RATES,
    additionalSources: [TAX_FREE, TAX_ON_PENSION, STATE_PENSION],
    sourceReadOn: READ_ON,
    derivation:
      "RV16, the personal allowance taper above 100,000, 2026/27, England, Wales and NI. The tax-free lump sum was taken at retirement, so the whole 100,452.40 withdrawal is taxed. Total income 100,452.40 + 12,547.60 = 113,000. GOV.UK income-tax-rates: the allowance goes down by 1 for every 2 of adjusted net income above 100,000. Excess 13,000, reduction 13,000 / 2 = 6,500 (a whole number, so no rounding question); allowance 12,570 - 6,500 = 6,070. Taxable income 113,000 - 6,070 = 106,930. Basic rate band 37,700 x 0.20 = 7,540. Higher rate (106,930 - 37,700) = 69,230 x 0.40 = 27,692; 106,930 is below the 125,140 additional rate threshold. Total 7,540 + 27,692 = 35,232.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:29e7fa03f9e78f40c3fa647031b7dda9c3c8f1dccf4510fd8cbb58894731b002",
  },
];
