/**
 * UK tax test-vector catalogue (E4 T1).
 *
 * Every expected value is hand-derived band by band from figures read on
 * GOV.UK pages (see each vector's `source` and `derivation`). No vector is
 * computed by the engine. Vectors with status UNVERIFIED rest on at least one
 * figure that could not be confirmed on a GOV.UK page (marked
 * "UNVERIFIED: <reason>"); they must not be treated as authoritative until the
 * reviewer signs them off. `signedOffBy` stays null until the owner signs off.
 *
 * Conventions: money in pounds as floats, expected values rounded to pence.
 * Inputs by kind:
 * - incomeTax: { grossIncome } (employment income, no other income or reliefs)
 * - giftAid: { grossIncome, giftAidNet } (EWNI only; net donation, grossed up x 1.25)
 * - employeeNi: { grossEarnings } (annual Class 1 category A, annual method)
 * - class4: { profits }
 * - employerNiSaving: { grossSalary, salarySacrifice }
 * - studentLoan: { grossIncome, plan } plan is plan1|plan2|plan4|plan5|postgrad
 * - dividends: { employmentIncome, dividendIncome }; expected is dividend tax only
 *
 * Scotland Gift Aid vectors are deliberately absent: decision D9-B models Gift Aid for Scotland only
 * through the allowance taper (no band extension), so there is no verified figure to pin.
 */

/**
 * Pension treatment pinned by the engine's calculateUkTax (E4 T5), recorded here
 * because no vector in this catalogue includes a pension contribution.
 * calculateUkTax deducts the employee pension (grossSalary x pct) from adjusted
 * net income and from taxable income for every taxpayer ("net-pay"), whether or
 * not isSalarySacrifice is set. Real treatment differs: relief at source schemes
 * extend the basic band by the grossed-up contribution instead. UNVERIFIED: not
 * confirmed against GOV.UK for any year; owner ruling needed.
 */
export const UK_TAX_PENSION_TREATMENT = {
  pinned: "net-pay",
  status: "UNVERIFIED",
  note: "UNVERIFIED: net-pay deduction from taxable income for all schemes is the current coded behaviour, not confirmed on GOV.UK; owner ruling pending.",
} as const;

export const UK_TAX_VECTOR_YEARS = [
  "2020/21",
  "2021/22",
  "2022/23",
  "2023/24",
  "2024/25",
  "2025/26",
  "2026/27",
] as const;
export type UkTaxVectorYear = (typeof UK_TAX_VECTOR_YEARS)[number];

export type UkTaxVectorRegion = "ENGLAND_NI_WALES" | "SCOTLAND";
export type UkTaxVectorKind =
  | "incomeTax"
  | "employeeNi"
  | "employerNiSaving"
  | "studentLoan"
  | "giftAid"
  | "class4"
  | "dividends";
export type UkTaxVectorStatus = "VERIFIED" | "UNVERIFIED";

export interface UkTaxVector {
  id: string;
  taxYear: UkTaxVectorYear;
  region: UkTaxVectorRegion;
  kind: UkTaxVectorKind;
  input: Record<string, number | string>;
  /** Expected result in pounds, to pence. */
  expected: number;
  /** Primary GOV.UK / gov.scot page. */
  source: string;
  /** Archived capture of the source page, where the live page lacks the year. */
  archiveUrl?: string;
  additionalSources?: readonly string[];
  /** Band-by-band hand arithmetic. */
  derivation: string;
  confidence: "high" | "medium";
  status: UkTaxVectorStatus;
  /** Required when status is UNVERIFIED, starts with "UNVERIFIED:". */
  unverifiedReason?: string;
  signedOffBy: string | null;
}

export interface UkTaxVectorFilter {
  taxYear?: UkTaxVectorYear;
  region?: UkTaxVectorRegion;
  kind?: UkTaxVectorKind;
  status?: UkTaxVectorStatus;
}

export interface UkTaxVectorFailure {
  id: string;
  expected: number;
  actual: number;
}

export interface UkTaxVectorRunResult {
  checked: number;
  failures: UkTaxVectorFailure[];
}

/** Half a penny: engine results are rounded to pence at public boundaries. */
export const UK_TAX_VECTOR_TOLERANCE = 0.005;

export function selectUkTaxVectors(
  filter: UkTaxVectorFilter = {},
  vectors: readonly UkTaxVector[] = UK_TAX_VECTORS,
): UkTaxVector[] {
  return vectors.filter(
    (v) =>
      (filter.taxYear === undefined || v.taxYear === filter.taxYear) &&
      (filter.region === undefined || v.region === filter.region) &&
      (filter.kind === undefined || v.kind === filter.kind) &&
      (filter.status === undefined || v.status === filter.status),
  );
}

/**
 * Runner for later tasks: evaluate each vector with `evaluate` (which calls the
 * engine) and report mismatches. Later tests assert `failures` is empty for the
 * kinds/years their fix covers.
 */
export function runUkTaxVectors(
  vectors: readonly UkTaxVector[],
  evaluate: (vector: UkTaxVector) => number,
  tolerance: number = UK_TAX_VECTOR_TOLERANCE,
): UkTaxVectorRunResult {
  const failures: UkTaxVectorFailure[] = [];
  for (const vector of vectors) {
    const actual = evaluate(vector);
    if (!(Math.abs(actual - vector.expected) <= tolerance)) {
      failures.push({ id: vector.id, expected: vector.expected, actual });
    }
  }
  return { checked: vectors.length, failures };
}

export const UK_TAX_VECTORS: readonly UkTaxVector[] = [
  {
    id: "ewni.incomeTax.2020-21.30000",
    taxYear: "2020/21",
    region: "ENGLAND_NI_WALES",
    kind: "incomeTax",
    input: {
      grossIncome: 30000,
    },
    expected: 3500,
    source: "https://www.gov.uk/income-tax-rates",
    archiveUrl:
      "https://webarchive.nationalarchives.gov.uk/ukgwa/20200901000000mp_/https://www.gov.uk/income-tax-rates",
    derivation:
      "Gross income 30000. PA 12500 (no taper at adjusted net income 30000). Taxable 30000 - 12500 = 17500. Basic 17500 x 20% = 3500; higher 0 x 40% = 0; additional 0 x 45% = 0. Total 3500.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "ewni.incomeTax.2020-21.60000",
    taxYear: "2020/21",
    region: "ENGLAND_NI_WALES",
    kind: "incomeTax",
    input: {
      grossIncome: 60000,
    },
    expected: 11500,
    source: "https://www.gov.uk/income-tax-rates",
    archiveUrl:
      "https://webarchive.nationalarchives.gov.uk/ukgwa/20200901000000mp_/https://www.gov.uk/income-tax-rates",
    derivation:
      "Gross income 60000. PA 12500 (no taper at adjusted net income 60000). Taxable 60000 - 12500 = 47500. Basic 37500 x 20% = 7500; higher 10000 x 40% = 4000; additional 0 x 45% = 0. Total 11500.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "ewni.incomeTax.2020-21.100000",
    taxYear: "2020/21",
    region: "ENGLAND_NI_WALES",
    kind: "incomeTax",
    input: {
      grossIncome: 100000,
    },
    expected: 27500,
    source: "https://www.gov.uk/income-tax-rates",
    archiveUrl:
      "https://webarchive.nationalarchives.gov.uk/ukgwa/20200901000000mp_/https://www.gov.uk/income-tax-rates",
    derivation:
      "Gross income 100000. PA 12500 (no taper at adjusted net income 100000). Taxable 100000 - 12500 = 87500. Basic 37500 x 20% = 7500; higher 50000 x 40% = 20000; additional 0 x 45% = 0. Total 27500.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "ewni.incomeTax.2020-21.110000",
    taxYear: "2020/21",
    region: "ENGLAND_NI_WALES",
    kind: "incomeTax",
    input: {
      grossIncome: 110000,
    },
    expected: 33500,
    source: "https://www.gov.uk/income-tax-rates",
    archiveUrl:
      "https://webarchive.nationalarchives.gov.uk/ukgwa/20200901000000mp_/https://www.gov.uk/income-tax-rates",
    derivation:
      "Gross income 110000. Taper: (110000 - 100000) / 2 = 5000, PA 12500 - 5000 = 7500. Taxable 110000 - 7500 = 102500. Basic 37500 x 20% = 7500; higher 65000 x 40% = 26000; additional 0 x 45% = 0. Total 33500.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: the GBP1-per-GBP2 taper rate is not stated on the archived 2020/21-2022/23 gov.uk pages (memory only); the vector relies on it.",
    signedOffBy: null,
  },
  {
    id: "ewni.incomeTax.2020-21.125140",
    taxYear: "2020/21",
    region: "ENGLAND_NI_WALES",
    kind: "incomeTax",
    input: {
      grossIncome: 125140,
    },
    expected: 42556,
    source: "https://www.gov.uk/income-tax-rates",
    archiveUrl:
      "https://webarchive.nationalarchives.gov.uk/ukgwa/20200901000000mp_/https://www.gov.uk/income-tax-rates",
    derivation:
      "Gross income 125140. Taper: (125140 - 100000) / 2 = 12570, PA 12500 - 12570 = 0. Taxable 125140 - 0 = 125140. Basic 37500 x 20% = 7500; higher 87640 x 40% = 35056; additional 0 x 45% = 0. Total 42556.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "ewni.incomeTax.2020-21.150000",
    taxYear: "2020/21",
    region: "ENGLAND_NI_WALES",
    kind: "incomeTax",
    input: {
      grossIncome: 150000,
    },
    expected: 52500,
    source: "https://www.gov.uk/income-tax-rates",
    archiveUrl:
      "https://webarchive.nationalarchives.gov.uk/ukgwa/20200901000000mp_/https://www.gov.uk/income-tax-rates",
    derivation:
      "Gross income 150000. Taper: (150000 - 100000) / 2 = 25000, PA 12500 - 25000 = 0. Taxable 150000 - 0 = 150000. Basic 37500 x 20% = 7500; higher 112500 x 40% = 45000; additional 0 x 45% = 0. Total 52500.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "ewni.incomeTax.2020-21.160000",
    taxYear: "2020/21",
    region: "ENGLAND_NI_WALES",
    kind: "incomeTax",
    input: {
      grossIncome: 160000,
    },
    expected: 57000,
    source: "https://www.gov.uk/income-tax-rates",
    archiveUrl:
      "https://webarchive.nationalarchives.gov.uk/ukgwa/20200901000000mp_/https://www.gov.uk/income-tax-rates",
    derivation:
      "Gross income 160000. Taper: (160000 - 100000) / 2 = 30000, PA 12500 - 30000 = 0. Taxable 160000 - 0 = 160000. Basic 37500 x 20% = 7500; higher 112500 x 40% = 45000; additional 10000 x 45% = 4500. Total 57000.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "ewni.giftAid.2020-21.60000.net1000",
    taxYear: "2020/21",
    region: "ENGLAND_NI_WALES",
    kind: "giftAid",
    input: {
      grossIncome: 60000,
      giftAidNet: 1000,
    },
    expected: 11250,
    source: "https://www.gov.uk/income-tax-rates",
    archiveUrl:
      "https://webarchive.nationalarchives.gov.uk/ukgwa/20200901000000mp_/https://www.gov.uk/income-tax-rates",
    additionalSources: [
      "https://www.gov.uk/guidance/adjusted-net-income",
      "https://www.legislation.gov.uk/ukpga/2007/3/section/414",
    ],
    derivation:
      "Gross income 60000. Gift Aid gross-up 1000 x 1.25 = 1250; adjusted net income 60000 - 1250 = 58750; basic and higher limits both raised by 1250 (ITA 2007 s.414): 37500 + 1250 = 38750, 150000 + 1250 = 151250. PA 12500 (no taper at adjusted net income 58750). Taxable 60000 - 12500 = 47500. Basic 38750 x 20% = 7750; higher 8750 x 40% = 3500; additional 0 x 45% = 0. Total 11250.",
    confidence: "medium",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "ewni.giftAid.2020-21.110000.net1000",
    taxYear: "2020/21",
    region: "ENGLAND_NI_WALES",
    kind: "giftAid",
    input: {
      grossIncome: 110000,
      giftAidNet: 1000,
    },
    expected: 33000,
    source: "https://www.gov.uk/income-tax-rates",
    archiveUrl:
      "https://webarchive.nationalarchives.gov.uk/ukgwa/20200901000000mp_/https://www.gov.uk/income-tax-rates",
    additionalSources: [
      "https://www.gov.uk/guidance/adjusted-net-income",
      "https://www.legislation.gov.uk/ukpga/2007/3/section/414",
    ],
    derivation:
      "Gross income 110000. Gift Aid gross-up 1000 x 1.25 = 1250; adjusted net income 110000 - 1250 = 108750; basic and higher limits both raised by 1250 (ITA 2007 s.414): 37500 + 1250 = 38750, 150000 + 1250 = 151250. Taper: (108750 - 100000) / 2 = 4375, PA 12500 - 4375 = 8125. Taxable 110000 - 8125 = 101875. Basic 38750 x 20% = 7750; higher 63125 x 40% = 25250; additional 0 x 45% = 0. Total 33000.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: the GBP1-per-GBP2 taper rate is not stated on the archived 2020/21-2022/23 gov.uk pages (memory only); the vector relies on it.",
    signedOffBy: null,
  },
  {
    id: "ewni.incomeTax.2021-22.30000",
    taxYear: "2021/22",
    region: "ENGLAND_NI_WALES",
    kind: "incomeTax",
    input: {
      grossIncome: 30000,
    },
    expected: 3486,
    source: "https://www.gov.uk/income-tax-rates",
    archiveUrl:
      "https://webarchive.nationalarchives.gov.uk/ukgwa/20211001000000mp_/https://www.gov.uk/income-tax-rates",
    derivation:
      "Gross income 30000. PA 12570 (no taper at adjusted net income 30000). Taxable 30000 - 12570 = 17430. Basic 17430 x 20% = 3486; higher 0 x 40% = 0; additional 0 x 45% = 0. Total 3486.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "ewni.incomeTax.2021-22.60000",
    taxYear: "2021/22",
    region: "ENGLAND_NI_WALES",
    kind: "incomeTax",
    input: {
      grossIncome: 60000,
    },
    expected: 11432,
    source: "https://www.gov.uk/income-tax-rates",
    archiveUrl:
      "https://webarchive.nationalarchives.gov.uk/ukgwa/20211001000000mp_/https://www.gov.uk/income-tax-rates",
    derivation:
      "Gross income 60000. PA 12570 (no taper at adjusted net income 60000). Taxable 60000 - 12570 = 47430. Basic 37700 x 20% = 7540; higher 9730 x 40% = 3892; additional 0 x 45% = 0. Total 11432.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "ewni.incomeTax.2021-22.100000",
    taxYear: "2021/22",
    region: "ENGLAND_NI_WALES",
    kind: "incomeTax",
    input: {
      grossIncome: 100000,
    },
    expected: 27432,
    source: "https://www.gov.uk/income-tax-rates",
    archiveUrl:
      "https://webarchive.nationalarchives.gov.uk/ukgwa/20211001000000mp_/https://www.gov.uk/income-tax-rates",
    derivation:
      "Gross income 100000. PA 12570 (no taper at adjusted net income 100000). Taxable 100000 - 12570 = 87430. Basic 37700 x 20% = 7540; higher 49730 x 40% = 19892; additional 0 x 45% = 0. Total 27432.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "ewni.incomeTax.2021-22.110000",
    taxYear: "2021/22",
    region: "ENGLAND_NI_WALES",
    kind: "incomeTax",
    input: {
      grossIncome: 110000,
    },
    expected: 33432,
    source: "https://www.gov.uk/income-tax-rates",
    archiveUrl:
      "https://webarchive.nationalarchives.gov.uk/ukgwa/20211001000000mp_/https://www.gov.uk/income-tax-rates",
    derivation:
      "Gross income 110000. Taper: (110000 - 100000) / 2 = 5000, PA 12570 - 5000 = 7570. Taxable 110000 - 7570 = 102430. Basic 37700 x 20% = 7540; higher 64730 x 40% = 25892; additional 0 x 45% = 0. Total 33432.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: the GBP1-per-GBP2 taper rate is not stated on the archived 2020/21-2022/23 gov.uk pages (memory only); the vector relies on it.",
    signedOffBy: null,
  },
  {
    id: "ewni.incomeTax.2021-22.125140",
    taxYear: "2021/22",
    region: "ENGLAND_NI_WALES",
    kind: "incomeTax",
    input: {
      grossIncome: 125140,
    },
    expected: 42516,
    source: "https://www.gov.uk/income-tax-rates",
    archiveUrl:
      "https://webarchive.nationalarchives.gov.uk/ukgwa/20211001000000mp_/https://www.gov.uk/income-tax-rates",
    derivation:
      "Gross income 125140. Taper: (125140 - 100000) / 2 = 12570, PA 12570 - 12570 = 0. Taxable 125140 - 0 = 125140. Basic 37700 x 20% = 7540; higher 87440 x 40% = 34976; additional 0 x 45% = 0. Total 42516.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "ewni.incomeTax.2021-22.150000",
    taxYear: "2021/22",
    region: "ENGLAND_NI_WALES",
    kind: "incomeTax",
    input: {
      grossIncome: 150000,
    },
    expected: 52460,
    source: "https://www.gov.uk/income-tax-rates",
    archiveUrl:
      "https://webarchive.nationalarchives.gov.uk/ukgwa/20211001000000mp_/https://www.gov.uk/income-tax-rates",
    derivation:
      "Gross income 150000. Taper: (150000 - 100000) / 2 = 25000, PA 12570 - 25000 = 0. Taxable 150000 - 0 = 150000. Basic 37700 x 20% = 7540; higher 112300 x 40% = 44920; additional 0 x 45% = 0. Total 52460.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "ewni.incomeTax.2021-22.160000",
    taxYear: "2021/22",
    region: "ENGLAND_NI_WALES",
    kind: "incomeTax",
    input: {
      grossIncome: 160000,
    },
    expected: 56960,
    source: "https://www.gov.uk/income-tax-rates",
    archiveUrl:
      "https://webarchive.nationalarchives.gov.uk/ukgwa/20211001000000mp_/https://www.gov.uk/income-tax-rates",
    derivation:
      "Gross income 160000. Taper: (160000 - 100000) / 2 = 30000, PA 12570 - 30000 = 0. Taxable 160000 - 0 = 160000. Basic 37700 x 20% = 7540; higher 112300 x 40% = 44920; additional 10000 x 45% = 4500. Total 56960.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "ewni.giftAid.2021-22.60000.net1000",
    taxYear: "2021/22",
    region: "ENGLAND_NI_WALES",
    kind: "giftAid",
    input: {
      grossIncome: 60000,
      giftAidNet: 1000,
    },
    expected: 11182,
    source: "https://www.gov.uk/income-tax-rates",
    archiveUrl:
      "https://webarchive.nationalarchives.gov.uk/ukgwa/20211001000000mp_/https://www.gov.uk/income-tax-rates",
    additionalSources: [
      "https://www.gov.uk/guidance/adjusted-net-income",
      "https://www.legislation.gov.uk/ukpga/2007/3/section/414",
    ],
    derivation:
      "Gross income 60000. Gift Aid gross-up 1000 x 1.25 = 1250; adjusted net income 60000 - 1250 = 58750; basic and higher limits both raised by 1250 (ITA 2007 s.414): 37700 + 1250 = 38950, 150000 + 1250 = 151250. PA 12570 (no taper at adjusted net income 58750). Taxable 60000 - 12570 = 47430. Basic 38950 x 20% = 7790; higher 8480 x 40% = 3392; additional 0 x 45% = 0. Total 11182.",
    confidence: "medium",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "ewni.giftAid.2021-22.110000.net1000",
    taxYear: "2021/22",
    region: "ENGLAND_NI_WALES",
    kind: "giftAid",
    input: {
      grossIncome: 110000,
      giftAidNet: 1000,
    },
    expected: 32932,
    source: "https://www.gov.uk/income-tax-rates",
    archiveUrl:
      "https://webarchive.nationalarchives.gov.uk/ukgwa/20211001000000mp_/https://www.gov.uk/income-tax-rates",
    additionalSources: [
      "https://www.gov.uk/guidance/adjusted-net-income",
      "https://www.legislation.gov.uk/ukpga/2007/3/section/414",
    ],
    derivation:
      "Gross income 110000. Gift Aid gross-up 1000 x 1.25 = 1250; adjusted net income 110000 - 1250 = 108750; basic and higher limits both raised by 1250 (ITA 2007 s.414): 37700 + 1250 = 38950, 150000 + 1250 = 151250. Taper: (108750 - 100000) / 2 = 4375, PA 12570 - 4375 = 8195. Taxable 110000 - 8195 = 101805. Basic 38950 x 20% = 7790; higher 62855 x 40% = 25142; additional 0 x 45% = 0. Total 32932.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: the GBP1-per-GBP2 taper rate is not stated on the archived 2020/21-2022/23 gov.uk pages (memory only); the vector relies on it.",
    signedOffBy: null,
  },
  {
    id: "ewni.incomeTax.2022-23.30000",
    taxYear: "2022/23",
    region: "ENGLAND_NI_WALES",
    kind: "incomeTax",
    input: {
      grossIncome: 30000,
    },
    expected: 3486,
    source: "https://www.gov.uk/income-tax-rates",
    archiveUrl:
      "https://webarchive.nationalarchives.gov.uk/ukgwa/20220801195953mp_/https://www.gov.uk/income-tax-rates",
    derivation:
      "Gross income 30000. PA 12570 (no taper at adjusted net income 30000). Taxable 30000 - 12570 = 17430. Basic 17430 x 20% = 3486; higher 0 x 40% = 0; additional 0 x 45% = 0. Total 3486.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "ewni.incomeTax.2022-23.60000",
    taxYear: "2022/23",
    region: "ENGLAND_NI_WALES",
    kind: "incomeTax",
    input: {
      grossIncome: 60000,
    },
    expected: 11432,
    source: "https://www.gov.uk/income-tax-rates",
    archiveUrl:
      "https://webarchive.nationalarchives.gov.uk/ukgwa/20220801195953mp_/https://www.gov.uk/income-tax-rates",
    derivation:
      "Gross income 60000. PA 12570 (no taper at adjusted net income 60000). Taxable 60000 - 12570 = 47430. Basic 37700 x 20% = 7540; higher 9730 x 40% = 3892; additional 0 x 45% = 0. Total 11432.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "ewni.incomeTax.2022-23.100000",
    taxYear: "2022/23",
    region: "ENGLAND_NI_WALES",
    kind: "incomeTax",
    input: {
      grossIncome: 100000,
    },
    expected: 27432,
    source: "https://www.gov.uk/income-tax-rates",
    archiveUrl:
      "https://webarchive.nationalarchives.gov.uk/ukgwa/20220801195953mp_/https://www.gov.uk/income-tax-rates",
    derivation:
      "Gross income 100000. PA 12570 (no taper at adjusted net income 100000). Taxable 100000 - 12570 = 87430. Basic 37700 x 20% = 7540; higher 49730 x 40% = 19892; additional 0 x 45% = 0. Total 27432.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "ewni.incomeTax.2022-23.110000",
    taxYear: "2022/23",
    region: "ENGLAND_NI_WALES",
    kind: "incomeTax",
    input: {
      grossIncome: 110000,
    },
    expected: 33432,
    source: "https://www.gov.uk/income-tax-rates",
    archiveUrl:
      "https://webarchive.nationalarchives.gov.uk/ukgwa/20220801195953mp_/https://www.gov.uk/income-tax-rates",
    derivation:
      "Gross income 110000. Taper: (110000 - 100000) / 2 = 5000, PA 12570 - 5000 = 7570. Taxable 110000 - 7570 = 102430. Basic 37700 x 20% = 7540; higher 64730 x 40% = 25892; additional 0 x 45% = 0. Total 33432.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: the GBP1-per-GBP2 taper rate is not stated on the archived 2020/21-2022/23 gov.uk pages (memory only); the vector relies on it.",
    signedOffBy: null,
  },
  {
    id: "ewni.incomeTax.2022-23.125140",
    taxYear: "2022/23",
    region: "ENGLAND_NI_WALES",
    kind: "incomeTax",
    input: {
      grossIncome: 125140,
    },
    expected: 42516,
    source: "https://www.gov.uk/income-tax-rates",
    archiveUrl:
      "https://webarchive.nationalarchives.gov.uk/ukgwa/20220801195953mp_/https://www.gov.uk/income-tax-rates",
    derivation:
      "Gross income 125140. Taper: (125140 - 100000) / 2 = 12570, PA 12570 - 12570 = 0. Taxable 125140 - 0 = 125140. Basic 37700 x 20% = 7540; higher 87440 x 40% = 34976; additional 0 x 45% = 0. Total 42516.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "ewni.incomeTax.2022-23.150000",
    taxYear: "2022/23",
    region: "ENGLAND_NI_WALES",
    kind: "incomeTax",
    input: {
      grossIncome: 150000,
    },
    expected: 52460,
    source: "https://www.gov.uk/income-tax-rates",
    archiveUrl:
      "https://webarchive.nationalarchives.gov.uk/ukgwa/20220801195953mp_/https://www.gov.uk/income-tax-rates",
    derivation:
      "Gross income 150000. Taper: (150000 - 100000) / 2 = 25000, PA 12570 - 25000 = 0. Taxable 150000 - 0 = 150000. Basic 37700 x 20% = 7540; higher 112300 x 40% = 44920; additional 0 x 45% = 0. Total 52460.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "ewni.incomeTax.2022-23.160000",
    taxYear: "2022/23",
    region: "ENGLAND_NI_WALES",
    kind: "incomeTax",
    input: {
      grossIncome: 160000,
    },
    expected: 56960,
    source: "https://www.gov.uk/income-tax-rates",
    archiveUrl:
      "https://webarchive.nationalarchives.gov.uk/ukgwa/20220801195953mp_/https://www.gov.uk/income-tax-rates",
    derivation:
      "Gross income 160000. Taper: (160000 - 100000) / 2 = 30000, PA 12570 - 30000 = 0. Taxable 160000 - 0 = 160000. Basic 37700 x 20% = 7540; higher 112300 x 40% = 44920; additional 10000 x 45% = 4500. Total 56960.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "ewni.giftAid.2022-23.60000.net1000",
    taxYear: "2022/23",
    region: "ENGLAND_NI_WALES",
    kind: "giftAid",
    input: {
      grossIncome: 60000,
      giftAidNet: 1000,
    },
    expected: 11182,
    source: "https://www.gov.uk/income-tax-rates",
    archiveUrl:
      "https://webarchive.nationalarchives.gov.uk/ukgwa/20220801195953mp_/https://www.gov.uk/income-tax-rates",
    additionalSources: [
      "https://www.gov.uk/guidance/adjusted-net-income",
      "https://www.legislation.gov.uk/ukpga/2007/3/section/414",
    ],
    derivation:
      "Gross income 60000. Gift Aid gross-up 1000 x 1.25 = 1250; adjusted net income 60000 - 1250 = 58750; basic and higher limits both raised by 1250 (ITA 2007 s.414): 37700 + 1250 = 38950, 150000 + 1250 = 151250. PA 12570 (no taper at adjusted net income 58750). Taxable 60000 - 12570 = 47430. Basic 38950 x 20% = 7790; higher 8480 x 40% = 3392; additional 0 x 45% = 0. Total 11182.",
    confidence: "medium",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "ewni.giftAid.2022-23.110000.net1000",
    taxYear: "2022/23",
    region: "ENGLAND_NI_WALES",
    kind: "giftAid",
    input: {
      grossIncome: 110000,
      giftAidNet: 1000,
    },
    expected: 32932,
    source: "https://www.gov.uk/income-tax-rates",
    archiveUrl:
      "https://webarchive.nationalarchives.gov.uk/ukgwa/20220801195953mp_/https://www.gov.uk/income-tax-rates",
    additionalSources: [
      "https://www.gov.uk/guidance/adjusted-net-income",
      "https://www.legislation.gov.uk/ukpga/2007/3/section/414",
    ],
    derivation:
      "Gross income 110000. Gift Aid gross-up 1000 x 1.25 = 1250; adjusted net income 110000 - 1250 = 108750; basic and higher limits both raised by 1250 (ITA 2007 s.414): 37700 + 1250 = 38950, 150000 + 1250 = 151250. Taper: (108750 - 100000) / 2 = 4375, PA 12570 - 4375 = 8195. Taxable 110000 - 8195 = 101805. Basic 38950 x 20% = 7790; higher 62855 x 40% = 25142; additional 0 x 45% = 0. Total 32932.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: the GBP1-per-GBP2 taper rate is not stated on the archived 2020/21-2022/23 gov.uk pages (memory only); the vector relies on it.",
    signedOffBy: null,
  },
  {
    id: "ewni.incomeTax.2023-24.30000",
    taxYear: "2023/24",
    region: "ENGLAND_NI_WALES",
    kind: "incomeTax",
    input: {
      grossIncome: 30000,
    },
    expected: 3486,
    source:
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    derivation:
      "Gross income 30000. PA 12570 (no taper at adjusted net income 30000). Taxable 30000 - 12570 = 17430. Basic 17430 x 20% = 3486; higher 0 x 40% = 0; additional 0 x 45% = 0. Total 3486.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "ewni.incomeTax.2023-24.60000",
    taxYear: "2023/24",
    region: "ENGLAND_NI_WALES",
    kind: "incomeTax",
    input: {
      grossIncome: 60000,
    },
    expected: 11432,
    source:
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    derivation:
      "Gross income 60000. PA 12570 (no taper at adjusted net income 60000). Taxable 60000 - 12570 = 47430. Basic 37700 x 20% = 7540; higher 9730 x 40% = 3892; additional 0 x 45% = 0. Total 11432.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "ewni.incomeTax.2023-24.100000",
    taxYear: "2023/24",
    region: "ENGLAND_NI_WALES",
    kind: "incomeTax",
    input: {
      grossIncome: 100000,
    },
    expected: 27432,
    source:
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    derivation:
      "Gross income 100000. PA 12570 (no taper at adjusted net income 100000). Taxable 100000 - 12570 = 87430. Basic 37700 x 20% = 7540; higher 49730 x 40% = 19892; additional 0 x 45% = 0. Total 27432.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "ewni.incomeTax.2023-24.110000",
    taxYear: "2023/24",
    region: "ENGLAND_NI_WALES",
    kind: "incomeTax",
    input: {
      grossIncome: 110000,
    },
    expected: 33432,
    source:
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    derivation:
      "Gross income 110000. Taper: (110000 - 100000) / 2 = 5000, PA 12570 - 5000 = 7570. Taxable 110000 - 7570 = 102430. Basic 37700 x 20% = 7540; higher 64730 x 40% = 25892; additional 0 x 45% = 0. Total 33432.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "ewni.incomeTax.2023-24.125140",
    taxYear: "2023/24",
    region: "ENGLAND_NI_WALES",
    kind: "incomeTax",
    input: {
      grossIncome: 125140,
    },
    expected: 42516,
    source:
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    derivation:
      "Gross income 125140. Taper: (125140 - 100000) / 2 = 12570, PA 12570 - 12570 = 0. Taxable 125140 - 0 = 125140. Basic 37700 x 20% = 7540; higher 87440 x 40% = 34976; additional 0 x 45% = 0. Total 42516.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "ewni.incomeTax.2023-24.150000",
    taxYear: "2023/24",
    region: "ENGLAND_NI_WALES",
    kind: "incomeTax",
    input: {
      grossIncome: 150000,
    },
    expected: 53703,
    source:
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    derivation:
      "Gross income 150000. Taper: (150000 - 100000) / 2 = 25000, PA 12570 - 25000 = 0. Taxable 150000 - 0 = 150000. Basic 37700 x 20% = 7540; higher 87440 x 40% = 34976; additional 24860 x 45% = 11187. Total 53703.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "ewni.giftAid.2023-24.60000.net1000",
    taxYear: "2023/24",
    region: "ENGLAND_NI_WALES",
    kind: "giftAid",
    input: {
      grossIncome: 60000,
      giftAidNet: 1000,
    },
    expected: 11182,
    source:
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    additionalSources: [
      "https://www.gov.uk/guidance/adjusted-net-income",
      "https://www.legislation.gov.uk/ukpga/2007/3/section/414",
    ],
    derivation:
      "Gross income 60000. Gift Aid gross-up 1000 x 1.25 = 1250; adjusted net income 60000 - 1250 = 58750; basic and higher limits both raised by 1250 (ITA 2007 s.414): 37700 + 1250 = 38950, 125140 + 1250 = 126390. PA 12570 (no taper at adjusted net income 58750). Taxable 60000 - 12570 = 47430. Basic 38950 x 20% = 7790; higher 8480 x 40% = 3392; additional 0 x 45% = 0. Total 11182.",
    confidence: "medium",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "ewni.giftAid.2023-24.110000.net1000",
    taxYear: "2023/24",
    region: "ENGLAND_NI_WALES",
    kind: "giftAid",
    input: {
      grossIncome: 110000,
      giftAidNet: 1000,
    },
    expected: 32932,
    source:
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    additionalSources: [
      "https://www.gov.uk/guidance/adjusted-net-income",
      "https://www.legislation.gov.uk/ukpga/2007/3/section/414",
    ],
    derivation:
      "Gross income 110000. Gift Aid gross-up 1000 x 1.25 = 1250; adjusted net income 110000 - 1250 = 108750; basic and higher limits both raised by 1250 (ITA 2007 s.414): 37700 + 1250 = 38950, 125140 + 1250 = 126390. Taper: (108750 - 100000) / 2 = 4375, PA 12570 - 4375 = 8195. Taxable 110000 - 8195 = 101805. Basic 38950 x 20% = 7790; higher 62855 x 40% = 25142; additional 0 x 45% = 0. Total 32932.",
    confidence: "medium",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "ewni.incomeTax.2024-25.30000",
    taxYear: "2024/25",
    region: "ENGLAND_NI_WALES",
    kind: "incomeTax",
    input: {
      grossIncome: 30000,
    },
    expected: 3486,
    source:
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    derivation:
      "Gross income 30000. PA 12570 (no taper at adjusted net income 30000). Taxable 30000 - 12570 = 17430. Basic 17430 x 20% = 3486; higher 0 x 40% = 0; additional 0 x 45% = 0. Total 3486.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "ewni.incomeTax.2024-25.60000",
    taxYear: "2024/25",
    region: "ENGLAND_NI_WALES",
    kind: "incomeTax",
    input: {
      grossIncome: 60000,
    },
    expected: 11432,
    source:
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    derivation:
      "Gross income 60000. PA 12570 (no taper at adjusted net income 60000). Taxable 60000 - 12570 = 47430. Basic 37700 x 20% = 7540; higher 9730 x 40% = 3892; additional 0 x 45% = 0. Total 11432.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "ewni.incomeTax.2024-25.100000",
    taxYear: "2024/25",
    region: "ENGLAND_NI_WALES",
    kind: "incomeTax",
    input: {
      grossIncome: 100000,
    },
    expected: 27432,
    source:
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    derivation:
      "Gross income 100000. PA 12570 (no taper at adjusted net income 100000). Taxable 100000 - 12570 = 87430. Basic 37700 x 20% = 7540; higher 49730 x 40% = 19892; additional 0 x 45% = 0. Total 27432.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "ewni.incomeTax.2024-25.110000",
    taxYear: "2024/25",
    region: "ENGLAND_NI_WALES",
    kind: "incomeTax",
    input: {
      grossIncome: 110000,
    },
    expected: 33432,
    source:
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    derivation:
      "Gross income 110000. Taper: (110000 - 100000) / 2 = 5000, PA 12570 - 5000 = 7570. Taxable 110000 - 7570 = 102430. Basic 37700 x 20% = 7540; higher 64730 x 40% = 25892; additional 0 x 45% = 0. Total 33432.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "ewni.incomeTax.2024-25.125140",
    taxYear: "2024/25",
    region: "ENGLAND_NI_WALES",
    kind: "incomeTax",
    input: {
      grossIncome: 125140,
    },
    expected: 42516,
    source:
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    derivation:
      "Gross income 125140. Taper: (125140 - 100000) / 2 = 12570, PA 12570 - 12570 = 0. Taxable 125140 - 0 = 125140. Basic 37700 x 20% = 7540; higher 87440 x 40% = 34976; additional 0 x 45% = 0. Total 42516.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "ewni.incomeTax.2024-25.150000",
    taxYear: "2024/25",
    region: "ENGLAND_NI_WALES",
    kind: "incomeTax",
    input: {
      grossIncome: 150000,
    },
    expected: 53703,
    source:
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    derivation:
      "Gross income 150000. Taper: (150000 - 100000) / 2 = 25000, PA 12570 - 25000 = 0. Taxable 150000 - 0 = 150000. Basic 37700 x 20% = 7540; higher 87440 x 40% = 34976; additional 24860 x 45% = 11187. Total 53703.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "ewni.giftAid.2024-25.60000.net1000",
    taxYear: "2024/25",
    region: "ENGLAND_NI_WALES",
    kind: "giftAid",
    input: {
      grossIncome: 60000,
      giftAidNet: 1000,
    },
    expected: 11182,
    source:
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    additionalSources: [
      "https://www.gov.uk/guidance/adjusted-net-income",
      "https://www.legislation.gov.uk/ukpga/2007/3/section/414",
    ],
    derivation:
      "Gross income 60000. Gift Aid gross-up 1000 x 1.25 = 1250; adjusted net income 60000 - 1250 = 58750; basic and higher limits both raised by 1250 (ITA 2007 s.414): 37700 + 1250 = 38950, 125140 + 1250 = 126390. PA 12570 (no taper at adjusted net income 58750). Taxable 60000 - 12570 = 47430. Basic 38950 x 20% = 7790; higher 8480 x 40% = 3392; additional 0 x 45% = 0. Total 11182.",
    confidence: "medium",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "ewni.giftAid.2024-25.110000.net1000",
    taxYear: "2024/25",
    region: "ENGLAND_NI_WALES",
    kind: "giftAid",
    input: {
      grossIncome: 110000,
      giftAidNet: 1000,
    },
    expected: 32932,
    source:
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    additionalSources: [
      "https://www.gov.uk/guidance/adjusted-net-income",
      "https://www.legislation.gov.uk/ukpga/2007/3/section/414",
    ],
    derivation:
      "Gross income 110000. Gift Aid gross-up 1000 x 1.25 = 1250; adjusted net income 110000 - 1250 = 108750; basic and higher limits both raised by 1250 (ITA 2007 s.414): 37700 + 1250 = 38950, 125140 + 1250 = 126390. Taper: (108750 - 100000) / 2 = 4375, PA 12570 - 4375 = 8195. Taxable 110000 - 8195 = 101805. Basic 38950 x 20% = 7790; higher 62855 x 40% = 25142; additional 0 x 45% = 0. Total 32932.",
    confidence: "medium",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "ewni.incomeTax.2025-26.30000",
    taxYear: "2025/26",
    region: "ENGLAND_NI_WALES",
    kind: "incomeTax",
    input: {
      grossIncome: 30000,
    },
    expected: 3486,
    source:
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    derivation:
      "Gross income 30000. PA 12570 (no taper at adjusted net income 30000). Taxable 30000 - 12570 = 17430. Basic 17430 x 20% = 3486; higher 0 x 40% = 0; additional 0 x 45% = 0. Total 3486.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "ewni.incomeTax.2025-26.60000",
    taxYear: "2025/26",
    region: "ENGLAND_NI_WALES",
    kind: "incomeTax",
    input: {
      grossIncome: 60000,
    },
    expected: 11432,
    source:
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    derivation:
      "Gross income 60000. PA 12570 (no taper at adjusted net income 60000). Taxable 60000 - 12570 = 47430. Basic 37700 x 20% = 7540; higher 9730 x 40% = 3892; additional 0 x 45% = 0. Total 11432.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "ewni.incomeTax.2025-26.100000",
    taxYear: "2025/26",
    region: "ENGLAND_NI_WALES",
    kind: "incomeTax",
    input: {
      grossIncome: 100000,
    },
    expected: 27432,
    source:
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    derivation:
      "Gross income 100000. PA 12570 (no taper at adjusted net income 100000). Taxable 100000 - 12570 = 87430. Basic 37700 x 20% = 7540; higher 49730 x 40% = 19892; additional 0 x 45% = 0. Total 27432.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "ewni.incomeTax.2025-26.110000",
    taxYear: "2025/26",
    region: "ENGLAND_NI_WALES",
    kind: "incomeTax",
    input: {
      grossIncome: 110000,
    },
    expected: 33432,
    source:
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    derivation:
      "Gross income 110000. Taper: (110000 - 100000) / 2 = 5000, PA 12570 - 5000 = 7570. Taxable 110000 - 7570 = 102430. Basic 37700 x 20% = 7540; higher 64730 x 40% = 25892; additional 0 x 45% = 0. Total 33432.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "ewni.incomeTax.2025-26.125140",
    taxYear: "2025/26",
    region: "ENGLAND_NI_WALES",
    kind: "incomeTax",
    input: {
      grossIncome: 125140,
    },
    expected: 42516,
    source:
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    derivation:
      "Gross income 125140. Taper: (125140 - 100000) / 2 = 12570, PA 12570 - 12570 = 0. Taxable 125140 - 0 = 125140. Basic 37700 x 20% = 7540; higher 87440 x 40% = 34976; additional 0 x 45% = 0. Total 42516.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "ewni.incomeTax.2025-26.150000",
    taxYear: "2025/26",
    region: "ENGLAND_NI_WALES",
    kind: "incomeTax",
    input: {
      grossIncome: 150000,
    },
    expected: 53703,
    source:
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    derivation:
      "Gross income 150000. Taper: (150000 - 100000) / 2 = 25000, PA 12570 - 25000 = 0. Taxable 150000 - 0 = 150000. Basic 37700 x 20% = 7540; higher 87440 x 40% = 34976; additional 24860 x 45% = 11187. Total 53703.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "ewni.giftAid.2025-26.60000.net1000",
    taxYear: "2025/26",
    region: "ENGLAND_NI_WALES",
    kind: "giftAid",
    input: {
      grossIncome: 60000,
      giftAidNet: 1000,
    },
    expected: 11182,
    source:
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    additionalSources: [
      "https://www.gov.uk/guidance/adjusted-net-income",
      "https://www.legislation.gov.uk/ukpga/2007/3/section/414",
    ],
    derivation:
      "Gross income 60000. Gift Aid gross-up 1000 x 1.25 = 1250; adjusted net income 60000 - 1250 = 58750; basic and higher limits both raised by 1250 (ITA 2007 s.414): 37700 + 1250 = 38950, 125140 + 1250 = 126390. PA 12570 (no taper at adjusted net income 58750). Taxable 60000 - 12570 = 47430. Basic 38950 x 20% = 7790; higher 8480 x 40% = 3392; additional 0 x 45% = 0. Total 11182.",
    confidence: "medium",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "ewni.giftAid.2025-26.110000.net1000",
    taxYear: "2025/26",
    region: "ENGLAND_NI_WALES",
    kind: "giftAid",
    input: {
      grossIncome: 110000,
      giftAidNet: 1000,
    },
    expected: 32932,
    source:
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    additionalSources: [
      "https://www.gov.uk/guidance/adjusted-net-income",
      "https://www.legislation.gov.uk/ukpga/2007/3/section/414",
    ],
    derivation:
      "Gross income 110000. Gift Aid gross-up 1000 x 1.25 = 1250; adjusted net income 110000 - 1250 = 108750; basic and higher limits both raised by 1250 (ITA 2007 s.414): 37700 + 1250 = 38950, 125140 + 1250 = 126390. Taper: (108750 - 100000) / 2 = 4375, PA 12570 - 4375 = 8195. Taxable 110000 - 8195 = 101805. Basic 38950 x 20% = 7790; higher 62855 x 40% = 25142; additional 0 x 45% = 0. Total 32932.",
    confidence: "medium",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "ewni.incomeTax.2026-27.30000",
    taxYear: "2026/27",
    region: "ENGLAND_NI_WALES",
    kind: "incomeTax",
    input: {
      grossIncome: 30000,
    },
    expected: 3486,
    source:
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    derivation:
      "Gross income 30000. PA 12570 (no taper at adjusted net income 30000). Taxable 30000 - 12570 = 17430. Basic 17430 x 20% = 3486; higher 0 x 40% = 0; additional 0 x 45% = 0. Total 3486.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "ewni.incomeTax.2026-27.60000",
    taxYear: "2026/27",
    region: "ENGLAND_NI_WALES",
    kind: "incomeTax",
    input: {
      grossIncome: 60000,
    },
    expected: 11432,
    source:
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    derivation:
      "Gross income 60000. PA 12570 (no taper at adjusted net income 60000). Taxable 60000 - 12570 = 47430. Basic 37700 x 20% = 7540; higher 9730 x 40% = 3892; additional 0 x 45% = 0. Total 11432.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "ewni.incomeTax.2026-27.100000",
    taxYear: "2026/27",
    region: "ENGLAND_NI_WALES",
    kind: "incomeTax",
    input: {
      grossIncome: 100000,
    },
    expected: 27432,
    source:
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    derivation:
      "Gross income 100000. PA 12570 (no taper at adjusted net income 100000). Taxable 100000 - 12570 = 87430. Basic 37700 x 20% = 7540; higher 49730 x 40% = 19892; additional 0 x 45% = 0. Total 27432.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "ewni.incomeTax.2026-27.110000",
    taxYear: "2026/27",
    region: "ENGLAND_NI_WALES",
    kind: "incomeTax",
    input: {
      grossIncome: 110000,
    },
    expected: 33432,
    source:
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    derivation:
      "Gross income 110000. Taper: (110000 - 100000) / 2 = 5000, PA 12570 - 5000 = 7570. Taxable 110000 - 7570 = 102430. Basic 37700 x 20% = 7540; higher 64730 x 40% = 25892; additional 0 x 45% = 0. Total 33432.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "ewni.incomeTax.2026-27.125140",
    taxYear: "2026/27",
    region: "ENGLAND_NI_WALES",
    kind: "incomeTax",
    input: {
      grossIncome: 125140,
    },
    expected: 42516,
    source:
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    derivation:
      "Gross income 125140. Taper: (125140 - 100000) / 2 = 12570, PA 12570 - 12570 = 0. Taxable 125140 - 0 = 125140. Basic 37700 x 20% = 7540; higher 87440 x 40% = 34976; additional 0 x 45% = 0. Total 42516.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "ewni.incomeTax.2026-27.150000",
    taxYear: "2026/27",
    region: "ENGLAND_NI_WALES",
    kind: "incomeTax",
    input: {
      grossIncome: 150000,
    },
    expected: 53703,
    source:
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    derivation:
      "Gross income 150000. Taper: (150000 - 100000) / 2 = 25000, PA 12570 - 25000 = 0. Taxable 150000 - 0 = 150000. Basic 37700 x 20% = 7540; higher 87440 x 40% = 34976; additional 24860 x 45% = 11187. Total 53703.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "ewni.giftAid.2026-27.60000.net1000",
    taxYear: "2026/27",
    region: "ENGLAND_NI_WALES",
    kind: "giftAid",
    input: {
      grossIncome: 60000,
      giftAidNet: 1000,
    },
    expected: 11182,
    source:
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    additionalSources: [
      "https://www.gov.uk/guidance/adjusted-net-income",
      "https://www.legislation.gov.uk/ukpga/2007/3/section/414",
    ],
    derivation:
      "Gross income 60000. Gift Aid gross-up 1000 x 1.25 = 1250; adjusted net income 60000 - 1250 = 58750; basic and higher limits both raised by 1250 (ITA 2007 s.414): 37700 + 1250 = 38950, 125140 + 1250 = 126390. PA 12570 (no taper at adjusted net income 58750). Taxable 60000 - 12570 = 47430. Basic 38950 x 20% = 7790; higher 8480 x 40% = 3392; additional 0 x 45% = 0. Total 11182.",
    confidence: "medium",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "ewni.giftAid.2026-27.110000.net1000",
    taxYear: "2026/27",
    region: "ENGLAND_NI_WALES",
    kind: "giftAid",
    input: {
      grossIncome: 110000,
      giftAidNet: 1000,
    },
    expected: 32932,
    source:
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    additionalSources: [
      "https://www.gov.uk/guidance/adjusted-net-income",
      "https://www.legislation.gov.uk/ukpga/2007/3/section/414",
    ],
    derivation:
      "Gross income 110000. Gift Aid gross-up 1000 x 1.25 = 1250; adjusted net income 110000 - 1250 = 108750; basic and higher limits both raised by 1250 (ITA 2007 s.414): 37700 + 1250 = 38950, 125140 + 1250 = 126390. Taper: (108750 - 100000) / 2 = 4375, PA 12570 - 4375 = 8195. Taxable 110000 - 8195 = 101805. Basic 38950 x 20% = 7790; higher 62855 x 40% = 25142; additional 0 x 45% = 0. Total 32932.",
    confidence: "medium",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "scotland.incomeTax.2020-21.30000",
    taxYear: "2020/21",
    region: "SCOTLAND",
    kind: "incomeTax",
    input: {
      grossIncome: 30000,
    },
    expected: 3527.57,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2020-to-2021",
    derivation:
      "Gross income 30000. PA 12500. Taxable 30000 - 12500 = 17500. Bands (taxable income above PA, upper bounds 2085/12658/30930/150000): 2085 x 19% = 396.15; 10573 x 20% = 2114.6; 4842 x 21% = 1016.82; 0 x 41% = 0; top 0 x 46% = 0. Total 3527.57.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "scotland.incomeTax.2020-21.50000",
    taxYear: "2020/21",
    region: "SCOTLAND",
    kind: "incomeTax",
    input: {
      grossIncome: 50000,
    },
    expected: 9041.57,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2020-to-2021",
    derivation:
      "Gross income 50000. PA 12500. Taxable 50000 - 12500 = 37500. Bands (taxable income above PA, upper bounds 2085/12658/30930/150000): 2085 x 19% = 396.15; 10573 x 20% = 2114.6; 18272 x 21% = 3837.12; 6570 x 41% = 2693.7; top 0 x 46% = 0. Total 9041.57.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "scotland.incomeTax.2020-21.100000",
    taxYear: "2020/21",
    region: "SCOTLAND",
    kind: "incomeTax",
    input: {
      grossIncome: 100000,
    },
    expected: 29541.57,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2020-to-2021",
    derivation:
      "Gross income 100000. PA 12500. Taxable 100000 - 12500 = 87500. Bands (taxable income above PA, upper bounds 2085/12658/30930/150000): 2085 x 19% = 396.15; 10573 x 20% = 2114.6; 18272 x 21% = 3837.12; 56570 x 41% = 23193.7; top 0 x 46% = 0. Total 29541.57.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "scotland.incomeTax.2020-21.110000",
    taxYear: "2020/21",
    region: "SCOTLAND",
    kind: "incomeTax",
    input: {
      grossIncome: 110000,
    },
    expected: 35691.57,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2020-to-2021",
    derivation:
      "Gross income 110000. Taper (110000 - 100000) / 2 = 5000, PA 12500 - 5000 = 7500. Taxable 110000 - 7500 = 102500. Bands (taxable income above PA, upper bounds 2085/12658/30930/150000): 2085 x 19% = 396.15; 10573 x 20% = 2114.6; 18272 x 21% = 3837.12; 71570 x 41% = 29343.7; top 0 x 46% = 0. Total 35691.57.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: effect of the tapered personal allowance on Scottish bands is not confirmed by any page read (bands assumed to apply to taxable income after the tapered PA; memory only).",
    signedOffBy: null,
  },
  {
    id: "scotland.incomeTax.2020-21.150000",
    taxYear: "2020/21",
    region: "SCOTLAND",
    kind: "incomeTax",
    input: {
      grossIncome: 150000,
    },
    expected: 55166.57,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2020-to-2021",
    derivation:
      "Gross income 150000. Taper (150000 - 100000) / 2 = 25000, PA 12500 - 25000 = 0. Taxable 150000 - 0 = 150000. Bands (taxable income above PA, upper bounds 2085/12658/30930/150000): 2085 x 19% = 396.15; 10573 x 20% = 2114.6; 18272 x 21% = 3837.12; 119070 x 41% = 48818.7; top 0 x 46% = 0. Total 55166.57.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: frame (taxable income vs gross income) of the 125,140 advanced/top boundary (and 150,000 higher/top boundary before 2023/24) is ambiguous between the two GOV.UK pages read.",
    signedOffBy: null,
  },
  {
    id: "scotland.incomeTax.2021-22.30000",
    taxYear: "2021/22",
    region: "SCOTLAND",
    kind: "incomeTax",
    input: {
      grossIncome: 30000,
    },
    expected: 3512.07,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2021-to-2022",
    derivation:
      "Gross income 30000. PA 12570. Taxable 30000 - 12570 = 17430. Bands (taxable income above PA, upper bounds 2097/12726/31092/150000): 2097 x 19% = 398.43; 10629 x 20% = 2125.8; 4704 x 21% = 987.84; 0 x 41% = 0; top 0 x 46% = 0. Total 3512.07.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "scotland.incomeTax.2021-22.50000",
    taxYear: "2021/22",
    region: "SCOTLAND",
    kind: "incomeTax",
    input: {
      grossIncome: 50000,
    },
    expected: 8979.67,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2021-to-2022",
    derivation:
      "Gross income 50000. PA 12570. Taxable 50000 - 12570 = 37430. Bands (taxable income above PA, upper bounds 2097/12726/31092/150000): 2097 x 19% = 398.43; 10629 x 20% = 2125.8; 18366 x 21% = 3856.86; 6338 x 41% = 2598.58; top 0 x 46% = 0. Total 8979.67.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "scotland.incomeTax.2021-22.100000",
    taxYear: "2021/22",
    region: "SCOTLAND",
    kind: "incomeTax",
    input: {
      grossIncome: 100000,
    },
    expected: 29479.67,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2021-to-2022",
    derivation:
      "Gross income 100000. PA 12570. Taxable 100000 - 12570 = 87430. Bands (taxable income above PA, upper bounds 2097/12726/31092/150000): 2097 x 19% = 398.43; 10629 x 20% = 2125.8; 18366 x 21% = 3856.86; 56338 x 41% = 23098.58; top 0 x 46% = 0. Total 29479.67.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "scotland.incomeTax.2021-22.110000",
    taxYear: "2021/22",
    region: "SCOTLAND",
    kind: "incomeTax",
    input: {
      grossIncome: 110000,
    },
    expected: 35629.67,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2021-to-2022",
    derivation:
      "Gross income 110000. Taper (110000 - 100000) / 2 = 5000, PA 12570 - 5000 = 7570. Taxable 110000 - 7570 = 102430. Bands (taxable income above PA, upper bounds 2097/12726/31092/150000): 2097 x 19% = 398.43; 10629 x 20% = 2125.8; 18366 x 21% = 3856.86; 71338 x 41% = 29248.58; top 0 x 46% = 0. Total 35629.67.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: effect of the tapered personal allowance on Scottish bands is not confirmed by any page read (bands assumed to apply to taxable income after the tapered PA; memory only).",
    signedOffBy: null,
  },
  {
    id: "scotland.incomeTax.2021-22.150000",
    taxYear: "2021/22",
    region: "SCOTLAND",
    kind: "incomeTax",
    input: {
      grossIncome: 150000,
    },
    expected: 55133.37,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2021-to-2022",
    derivation:
      "Gross income 150000. Taper (150000 - 100000) / 2 = 25000, PA 12570 - 25000 = 0. Taxable 150000 - 0 = 150000. Bands (taxable income above PA, upper bounds 2097/12726/31092/150000): 2097 x 19% = 398.43; 10629 x 20% = 2125.8; 18366 x 21% = 3856.86; 118908 x 41% = 48752.28; top 0 x 46% = 0. Total 55133.37.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: frame (taxable income vs gross income) of the 125,140 advanced/top boundary (and 150,000 higher/top boundary before 2023/24) is ambiguous between the two GOV.UK pages read.",
    signedOffBy: null,
  },
  {
    id: "scotland.incomeTax.2022-23.30000",
    taxYear: "2022/23",
    region: "SCOTLAND",
    kind: "incomeTax",
    input: {
      grossIncome: 30000,
    },
    expected: 3507.5,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2022-to-2023",
    derivation:
      "Gross income 30000. PA 12570. Taxable 30000 - 12570 = 17430. Bands (taxable income above PA, upper bounds 2162/13118/31092/150000): 2162 x 19% = 410.78; 10956 x 20% = 2191.2; 4312 x 21% = 905.52; 0 x 41% = 0; top 0 x 46% = 0. Total 3507.5.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "scotland.incomeTax.2022-23.50000",
    taxYear: "2022/23",
    region: "SCOTLAND",
    kind: "incomeTax",
    input: {
      grossIncome: 50000,
    },
    expected: 8975.1,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2022-to-2023",
    derivation:
      "Gross income 50000. PA 12570. Taxable 50000 - 12570 = 37430. Bands (taxable income above PA, upper bounds 2162/13118/31092/150000): 2162 x 19% = 410.78; 10956 x 20% = 2191.2; 17974 x 21% = 3774.54; 6338 x 41% = 2598.58; top 0 x 46% = 0. Total 8975.1.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "scotland.incomeTax.2022-23.100000",
    taxYear: "2022/23",
    region: "SCOTLAND",
    kind: "incomeTax",
    input: {
      grossIncome: 100000,
    },
    expected: 29475.1,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2022-to-2023",
    derivation:
      "Gross income 100000. PA 12570. Taxable 100000 - 12570 = 87430. Bands (taxable income above PA, upper bounds 2162/13118/31092/150000): 2162 x 19% = 410.78; 10956 x 20% = 2191.2; 17974 x 21% = 3774.54; 56338 x 41% = 23098.58; top 0 x 46% = 0. Total 29475.1.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "scotland.incomeTax.2022-23.110000",
    taxYear: "2022/23",
    region: "SCOTLAND",
    kind: "incomeTax",
    input: {
      grossIncome: 110000,
    },
    expected: 35625.1,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2022-to-2023",
    derivation:
      "Gross income 110000. Taper (110000 - 100000) / 2 = 5000, PA 12570 - 5000 = 7570. Taxable 110000 - 7570 = 102430. Bands (taxable income above PA, upper bounds 2162/13118/31092/150000): 2162 x 19% = 410.78; 10956 x 20% = 2191.2; 17974 x 21% = 3774.54; 71338 x 41% = 29248.58; top 0 x 46% = 0. Total 35625.1.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: effect of the tapered personal allowance on Scottish bands is not confirmed by any page read (bands assumed to apply to taxable income after the tapered PA; memory only).",
    signedOffBy: null,
  },
  {
    id: "scotland.incomeTax.2022-23.150000",
    taxYear: "2022/23",
    region: "SCOTLAND",
    kind: "incomeTax",
    input: {
      grossIncome: 150000,
    },
    expected: 55128.8,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2022-to-2023",
    derivation:
      "Gross income 150000. Taper (150000 - 100000) / 2 = 25000, PA 12570 - 25000 = 0. Taxable 150000 - 0 = 150000. Bands (taxable income above PA, upper bounds 2162/13118/31092/150000): 2162 x 19% = 410.78; 10956 x 20% = 2191.2; 17974 x 21% = 3774.54; 118908 x 41% = 48752.28; top 0 x 46% = 0. Total 55128.8.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: frame (taxable income vs gross income) of the 125,140 advanced/top boundary (and 150,000 higher/top boundary before 2023/24) is ambiguous between the two GOV.UK pages read.",
    signedOffBy: null,
  },
  {
    id: "scotland.incomeTax.2023-24.30000",
    taxYear: "2023/24",
    region: "SCOTLAND",
    kind: "incomeTax",
    input: {
      grossIncome: 30000,
    },
    expected: 3507.5,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2023-to-2024",
    derivation:
      "Gross income 30000. PA 12570. Taxable 30000 - 12570 = 17430. Bands (taxable income above PA, upper bounds 2162/13118/31092/125140): 2162 x 19% = 410.78; 10956 x 20% = 2191.2; 4312 x 21% = 905.52; 0 x 42% = 0; top 0 x 47% = 0. Total 3507.5.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "scotland.incomeTax.2023-24.50000",
    taxYear: "2023/24",
    region: "SCOTLAND",
    kind: "incomeTax",
    input: {
      grossIncome: 50000,
    },
    expected: 9038.48,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2023-to-2024",
    derivation:
      "Gross income 50000. PA 12570. Taxable 50000 - 12570 = 37430. Bands (taxable income above PA, upper bounds 2162/13118/31092/125140): 2162 x 19% = 410.78; 10956 x 20% = 2191.2; 17974 x 21% = 3774.54; 6338 x 42% = 2661.96; top 0 x 47% = 0. Total 9038.48.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "scotland.incomeTax.2023-24.100000",
    taxYear: "2023/24",
    region: "SCOTLAND",
    kind: "incomeTax",
    input: {
      grossIncome: 100000,
    },
    expected: 30038.48,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2023-to-2024",
    derivation:
      "Gross income 100000. PA 12570. Taxable 100000 - 12570 = 87430. Bands (taxable income above PA, upper bounds 2162/13118/31092/125140): 2162 x 19% = 410.78; 10956 x 20% = 2191.2; 17974 x 21% = 3774.54; 56338 x 42% = 23661.96; top 0 x 47% = 0. Total 30038.48.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "scotland.incomeTax.2023-24.110000",
    taxYear: "2023/24",
    region: "SCOTLAND",
    kind: "incomeTax",
    input: {
      grossIncome: 110000,
    },
    expected: 36338.48,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2023-to-2024",
    derivation:
      "Gross income 110000. Taper (110000 - 100000) / 2 = 5000, PA 12570 - 5000 = 7570. Taxable 110000 - 7570 = 102430. Bands (taxable income above PA, upper bounds 2162/13118/31092/125140): 2162 x 19% = 410.78; 10956 x 20% = 2191.2; 17974 x 21% = 3774.54; 71338 x 42% = 29961.96; top 0 x 47% = 0. Total 36338.48.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: effect of the tapered personal allowance on Scottish bands is not confirmed by any page read (bands assumed to apply to taxable income after the tapered PA; memory only).",
    signedOffBy: null,
  },
  {
    id: "scotland.incomeTax.2023-24.150000",
    taxYear: "2023/24",
    region: "SCOTLAND",
    kind: "incomeTax",
    input: {
      grossIncome: 150000,
    },
    expected: 57560.88,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2023-to-2024",
    derivation:
      "Gross income 150000. Taper (150000 - 100000) / 2 = 25000, PA 12570 - 25000 = 0. Taxable 150000 - 0 = 150000. Bands (taxable income above PA, upper bounds 2162/13118/31092/125140): 2162 x 19% = 410.78; 10956 x 20% = 2191.2; 17974 x 21% = 3774.54; 94048 x 42% = 39500.16; top 24860 x 47% = 11684.2. Total 57560.88.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: frame (taxable income vs gross income) of the 125,140 advanced/top boundary (and 150,000 higher/top boundary before 2023/24) is ambiguous between the two GOV.UK pages read.",
    signedOffBy: null,
  },
  {
    id: "scotland.incomeTax.2024-25.30000",
    taxYear: "2024/25",
    region: "SCOTLAND",
    kind: "incomeTax",
    input: {
      grossIncome: 30000,
    },
    expected: 3497.33,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2024-to-2025",
    derivation:
      "Gross income 30000. PA 12570. Taxable 30000 - 12570 = 17430. Bands (taxable income above PA, upper bounds 2306/13991/31092/62430/125140): 2306 x 19% = 438.14; 11685 x 20% = 2337; 3439 x 21% = 722.19; 0 x 42% = 0; 0 x 45% = 0; top 0 x 48% = 0. Total 3497.33.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "scotland.incomeTax.2024-25.50000",
    taxYear: "2024/25",
    region: "SCOTLAND",
    kind: "incomeTax",
    input: {
      grossIncome: 50000,
    },
    expected: 9028.31,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2024-to-2025",
    derivation:
      "Gross income 50000. PA 12570. Taxable 50000 - 12570 = 37430. Bands (taxable income above PA, upper bounds 2306/13991/31092/62430/125140): 2306 x 19% = 438.14; 11685 x 20% = 2337; 17101 x 21% = 3591.21; 6338 x 42% = 2661.96; 0 x 45% = 0; top 0 x 48% = 0. Total 9028.31.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "scotland.incomeTax.2024-25.100000",
    taxYear: "2024/25",
    region: "SCOTLAND",
    kind: "incomeTax",
    input: {
      grossIncome: 100000,
    },
    expected: 30778.31,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2024-to-2025",
    derivation:
      "Gross income 100000. PA 12570. Taxable 100000 - 12570 = 87430. Bands (taxable income above PA, upper bounds 2306/13991/31092/62430/125140): 2306 x 19% = 438.14; 11685 x 20% = 2337; 17101 x 21% = 3591.21; 31338 x 42% = 13161.96; 25000 x 45% = 11250; top 0 x 48% = 0. Total 30778.31.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "scotland.incomeTax.2024-25.110000",
    taxYear: "2024/25",
    region: "SCOTLAND",
    kind: "incomeTax",
    input: {
      grossIncome: 110000,
    },
    expected: 37528.31,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2024-to-2025",
    derivation:
      "Gross income 110000. Taper (110000 - 100000) / 2 = 5000, PA 12570 - 5000 = 7570. Taxable 110000 - 7570 = 102430. Bands (taxable income above PA, upper bounds 2306/13991/31092/62430/125140): 2306 x 19% = 438.14; 11685 x 20% = 2337; 17101 x 21% = 3591.21; 31338 x 42% = 13161.96; 40000 x 45% = 18000; top 0 x 48% = 0. Total 37528.31.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: effect of the tapered personal allowance on Scottish bands is not confirmed by any page read (bands assumed to apply to taxable income after the tapered PA; memory only).",
    signedOffBy: null,
  },
  {
    id: "scotland.incomeTax.2024-25.150000",
    taxYear: "2024/25",
    region: "SCOTLAND",
    kind: "incomeTax",
    input: {
      grossIncome: 150000,
    },
    expected: 59680.61,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2024-to-2025",
    derivation:
      "Gross income 150000. Taper (150000 - 100000) / 2 = 25000, PA 12570 - 25000 = 0. Taxable 150000 - 0 = 150000. Bands (taxable income above PA, upper bounds 2306/13991/31092/62430/125140): 2306 x 19% = 438.14; 11685 x 20% = 2337; 17101 x 21% = 3591.21; 31338 x 42% = 13161.96; 62710 x 45% = 28219.5; top 24860 x 48% = 11932.8. Total 59680.61.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: frame (taxable income vs gross income) of the 125,140 advanced/top boundary (and 150,000 higher/top boundary before 2023/24) is ambiguous between the two GOV.UK pages read.",
    signedOffBy: null,
  },
  {
    id: "scotland.incomeTax.2025-26.30000",
    taxYear: "2025/26",
    region: "SCOTLAND",
    kind: "incomeTax",
    input: {
      grossIncome: 30000,
    },
    expected: 3482.82,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2025-to-2026",
    derivation:
      "Gross income 30000. PA 12570. Taxable 30000 - 12570 = 17430. Bands (taxable income above PA, upper bounds 2827/14921/31092/62430/125140): 2827 x 19% = 537.13; 12094 x 20% = 2418.8; 2509 x 21% = 526.89; 0 x 42% = 0; 0 x 45% = 0; top 0 x 48% = 0. Total 3482.82.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "scotland.incomeTax.2025-26.50000",
    taxYear: "2025/26",
    region: "SCOTLAND",
    kind: "incomeTax",
    input: {
      grossIncome: 50000,
    },
    expected: 9013.8,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2025-to-2026",
    derivation:
      "Gross income 50000. PA 12570. Taxable 50000 - 12570 = 37430. Bands (taxable income above PA, upper bounds 2827/14921/31092/62430/125140): 2827 x 19% = 537.13; 12094 x 20% = 2418.8; 16171 x 21% = 3395.91; 6338 x 42% = 2661.96; 0 x 45% = 0; top 0 x 48% = 0. Total 9013.8.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "scotland.incomeTax.2025-26.100000",
    taxYear: "2025/26",
    region: "SCOTLAND",
    kind: "incomeTax",
    input: {
      grossIncome: 100000,
    },
    expected: 30763.8,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2025-to-2026",
    derivation:
      "Gross income 100000. PA 12570. Taxable 100000 - 12570 = 87430. Bands (taxable income above PA, upper bounds 2827/14921/31092/62430/125140): 2827 x 19% = 537.13; 12094 x 20% = 2418.8; 16171 x 21% = 3395.91; 31338 x 42% = 13161.96; 25000 x 45% = 11250; top 0 x 48% = 0. Total 30763.8.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "scotland.incomeTax.2025-26.110000",
    taxYear: "2025/26",
    region: "SCOTLAND",
    kind: "incomeTax",
    input: {
      grossIncome: 110000,
    },
    expected: 37513.8,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2025-to-2026",
    derivation:
      "Gross income 110000. Taper (110000 - 100000) / 2 = 5000, PA 12570 - 5000 = 7570. Taxable 110000 - 7570 = 102430. Bands (taxable income above PA, upper bounds 2827/14921/31092/62430/125140): 2827 x 19% = 537.13; 12094 x 20% = 2418.8; 16171 x 21% = 3395.91; 31338 x 42% = 13161.96; 40000 x 45% = 18000; top 0 x 48% = 0. Total 37513.8.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: effect of the tapered personal allowance on Scottish bands is not confirmed by any page read (bands assumed to apply to taxable income after the tapered PA; memory only).",
    signedOffBy: null,
  },
  {
    id: "scotland.incomeTax.2025-26.125140",
    taxYear: "2025/26",
    region: "SCOTLAND",
    kind: "incomeTax",
    input: {
      grossIncome: 125140,
    },
    expected: 47733.3,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2025-to-2026",
    derivation:
      "Gross income 125140. Taper (125140 - 100000) / 2 = 12570, PA 12570 - 12570 = 0. Taxable 125140. Bands (taxable income above PA, upper bounds 2827/14921/31092/62430/125140): 2827 x 19% = 537.13; 12094 x 20% = 2418.8; 16171 x 21% = 3395.91; 31338 x 42% = 13161.96; 62710 x 45% = 28219.5; top 0 x 48% = 0. Total 47733.3.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: frame (taxable income vs gross income) of the 125,140 advanced/top boundary is ambiguous between the two GOV.UK pages read; the allowance is fully tapered here so taxable income equals gross income.",
    signedOffBy: null,
  },
  {
    id: "scotland.incomeTax.2025-26.150000",
    taxYear: "2025/26",
    region: "SCOTLAND",
    kind: "incomeTax",
    input: {
      grossIncome: 150000,
    },
    expected: 59666.1,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2025-to-2026",
    derivation:
      "Gross income 150000. Taper (150000 - 100000) / 2 = 25000, PA 12570 - 25000 = 0. Taxable 150000 - 0 = 150000. Bands (taxable income above PA, upper bounds 2827/14921/31092/62430/125140): 2827 x 19% = 537.13; 12094 x 20% = 2418.8; 16171 x 21% = 3395.91; 31338 x 42% = 13161.96; 62710 x 45% = 28219.5; top 24860 x 48% = 11932.8. Total 59666.1.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: frame (taxable income vs gross income) of the 125,140 advanced/top boundary (and 150,000 higher/top boundary before 2023/24) is ambiguous between the two GOV.UK pages read.",
    signedOffBy: null,
  },
  {
    id: "scotland.incomeTax.2026-27.30000",
    taxYear: "2026/27",
    region: "SCOTLAND",
    kind: "incomeTax",
    input: {
      grossIncome: 30000,
    },
    expected: 3451.07,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027",
    derivation:
      "Gross income 30000. PA 12570. Taxable 30000 - 12570 = 17430. Bands (taxable income above PA, upper bounds 3967/16956/31092/62430/125140): 3967 x 19% = 753.73; 12989 x 20% = 2597.8; 474 x 21% = 99.54; 0 x 42% = 0; 0 x 45% = 0; top 0 x 48% = 0. Total 3451.07.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "scotland.incomeTax.2026-27.50000",
    taxYear: "2026/27",
    region: "SCOTLAND",
    kind: "incomeTax",
    input: {
      grossIncome: 50000,
    },
    expected: 8982.05,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027",
    derivation:
      "Gross income 50000. PA 12570. Taxable 50000 - 12570 = 37430. Bands (taxable income above PA, upper bounds 3967/16956/31092/62430/125140): 3967 x 19% = 753.73; 12989 x 20% = 2597.8; 14136 x 21% = 2968.56; 6338 x 42% = 2661.96; 0 x 45% = 0; top 0 x 48% = 0. Total 8982.05.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "scotland.incomeTax.2026-27.100000",
    taxYear: "2026/27",
    region: "SCOTLAND",
    kind: "incomeTax",
    input: {
      grossIncome: 100000,
    },
    expected: 30732.05,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027",
    derivation:
      "Gross income 100000. PA 12570. Taxable 100000 - 12570 = 87430. Bands (taxable income above PA, upper bounds 3967/16956/31092/62430/125140): 3967 x 19% = 753.73; 12989 x 20% = 2597.8; 14136 x 21% = 2968.56; 31338 x 42% = 13161.96; 25000 x 45% = 11250; top 0 x 48% = 0. Total 30732.05.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "scotland.incomeTax.2026-27.110000",
    taxYear: "2026/27",
    region: "SCOTLAND",
    kind: "incomeTax",
    input: {
      grossIncome: 110000,
    },
    expected: 37482.05,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027",
    derivation:
      "Gross income 110000. Taper (110000 - 100000) / 2 = 5000, PA 12570 - 5000 = 7570. Taxable 110000 - 7570 = 102430. Bands (taxable income above PA, upper bounds 3967/16956/31092/62430/125140): 3967 x 19% = 753.73; 12989 x 20% = 2597.8; 14136 x 21% = 2968.56; 31338 x 42% = 13161.96; 40000 x 45% = 18000; top 0 x 48% = 0. Total 37482.05.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: effect of the tapered personal allowance on Scottish bands is not confirmed by any page read (bands assumed to apply to taxable income after the tapered PA; memory only).",
    signedOffBy: null,
  },
  {
    id: "scotland.incomeTax.2026-27.125140",
    taxYear: "2026/27",
    region: "SCOTLAND",
    kind: "incomeTax",
    input: {
      grossIncome: 125140,
    },
    expected: 47701.55,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027",
    derivation:
      "Gross income 125140. Taper (125140 - 100000) / 2 = 12570, PA 12570 - 12570 = 0. Taxable 125140. Bands (taxable income above PA, upper bounds 3967/16956/31092/62430/125140): 3967 x 19% = 753.73; 12989 x 20% = 2597.8; 14136 x 21% = 2968.56; 31338 x 42% = 13161.96; 62710 x 45% = 28219.5; top 0 x 48% = 0. Total 47701.55.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: frame (taxable income vs gross income) of the 125,140 advanced/top boundary is ambiguous between the two GOV.UK pages read; the allowance is fully tapered here so taxable income equals gross income.",
    signedOffBy: null,
  },
  {
    id: "scotland.incomeTax.2026-27.150000",
    taxYear: "2026/27",
    region: "SCOTLAND",
    kind: "incomeTax",
    input: {
      grossIncome: 150000,
    },
    expected: 59634.35,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027",
    derivation:
      "Gross income 150000. Taper (150000 - 100000) / 2 = 25000, PA 12570 - 25000 = 0. Taxable 150000 - 0 = 150000. Bands (taxable income above PA, upper bounds 3967/16956/31092/62430/125140): 3967 x 19% = 753.73; 12989 x 20% = 2597.8; 14136 x 21% = 2968.56; 31338 x 42% = 13161.96; 62710 x 45% = 28219.5; top 24860 x 48% = 11932.8. Total 59634.35.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: frame (taxable income vs gross income) of the 125,140 advanced/top boundary (and 150,000 higher/top boundary before 2023/24) is ambiguous between the two GOV.UK pages read.",
    signedOffBy: null,
  },
  {
    id: "employeeNi.2020-21.30000",
    taxYear: "2020/21",
    region: "ENGLAND_NI_WALES",
    kind: "employeeNi",
    input: {
      grossEarnings: 30000,
    },
    expected: 2460,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2020-to-2021",
    derivation:
      "Annual earnings 30000. Main band 30000 - PT 9500 = 20500 x 12% = 2460; above UEL 50000: 0 x 2% = 0. Total 2460.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "employeeNi.2020-21.60000",
    taxYear: "2020/21",
    region: "ENGLAND_NI_WALES",
    kind: "employeeNi",
    input: {
      grossEarnings: 60000,
    },
    expected: 5060,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2020-to-2021",
    derivation:
      "Annual earnings 60000. Main band 50000 - PT 9500 = 40500 x 12% = 4860; above UEL 50000: 10000 x 2% = 200. Total 5060.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "class4.2020-21.60000",
    taxYear: "2020/21",
    region: "ENGLAND_NI_WALES",
    kind: "class4",
    input: {
      profits: 60000,
    },
    expected: 3845,
    source:
      "https://www.gov.uk/government/publications/rates-and-allowances-national-insurance-contributions/rates-and-allowances-national-insurance-contributions",
    derivation:
      "Profits 60000. (50000 - LPL 9500) = 40500 x 9% = 3645; above UPL 50000: 10000 x 2% = 200. Total 3845.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Class 4 limits and rates for 2020/21-2022/23 are memory only; no GOV.UK page reachable (RA covers 2022/23 onward without Class 4 figures for that year). 2022/23 also needs a blended rate for the mid-year change.",
    signedOffBy: null,
  },
  {
    id: "employerNiSaving.2020-21.60000.3000",
    taxYear: "2020/21",
    region: "ENGLAND_NI_WALES",
    kind: "employerNiSaving",
    input: {
      grossSalary: 60000,
      salarySacrifice: 3000,
    },
    expected: 414,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2020-to-2021",
    derivation:
      "Employer NI before = (60000 - ST 8788, floored at 0) = 51212; after sacrifice = (57000 - 8788, floored at 0) = 48212; reduction 3000 x 13.8% = 414.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "employeeNi.2021-22.30000",
    taxYear: "2021/22",
    region: "ENGLAND_NI_WALES",
    kind: "employeeNi",
    input: {
      grossEarnings: 30000,
    },
    expected: 2451.84,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2021-to-2022",
    derivation:
      "Annual earnings 30000. Main band 30000 - PT 9568 = 20432 x 12% = 2451.84; above UEL 50270: 0 x 2% = 0. Total 2451.84.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "employeeNi.2021-22.60000",
    taxYear: "2021/22",
    region: "ENGLAND_NI_WALES",
    kind: "employeeNi",
    input: {
      grossEarnings: 60000,
    },
    expected: 5078.84,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2021-to-2022",
    derivation:
      "Annual earnings 60000. Main band 50270 - PT 9568 = 40702 x 12% = 4884.24; above UEL 50270: 9730 x 2% = 194.6. Total 5078.84.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "class4.2021-22.60000",
    taxYear: "2021/22",
    region: "ENGLAND_NI_WALES",
    kind: "class4",
    input: {
      profits: 60000,
    },
    expected: 3857.78,
    source:
      "https://www.gov.uk/government/publications/rates-and-allowances-national-insurance-contributions/rates-and-allowances-national-insurance-contributions",
    derivation:
      "Profits 60000. (50270 - LPL 9568) = 40702 x 9% = 3663.18; above UPL 50270: 9730 x 2% = 194.6. Total 3857.78.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Class 4 limits and rates for 2020/21-2022/23 are memory only; no GOV.UK page reachable (RA covers 2022/23 onward without Class 4 figures for that year). 2022/23 also needs a blended rate for the mid-year change.",
    signedOffBy: null,
  },
  {
    id: "employerNiSaving.2021-22.60000.3000",
    taxYear: "2021/22",
    region: "ENGLAND_NI_WALES",
    kind: "employerNiSaving",
    input: {
      grossSalary: 60000,
      salarySacrifice: 3000,
    },
    expected: 414,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2021-to-2022",
    derivation:
      "Employer NI before = (60000 - ST 8840, floored at 0) = 51160; after sacrifice = (57000 - 8840, floored at 0) = 48160; reduction 3000 x 13.8% = 414.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "employeeNi.2022-23.30000",
    taxYear: "2022/23",
    region: "ENGLAND_NI_WALES",
    kind: "employeeNi",
    input: {
      grossEarnings: 30000,
    },
    expected: 2303.11,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2022-to-2023",
    derivation:
      "Annual earnings 30000. Main band 30000 - PT 11908 = 18092 x 12.73% = 2303.11; above UEL 50270: 0 x 2.73% = 0. Total 2303.11.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: 2022/23 had mid-year changes (PT 9,880 then 12,570 from 6 Jul 2022; rate 13.25% then 12% from 6 Nov 2022). Only the directors' annual-method figures (PT 11,908, 12.73%/2.73%) are printed on GOV.UK; applying them to ordinary employees is a modelling choice for the reviewer.",
    signedOffBy: null,
  },
  {
    id: "employeeNi.2022-23.60000",
    taxYear: "2022/23",
    region: "ENGLAND_NI_WALES",
    kind: "employeeNi",
    input: {
      grossEarnings: 60000,
    },
    expected: 5149.11,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2022-to-2023",
    derivation:
      "Annual earnings 60000. Main band 50270 - PT 11908 = 38362 x 12.73% = 4883.48; above UEL 50270: 9730 x 2.73% = 265.63. Total 5149.11.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: 2022/23 had mid-year changes (PT 9,880 then 12,570 from 6 Jul 2022; rate 13.25% then 12% from 6 Nov 2022). Only the directors' annual-method figures (PT 11,908, 12.73%/2.73%) are printed on GOV.UK; applying them to ordinary employees is a modelling choice for the reviewer.",
    signedOffBy: null,
  },
  {
    id: "class4.2022-23.60000",
    taxYear: "2022/23",
    region: "ENGLAND_NI_WALES",
    kind: "class4",
    input: {
      profits: 60000,
    },
    expected: 3998.25,
    source:
      "https://www.gov.uk/government/publications/rates-and-allowances-national-insurance-contributions/rates-and-allowances-national-insurance-contributions",
    derivation:
      "Profits 60000. (50270 - LPL 11908) = 38362 x 9.73% = 3732.62; above UPL 50270: 9730 x 2.73% = 265.63. Total 3998.25.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: Class 4 limits and rates for 2020/21-2022/23 are memory only; no GOV.UK page reachable (RA covers 2022/23 onward without Class 4 figures for that year). 2022/23 also needs a blended rate for the mid-year change.",
    signedOffBy: null,
  },
  {
    id: "employerNiSaving.2022-23.60000.3000",
    taxYear: "2022/23",
    region: "ENGLAND_NI_WALES",
    kind: "employerNiSaving",
    input: {
      grossSalary: 60000,
      salarySacrifice: 3000,
    },
    expected: 435.9,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2022-to-2023",
    derivation:
      "Employer NI before = (60000 - ST 9100, floored at 0) = 50900; after sacrifice = (57000 - 9100, floored at 0) = 47900; reduction 3000 x 14.53% = 435.9.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: 2022/23 employer rate was 15.05% to 5 Nov 2022 then 13.8%; 14.53% is the annual blend printed for directors only; ST 9,100 applied from 6 Jul 2022.",
    signedOffBy: null,
  },
  {
    id: "employeeNi.2023-24.30000",
    taxYear: "2023/24",
    region: "ENGLAND_NI_WALES",
    kind: "employeeNi",
    input: {
      grossEarnings: 30000,
    },
    expected: 2004.45,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2023-to-2024",
    derivation:
      "Annual earnings 30000. Main band 30000 - PT 12570 = 17430 x 11.5% = 2004.45; above UEL 50270: 0 x 2% = 0. Total 2004.45.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: 2023/24 main rate was 12% to 5 Jan 2024 then 10% for employees. 11.5% is printed on the GOV.UK 2023 to 2024 employer page as the directors' whole-year rate; applying it to ordinary employees is an approximation (equals the evenly paid blend (9*12 + 3*10)/12). The reviewer must choose blend vs period method.",
    signedOffBy: null,
  },
  {
    id: "employeeNi.2023-24.60000",
    taxYear: "2023/24",
    region: "ENGLAND_NI_WALES",
    kind: "employeeNi",
    input: {
      grossEarnings: 60000,
    },
    expected: 4530.1,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2023-to-2024",
    derivation:
      "Annual earnings 60000. Main band 50270 - PT 12570 = 37700 x 11.5% = 4335.5; above UEL 50270: 9730 x 2% = 194.6. Total 4530.1.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: 2023/24 main rate was 12% to 5 Jan 2024 then 10% for employees. 11.5% is printed on the GOV.UK 2023 to 2024 employer page as the directors' whole-year rate; applying it to ordinary employees is an approximation (equals the evenly paid blend (9*12 + 3*10)/12). The reviewer must choose blend vs period method.",
    signedOffBy: null,
  },
  {
    id: "class4.2023-24.60000",
    taxYear: "2023/24",
    region: "ENGLAND_NI_WALES",
    kind: "class4",
    input: {
      profits: 60000,
    },
    expected: 3587.6,
    source:
      "https://www.gov.uk/government/publications/rates-and-allowances-national-insurance-contributions/rates-and-allowances-national-insurance-contributions",
    derivation:
      "Profits 60000. (50270 - LPL 12570) = 37700 x 9% = 3393; above UPL 50270: 9730 x 2% = 194.6. Total 3587.6.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "employerNiSaving.2023-24.60000.3000",
    taxYear: "2023/24",
    region: "ENGLAND_NI_WALES",
    kind: "employerNiSaving",
    input: {
      grossSalary: 60000,
      salarySacrifice: 3000,
    },
    expected: 414,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2023-to-2024",
    derivation:
      "Employer NI before = (60000 - ST 9100, floored at 0) = 50900; after sacrifice = (57000 - 9100, floored at 0) = 47900; reduction 3000 x 13.8% = 414.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "employeeNi.2024-25.30000",
    taxYear: "2024/25",
    region: "ENGLAND_NI_WALES",
    kind: "employeeNi",
    input: {
      grossEarnings: 30000,
    },
    expected: 1394.4,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2024-to-2025",
    derivation:
      "Annual earnings 30000. Main band 30000 - PT 12570 = 17430 x 8% = 1394.4; above UEL 50270: 0 x 2% = 0. Total 1394.4.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "employeeNi.2024-25.60000",
    taxYear: "2024/25",
    region: "ENGLAND_NI_WALES",
    kind: "employeeNi",
    input: {
      grossEarnings: 60000,
    },
    expected: 3210.6,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2024-to-2025",
    derivation:
      "Annual earnings 60000. Main band 50270 - PT 12570 = 37700 x 8% = 3016; above UEL 50270: 9730 x 2% = 194.6. Total 3210.6.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "class4.2024-25.60000",
    taxYear: "2024/25",
    region: "ENGLAND_NI_WALES",
    kind: "class4",
    input: {
      profits: 60000,
    },
    expected: 2456.6,
    source:
      "https://www.gov.uk/government/publications/rates-and-allowances-national-insurance-contributions/rates-and-allowances-national-insurance-contributions",
    derivation:
      "Profits 60000. (50270 - LPL 12570) = 37700 x 6% = 2262; above UPL 50270: 9730 x 2% = 194.6. Total 2456.6.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "employerNiSaving.2024-25.60000.3000",
    taxYear: "2024/25",
    region: "ENGLAND_NI_WALES",
    kind: "employerNiSaving",
    input: {
      grossSalary: 60000,
      salarySacrifice: 3000,
    },
    expected: 414,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2024-to-2025",
    derivation:
      "Employer NI before = (60000 - ST 9100, floored at 0) = 50900; after sacrifice = (57000 - 9100, floored at 0) = 47900; reduction 3000 x 13.8% = 414.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "employeeNi.2025-26.30000",
    taxYear: "2025/26",
    region: "ENGLAND_NI_WALES",
    kind: "employeeNi",
    input: {
      grossEarnings: 30000,
    },
    expected: 1394.4,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2025-to-2026",
    derivation:
      "Annual earnings 30000. Main band 30000 - PT 12570 = 17430 x 8% = 1394.4; above UEL 50270: 0 x 2% = 0. Total 1394.4.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "employeeNi.2025-26.60000",
    taxYear: "2025/26",
    region: "ENGLAND_NI_WALES",
    kind: "employeeNi",
    input: {
      grossEarnings: 60000,
    },
    expected: 3210.6,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2025-to-2026",
    derivation:
      "Annual earnings 60000. Main band 50270 - PT 12570 = 37700 x 8% = 3016; above UEL 50270: 9730 x 2% = 194.6. Total 3210.6.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "class4.2025-26.60000",
    taxYear: "2025/26",
    region: "ENGLAND_NI_WALES",
    kind: "class4",
    input: {
      profits: 60000,
    },
    expected: 2456.6,
    source:
      "https://www.gov.uk/government/publications/rates-and-allowances-national-insurance-contributions/rates-and-allowances-national-insurance-contributions",
    derivation:
      "Profits 60000. (50270 - LPL 12570) = 37700 x 6% = 2262; above UPL 50270: 9730 x 2% = 194.6. Total 2456.6.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "employerNiSaving.2025-26.60000.3000",
    taxYear: "2025/26",
    region: "ENGLAND_NI_WALES",
    kind: "employerNiSaving",
    input: {
      grossSalary: 60000,
      salarySacrifice: 3000,
    },
    expected: 450,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2025-to-2026",
    derivation:
      "Employer NI before = (60000 - ST 5000, floored at 0) = 55000; after sacrifice = (57000 - 5000, floored at 0) = 52000; reduction 3000 x 15% = 450.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "employerNiSaving.2025-26.6000.3000",
    taxYear: "2025/26",
    region: "ENGLAND_NI_WALES",
    kind: "employerNiSaving",
    input: {
      grossSalary: 6000,
      salarySacrifice: 3000,
    },
    expected: 150,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2025-to-2026",
    derivation:
      "Employer NI before = (6000 - ST 5000, floored at 0) = 1000; after sacrifice = (3000 - 5000, floored at 0) = 0; reduction 1000 x 15% = 150.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "employeeNi.2026-27.30000",
    taxYear: "2026/27",
    region: "ENGLAND_NI_WALES",
    kind: "employeeNi",
    input: {
      grossEarnings: 30000,
    },
    expected: 1394.4,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027",
    derivation:
      "Annual earnings 30000. Main band 30000 - PT 12570 = 17430 x 8% = 1394.4; above UEL 50270: 0 x 2% = 0. Total 1394.4.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "employeeNi.2026-27.60000",
    taxYear: "2026/27",
    region: "ENGLAND_NI_WALES",
    kind: "employeeNi",
    input: {
      grossEarnings: 60000,
    },
    expected: 3210.6,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027",
    derivation:
      "Annual earnings 60000. Main band 50270 - PT 12570 = 37700 x 8% = 3016; above UEL 50270: 9730 x 2% = 194.6. Total 3210.6.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "class4.2026-27.60000",
    taxYear: "2026/27",
    region: "ENGLAND_NI_WALES",
    kind: "class4",
    input: {
      profits: 60000,
    },
    expected: 2456.6,
    source:
      "https://www.gov.uk/government/publications/rates-and-allowances-national-insurance-contributions/rates-and-allowances-national-insurance-contributions",
    derivation:
      "Profits 60000. (50270 - LPL 12570) = 37700 x 6% = 2262; above UPL 50270: 9730 x 2% = 194.6. Total 2456.6.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "employerNiSaving.2026-27.60000.3000",
    taxYear: "2026/27",
    region: "ENGLAND_NI_WALES",
    kind: "employerNiSaving",
    input: {
      grossSalary: 60000,
      salarySacrifice: 3000,
    },
    expected: 450,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027",
    derivation:
      "Employer NI before = (60000 - ST 5000, floored at 0) = 55000; after sacrifice = (57000 - 5000, floored at 0) = 52000; reduction 3000 x 15% = 450.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "employerNiSaving.2026-27.6000.3000",
    taxYear: "2026/27",
    region: "ENGLAND_NI_WALES",
    kind: "employerNiSaving",
    input: {
      grossSalary: 6000,
      salarySacrifice: 3000,
    },
    expected: 150,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027",
    derivation:
      "Employer NI before = (6000 - ST 5000, floored at 0) = 1000; after sacrifice = (3000 - 5000, floored at 0) = 0; reduction 1000 x 15% = 150.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "studentLoan.2020-21.plan1.35000",
    taxYear: "2020/21",
    region: "ENGLAND_NI_WALES",
    kind: "studentLoan",
    input: {
      grossIncome: 35000,
      plan: "plan1",
    },
    expected: 1404.9,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2020-to-2021",
    derivation: "plan1 threshold 19390; (35000 - 19390) = 15610 x 9% = 1404.9.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "studentLoan.2020-21.plan2.35000",
    taxYear: "2020/21",
    region: "ENGLAND_NI_WALES",
    kind: "studentLoan",
    input: {
      grossIncome: 35000,
      plan: "plan2",
    },
    expected: 758.25,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2020-to-2021",
    derivation: "plan2 threshold 26575; (35000 - 26575) = 8425 x 9% = 758.25.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "studentLoan.2020-21.postgrad.35000",
    taxYear: "2020/21",
    region: "ENGLAND_NI_WALES",
    kind: "studentLoan",
    input: {
      grossIncome: 35000,
      plan: "postgrad",
    },
    expected: 840,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2020-to-2021",
    derivation: "postgrad threshold 21000; (35000 - 21000) = 14000 x 6% = 840.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "studentLoan.2020-21.plan2.25575",
    taxYear: "2020/21",
    region: "ENGLAND_NI_WALES",
    kind: "studentLoan",
    input: {
      grossIncome: 25575,
      plan: "plan2",
    },
    expected: 0,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2020-to-2021",
    derivation: "plan2 threshold 26575; income 25575 is below it, so repayment is 0.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "studentLoan.2021-22.plan1.35000",
    taxYear: "2021/22",
    region: "ENGLAND_NI_WALES",
    kind: "studentLoan",
    input: {
      grossIncome: 35000,
      plan: "plan1",
    },
    expected: 1359.45,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2021-to-2022",
    derivation: "plan1 threshold 19895; (35000 - 19895) = 15105 x 9% = 1359.45.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "studentLoan.2021-22.plan2.35000",
    taxYear: "2021/22",
    region: "ENGLAND_NI_WALES",
    kind: "studentLoan",
    input: {
      grossIncome: 35000,
      plan: "plan2",
    },
    expected: 693.45,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2021-to-2022",
    derivation: "plan2 threshold 27295; (35000 - 27295) = 7705 x 9% = 693.45.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "studentLoan.2021-22.plan4.35000",
    taxYear: "2021/22",
    region: "ENGLAND_NI_WALES",
    kind: "studentLoan",
    input: {
      grossIncome: 35000,
      plan: "plan4",
    },
    expected: 900,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2021-to-2022",
    derivation: "plan4 threshold 25000; (35000 - 25000) = 10000 x 9% = 900.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "studentLoan.2021-22.postgrad.35000",
    taxYear: "2021/22",
    region: "ENGLAND_NI_WALES",
    kind: "studentLoan",
    input: {
      grossIncome: 35000,
      plan: "postgrad",
    },
    expected: 840,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2021-to-2022",
    derivation: "postgrad threshold 21000; (35000 - 21000) = 14000 x 6% = 840.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "studentLoan.2021-22.plan2.26295",
    taxYear: "2021/22",
    region: "ENGLAND_NI_WALES",
    kind: "studentLoan",
    input: {
      grossIncome: 26295,
      plan: "plan2",
    },
    expected: 0,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2021-to-2022",
    derivation: "plan2 threshold 27295; income 26295 is below it, so repayment is 0.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "studentLoan.2022-23.plan1.35000",
    taxYear: "2022/23",
    region: "ENGLAND_NI_WALES",
    kind: "studentLoan",
    input: {
      grossIncome: 35000,
      plan: "plan1",
    },
    expected: 1332.45,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2022-to-2023",
    derivation: "plan1 threshold 20195; (35000 - 20195) = 14805 x 9% = 1332.45.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "studentLoan.2022-23.plan2.35000",
    taxYear: "2022/23",
    region: "ENGLAND_NI_WALES",
    kind: "studentLoan",
    input: {
      grossIncome: 35000,
      plan: "plan2",
    },
    expected: 693.45,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2022-to-2023",
    derivation: "plan2 threshold 27295; (35000 - 27295) = 7705 x 9% = 693.45.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "studentLoan.2022-23.plan4.35000",
    taxYear: "2022/23",
    region: "ENGLAND_NI_WALES",
    kind: "studentLoan",
    input: {
      grossIncome: 35000,
      plan: "plan4",
    },
    expected: 866.25,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2022-to-2023",
    derivation: "plan4 threshold 25375; (35000 - 25375) = 9625 x 9% = 866.25.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "studentLoan.2022-23.postgrad.35000",
    taxYear: "2022/23",
    region: "ENGLAND_NI_WALES",
    kind: "studentLoan",
    input: {
      grossIncome: 35000,
      plan: "postgrad",
    },
    expected: 840,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2022-to-2023",
    derivation: "postgrad threshold 21000; (35000 - 21000) = 14000 x 6% = 840.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "studentLoan.2022-23.plan2.26295",
    taxYear: "2022/23",
    region: "ENGLAND_NI_WALES",
    kind: "studentLoan",
    input: {
      grossIncome: 26295,
      plan: "plan2",
    },
    expected: 0,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2022-to-2023",
    derivation: "plan2 threshold 27295; income 26295 is below it, so repayment is 0.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "studentLoan.2023-24.plan1.35000",
    taxYear: "2023/24",
    region: "ENGLAND_NI_WALES",
    kind: "studentLoan",
    input: {
      grossIncome: 35000,
      plan: "plan1",
    },
    expected: 1168.65,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2023-to-2024",
    derivation: "plan1 threshold 22015; (35000 - 22015) = 12985 x 9% = 1168.65.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "studentLoan.2023-24.plan2.35000",
    taxYear: "2023/24",
    region: "ENGLAND_NI_WALES",
    kind: "studentLoan",
    input: {
      grossIncome: 35000,
      plan: "plan2",
    },
    expected: 693.45,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2023-to-2024",
    derivation: "plan2 threshold 27295; (35000 - 27295) = 7705 x 9% = 693.45.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "studentLoan.2023-24.plan4.35000",
    taxYear: "2023/24",
    region: "ENGLAND_NI_WALES",
    kind: "studentLoan",
    input: {
      grossIncome: 35000,
      plan: "plan4",
    },
    expected: 660.6,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2023-to-2024",
    derivation: "plan4 threshold 27660; (35000 - 27660) = 7340 x 9% = 660.6.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "studentLoan.2023-24.plan5.35000",
    taxYear: "2023/24",
    region: "ENGLAND_NI_WALES",
    kind: "studentLoan",
    input: {
      grossIncome: 35000,
      plan: "plan5",
    },
    expected: 900,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2023-to-2024",
    derivation: "plan5 threshold 25000; (35000 - 25000) = 10000 x 9% = 900.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: the employer page for this year does not list Plan 5; 25,000 is memory only.",
    signedOffBy: null,
  },
  {
    id: "studentLoan.2023-24.postgrad.35000",
    taxYear: "2023/24",
    region: "ENGLAND_NI_WALES",
    kind: "studentLoan",
    input: {
      grossIncome: 35000,
      plan: "postgrad",
    },
    expected: 840,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2023-to-2024",
    derivation: "postgrad threshold 21000; (35000 - 21000) = 14000 x 6% = 840.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "studentLoan.2023-24.plan2.26295",
    taxYear: "2023/24",
    region: "ENGLAND_NI_WALES",
    kind: "studentLoan",
    input: {
      grossIncome: 26295,
      plan: "plan2",
    },
    expected: 0,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2023-to-2024",
    derivation: "plan2 threshold 27295; income 26295 is below it, so repayment is 0.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "studentLoan.2024-25.plan1.35000",
    taxYear: "2024/25",
    region: "ENGLAND_NI_WALES",
    kind: "studentLoan",
    input: {
      grossIncome: 35000,
      plan: "plan1",
    },
    expected: 900.9,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2024-to-2025",
    derivation: "plan1 threshold 24990; (35000 - 24990) = 10010 x 9% = 900.9.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "studentLoan.2024-25.plan2.35000",
    taxYear: "2024/25",
    region: "ENGLAND_NI_WALES",
    kind: "studentLoan",
    input: {
      grossIncome: 35000,
      plan: "plan2",
    },
    expected: 693.45,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2024-to-2025",
    derivation: "plan2 threshold 27295; (35000 - 27295) = 7705 x 9% = 693.45.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "studentLoan.2024-25.plan4.35000",
    taxYear: "2024/25",
    region: "ENGLAND_NI_WALES",
    kind: "studentLoan",
    input: {
      grossIncome: 35000,
      plan: "plan4",
    },
    expected: 324.45,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2024-to-2025",
    derivation: "plan4 threshold 31395; (35000 - 31395) = 3605 x 9% = 324.45.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "studentLoan.2024-25.plan5.35000",
    taxYear: "2024/25",
    region: "ENGLAND_NI_WALES",
    kind: "studentLoan",
    input: {
      grossIncome: 35000,
      plan: "plan5",
    },
    expected: 900,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2024-to-2025",
    derivation: "plan5 threshold 25000; (35000 - 25000) = 10000 x 9% = 900.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: the employer page for this year does not list Plan 5; 25,000 is memory only.",
    signedOffBy: null,
  },
  {
    id: "studentLoan.2024-25.postgrad.35000",
    taxYear: "2024/25",
    region: "ENGLAND_NI_WALES",
    kind: "studentLoan",
    input: {
      grossIncome: 35000,
      plan: "postgrad",
    },
    expected: 840,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2024-to-2025",
    derivation: "postgrad threshold 21000; (35000 - 21000) = 14000 x 6% = 840.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "studentLoan.2024-25.plan2.26295",
    taxYear: "2024/25",
    region: "ENGLAND_NI_WALES",
    kind: "studentLoan",
    input: {
      grossIncome: 26295,
      plan: "plan2",
    },
    expected: 0,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2024-to-2025",
    derivation: "plan2 threshold 27295; income 26295 is below it, so repayment is 0.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "studentLoan.2025-26.plan1.35000",
    taxYear: "2025/26",
    region: "ENGLAND_NI_WALES",
    kind: "studentLoan",
    input: {
      grossIncome: 35000,
      plan: "plan1",
    },
    expected: 804.15,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2025-to-2026",
    derivation: "plan1 threshold 26065; (35000 - 26065) = 8935 x 9% = 804.15.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "studentLoan.2025-26.plan2.35000",
    taxYear: "2025/26",
    region: "ENGLAND_NI_WALES",
    kind: "studentLoan",
    input: {
      grossIncome: 35000,
      plan: "plan2",
    },
    expected: 587.7,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2025-to-2026",
    derivation: "plan2 threshold 28470; (35000 - 28470) = 6530 x 9% = 587.7.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "studentLoan.2025-26.plan4.35000",
    taxYear: "2025/26",
    region: "ENGLAND_NI_WALES",
    kind: "studentLoan",
    input: {
      grossIncome: 35000,
      plan: "plan4",
    },
    expected: 202.95,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2025-to-2026",
    derivation: "plan4 threshold 32745; (35000 - 32745) = 2255 x 9% = 202.95.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "studentLoan.2025-26.plan5.35000",
    taxYear: "2025/26",
    region: "ENGLAND_NI_WALES",
    kind: "studentLoan",
    input: {
      grossIncome: 35000,
      plan: "plan5",
    },
    expected: 900,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2025-to-2026",
    derivation: "plan5 threshold 25000; (35000 - 25000) = 10000 x 9% = 900.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: the employer page for this year does not list Plan 5; 25,000 is memory only.",
    signedOffBy: null,
  },
  {
    id: "studentLoan.2025-26.postgrad.35000",
    taxYear: "2025/26",
    region: "ENGLAND_NI_WALES",
    kind: "studentLoan",
    input: {
      grossIncome: 35000,
      plan: "postgrad",
    },
    expected: 840,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2025-to-2026",
    derivation: "postgrad threshold 21000; (35000 - 21000) = 14000 x 6% = 840.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "studentLoan.2025-26.plan2.27470",
    taxYear: "2025/26",
    region: "ENGLAND_NI_WALES",
    kind: "studentLoan",
    input: {
      grossIncome: 27470,
      plan: "plan2",
    },
    expected: 0,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2025-to-2026",
    derivation: "plan2 threshold 28470; income 27470 is below it, so repayment is 0.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "studentLoan.2026-27.plan1.35000",
    taxYear: "2026/27",
    region: "ENGLAND_NI_WALES",
    kind: "studentLoan",
    input: {
      grossIncome: 35000,
      plan: "plan1",
    },
    expected: 729,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027",
    derivation: "plan1 threshold 26900; (35000 - 26900) = 8100 x 9% = 729.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "studentLoan.2026-27.plan2.35000",
    taxYear: "2026/27",
    region: "ENGLAND_NI_WALES",
    kind: "studentLoan",
    input: {
      grossIncome: 35000,
      plan: "plan2",
    },
    expected: 505.35,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027",
    derivation: "plan2 threshold 29385; (35000 - 29385) = 5615 x 9% = 505.35.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "studentLoan.2026-27.plan4.35000",
    taxYear: "2026/27",
    region: "ENGLAND_NI_WALES",
    kind: "studentLoan",
    input: {
      grossIncome: 35000,
      plan: "plan4",
    },
    expected: 108.45,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027",
    derivation: "plan4 threshold 33795; (35000 - 33795) = 1205 x 9% = 108.45.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "studentLoan.2026-27.plan5.35000",
    taxYear: "2026/27",
    region: "ENGLAND_NI_WALES",
    kind: "studentLoan",
    input: {
      grossIncome: 35000,
      plan: "plan5",
    },
    expected: 900,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027",
    derivation: "plan5 threshold 25000; (35000 - 25000) = 10000 x 9% = 900.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "studentLoan.2026-27.postgrad.35000",
    taxYear: "2026/27",
    region: "ENGLAND_NI_WALES",
    kind: "studentLoan",
    input: {
      grossIncome: 35000,
      plan: "postgrad",
    },
    expected: 840,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027",
    derivation: "postgrad threshold 21000; (35000 - 21000) = 14000 x 6% = 840.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "studentLoan.2026-27.plan2.28385",
    taxYear: "2026/27",
    region: "ENGLAND_NI_WALES",
    kind: "studentLoan",
    input: {
      grossIncome: 28385,
      plan: "plan2",
    },
    expected: 0,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027",
    derivation: "plan2 threshold 29385; income 28385 is below it, so repayment is 0.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "dividends.2020-21.basic",
    taxYear: "2020/21",
    region: "ENGLAND_NI_WALES",
    kind: "dividends",
    input: {
      employmentIncome: 20000,
      dividendIncome: 5000,
    },
    expected: 225,
    source: "https://www.legislation.gov.uk/ukpga/2007/3/section/8/2020-04-06",
    additionalSources: [
      "https://www.legislation.gov.uk/ukpga/2007/3/section/13A/2020-04-06",
      "https://www.legislation.gov.uk/ukpga/2007/3/section/8/2021-04-06",
    ],
    derivation:
      "Employment income 20000 less PA 12500 = 7500, inside the basic band 37500, so all dividends fall in the basic band. Dividend allowance 2000: taxable dividends 5000 - 2000 = 3000 x 7.5% = 225 (dividend tax only).",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "dividends.2020-21.higher",
    taxYear: "2020/21",
    region: "ENGLAND_NI_WALES",
    kind: "dividends",
    input: {
      employmentIncome: 60000,
      dividendIncome: 5000,
    },
    expected: 975,
    source: "https://www.legislation.gov.uk/ukpga/2007/3/section/8/2020-04-06",
    additionalSources: [
      "https://www.legislation.gov.uk/ukpga/2007/3/section/13A/2020-04-06",
      "https://www.legislation.gov.uk/ukpga/2007/3/section/8/2021-04-06",
    ],
    derivation:
      "Employment income 60000 less PA 12500 = 47500 already exceeds the basic band 37500, so all dividends fall in the higher band. Dividend allowance 2000: taxable dividends 5000 - 2000 = 3000 x 32.5% = 975 (dividend tax only).",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "dividends.2021-22.basic",
    taxYear: "2021/22",
    region: "ENGLAND_NI_WALES",
    kind: "dividends",
    input: {
      employmentIncome: 20000,
      dividendIncome: 5000,
    },
    expected: 225,
    source: "https://www.legislation.gov.uk/ukpga/2007/3/section/8/2021-04-06",
    additionalSources: ["https://www.legislation.gov.uk/ukpga/2007/3/section/13A/2021-04-06"],
    derivation:
      "Employment income 20000 less PA 12570 = 7430, inside the basic band 37700, so all dividends fall in the basic band. Dividend allowance 2000: taxable dividends 5000 - 2000 = 3000 x 7.5% = 225 (dividend tax only).",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "dividends.2021-22.higher",
    taxYear: "2021/22",
    region: "ENGLAND_NI_WALES",
    kind: "dividends",
    input: {
      employmentIncome: 60000,
      dividendIncome: 5000,
    },
    expected: 975,
    source: "https://www.legislation.gov.uk/ukpga/2007/3/section/8/2021-04-06",
    additionalSources: ["https://www.legislation.gov.uk/ukpga/2007/3/section/13A/2021-04-06"],
    derivation:
      "Employment income 60000 less PA 12570 = 47430 already exceeds the basic band 37700, so all dividends fall in the higher band. Dividend allowance 2000: taxable dividends 5000 - 2000 = 3000 x 32.5% = 975 (dividend tax only).",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "dividends.2022-23.basic",
    taxYear: "2022/23",
    region: "ENGLAND_NI_WALES",
    kind: "dividends",
    input: {
      employmentIncome: 20000,
      dividendIncome: 5000,
    },
    expected: 262.5,
    source: "https://www.legislation.gov.uk/ukpga/2007/3/section/8/2022-04-06",
    additionalSources: ["https://www.legislation.gov.uk/ukpga/2007/3/section/13A/2022-04-06"],
    derivation:
      "Employment income 20000 less PA 12570 = 7430, inside the basic band 37700, so all dividends fall in the basic band. Dividend allowance 2000: taxable dividends 5000 - 2000 = 3000 x 8.75% = 262.5 (dividend tax only).",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "dividends.2022-23.higher",
    taxYear: "2022/23",
    region: "ENGLAND_NI_WALES",
    kind: "dividends",
    input: {
      employmentIncome: 60000,
      dividendIncome: 5000,
    },
    expected: 1012.5,
    source: "https://www.legislation.gov.uk/ukpga/2007/3/section/8/2022-04-06",
    additionalSources: ["https://www.legislation.gov.uk/ukpga/2007/3/section/13A/2022-04-06"],
    derivation:
      "Employment income 60000 less PA 12570 = 47430 already exceeds the basic band 37700, so all dividends fall in the higher band. Dividend allowance 2000: taxable dividends 5000 - 2000 = 3000 x 33.75% = 1012.5 (dividend tax only).",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "dividends.2023-24.basic",
    taxYear: "2023/24",
    region: "ENGLAND_NI_WALES",
    kind: "dividends",
    input: {
      employmentIncome: 20000,
      dividendIncome: 5000,
    },
    expected: 350,
    source:
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    additionalSources: ["https://www.gov.uk/tax-on-dividends"],
    derivation:
      "Employment income 20000 less PA 12570 = 7430, inside the basic band 37700, so all dividends fall in the basic band. Dividend allowance 1000: taxable dividends 5000 - 1000 = 4000 x 8.75% = 350 (dividend tax only).",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "dividends.2023-24.higher",
    taxYear: "2023/24",
    region: "ENGLAND_NI_WALES",
    kind: "dividends",
    input: {
      employmentIncome: 60000,
      dividendIncome: 5000,
    },
    expected: 1350,
    source:
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    additionalSources: ["https://www.gov.uk/tax-on-dividends"],
    derivation:
      "Employment income 60000 less PA 12570 = 47430 already exceeds the basic band 37700, so all dividends fall in the higher band. Dividend allowance 1000: taxable dividends 5000 - 1000 = 4000 x 33.75% = 1350 (dividend tax only).",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "dividends.2023-24.additional",
    taxYear: "2023/24",
    region: "ENGLAND_NI_WALES",
    kind: "dividends",
    input: {
      employmentIncome: 200000,
      dividendIncome: 5000,
    },
    expected: 1574,
    source:
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    additionalSources: ["https://www.gov.uk/tax-on-dividends"],
    derivation:
      "Employment income 200000 gives PA 0 and taxable income above 125140, so all dividends fall in the additional band. Dividend allowance 1000: taxable dividends 5000 - 1000 = 4000 x 39.35% = 1574 (dividend tax only).",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "dividends.2024-25.basic",
    taxYear: "2024/25",
    region: "ENGLAND_NI_WALES",
    kind: "dividends",
    input: {
      employmentIncome: 20000,
      dividendIncome: 5000,
    },
    expected: 393.75,
    source:
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    additionalSources: ["https://www.gov.uk/tax-on-dividends"],
    derivation:
      "Employment income 20000 less PA 12570 = 7430, inside the basic band 37700, so all dividends fall in the basic band. Dividend allowance 500: taxable dividends 5000 - 500 = 4500 x 8.75% = 393.75 (dividend tax only).",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "dividends.2024-25.higher",
    taxYear: "2024/25",
    region: "ENGLAND_NI_WALES",
    kind: "dividends",
    input: {
      employmentIncome: 60000,
      dividendIncome: 5000,
    },
    expected: 1518.75,
    source:
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    additionalSources: ["https://www.gov.uk/tax-on-dividends"],
    derivation:
      "Employment income 60000 less PA 12570 = 47430 already exceeds the basic band 37700, so all dividends fall in the higher band. Dividend allowance 500: taxable dividends 5000 - 500 = 4500 x 33.75% = 1518.75 (dividend tax only).",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "dividends.2024-25.additional",
    taxYear: "2024/25",
    region: "ENGLAND_NI_WALES",
    kind: "dividends",
    input: {
      employmentIncome: 200000,
      dividendIncome: 5000,
    },
    expected: 1770.75,
    source:
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    additionalSources: ["https://www.gov.uk/tax-on-dividends"],
    derivation:
      "Employment income 200000 gives PA 0 and taxable income above 125140, so all dividends fall in the additional band. Dividend allowance 500: taxable dividends 5000 - 500 = 4500 x 39.35% = 1770.75 (dividend tax only).",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "dividends.2025-26.basic",
    taxYear: "2025/26",
    region: "ENGLAND_NI_WALES",
    kind: "dividends",
    input: {
      employmentIncome: 20000,
      dividendIncome: 5000,
    },
    expected: 393.75,
    source:
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    additionalSources: ["https://www.gov.uk/tax-on-dividends"],
    derivation:
      "Employment income 20000 less PA 12570 = 7430, inside the basic band 37700, so all dividends fall in the basic band. Dividend allowance 500: taxable dividends 5000 - 500 = 4500 x 8.75% = 393.75 (dividend tax only).",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "dividends.2025-26.higher",
    taxYear: "2025/26",
    region: "ENGLAND_NI_WALES",
    kind: "dividends",
    input: {
      employmentIncome: 60000,
      dividendIncome: 5000,
    },
    expected: 1518.75,
    source:
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    additionalSources: ["https://www.gov.uk/tax-on-dividends"],
    derivation:
      "Employment income 60000 less PA 12570 = 47430 already exceeds the basic band 37700, so all dividends fall in the higher band. Dividend allowance 500: taxable dividends 5000 - 500 = 4500 x 33.75% = 1518.75 (dividend tax only).",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "dividends.2025-26.additional",
    taxYear: "2025/26",
    region: "ENGLAND_NI_WALES",
    kind: "dividends",
    input: {
      employmentIncome: 200000,
      dividendIncome: 5000,
    },
    expected: 1770.75,
    source:
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    additionalSources: ["https://www.gov.uk/tax-on-dividends"],
    derivation:
      "Employment income 200000 gives PA 0 and taxable income above 125140, so all dividends fall in the additional band. Dividend allowance 500: taxable dividends 5000 - 500 = 4500 x 39.35% = 1770.75 (dividend tax only).",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "dividends.2026-27.basic",
    taxYear: "2026/27",
    region: "ENGLAND_NI_WALES",
    kind: "dividends",
    input: {
      employmentIncome: 20000,
      dividendIncome: 5000,
    },
    expected: 483.75,
    source:
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    additionalSources: ["https://www.gov.uk/tax-on-dividends"],
    derivation:
      "Employment income 20000 less PA 12570 = 7430, inside the basic band 37700, so all dividends fall in the basic band. Dividend allowance 500: taxable dividends 5000 - 500 = 4500 x 10.75% = 483.75 (dividend tax only).",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "dividends.2026-27.higher",
    taxYear: "2026/27",
    region: "ENGLAND_NI_WALES",
    kind: "dividends",
    input: {
      employmentIncome: 60000,
      dividendIncome: 5000,
    },
    expected: 1608.75,
    source:
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    additionalSources: ["https://www.gov.uk/tax-on-dividends"],
    derivation:
      "Employment income 60000 less PA 12570 = 47430 already exceeds the basic band 37700, so all dividends fall in the higher band. Dividend allowance 500: taxable dividends 5000 - 500 = 4500 x 35.75% = 1608.75 (dividend tax only).",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
  {
    id: "dividends.2026-27.additional",
    taxYear: "2026/27",
    region: "ENGLAND_NI_WALES",
    kind: "dividends",
    input: {
      employmentIncome: 200000,
      dividendIncome: 5000,
    },
    expected: 1770.75,
    source:
      "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    additionalSources: ["https://www.gov.uk/tax-on-dividends"],
    derivation:
      "Employment income 200000 gives PA 0 and taxable income above 125140, so all dividends fall in the additional band. Dividend allowance 500: taxable dividends 5000 - 500 = 4500 x 39.35% = 1770.75 (dividend tax only).",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: null,
  },
];
