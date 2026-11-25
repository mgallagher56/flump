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
 * - giftAid: { grossIncome, giftAidNet } (net donation, grossed up x 1.25)
 * - employeeNi: { grossEarnings } (annual Class 1 category A, annual method)
 * - class4: { profits }
 * - employerNiSaving: { grossSalary, salarySacrifice }
 * - studentLoan: { grossIncome, plan } plan is plan1|plan2|plan4|plan5|postgrad
 * - dividends: { employmentIncome, dividendIncome }; expected is dividend tax only
 *
 * Scotland Gift Aid vectors (owner ruling replacing D9-B): ITA 2007 s.414(2)(b) raises "the upper limit
 * for the Scottish basic rate and the limits for any Scottish rates above the Scottish basic rate" by the
 * grossed-up gift. The Scottish starter band and its upper limit are unchanged; the Basic band's upper
 * limit and every band limit above it move up by net x 1.25. Gift Aid also still reduces adjusted net
 * income for the allowance taper. These vectors are UNVERIFIED (statute text read, no HMRC guidance page
 * for Scotland read) and are asserted against calculateUkTax.
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
  "2027/28",
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
type UkTaxVectorStatus = "VERIFIED" | "UNVERIFIED";

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
  /**
   * Owner sign-off. null until the owner signs. Only `scripts/tax-signoff.ts apply` may set
   * these (the owner runs it; it refuses to run in CI). `signedOffHash` binds the sign-off to
   * the vector's content: editing a signed vector invalidates it (see signoff.ts).
   */
  signedOffBy: string | null;
  /** ISO date (YYYY-MM-DD). Present only when signedOffBy is set. */
  signedOffAt?: string;
  /** sha256 of the vector content at sign-off. Present only when signedOffBy is set. */
  signedOffHash?: string;
  /** Written ruling that settles the judgement call behind an UNVERIFIED vector. Required to sign one. */
  rulingRef?: string;
}

interface UkTaxVectorFilter {
  taxYear?: UkTaxVectorYear;
  region?: UkTaxVectorRegion;
  kind?: UkTaxVectorKind;
  status?: UkTaxVectorStatus;
}

interface UkTaxVectorFailure {
  id: string;
  expected: number;
  actual: number;
}

export interface UkTaxVectorRunResult {
  checked: number;
  failures: UkTaxVectorFailure[];
}

/** Half a penny: engine results are rounded to pence at public boundaries. */
const UK_TAX_VECTOR_TOLERANCE = 0.005;

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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:dfc2c0f0d52f725c3b4466fb9d1d293b78aec8d61af786ae5e7604bec5ee4a88",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:dc398917f56550e065a771b02b049272392de3b523ab35b2a010e69dc2ff6a3a",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:3aca7b58c5234f7dfafaa35682512c16182f74e50a883955dc8c226d24ab8644",
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
    additionalSources: ["https://www.legislation.gov.uk/ukpga/2007/3/section/35/2020-04-06"],
    derivation:
      "Gross income 110000. Taper: (110000 - 100000) / 2 = 5000, PA 12500 - 5000 = 7500. Taxable 110000 - 7500 = 102500. Basic 37500 x 20% = 7500; higher 65000 x 40% = 26000; additional 0 x 45% = 0. Total 33500.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:a1e77cc0edcf13cd1af6c90ffad0b7d9d9cf042d109aa33db053b7eabf7861c8",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:aa6ee9c051346612538492fdc5e0086c2cf97faa4012171d50e723960b7b0dae",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:08a40a348f595236843b322de473ad0dbcc67252f60769b329f4987cb852bc8a",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:7f08c375061c7df28335be624590fd927ddf58bae15ad1ff25dd50bd377cd12e",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:a3eb1cee34b66daf9de7d6e9c62e37ae5eb416055d09c1b6b0ec20d2749199d4",
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
      "https://www.legislation.gov.uk/ukpga/2007/3/section/35/2020-04-06",
      "https://www.gov.uk/guidance/adjusted-net-income",
      "https://www.legislation.gov.uk/ukpga/2007/3/section/414",
    ],
    derivation:
      "Gross income 110000. Gift Aid gross-up 1000 x 1.25 = 1250; adjusted net income 110000 - 1250 = 108750; basic and higher limits both raised by 1250 (ITA 2007 s.414): 37500 + 1250 = 38750, 150000 + 1250 = 151250. Taper: (108750 - 100000) / 2 = 4375, PA 12500 - 4375 = 8125. Taxable 110000 - 8125 = 101875. Basic 38750 x 20% = 7750; higher 63125 x 40% = 25250; additional 0 x 45% = 0. Total 33000.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:e0dbd359da8a9e16a8d0396d40c98b3fc693ce14deed9008098168ab3bd81490",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:769c82c4eb985a9199b65e197dfe294e63110de2cab8b71c5ee01227129b010a",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:ba31026122d0109802952ab0cd01042a24fb14f95a6b4a760be090ad829e26fe",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:2e66225338ca0c98eb1b6a2ebcb90cb5d7bc0057065d79db56ce9a53cbb0ae8b",
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
    additionalSources: ["https://www.legislation.gov.uk/ukpga/2007/3/section/35/2021-04-06"],
    derivation:
      "Gross income 110000. Taper: (110000 - 100000) / 2 = 5000, PA 12570 - 5000 = 7570. Taxable 110000 - 7570 = 102430. Basic 37700 x 20% = 7540; higher 64730 x 40% = 25892; additional 0 x 45% = 0. Total 33432.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:1107ec51c861f094d02d9aad1b9c873551eadbff2afe994e88546857c2a862b9",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:dded066482edda1e710a110292b1b2445d6bfd6d366ad309653db635cbec8f77",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:f9fc6b5399ca9bee22a8fef2f6afb82cc632d14318efa8b15562c8bcded6b8a8",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:9091632b109675f1fe8fbb3e32744d129cd40899c77f7bc1524e7c00cefac207",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:a1d655283cdc06b5413be3101bbe7ff41a138da631a4218feb07253a786a2cc5",
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
      "https://www.legislation.gov.uk/ukpga/2007/3/section/35/2021-04-06",
      "https://www.gov.uk/guidance/adjusted-net-income",
      "https://www.legislation.gov.uk/ukpga/2007/3/section/414",
    ],
    derivation:
      "Gross income 110000. Gift Aid gross-up 1000 x 1.25 = 1250; adjusted net income 110000 - 1250 = 108750; basic and higher limits both raised by 1250 (ITA 2007 s.414): 37700 + 1250 = 38950, 150000 + 1250 = 151250. Taper: (108750 - 100000) / 2 = 4375, PA 12570 - 4375 = 8195. Taxable 110000 - 8195 = 101805. Basic 38950 x 20% = 7790; higher 62855 x 40% = 25142; additional 0 x 45% = 0. Total 32932.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:e0c72de3bc4edf16a6140e4e81e5bea705cc2e030a53778e5c2a3637751e9ae4",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:6de33ce8538e6e6a3cd767d1aab024627885f0f2e9a449f6b17d136445bec521",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:405ea6368c92f264b950a7d1763014be40cecc9d8a9a4b0d2dca8319d00187c6",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:93175ad670d16162cd4e698ee05116dc03a88801ca02ac29b1ae525f542d54fa",
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
    additionalSources: ["https://www.legislation.gov.uk/ukpga/2007/3/section/35/2022-04-06"],
    derivation:
      "Gross income 110000. Taper: (110000 - 100000) / 2 = 5000, PA 12570 - 5000 = 7570. Taxable 110000 - 7570 = 102430. Basic 37700 x 20% = 7540; higher 64730 x 40% = 25892; additional 0 x 45% = 0. Total 33432.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:b83110749112af9a8e7df437bd5d84779c0015ec426ae7fd32636e118c7e982d",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:3373254745c582b6e3b6ca81b72220ef327d8b74ee0d7a838971ab11f2eca182",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:ccd1a1ccb1acab55e5b4b487138473870add8fe5c499a6d90b1c26382b86b4fe",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:80d150cb790fe741963da864a8cdb1d5771c2d02d3791d58a90de0ee7f6e2ea1",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:7736b2f65293dc8b57e043378d357c2b05a422f58c72fcc1951361d125430f25",
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
      "https://www.legislation.gov.uk/ukpga/2007/3/section/35/2022-04-06",
      "https://www.gov.uk/guidance/adjusted-net-income",
      "https://www.legislation.gov.uk/ukpga/2007/3/section/414",
    ],
    derivation:
      "Gross income 110000. Gift Aid gross-up 1000 x 1.25 = 1250; adjusted net income 110000 - 1250 = 108750; basic and higher limits both raised by 1250 (ITA 2007 s.414): 37700 + 1250 = 38950, 150000 + 1250 = 151250. Taper: (108750 - 100000) / 2 = 4375, PA 12570 - 4375 = 8195. Taxable 110000 - 8195 = 101805. Basic 38950 x 20% = 7790; higher 62855 x 40% = 25142; additional 0 x 45% = 0. Total 32932.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:3be6dc8d0edc8d4e11944f77b07433ec6b894334ade24bd2313fade69aeed9d3",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:ca6c4e2929cb8feaa685c52d11124fdda7c3e7ec2cb3531e3a96c150b9aca6e2",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:16f7fb4c5e4b2f1f06ec1fc894afda34b5107d6fcce8cdc01dbb39e611f00891",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:255573677b25b1785f2d6fc5f1b4e7a5ed76e0e2bb9114c27402c3fb2aabae61",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:e1a4bba74b2570c879433c1beb54ab900923a132a312a876bbfaf7558bff5857",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:b3f5225a6c4bec1db6d5c94d54c0cf54c34047f4200e638a011391bdd8a52d39",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:0bc93bd589eb49f8ff922448346ea25d5e3f3496ca5f9453d47b0a972d215ceb",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:cc1290c0a1a54b79721d3ed6bfc479377d3cad66a8ba8cfc88c880914d656591",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:1333615d8bf29732251c90fbe4e92a477617adbefec677a1de84c5e4bc7fb8a3",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:ca556314e4eef057cb501ffeff143a3b7200920d8d8b1d3cbf53634aec95eedc",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:8db6956f60a05e2b96e4c5c7572a5e9d0490ba2cf0829d0ffeefd379473fc342",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:792f8b5dc65cc6219722f26210a51ed8ea9b8abd084c47926902e5b5f81e2fb0",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:2dfff3d4fb9e4ea2f9ebec30b54d16032a59ada185f6fc7ffd075fcd89cc4be4",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:77b2f8c526a426c9e53ef6bc0461ea0733938314dda2a6c898b200755806b228",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:7eff1a0f9bf96148c856be675985904b819117d2f186dd33c1ff4145ae21ed64",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:962adcd397ef27ef67390935bef6fae7dd4993b16ce6e1ea24995a68fe94b108",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:927f317918fbebe42aff004b4fcee26fe1323d3e2a0a7d22c0ee8b6948bf78e4",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:70b9c4278fb38a860a65bdd7f346f52097e5246ab5ecb85712626fef599aa5df",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:0359e23dfd5e4334ce70a37f883f75c98401c26b886923b8c99e873a2877170a",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:05a254e55a6ad6c823721fb5befa6d6b2738e5cfcecc7b250ab51877d97573fe",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:aad32cc3e306f3a27dd12a6ce2a370770e666cfee88d9700f6189d6d8eae91df",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:11597a87f3bd9d2730f034d4dc4bc2ec4b56c0518547365449a80bcc313d66be",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:eb9fdba9c60713aea0fee252a8ba9f028725f805ed80d48f5ee77400b3d1cdc9",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:88c1702af46415a6f285036993322d8a1cf5a3d88551d61c13b4bc602ea4127a",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:bab988233ec490a49fe12a2c288d9108cb548d7c4f2ef7c8ad6095518de06e07",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:71a2e6df23612e415b48971adabc7243e87238939deb49d9bab43b215e047a06",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:e8bac45c26a5f8a7db4df92bed8be56aa40e37b28167219aab2f8add00992ff6",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:13c66b301329604bca5e74ef75d2c59e8fd971df7e858e8c468236d9a37e57c3",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:fa3f9508821346288a285d1f72c5daa982ef2112c2b69a5bd38265f1fe46711a",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:156c9360fd6021f524a2917d8bea9a16bed8d517cb9761fd20ae02afbb3417ac",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:4c27ab473874cfe2c96289f014beae7a79dcfd816e2611a2e044ef4ac31d3bd5",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:5d9280297c43f0a978bdc50254322bf4f5c89826179e6dca7a0d846e567f4698",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:ac216edc3be157047b604c2007f0a90413a34b6e15c09381cf1748f39b76523c",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:f04d5d31e4ee32c0be00cc32add1df45b03ddad90852fdb99b10f29927d4d4e9",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:a4a4cb21b3e4e120c2bef9243c91c470c192f1381196db816805a74fa633c882",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:1c6a3ccb964170aba141b270fa1668345fdbe9b12bc850487a862362fe7f719c",
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
    additionalSources: ["https://www.legislation.gov.uk/ukpga/2007/3/section/35/2020-04-06"],
    derivation:
      "Gross income 110000. Taper (110000 - 100000) / 2 = 5000, PA 12500 - 5000 = 7500. Taxable 110000 - 7500 = 102500. Bands (taxable income above PA, upper bounds 2085/12658/30930/150000): 2085 x 19% = 396.15; 10573 x 20% = 2114.6; 18272 x 21% = 3837.12; 71570 x 41% = 29343.7; top 0 x 46% = 0. Total 35691.57.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:ce695151158a06bc2f8a912ad1fb8469d802138f37cdfe967f006b0a10518971",
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
    additionalSources: ["https://www.legislation.gov.uk/ukpga/2007/3/section/35/2020-04-06"],
    derivation:
      "Gross income 150000. Taper (150000 - 100000) / 2 = 25000, PA 12500 - 25000 = 0. Taxable 150000 - 0 = 150000. Bands (taxable income above PA, upper bounds 2085/12658/30930/150000): 2085 x 19% = 396.15; 10573 x 20% = 2114.6; 18272 x 21% = 3837.12; 119070 x 41% = 48818.7; top 0 x 46% = 0. Total 55166.57.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:5111182e7c075b1d5b06241b05be01f186834b6cbbdfd7ada23f0faa86bd7b68",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:f878b7f01b9f5138cc62370e934450844f55b2caed077a516611903dfe2e2fd0",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:f4745193d56f68e788c6646a6ee7c3fa789740e6a743032da2586fa1cc435497",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:b15c6eb7eb65844c1972705e258b49dd2735d2b9b778611c6049df917bd1ad5c",
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
    additionalSources: ["https://www.legislation.gov.uk/ukpga/2007/3/section/35/2021-04-06"],
    derivation:
      "Gross income 110000. Taper (110000 - 100000) / 2 = 5000, PA 12570 - 5000 = 7570. Taxable 110000 - 7570 = 102430. Bands (taxable income above PA, upper bounds 2097/12726/31092/150000): 2097 x 19% = 398.43; 10629 x 20% = 2125.8; 18366 x 21% = 3856.86; 71338 x 41% = 29248.58; top 0 x 46% = 0. Total 35629.67.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:b7522d98118f072fdb28896ddcc615c1a931bc0b86e3406bcf8e6c9eb2cb0172",
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
    additionalSources: ["https://www.legislation.gov.uk/ukpga/2007/3/section/35/2021-04-06"],
    derivation:
      "Gross income 150000. Taper (150000 - 100000) / 2 = 25000, PA 12570 - 25000 = 0. Taxable 150000 - 0 = 150000. Bands (taxable income above PA, upper bounds 2097/12726/31092/150000): 2097 x 19% = 398.43; 10629 x 20% = 2125.8; 18366 x 21% = 3856.86; 118908 x 41% = 48752.28; top 0 x 46% = 0. Total 55133.37.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:a37e3f02621211089c553c4a373d2a8e4ceeaf451cd83d3eeb2dcbebfdfb9509",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:75937551f8e8b8d9d10589b88f56f8a855ca9839f3907a8419c5d51b013eafc1",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:31119a98c419e1fab3ba525b6cf33d5ad5d9eaad8d179cc127123a1edeb51ac4",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:9f38e7e7d99b07fce3bae59db0d24b6f1a3fb4f11aee83de1de75c2ae3969c58",
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
    additionalSources: ["https://www.legislation.gov.uk/ukpga/2007/3/section/35/2022-04-06"],
    derivation:
      "Gross income 110000. Taper (110000 - 100000) / 2 = 5000, PA 12570 - 5000 = 7570. Taxable 110000 - 7570 = 102430. Bands (taxable income above PA, upper bounds 2162/13118/31092/150000): 2162 x 19% = 410.78; 10956 x 20% = 2191.2; 17974 x 21% = 3774.54; 71338 x 41% = 29248.58; top 0 x 46% = 0. Total 35625.1.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:24a0ff3f7c53cdc4178b96b35e564970ed5738f2db1a1de368cfbefa7a6f4585",
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
    additionalSources: ["https://www.legislation.gov.uk/ukpga/2007/3/section/35/2022-04-06"],
    derivation:
      "Gross income 150000. Taper (150000 - 100000) / 2 = 25000, PA 12570 - 25000 = 0. Taxable 150000 - 0 = 150000. Bands (taxable income above PA, upper bounds 2162/13118/31092/150000): 2162 x 19% = 410.78; 10956 x 20% = 2191.2; 17974 x 21% = 3774.54; 118908 x 41% = 48752.28; top 0 x 46% = 0. Total 55128.8.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:71bb959d4e0c26ceb30ebecd392af779d8dff168f4eb2a2f2b02a2074c34f293",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:1b5d557a38021bcfb3f99e66ae62898602d89156c1f8e374f8b47169d6dbe407",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:1aae2668d25cd54b5e35b6ef42d374c7e5a7c6f16380925c2c62b127f5c58e6d",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:c5ae42de788adc1ac14ccde3b1f351bb4734885e1eb8ca7e4b2b5546652f41af",
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
    additionalSources: ["https://www.legislation.gov.uk/ukpga/2007/3/section/35/2021-04-06"],
    derivation:
      "Gross income 110000. Taper (110000 - 100000) / 2 = 5000, PA 12570 - 5000 = 7570. Taxable 110000 - 7570 = 102430. Bands (taxable income above PA, upper bounds 2162/13118/31092/125140): 2162 x 19% = 410.78; 10956 x 20% = 2191.2; 17974 x 21% = 3774.54; 71338 x 42% = 29961.96; top 0 x 47% = 0. Total 36338.48.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:c8f0a43259765edb7a21895a50493cef14b0d4c6706cea2144d016f158d1f7c7",
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
    additionalSources: ["https://www.legislation.gov.uk/ukpga/2007/3/section/35/2021-04-06"],
    derivation:
      "Gross income 150000. Taper (150000 - 100000) / 2 = 25000, PA 12570 - 25000 = 0. Taxable 150000 - 0 = 150000. Bands (taxable income above PA, upper bounds 2162/13118/31092/125140): 2162 x 19% = 410.78; 10956 x 20% = 2191.2; 17974 x 21% = 3774.54; 94048 x 42% = 39500.16; top 24860 x 47% = 11684.2. Total 57560.88.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:7521a425bb1ccc30a8692d0b78d4d749b198eacec4db6ac02dfd4fe8b90f6497",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:f772d5d4e47cff27e2edc0b62ebdc6b75ab8397bf253b526f718b2d7b1d72e14",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:81fec5f15c58b475d14e18f129d8344ab026ec93663256ef14d2bfcc75c3389f",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:cae316f334a06475e9762ca88490999bdedd41afca630cc31563fbb902119ea7",
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
    additionalSources: ["https://www.legislation.gov.uk/ukpga/2007/3/section/35/2021-04-06"],
    derivation:
      "Gross income 110000. Taper (110000 - 100000) / 2 = 5000, PA 12570 - 5000 = 7570. Taxable 110000 - 7570 = 102430. Bands (taxable income above PA, upper bounds 2306/13991/31092/62430/125140): 2306 x 19% = 438.14; 11685 x 20% = 2337; 17101 x 21% = 3591.21; 31338 x 42% = 13161.96; 40000 x 45% = 18000; top 0 x 48% = 0. Total 37528.31.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:7072cea3375ae3cd50b57fad186ed319183e2a6d1a78957684f025eb42803a9b",
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
    additionalSources: ["https://www.legislation.gov.uk/ukpga/2007/3/section/35/2021-04-06"],
    derivation:
      "Gross income 150000. Taper (150000 - 100000) / 2 = 25000, PA 12570 - 25000 = 0. Taxable 150000 - 0 = 150000. Bands (taxable income above PA, upper bounds 2306/13991/31092/62430/125140): 2306 x 19% = 438.14; 11685 x 20% = 2337; 17101 x 21% = 3591.21; 31338 x 42% = 13161.96; 62710 x 45% = 28219.5; top 24860 x 48% = 11932.8. Total 59680.61.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:5843a1d104c13de1bab2485dd6d03013e7391af16d0edf20e7fb7f4842a3dd61",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:75dd5f095a8a8625f8655f440eb17f0e3ad83f571a877c8957ed9eabde0f93e4",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:2400d5be6ec2543df0c0148bad46d8778dd82e0e79df671b7a626d9c2e90a8b9",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:28234bbcd95ab6601fdf21eda8f442a2e367a3322e57349a8d26580fe85dcc86",
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
    additionalSources: ["https://www.legislation.gov.uk/ukpga/2007/3/section/35/2021-04-06"],
    derivation:
      "Gross income 110000. Taper (110000 - 100000) / 2 = 5000, PA 12570 - 5000 = 7570. Taxable 110000 - 7570 = 102430. Bands (taxable income above PA, upper bounds 2827/14921/31092/62430/125140): 2827 x 19% = 537.13; 12094 x 20% = 2418.8; 16171 x 21% = 3395.91; 31338 x 42% = 13161.96; 40000 x 45% = 18000; top 0 x 48% = 0. Total 37513.8.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:bef6d417d51cc48805a119ab1451fa5f4a2148e0d91d928449979cbf70d0b6ad",
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
    additionalSources: ["https://www.legislation.gov.uk/ukpga/2007/3/section/35/2021-04-06"],
    derivation:
      "Gross income 125140. Taper (125140 - 100000) / 2 = 12570, PA 12570 - 12570 = 0. Taxable 125140. Bands (taxable income above PA, upper bounds 2827/14921/31092/62430/125140): 2827 x 19% = 537.13; 12094 x 20% = 2418.8; 16171 x 21% = 3395.91; 31338 x 42% = 13161.96; 62710 x 45% = 28219.5; top 0 x 48% = 0. Total 47733.3.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:500ab62e8478335a3b9970e4182e8a377e940af487346854f31df11b32c764dc",
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
    additionalSources: ["https://www.legislation.gov.uk/ukpga/2007/3/section/35/2021-04-06"],
    derivation:
      "Gross income 150000. Taper (150000 - 100000) / 2 = 25000, PA 12570 - 25000 = 0. Taxable 150000 - 0 = 150000. Bands (taxable income above PA, upper bounds 2827/14921/31092/62430/125140): 2827 x 19% = 537.13; 12094 x 20% = 2418.8; 16171 x 21% = 3395.91; 31338 x 42% = 13161.96; 62710 x 45% = 28219.5; top 24860 x 48% = 11932.8. Total 59666.1.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:ba91939dbca3d96ea87f9b11afc543c80fdc692f4dc922b9deb4fe331d610227",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:bb6b5d52b7f250f82fabb36d2ddd2f7fdb47b6395cfbccde48cf431351360e6a",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:cd1663eb4846b5a05ae40da8215bdb3bc2d00baa68841233614920f1c7fc0e00",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:468b4dad16cfa049b6c73218bd01944d941366e12a6c60b9a4588a85326d0963",
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
    additionalSources: ["https://www.legislation.gov.uk/ukpga/2007/3/section/35/2021-04-06"],
    derivation:
      "Gross income 110000. Taper (110000 - 100000) / 2 = 5000, PA 12570 - 5000 = 7570. Taxable 110000 - 7570 = 102430. Bands (taxable income above PA, upper bounds 3967/16956/31092/62430/125140): 3967 x 19% = 753.73; 12989 x 20% = 2597.8; 14136 x 21% = 2968.56; 31338 x 42% = 13161.96; 40000 x 45% = 18000; top 0 x 48% = 0. Total 37482.05.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:479352742ed10de0a80e372cbe46ba6f2e1514acb61b230df23775e7cedc445c",
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
    additionalSources: ["https://www.legislation.gov.uk/ukpga/2007/3/section/35/2021-04-06"],
    derivation:
      "Gross income 125140. Taper (125140 - 100000) / 2 = 12570, PA 12570 - 12570 = 0. Taxable 125140. Bands (taxable income above PA, upper bounds 3967/16956/31092/62430/125140): 3967 x 19% = 753.73; 12989 x 20% = 2597.8; 14136 x 21% = 2968.56; 31338 x 42% = 13161.96; 62710 x 45% = 28219.5; top 0 x 48% = 0. Total 47701.55.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:919b01dcd841d1565a37f981d45384dd4de67f5ec4162cc38ab70517530445df",
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
    additionalSources: ["https://www.legislation.gov.uk/ukpga/2007/3/section/35/2021-04-06"],
    derivation:
      "Gross income 150000. Taper (150000 - 100000) / 2 = 25000, PA 12570 - 25000 = 0. Taxable 150000 - 0 = 150000. Bands (taxable income above PA, upper bounds 3967/16956/31092/62430/125140): 3967 x 19% = 753.73; 12989 x 20% = 2597.8; 14136 x 21% = 2968.56; 31338 x 42% = 13161.96; 62710 x 45% = 28219.5; top 24860 x 48% = 11932.8. Total 59634.35.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:e38e853e03b4d4d1eddbcff423a2a9de0f239dd0bd00897e7cd1dcd64dfa5f9e",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:bfe04fdd88daa15f946b0734c408733919ab0d6a6a68935c27e443e8ef80b657",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:3ef569de0922eda2515362915530e1bee843802ce51fb883730f80c5b01fedf3",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:90f3712fa04a179370ed8a76587003b19f7c8b980fd36f18f6c677d284d363df",
    rulingRef:
      "SSCBA 1992 s.15(3), (3ZA) as at 06/04/2020, read on legislation.gov.uk 2026-11-24: 9% on profits over 9,500 (SI 2020/299) up to 50,000, 2% above. 40,500 x 9% + 10,000 x 2% = 3,845.",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:c25b265e1f4232a895a83b1e2ec4747fc3f0b146ab857c0ca069a9c257844bce",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:fc4968c62559d83c407dd54c730856b3de5fc53c835b15abfeafd22f3f5a3989",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:eba23f358018eb00d42d2c4287a3fd9bca8361ef680d814ac2e742b447918983",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:75178dc13a9c48a1aa432862a4dec57ba2b485fefe28f1abec7e998fd4ec9396",
    rulingRef:
      "SSCBA 1992 s.15(3) and (3ZA), point-in-time 06/04/2021, read on legislation.gov.uk 2026-11-24: 9% on profits over 9,568 up to 50,270, 2% above 50,270. (50,270 - 9,568) x 9% + 9,730 x 2% = 3,857.78. No mid-year change in 2021/22.",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:e8dec4ce96d63a7c6febd5935208f581bca014122a9573d23b05e3e339ec1ca9",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:c33e0f6ebac3d3068305f4390ba35748938b44c7629ae94c5b704c37113c990c",
    rulingRef:
      "HSCL (Repeal) Act 2022 Schedule para 5(3)(a) (12.73%/2.73%) and GOV.UK employer rates 2022-23 (directors' PT 11,908), read 2026-11-24, are the only statutory annual-basis figures; 2,303.11 is correct on that basis. An evenly monthly-paid employee paid about 2,307.37.",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:a91141feeb8276b9e17bd26b082380a30ad4bb44dd8a6ce3840a878b1db76608",
    rulingRef:
      "Same provisions and page, read 2026-11-24: (50,270 - 11,908) x 12.73% + 9,730 x 2.73% = 5,149.11 on the annual earnings period method. An evenly monthly-paid employee paid about 5,152.92; accepted as the annual model.",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:e3b70963ebe926b47bb6bb7cc26b038970e149a52f1531344bce43c22f3756b3",
    rulingRef:
      "SSCBA 1992 s.15(3) (11,908 and 50,270, legislation.gov.uk version 2022-11-06) with s.15(3ZA) read as 9.73 and 2.73 for 2022-23 by HSCL (Repeal) Act 2022 s.2(2), read 2026-11-24, gives 3,732.62 + 265.63 = 3,998.25.",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:ea40aaa7f53cf83bbbc6dfd6ad0c38043192157e10dc65e478514dd57fbfe81d",
    rulingRef:
      "HSCL (Repeal) Act 2022 Schedule para 5(3)(b) and GOV.UK employer rates 2022-23, read 2026-11-24, give 14.53% for annual periods; 3,000 x 14.53% = 435.90. A monthly split (7 x 15.05%, 5 x 13.8%) gives 435.88. ST was 9,100 all year, not only from 6 July.",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:caf630e12484d4849513f07c732c0a33ece52eba89f71053442e67cb8fb36272",
    rulingRef:
      "Blend accepted. 12% to 2024-01-05 and 10% from 2024-01-06 (NIC (Reduction in Rates) Act 2023 s.1); Schedule para 1 sets 11.5% for annual earnings periods in 2023-24. Read on legislation.gov.uk and GOV.UK employer page 2026-11-24. 17,430 x 11.5% = 2,004.45; an evenly paid monthly employee comes to 2,003.76.",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:a63f5af4990fc539db7805f50bde552dbed97294adf827b241395a1e76052539",
    rulingRef:
      "Same basis: NIC (Reduction in Rates) Act 2023 s.1 and Schedule para 1 (11.5% annual rate), read 2026-11-24. 37,700 x 11.5% + 9,730 x 2% = 4,530.10; an evenly paid monthly employee comes to 4,529.22, so the blend is within 1 pound.",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:8cae5d193f27a1976dc03145a16f9ee201c5aed7888fd0c3d8613d625e48756a",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:99723ac97f0d10b5ca3c192ecac001b3e1fc93e6a2fd518604eca3788ccced12",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:c27cfa05460f0911d0ea6e836928d6d25122db531ef94bb6a64c6d7282c4aa81",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:d08e5dcce0962f64ae534bcc85c13db5a10e47390f93ab4370d150e7d13326f4",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:33987d369cde2614f53c981d1e28c59bb21897265ebb2ccd81a1ae77e6ee6326",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:8d143e87c54575ff3a6a3247463abf306933619c4d419d74b16ac44c93902ace",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:60cac16492ff9270dac7956dd8e4eba192291358a2a0ef260d086993341ea102",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:8ba47570eb2f7905ac9124b7a27557644f56304cfb167997bc44c3b997057400",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:d58eaaf9deb190e905e633e0787f495bbcf96af96de7c6aadc926bba6fc85e65",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:537042592581869051685c7ae859dca52491de0236e17d48552e3cd67d1d2f11",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:998606d124faa5cc0a2719ab32157bd3ff0d1fbe75fa4bba37c0e62a0130e174",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:6b658d5c3dbc91eaa26425ed10b8d5ec1e4efa4056437a7ca2ba254c813e55dc",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:a8d450a2c2254e87c81f0b19eed2ce8bfb024b09e3c1e0ef858e339de415d23a",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:f0aff3ad73f19a037e62107b1ba72c5fdc31dc71b743c883082fe77468b483dd",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:2997e496a4e976cbb3ef3be51deee04cb79f99c22b3381ce461d4715c6cc6875",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:d7612e5441abeb624f65be6adc672d7562ea723bb3b12dcbc637faa8dc2c75c4",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:1f503b8c7e9c76151a1656b91579fbdfa33ff6c29a14ded874c2caded82b50f5",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:b4c41e4fc09b1d40d55f8a5df06f6e933c9526beb1d8cc8133da6ac8d55f8a72",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:5896c465cb92fa4ce36c71ac793a426654c1b786f2a4d24fab22f97e915e80b5",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:8986ef5244809d583832e9473e48f28babf6ae2bb3eaca85e06a0358cfd2052e",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:3303a07c5ded758ccffcf8246e040d7de5dfb2d2587725059a0e4cb052f80e20",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:90bb851cf390478ead2d9a3202be132970c8909413d2aaa157b6f8860c242551",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:3559bd4e76be391a7bbd5765ee6b87725b3ba660011827cc29b39af81f6063f2",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:17e59568171cc566d3fdd6655a750ab968b53f8062e8d9fdd4c446cd446a06d4",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:1a5b050e577e3ec63b4e7cf25a9c439d4a8538ad613cbd311cdce0c7891db252",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:b9e86e86dba58c905283244e7c3b4df4e7a09e67997d25ec957e84f1ae8c42f4",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:7bd0ed2b4eec7ef0fd4bc6fb22b1969b1c286bd7483c8f1a655ac364b1c2d555",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:da6017bdbf78ff8f43447e6371d11f7899f113b8520959656689f1b599599953",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:3d5d38e5def9c21423a05e444629da198517fc594bc638c539763115c636ad49",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:ff9223c16a4d964ed70781087b757652c3bb3675d3eed6f8f9b50f730fdd4a3e",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:d052b56af769ccf736f6ca98c2260457918536ea36c324773f9a108264649f63",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:65811aece9183aa1129fb1d45c1c3ee48e94c0d5628b9731a989e3f6417b06df",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:289a148ff474a6c483ddb6ceb50effacbd041b449a5ac7aa9d38dfd85bda16dc",
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
    expected: 0,
    source: "https://www.legislation.gov.uk/uksi/2009/470/regulation/15",
    derivation:
      "SI 2009/470 reg 15(2BA): no part of a plan 5 loan is repayable on or before 5 April 2026. 2023/24 ends 5 April 2024, so nothing is due: 0.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:3202866157b9ad6443337bcb441306f4c3738867402e0844a2fb5bb8ea0f5501",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:d1e23cdf77843279e7586fb886e5778ebceb14f2321b4e079d089fbbbe96ed8a",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:8ffa3f9d4fe4186404ef9550bc7cda6e0f55b9d67839e9b92f2c78ab3e2cf778",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:e387f873fa5680ab7bd5e8414f5c806539b4bcc7af5a1604009f6aa3bd5a3c5a",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:f95f8add27008c361b306cd9b4b882904593b8442e3d8090c0d960d62f068ea5",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:458d275ed722af5f18a18895a248f0c9835cef98209d428a0b68221a2e1c362b",
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
    expected: 0,
    source: "https://www.legislation.gov.uk/uksi/2009/470/regulation/15",
    derivation:
      "SI 2009/470 reg 15(2BA): no part of a plan 5 loan is repayable on or before 5 April 2026. 2024/25 ends 5 April 2025, so nothing is due: 0.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:1529fa8afb3737bb2d33b26a1338479da8d7cd7caa040908879deda5e83fc1ae",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:33e6edcdce72b4a821d902064fa2ff4214e64d6edd0a14ec5e412c90d7d433a7",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:786b79c9b9a61d2c80217720d043a87b39593cf921275e6075a4c888cdba344a",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:c0c7f916f898680d5bfc1a3f38e89a5d6c56ade9ca1956322617ebae2fd75b61",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:0a0fbc1b90166565f03829509ec7003b20a8fb87979bbe798586afdb3183da23",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:c35d006dac9edccdbfa7628e4301023b628c7e6565d1fc7113cb1b99b56a7243",
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
    expected: 0,
    source: "https://www.legislation.gov.uk/uksi/2009/470/regulation/15",
    derivation:
      "SI 2009/470 reg 15(2BA): no part of a plan 5 loan is repayable on or before 5 April 2026. 2025/26 ends 5 April 2026, so nothing is due: 0.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:c25b7a462d31c0a07c470b0d3d7db692d7a061d441a3833622174116d86ac449",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:30fab15ae15a220b88f2d2c89509833edf90195285715cbf8a5ac30059e91cd0",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:f508d0e61c31ab7ef043cae3a7a445bd841fae71e7d5d5053176e2c8cf0ce2a6",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:3bdefca9bb81c4be2fc89b71325446bab54fa243aef3cde63fae5fd0a2771b59",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:4d5563f57e30eb0fef1565bbf63ae509ae527bc0d5135df89bbfba9fde32f745",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:841601605d35fdaea577753c1360b5199c82ba8ea2f94075f61347946bcabd4a",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:d48f779ace594a4a49a5dbf43b832cd2ac99d0399b180539932cc6aca814a0d1",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:7242085e7c245219fedbaeaf5c86a048e71135ad87080ffda99357b57915d3b0",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:9d77ebdca74d02a5ce70390fc2922041504b45e58b0d6f4d761d194cba0cfb37",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:2cced13f2ac43ba4673557c0ab807cf3f1927ec22d92157e156376c3c40e11d8",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:cc1c867a7496d5dfc8631a5d26577b02bc0c63ee2bafbe2780a4b9fce6dc20f1",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:28a64147681db5ebc397d64e6e9fe340e1a70282c2673ace95a4b9922177cfec",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:9bba9404a10f2fc0129604774ac9630194a9ac2a22b7e2350662d32a0e436b95",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:10e8df3599e33e41953aacb9ea6a5fa890aa0347f9ecdf6affa97b4dcba69def",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:84926b08a5111dbc2487e7e235b24d140dfed949a97bb625ab9cf8c2a5c54412",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:97486746696f62b2afdc450393a9887f20f7692bca0bafc3b4e7be75028cb74b",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:b4c8fe25649a010f66b16aa9d4389d1d6f98886b7c7a8ac4e98d74cf7bd94177",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:d949433069febaddc7e7814706fe19a210d124e914e6d35dbdf5410254392762",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:eb8afe93af0fc1fe3856ad64025872c06b21bb34081c87c2e59b75bb6f302cd7",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:b0d9dcec2f90caac5cda3315022ea4ef73b03d97f567d20a950988c8e85b41ed",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:832628ff29ed3bceae4e1fe1d3a148a255d0aee83134aed69cd75bd35fb3a1ce",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:4083a94740dd1b61398d518b0b543724370c3ceca48cbdeff92149962023de48",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:6bd384c56d474b0f9c6a61ecfb27715a93a8209aa285d0bcdb42736b02a51c95",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:6b51f8b2b9bcf4280c73560a0199bb5380221883170297a6b1b97f57d6ed060c",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:a7d2140ff6e494881bf55df81a7ba52e51be9d3e195e5210f6ffe7e0a435ce10",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:4498477e43344489e08abb5b1127c364f4877c0e7f00b8f401bb64769282f5ed",
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
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:a511b4ac5464640f13fae3b8d8bac60ceaf3f7c2e0a03c374f268725468fb9e9",
  },
  {
    id: "scotland.giftAid.2025-26.30000.net1000",
    taxYear: "2025/26",
    region: "SCOTLAND",
    kind: "giftAid",
    input: {
      grossIncome: 30000,
      giftAidNet: 1000,
    },
    expected: 3470.32,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2025-to-2026",
    additionalSources: [
      "https://www.legislation.gov.uk/ukpga/2007/3/section/414",
      "https://www.gov.uk/guidance/adjusted-net-income",
    ],
    derivation:
      "Gross income 30000, net gift 1000. Gross-up 1000 x 1.25 = 1250. Adjusted net income 30000 - 1250 = 28750, no taper, PA 12570. Taxable 30000 - 12570 = 17430. ITA 2007 s.414(2)(b): the upper limit of the Scottish basic rate and the limits of every Scottish rate above it (intermediate, higher, advanced, top as the year has them) rise by the grossed-up gift; the starter band and its upper limit are unchanged because the starter rate is below the Scottish basic rate. Unextended upper bounds 2827/14921/31092/62430/125140 become 2827/16171/32342/63680/126390. Bands: 2827 x 19% = 537.13; 13344 x 20% = 2668.8; 1259 x 21% = 264.39; 0 x 42% = 0; 0 x 45% = 0; 0 x 48% = 0. Total 3470.32. Without the extension (unextended bands) the tax would be 3482.82, which is 12.5 more.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      'UNVERIFIED: hand-derived from ITA 2007 s.414(2)(b) as read on legislation.gov.uk (the revised text and the 06/04/2020 and 06/04/2025 point-in-time versions carry the same wording); no HMRC guidance page confirming the Scottish application was read, and the ITA 2007 does not itself define which Scottish band is the Scottish basic rate (s.6A omitted), so the Scottish Parliament\'s "Basic" band is taken as that rate; owner to review against s.414 before merge.',
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:778f6ff21c7ac8663c5b8a956cc062f1e42349af8a20cebabbae6d887fb113a6",
    rulingRef:
      "ITA 2007 s.414(2)(b), read on legislation.gov.uk 2026-11-24, raises the Scottish basic rate limit and the limits above it by the grossed-up gift; s.989 makes the Scottish basic rate the 20% band, so the starter band stays at 2,827 and every limit above it rises by 1,250.",
  },
  {
    id: "scotland.giftAid.2025-26.28000.net1000",
    taxYear: "2025/26",
    region: "SCOTLAND",
    kind: "giftAid",
    input: {
      grossIncome: 28000,
      giftAidNet: 1000,
    },
    expected: 3057.73,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2025-to-2026",
    additionalSources: [
      "https://www.legislation.gov.uk/ukpga/2007/3/section/414",
      "https://www.gov.uk/guidance/adjusted-net-income",
    ],
    derivation:
      "Gross income 28000, net gift 1000. Gross-up 1000 x 1.25 = 1250. Adjusted net income 28000 - 1250 = 26750, no taper, PA 12570. Taxable 28000 - 12570 = 15430. ITA 2007 s.414(2)(b): the upper limit of the Scottish basic rate and the limits of every Scottish rate above it (intermediate, higher, advanced, top as the year has them) rise by the grossed-up gift; the starter band and its upper limit are unchanged because the starter rate is below the Scottish basic rate. Unextended upper bounds 2827/14921/31092/62430/125140 become 2827/16171/32342/63680/126390. Bands: 2827 x 19% = 537.13; 12603 x 20% = 2520.6; 0 x 21% = 0; 0 x 42% = 0; 0 x 45% = 0; 0 x 48% = 0. Total 3057.73. Without the extension (unextended bands) the tax would be 3062.82, which is 5.09 more.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      'UNVERIFIED: hand-derived from ITA 2007 s.414(2)(b) as read on legislation.gov.uk (the revised text and the 06/04/2020 and 06/04/2025 point-in-time versions carry the same wording); no HMRC guidance page confirming the Scottish application was read, and the ITA 2007 does not itself define which Scottish band is the Scottish basic rate (s.6A omitted), so the Scottish Parliament\'s "Basic" band is taken as that rate; owner to review against s.414 before merge.',
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:3340ce7eeba45b4c4b0dc546d4a750daaa93eadeb105c339e7c5b782e8370348",
    rulingRef:
      "ITA 2007 s.414(2)(b) with s.989 extends the 20% Scottish basic band limit and all limits above it by the grossed-up gift, leaving the starter band unchanged; the extended basic band covers all income above the starter band, giving 3,057.73.",
  },
  {
    id: "scotland.giftAid.2025-26.29000.net1000",
    taxYear: "2025/26",
    region: "SCOTLAND",
    kind: "giftAid",
    input: {
      grossIncome: 29000,
      giftAidNet: 1000,
    },
    expected: 3260.32,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2025-to-2026",
    additionalSources: [
      "https://www.legislation.gov.uk/ukpga/2007/3/section/414",
      "https://www.gov.uk/guidance/adjusted-net-income",
    ],
    derivation:
      "Gross income 29000, net gift 1000. Gross-up 1000 x 1.25 = 1250. Adjusted net income 29000 - 1250 = 27750, no taper, PA 12570. Taxable 29000 - 12570 = 16430. ITA 2007 s.414(2)(b): the upper limit of the Scottish basic rate and the limits of every Scottish rate above it (intermediate, higher, advanced, top as the year has them) rise by the grossed-up gift; the starter band and its upper limit are unchanged because the starter rate is below the Scottish basic rate. Unextended upper bounds 2827/14921/31092/62430/125140 become 2827/16171/32342/63680/126390. Bands: 2827 x 19% = 537.13; 13344 x 20% = 2668.8; 259 x 21% = 54.39; 0 x 42% = 0; 0 x 45% = 0; 0 x 48% = 0. Total 3260.32. Without the extension (unextended bands) the tax would be 3272.82, which is 12.5 more.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      'UNVERIFIED: hand-derived from ITA 2007 s.414(2)(b) as read on legislation.gov.uk (the revised text and the 06/04/2020 and 06/04/2025 point-in-time versions carry the same wording); no HMRC guidance page confirming the Scottish application was read, and the ITA 2007 does not itself define which Scottish band is the Scottish basic rate (s.6A omitted), so the Scottish Parliament\'s "Basic" band is taken as that rate; owner to review against s.414 before merge.',
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:744cdc6ac72f4865d34da546105adc4f66329b805a9e31c36f38947475b4f228",
    rulingRef:
      "ITA 2007 s.414(2)(b) with s.989 extends the 20% Scottish basic band limit and all limits above it by 1,250, leaving the starter band unchanged.",
  },
  {
    id: "scotland.giftAid.2025-26.60000.net1000",
    taxYear: "2025/26",
    region: "SCOTLAND",
    kind: "giftAid",
    input: {
      grossIncome: 60000,
      giftAidNet: 1000,
    },
    expected: 12938.8,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2025-to-2026",
    additionalSources: [
      "https://www.legislation.gov.uk/ukpga/2007/3/section/414",
      "https://www.gov.uk/guidance/adjusted-net-income",
    ],
    derivation:
      "Gross income 60000, net gift 1000. Gross-up 1000 x 1.25 = 1250. Adjusted net income 60000 - 1250 = 58750, no taper, PA 12570. Taxable 60000 - 12570 = 47430. ITA 2007 s.414(2)(b): the upper limit of the Scottish basic rate and the limits of every Scottish rate above it (intermediate, higher, advanced, top as the year has them) rise by the grossed-up gift; the starter band and its upper limit are unchanged because the starter rate is below the Scottish basic rate. Unextended upper bounds 2827/14921/31092/62430/125140 become 2827/16171/32342/63680/126390. Bands: 2827 x 19% = 537.13; 13344 x 20% = 2668.8; 16171 x 21% = 3395.91; 15088 x 42% = 6336.96; 0 x 45% = 0; 0 x 48% = 0. Total 12938.8. Without the extension (unextended bands) the tax would be 13213.8, which is 275 more.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      'UNVERIFIED: hand-derived from ITA 2007 s.414(2)(b) as read on legislation.gov.uk (the revised text and the 06/04/2020 and 06/04/2025 point-in-time versions carry the same wording); no HMRC guidance page confirming the Scottish application was read, and the ITA 2007 does not itself define which Scottish band is the Scottish basic rate (s.6A omitted), so the Scottish Parliament\'s "Basic" band is taken as that rate; owner to review against s.414 before merge.',
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:0d10c934efcb894086dac91e5b753cc2fe667f9da9d036a26f71190610abbc39",
    rulingRef:
      "ITA 2007 s.414(2)(b) with s.989 extends the 20% Scottish basic band limit and all limits above it by 1,250, leaving the starter band unchanged.",
  },
  {
    id: "scotland.giftAid.2025-26.70000.net4000",
    taxYear: "2025/26",
    region: "SCOTLAND",
    kind: "giftAid",
    input: {
      grossIncome: 70000,
      giftAidNet: 4000,
    },
    expected: 16313.8,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2025-to-2026",
    additionalSources: [
      "https://www.legislation.gov.uk/ukpga/2007/3/section/414",
      "https://www.gov.uk/guidance/adjusted-net-income",
    ],
    derivation:
      "Gross income 70000, net gift 4000. Gross-up 4000 x 1.25 = 5000. Adjusted net income 70000 - 5000 = 65000, no taper, PA 12570. Taxable 70000 - 12570 = 57430. ITA 2007 s.414(2)(b): the upper limit of the Scottish basic rate and the limits of every Scottish rate above it (intermediate, higher, advanced, top as the year has them) rise by the grossed-up gift; the starter band and its upper limit are unchanged because the starter rate is below the Scottish basic rate. Unextended upper bounds 2827/14921/31092/62430/125140 become 2827/19921/36092/67430/130140. Bands: 2827 x 19% = 537.13; 17094 x 20% = 3418.8; 16171 x 21% = 3395.91; 21338 x 42% = 8961.96; 0 x 45% = 0; 0 x 48% = 0. Total 16313.8. Without the extension (unextended bands) the tax would be 17413.8, which is 1100 more.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      'UNVERIFIED: hand-derived from ITA 2007 s.414(2)(b) as read on legislation.gov.uk (the revised text and the 06/04/2020 and 06/04/2025 point-in-time versions carry the same wording); no HMRC guidance page confirming the Scottish application was read, and the ITA 2007 does not itself define which Scottish band is the Scottish basic rate (s.6A omitted), so the Scottish Parliament\'s "Basic" band is taken as that rate; owner to review against s.414 before merge.',
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:3f333f8cbcf1626158ccb35bcf16b91a459509e0a01edaf14d80bfc40604c537",
    rulingRef:
      "ITA 2007 s.414(2)(b) with s.989 extends the 20% Scottish basic band limit and all limits above it by the grossed-up gift of 5,000, leaving the starter band unchanged.",
  },
  {
    id: "scotland.giftAid.2025-26.110000.net1000",
    taxYear: "2025/26",
    region: "SCOTLAND",
    kind: "giftAid",
    input: {
      grossIncome: 110000,
      giftAidNet: 1000,
    },
    expected: 36920.05,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2025-to-2026",
    additionalSources: [
      "https://www.legislation.gov.uk/ukpga/2007/3/section/414",
      "https://www.gov.uk/guidance/adjusted-net-income",
    ],
    derivation:
      "Gross income 110000, net gift 1000. Gross-up 1000 x 1.25 = 1250. Adjusted net income 110000 - 1250 = 108750; taper (108750 - 100000) / 2 = 4375, PA 12570 - 4375 = 8195. Taxable 110000 - 8195 = 101805. ITA 2007 s.414(2)(b): the upper limit of the Scottish basic rate and the limits of every Scottish rate above it (intermediate, higher, advanced, top as the year has them) rise by the grossed-up gift; the starter band and its upper limit are unchanged because the starter rate is below the Scottish basic rate. Unextended upper bounds 2827/14921/31092/62430/125140 become 2827/16171/32342/63680/126390. Bands: 2827 x 19% = 537.13; 13344 x 20% = 2668.8; 16171 x 21% = 3395.91; 31338 x 42% = 13161.96; 38125 x 45% = 17156.25; 0 x 48% = 0. Total 36920.05. Without the extension (unextended bands) the tax would be 37232.55, which is 312.5 more.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      'UNVERIFIED: hand-derived from ITA 2007 s.414(2)(b) as read on legislation.gov.uk (the revised text and the 06/04/2020 and 06/04/2025 point-in-time versions carry the same wording); no HMRC guidance page confirming the Scottish application was read, and the ITA 2007 does not itself define which Scottish band is the Scottish basic rate (s.6A omitted), so the Scottish Parliament\'s "Basic" band is taken as that rate; owner to review against s.414 before merge. Also rests on the taper frame for Scottish bands (sheet ruling 6).',
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:2e3bf22b219642c84742ab20ab621a1410e1b784e3990f64c800924d8f8a564c",
    rulingRef:
      "ITA 2007 s.414(2)(b) with s.989 extends the 20% basic band limit and those above by 1,250; GOV.UK sets Scottish bands on income after allowances, so the tapered allowance (8,195 at adjusted net income 108,750) raises taxable income without moving the limits.",
  },
  {
    id: "scotland.giftAid.2025-26.130000.net1000",
    taxYear: "2025/26",
    region: "SCOTLAND",
    kind: "giftAid",
    input: {
      grossIncome: 130000,
      giftAidNet: 1000,
    },
    expected: 49716.1,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2025-to-2026",
    additionalSources: [
      "https://www.legislation.gov.uk/ukpga/2007/3/section/414",
      "https://www.gov.uk/guidance/adjusted-net-income",
    ],
    derivation:
      "Gross income 130000, net gift 1000. Gross-up 1000 x 1.25 = 1250. Adjusted net income 130000 - 1250 = 128750; taper (128750 - 100000) / 2 = 14375, PA 12570 - 14375 = -1805 so PA 0 (rounded up to a whole pound, floored at 0). Taxable 130000 - 0 = 130000. ITA 2007 s.414(2)(b): the upper limit of the Scottish basic rate and the limits of every Scottish rate above it (intermediate, higher, advanced, top as the year has them) rise by the grossed-up gift; the starter band and its upper limit are unchanged because the starter rate is below the Scottish basic rate. Unextended upper bounds 2827/14921/31092/62430/125140 become 2827/16171/32342/63680/126390. Bands: 2827 x 19% = 537.13; 13344 x 20% = 2668.8; 16171 x 21% = 3395.91; 31338 x 42% = 13161.96; 62710 x 45% = 28219.5; 3610 x 48% = 1732.8. Total 49716.1. Without the extension (unextended bands) the tax would be 50066.1, which is 350 more.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      'UNVERIFIED: hand-derived from ITA 2007 s.414(2)(b) as read on legislation.gov.uk (the revised text and the 06/04/2020 and 06/04/2025 point-in-time versions carry the same wording); no HMRC guidance page confirming the Scottish application was read, and the ITA 2007 does not itself define which Scottish band is the Scottish basic rate (s.6A omitted), so the Scottish Parliament\'s "Basic" band is taken as that rate; owner to review against s.414 before merge. Also rests on the taper frame for Scottish bands (sheet ruling 6).',
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:e131765d56f4ee27930ea26e11b889b09e6c25199310fceabaa0d59fc81bd556",
    rulingRef:
      "ITA 2007 s.414(2)(b) with s.989 extends the 20% basic band limit and those above by 1,250; the allowance is nil at adjusted net income 128,750 and bands apply to income after allowances (GOV.UK), so the top rate starts at taxable 126,390.",
  },
  {
    id: "scotland.giftAid.2026-27.30000.net1000",
    taxYear: "2026/27",
    region: "SCOTLAND",
    kind: "giftAid",
    input: {
      grossIncome: 30000,
      giftAidNet: 1000,
    },
    expected: 3446.33,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027",
    additionalSources: [
      "https://www.legislation.gov.uk/ukpga/2007/3/section/414",
      "https://www.gov.uk/guidance/adjusted-net-income",
    ],
    derivation:
      "Gross income 30000, net gift 1000. Gross-up 1000 x 1.25 = 1250. Adjusted net income 30000 - 1250 = 28750, no taper, PA 12570. Taxable 30000 - 12570 = 17430. ITA 2007 s.414(2)(b): the upper limit of the Scottish basic rate and the limits of every Scottish rate above it (intermediate, higher, advanced, top as the year has them) rise by the grossed-up gift; the starter band and its upper limit are unchanged because the starter rate is below the Scottish basic rate. Unextended upper bounds 3967/16956/31092/62430/125140 become 3967/18206/32342/63680/126390. Bands: 3967 x 19% = 753.73; 13463 x 20% = 2692.6; 0 x 21% = 0; 0 x 42% = 0; 0 x 45% = 0; 0 x 48% = 0. Total 3446.33. Without the extension (unextended bands) the tax would be 3451.07, which is 4.74 more.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      'UNVERIFIED: hand-derived from ITA 2007 s.414(2)(b) as read on legislation.gov.uk (the revised text and the 06/04/2020 and 06/04/2025 point-in-time versions carry the same wording); no HMRC guidance page confirming the Scottish application was read, and the ITA 2007 does not itself define which Scottish band is the Scottish basic rate (s.6A omitted), so the Scottish Parliament\'s "Basic" band is taken as that rate; owner to review against s.414 before merge.',
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:f32f242ab414129881086bef30ce06e4ce649d0a015c07da8ae28a9a567e4669",
    rulingRef:
      "ITA 2007 s.414(2)(b), read on legislation.gov.uk 2026-11-24, raises the Scottish basic rate limit and the limits above it by the grossed-up gift; s.989 defines the Scottish basic rate as the 20% band, so the 19% starter band stays at 3,967.",
  },
  {
    id: "scotland.giftAid.2026-27.60000.net1000",
    taxYear: "2026/27",
    region: "SCOTLAND",
    kind: "giftAid",
    input: {
      grossIncome: 60000,
      giftAidNet: 1000,
    },
    expected: 12907.05,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027",
    additionalSources: [
      "https://www.legislation.gov.uk/ukpga/2007/3/section/414",
      "https://www.gov.uk/guidance/adjusted-net-income",
    ],
    derivation:
      "Gross income 60000, net gift 1000. Gross-up 1000 x 1.25 = 1250. Adjusted net income 60000 - 1250 = 58750, no taper, PA 12570. Taxable 60000 - 12570 = 47430. ITA 2007 s.414(2)(b): the upper limit of the Scottish basic rate and the limits of every Scottish rate above it (intermediate, higher, advanced, top as the year has them) rise by the grossed-up gift; the starter band and its upper limit are unchanged because the starter rate is below the Scottish basic rate. Unextended upper bounds 3967/16956/31092/62430/125140 become 3967/18206/32342/63680/126390. Bands: 3967 x 19% = 753.73; 14239 x 20% = 2847.8; 14136 x 21% = 2968.56; 15088 x 42% = 6336.96; 0 x 45% = 0; 0 x 48% = 0. Total 12907.05. Without the extension (unextended bands) the tax would be 13182.05, which is 275 more.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      'UNVERIFIED: hand-derived from ITA 2007 s.414(2)(b) as read on legislation.gov.uk (the revised text and the 06/04/2020 and 06/04/2025 point-in-time versions carry the same wording); no HMRC guidance page confirming the Scottish application was read, and the ITA 2007 does not itself define which Scottish band is the Scottish basic rate (s.6A omitted), so the Scottish Parliament\'s "Basic" band is taken as that rate; owner to review against s.414 before merge.',
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:fb598c9c1bec3d02057a5805b239acba1328c604e5e116cdce8b050a281e91dc",
    rulingRef:
      "ITA 2007 s.414(2)(b) with s.989 extends the basic, intermediate, higher, advanced and top limits by 1,250 and leaves the starter band unchanged; bounds 3967/18206/32342/63680/126390 and total 12,907.05 are correct.",
  },
  {
    id: "scotland.giftAid.2026-27.110000.net1000",
    taxYear: "2026/27",
    region: "SCOTLAND",
    kind: "giftAid",
    input: {
      grossIncome: 110000,
      giftAidNet: 1000,
    },
    expected: 36888.3,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027",
    additionalSources: [
      "https://www.legislation.gov.uk/ukpga/2007/3/section/414",
      "https://www.gov.uk/guidance/adjusted-net-income",
    ],
    derivation:
      "Gross income 110000, net gift 1000. Gross-up 1000 x 1.25 = 1250. Adjusted net income 110000 - 1250 = 108750; taper (108750 - 100000) / 2 = 4375, PA 12570 - 4375 = 8195. Taxable 110000 - 8195 = 101805. ITA 2007 s.414(2)(b): the upper limit of the Scottish basic rate and the limits of every Scottish rate above it (intermediate, higher, advanced, top as the year has them) rise by the grossed-up gift; the starter band and its upper limit are unchanged because the starter rate is below the Scottish basic rate. Unextended upper bounds 3967/16956/31092/62430/125140 become 3967/18206/32342/63680/126390. Bands: 3967 x 19% = 753.73; 14239 x 20% = 2847.8; 14136 x 21% = 2968.56; 31338 x 42% = 13161.96; 38125 x 45% = 17156.25; 0 x 48% = 0. Total 36888.3. Without the extension (unextended bands) the tax would be 37200.8, which is 312.5 more.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      'UNVERIFIED: hand-derived from ITA 2007 s.414(2)(b) as read on legislation.gov.uk (the revised text and the 06/04/2020 and 06/04/2025 point-in-time versions carry the same wording); no HMRC guidance page confirming the Scottish application was read, and the ITA 2007 does not itself define which Scottish band is the Scottish basic rate (s.6A omitted), so the Scottish Parliament\'s "Basic" band is taken as that rate; owner to review against s.414 before merge. Also rests on the taper frame for Scottish bands (sheet ruling 6).',
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:92074a5eb78f80cc0ce75f11663120cd81103b5095e1faef3362d234372b26e9",
    rulingRef:
      "ITA 2007 s.414(2)(b) with s.989 extends every Scottish limit from the basic rate upward by 1,250; the allowance taper on adjusted net income 108,750 is the UK-wide rule (GOV.UK rates and allowances page) and Scottish bands apply after the reduced allowance.",
  },
  {
    id: "scotland.giftAid.2020-21.30000.net1000",
    taxYear: "2020/21",
    region: "SCOTLAND",
    kind: "giftAid",
    input: {
      grossIncome: 30000,
      giftAidNet: 1000,
    },
    expected: 3515.07,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2020-to-2021",
    additionalSources: [
      "https://www.legislation.gov.uk/ukpga/2007/3/section/414",
      "https://www.gov.uk/guidance/adjusted-net-income",
    ],
    derivation:
      "Gross income 30000, net gift 1000. Gross-up 1000 x 1.25 = 1250. Adjusted net income 30000 - 1250 = 28750, no taper, PA 12500. Taxable 30000 - 12500 = 17500. ITA 2007 s.414(2)(b): the upper limit of the Scottish basic rate and the limits of every Scottish rate above it (intermediate, higher, advanced, top as the year has them) rise by the grossed-up gift; the starter band and its upper limit are unchanged because the starter rate is below the Scottish basic rate. Unextended upper bounds 2085/12658/30930/150000 become 2085/13908/32180/151250. Bands: 2085 x 19% = 396.15; 11823 x 20% = 2364.6; 3592 x 21% = 754.32; 0 x 41% = 0; 0 x 46% = 0. Total 3515.07. Without the extension (unextended bands) the tax would be 3527.57, which is 12.5 more.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      'UNVERIFIED: hand-derived from ITA 2007 s.414(2)(b) as read on legislation.gov.uk (the revised text and the 06/04/2020 and 06/04/2025 point-in-time versions carry the same wording); no HMRC guidance page confirming the Scottish application was read, and the ITA 2007 does not itself define which Scottish band is the Scottish basic rate (s.6A omitted), so the Scottish Parliament\'s "Basic" band is taken as that rate; owner to review against s.414 before merge.',
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:d14ca565168dd1bbd99d1b7c2e25768c234e9d722bf4cbea3ab8f7527bd4d816",
    rulingRef:
      'ITA 2007 s.414(2)(b) (as at 06/04/2020) with s.989 "Scottish basic rate" = the rate so named by the Scottish rate resolution, read legislation.gov.uk 2026-11-24: basic and higher limits rise 1,250, starter unchanged; 3,515.07.',
  },
  {
    id: "scotland.giftAid.2020-21.26000.net1000",
    taxYear: "2020/21",
    region: "SCOTLAND",
    kind: "giftAid",
    input: {
      grossIncome: 26000,
      giftAidNet: 1000,
    },
    expected: 2679.15,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2020-to-2021",
    additionalSources: [
      "https://www.legislation.gov.uk/ukpga/2007/3/section/414",
      "https://www.gov.uk/guidance/adjusted-net-income",
    ],
    derivation:
      "Gross income 26000, net gift 1000. Gross-up 1000 x 1.25 = 1250. Adjusted net income 26000 - 1250 = 24750, no taper, PA 12500. Taxable 26000 - 12500 = 13500. ITA 2007 s.414(2)(b): the upper limit of the Scottish basic rate and the limits of every Scottish rate above it (intermediate, higher, advanced, top as the year has them) rise by the grossed-up gift; the starter band and its upper limit are unchanged because the starter rate is below the Scottish basic rate. Unextended upper bounds 2085/12658/30930/150000 become 2085/13908/32180/151250. Bands: 2085 x 19% = 396.15; 11415 x 20% = 2283; 0 x 21% = 0; 0 x 41% = 0; 0 x 46% = 0. Total 2679.15. Without the extension (unextended bands) the tax would be 2687.57, which is 8.42 more.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      'UNVERIFIED: hand-derived from ITA 2007 s.414(2)(b) as read on legislation.gov.uk (the revised text and the 06/04/2020 and 06/04/2025 point-in-time versions carry the same wording); no HMRC guidance page confirming the Scottish application was read, and the ITA 2007 does not itself define which Scottish band is the Scottish basic rate (s.6A omitted), so the Scottish Parliament\'s "Basic" band is taken as that rate; owner to review against s.414 before merge.',
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:dcd70155fb280598fefc35b8d1f6a1ee71f7bf751a49c293ed4d3a0948097b3c",
    rulingRef:
      "ITA 2007 s.414(2)(b) with s.989, read on legislation.gov.uk 2026-11-24: basic limit 13,908, starter 2,085 unchanged; 396.15 + 11,415 x 20% = 2,679.15.",
  },
  {
    id: "scotland.giftAid.2020-21.27000.net1000",
    taxYear: "2020/21",
    region: "SCOTLAND",
    kind: "giftAid",
    input: {
      grossIncome: 27000,
      giftAidNet: 1000,
    },
    expected: 2885.07,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2020-to-2021",
    additionalSources: [
      "https://www.legislation.gov.uk/ukpga/2007/3/section/414",
      "https://www.gov.uk/guidance/adjusted-net-income",
    ],
    derivation:
      "Gross income 27000, net gift 1000. Gross-up 1000 x 1.25 = 1250. Adjusted net income 27000 - 1250 = 25750, no taper, PA 12500. Taxable 27000 - 12500 = 14500. ITA 2007 s.414(2)(b): the upper limit of the Scottish basic rate and the limits of every Scottish rate above it (intermediate, higher, advanced, top as the year has them) rise by the grossed-up gift; the starter band and its upper limit are unchanged because the starter rate is below the Scottish basic rate. Unextended upper bounds 2085/12658/30930/150000 become 2085/13908/32180/151250. Bands: 2085 x 19% = 396.15; 11823 x 20% = 2364.6; 592 x 21% = 124.32; 0 x 41% = 0; 0 x 46% = 0. Total 2885.07. Without the extension (unextended bands) the tax would be 2897.57, which is 12.5 more.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      'UNVERIFIED: hand-derived from ITA 2007 s.414(2)(b) as read on legislation.gov.uk (the revised text and the 06/04/2020 and 06/04/2025 point-in-time versions carry the same wording); no HMRC guidance page confirming the Scottish application was read, and the ITA 2007 does not itself define which Scottish band is the Scottish basic rate (s.6A omitted), so the Scottish Parliament\'s "Basic" band is taken as that rate; owner to review against s.414 before merge.',
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:c90280730d4246c2790b08ea129a533650b2211110cc0449a92020b37dddbe59",
    rulingRef:
      "ITA 2007 s.414(2)(b) with s.989, read on legislation.gov.uk 2026-11-24: starter unchanged, limits above it raised 1,250; 396.15 + 2,364.60 + 592 x 21% = 2,885.07.",
  },
  {
    id: "scotland.giftAid.2020-21.60000.net1000",
    taxYear: "2020/21",
    region: "SCOTLAND",
    kind: "giftAid",
    input: {
      grossIncome: 60000,
      giftAidNet: 1000,
    },
    expected: 12879.07,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2020-to-2021",
    additionalSources: [
      "https://www.legislation.gov.uk/ukpga/2007/3/section/414",
      "https://www.gov.uk/guidance/adjusted-net-income",
    ],
    derivation:
      "Gross income 60000, net gift 1000. Gross-up 1000 x 1.25 = 1250. Adjusted net income 60000 - 1250 = 58750, no taper, PA 12500. Taxable 60000 - 12500 = 47500. ITA 2007 s.414(2)(b): the upper limit of the Scottish basic rate and the limits of every Scottish rate above it (intermediate, higher, advanced, top as the year has them) rise by the grossed-up gift; the starter band and its upper limit are unchanged because the starter rate is below the Scottish basic rate. Unextended upper bounds 2085/12658/30930/150000 become 2085/13908/32180/151250. Bands: 2085 x 19% = 396.15; 11823 x 20% = 2364.6; 18272 x 21% = 3837.12; 15320 x 41% = 6281.2; 0 x 46% = 0. Total 12879.07. Without the extension (unextended bands) the tax would be 13141.57, which is 262.5 more.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      'UNVERIFIED: hand-derived from ITA 2007 s.414(2)(b) as read on legislation.gov.uk (the revised text and the 06/04/2020 and 06/04/2025 point-in-time versions carry the same wording); no HMRC guidance page confirming the Scottish application was read, and the ITA 2007 does not itself define which Scottish band is the Scottish basic rate (s.6A omitted), so the Scottish Parliament\'s "Basic" band is taken as that rate; owner to review against s.414 before merge.',
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:9804ae7520d6306b41751a89997d59eaf811e977ff4799cad01bcf27f3045f34",
    rulingRef:
      "ITA 2007 s.414(2)(b) with s.989, read on legislation.gov.uk 2026-11-24: limits 2,085/13,908/32,180; 15,320 x 41% in higher; 12,879.07.",
  },
  {
    id: "scotland.giftAid.2020-21.110000.net1000",
    taxYear: "2020/21",
    region: "SCOTLAND",
    kind: "giftAid",
    input: {
      grossIncome: 110000,
      giftAidNet: 1000,
    },
    expected: 35172.82,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2020-to-2021",
    additionalSources: [
      "https://www.legislation.gov.uk/ukpga/2007/3/section/414",
      "https://www.gov.uk/guidance/adjusted-net-income",
    ],
    derivation:
      "Gross income 110000, net gift 1000. Gross-up 1000 x 1.25 = 1250. Adjusted net income 110000 - 1250 = 108750; taper (108750 - 100000) / 2 = 4375, PA 12500 - 4375 = 8125. Taxable 110000 - 8125 = 101875. ITA 2007 s.414(2)(b): the upper limit of the Scottish basic rate and the limits of every Scottish rate above it (intermediate, higher, advanced, top as the year has them) rise by the grossed-up gift; the starter band and its upper limit are unchanged because the starter rate is below the Scottish basic rate. Unextended upper bounds 2085/12658/30930/150000 become 2085/13908/32180/151250. Bands: 2085 x 19% = 396.15; 11823 x 20% = 2364.6; 18272 x 21% = 3837.12; 69695 x 41% = 28574.95; 0 x 46% = 0. Total 35172.82. Without the extension (unextended bands) the tax would be 35435.32, which is 262.5 more.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      'UNVERIFIED: hand-derived from ITA 2007 s.414(2)(b) as read on legislation.gov.uk (the revised text and the 06/04/2020 and 06/04/2025 point-in-time versions carry the same wording); no HMRC guidance page confirming the Scottish application was read, and the ITA 2007 does not itself define which Scottish band is the Scottish basic rate (s.6A omitted), so the Scottish Parliament\'s "Basic" band is taken as that rate; owner to review against s.414 before merge. Also rests on the taper frame for Scottish bands (sheet ruling 6).',
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:146ba0b738acd7a4135cd249cd613517e9aef70e900f3140c95d9e597285cbbf",
    rulingRef:
      "ITA 2007 s.414(2)(b) with s.989 plus ss.35(2), 58 Step 2, read on legislation.gov.uk 2026-11-24: ANI 108,750, PA 8,125; bands fixed on taxable income, limits raised 1,250; 35,172.82.",
  },
  {
    id: "scotland.giftAid.2020-21.160000.net1000",
    taxYear: "2020/21",
    region: "SCOTLAND",
    kind: "giftAid",
    input: {
      grossIncome: 160000,
      giftAidNet: 1000,
    },
    expected: 59441.57,
    source: "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2020-to-2021",
    additionalSources: [
      "https://www.legislation.gov.uk/ukpga/2007/3/section/414",
      "https://www.gov.uk/guidance/adjusted-net-income",
    ],
    derivation:
      "Gross income 160000, net gift 1000. Gross-up 1000 x 1.25 = 1250. Adjusted net income 160000 - 1250 = 158750; taper (158750 - 100000) / 2 = 29375, PA 12500 - 29375 = -16875 so PA 0 (rounded up to a whole pound, floored at 0). Taxable 160000 - 0 = 160000. ITA 2007 s.414(2)(b): the upper limit of the Scottish basic rate and the limits of every Scottish rate above it (intermediate, higher, advanced, top as the year has them) rise by the grossed-up gift; the starter band and its upper limit are unchanged because the starter rate is below the Scottish basic rate. Unextended upper bounds 2085/12658/30930/150000 become 2085/13908/32180/151250. Bands: 2085 x 19% = 396.15; 11823 x 20% = 2364.6; 18272 x 21% = 3837.12; 119070 x 41% = 48818.7; 8750 x 46% = 4025. Total 59441.57. Without the extension (unextended bands) the tax would be 59766.57, which is 325 more.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      'UNVERIFIED: hand-derived from ITA 2007 s.414(2)(b) as read on legislation.gov.uk (the revised text and the 06/04/2020 and 06/04/2025 point-in-time versions carry the same wording); no HMRC guidance page confirming the Scottish application was read, and the ITA 2007 does not itself define which Scottish band is the Scottish basic rate (s.6A omitted), so the Scottish Parliament\'s "Basic" band is taken as that rate; owner to review against s.414 before merge. Also rests on the taper frame for Scottish bands (sheet ruling 6).',
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:63445cb4f615f59906e1c5a0e848ee6cf8bceedb801d4b7f1dd171fc4a672c71",
    rulingRef:
      "ITA 2007 s.414(2)(b) with s.989, read on legislation.gov.uk 2026-11-24: PA nil; top limit is a Scottish rate limit above basic so rises to 151,250; 8,750 x 46%; 59,441.57.",
  },
  {
    id: "ewni.incomeTax.2027-28.30000",
    taxYear: "2027/28",
    region: "ENGLAND_NI_WALES",
    kind: "incomeTax",
    input: {
      grossIncome: 30000,
    },
    expected: 3486,
    source:
      "https://www.gov.uk/government/publications/budget-2026-overview-of-tax-legislation-and-rates-ootlar/annex-a-rates-and-allowances",
    additionalSources: [
      "https://www.legislation.gov.uk/ukpga/2026/11/section/10/enacted",
      "https://www.gov.uk/government/publications/budget-2026-overview-of-tax-legislation-and-rates-ootlar/budget-2026-overview-of-tax-legislation-and-rates-ootlar",
    ],
    derivation:
      "Gross income 30000. PA 12570 (no taper at adjusted net income 30000). Taxable 30000 - 12570 = 17430. Basic 17430 x 20% = 3486; higher 0 x 40% = 0; additional 0 x 45% = 0. Total 3486. 2027/28 figures: main rates 20%, 40% and 45% are announced, not yet law.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "owner",
    signedOffAt: "2026-11-20",
    signedOffHash: "a47cd70f893bb6626744ff18aeab37ef101434a86779719dc686ddb47a3b5920",
  },
  {
    id: "ewni.incomeTax.2027-28.60000",
    taxYear: "2027/28",
    region: "ENGLAND_NI_WALES",
    kind: "incomeTax",
    input: {
      grossIncome: 60000,
    },
    expected: 11432,
    source:
      "https://www.gov.uk/government/publications/budget-2026-overview-of-tax-legislation-and-rates-ootlar/annex-a-rates-and-allowances",
    additionalSources: [
      "https://www.legislation.gov.uk/ukpga/2026/11/section/10/enacted",
      "https://www.gov.uk/government/publications/budget-2026-overview-of-tax-legislation-and-rates-ootlar/budget-2026-overview-of-tax-legislation-and-rates-ootlar",
    ],
    derivation:
      "Gross income 60000. PA 12570 (no taper at adjusted net income 60000). Taxable 60000 - 12570 = 47430. Basic 37700 x 20% = 7540; higher 9730 x 40% = 3892; additional 0 x 45% = 0. Total 11432. 2027/28 figures: main rates 20%, 40% and 45% are announced, not yet law.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "owner",
    signedOffAt: "2026-11-20",
    signedOffHash: "253bc8382949301eb7b1e93fb45bfa79a59dca54b29361a8aa46a99b1a9dee05",
  },
  {
    id: "ewni.incomeTax.2027-28.100000",
    taxYear: "2027/28",
    region: "ENGLAND_NI_WALES",
    kind: "incomeTax",
    input: {
      grossIncome: 100000,
    },
    expected: 27432,
    source:
      "https://www.gov.uk/government/publications/budget-2026-overview-of-tax-legislation-and-rates-ootlar/annex-a-rates-and-allowances",
    additionalSources: [
      "https://www.legislation.gov.uk/ukpga/2026/11/section/10/enacted",
      "https://www.gov.uk/government/publications/budget-2026-overview-of-tax-legislation-and-rates-ootlar/budget-2026-overview-of-tax-legislation-and-rates-ootlar",
    ],
    derivation:
      "Gross income 100000. PA 12570 (no taper at adjusted net income 100000). Taxable 100000 - 12570 = 87430. Basic 37700 x 20% = 7540; higher 49730 x 40% = 19892; additional 0 x 45% = 0. Total 27432. 2027/28 figures: main rates 20%, 40% and 45% are announced, not yet law.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "owner",
    signedOffAt: "2026-11-20",
    signedOffHash: "62efc66d33965a6ac57ea8ce9105e72b29e9057510df72832915aa1747cc60f0",
  },
  {
    id: "ewni.incomeTax.2027-28.110000",
    taxYear: "2027/28",
    region: "ENGLAND_NI_WALES",
    kind: "incomeTax",
    input: {
      grossIncome: 110000,
    },
    expected: 33432,
    source:
      "https://www.gov.uk/government/publications/budget-2026-overview-of-tax-legislation-and-rates-ootlar/annex-a-rates-and-allowances",
    additionalSources: [
      "https://www.legislation.gov.uk/ukpga/2026/11/section/10/enacted",
      "https://www.gov.uk/government/publications/budget-2026-overview-of-tax-legislation-and-rates-ootlar/budget-2026-overview-of-tax-legislation-and-rates-ootlar",
    ],
    derivation:
      "Gross income 110000. Taper: (110000 - 100000) / 2 = 5000, PA 12570 - 5000 = 7570. Taxable 110000 - 7570 = 102430. Basic 37700 x 20% = 7540; higher 64730 x 40% = 25892; additional 0 x 45% = 0. Total 33432. 2027/28 figures: main rates 20%, 40% and 45% are announced, not yet law.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "owner",
    signedOffAt: "2026-11-20",
    signedOffHash: "ef1395b68b40bacc7aa5fd5cbe3cb660485d806557f49adcbec5f205d8386c8c",
  },
  {
    id: "ewni.incomeTax.2027-28.125140",
    taxYear: "2027/28",
    region: "ENGLAND_NI_WALES",
    kind: "incomeTax",
    input: {
      grossIncome: 125140,
    },
    expected: 42516,
    source:
      "https://www.gov.uk/government/publications/budget-2026-overview-of-tax-legislation-and-rates-ootlar/annex-a-rates-and-allowances",
    additionalSources: [
      "https://www.legislation.gov.uk/ukpga/2026/11/section/10/enacted",
      "https://www.gov.uk/government/publications/budget-2026-overview-of-tax-legislation-and-rates-ootlar/budget-2026-overview-of-tax-legislation-and-rates-ootlar",
    ],
    derivation:
      "Gross income 125140. Taper: (125140 - 100000) / 2 = 12570, PA 12570 - 12570 = 0. Taxable 125140 - 0 = 125140. Basic 37700 x 20% = 7540; higher 87440 x 40% = 34976; additional 0 x 45% = 0. Total 42516. 2027/28 figures: main rates 20%, 40% and 45% are announced, not yet law.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "owner",
    signedOffAt: "2026-11-20",
    signedOffHash: "7d317b36caec76bd7cfd6fcd24d8afcd2e1ed2035f3be12a472dc84c620eb795",
  },
  {
    id: "ewni.incomeTax.2027-28.150000",
    taxYear: "2027/28",
    region: "ENGLAND_NI_WALES",
    kind: "incomeTax",
    input: {
      grossIncome: 150000,
    },
    expected: 53703,
    source:
      "https://www.gov.uk/government/publications/budget-2026-overview-of-tax-legislation-and-rates-ootlar/annex-a-rates-and-allowances",
    additionalSources: [
      "https://www.legislation.gov.uk/ukpga/2026/11/section/10/enacted",
      "https://www.gov.uk/government/publications/budget-2026-overview-of-tax-legislation-and-rates-ootlar/budget-2026-overview-of-tax-legislation-and-rates-ootlar",
    ],
    derivation:
      "Gross income 150000. Taper: (150000 - 100000) / 2 = 25000, PA 12570 - 25000 = 0. Taxable 150000 - 0 = 150000. Basic 37700 x 20% = 7540; higher 87440 x 40% = 34976; additional 24860 x 45% = 11187. Total 53703. 2027/28 figures: main rates 20%, 40% and 45% are announced, not yet law.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "owner",
    signedOffAt: "2026-11-20",
    signedOffHash: "15baad7a63ce4ae62e400d1d8c49b706c7896c290dc9b6ccb8a9dc6544800374",
  },
  {
    id: "ewni.giftAid.2027-28.60000.net1000",
    taxYear: "2027/28",
    region: "ENGLAND_NI_WALES",
    kind: "giftAid",
    input: {
      grossIncome: 60000,
      giftAidNet: 1000,
    },
    expected: 11182,
    source:
      "https://www.gov.uk/government/publications/budget-2026-overview-of-tax-legislation-and-rates-ootlar/annex-a-rates-and-allowances",
    additionalSources: [
      "https://www.legislation.gov.uk/ukpga/2026/11/section/10/enacted",
      "https://www.gov.uk/government/publications/budget-2026-overview-of-tax-legislation-and-rates-ootlar/budget-2026-overview-of-tax-legislation-and-rates-ootlar",
      "https://www.gov.uk/donating-to-charity/gift-aid",
      "https://www.gov.uk/guidance/adjusted-net-income",
      "https://www.legislation.gov.uk/ukpga/2007/3/section/414",
    ],
    derivation:
      "Gross income 60000. Gift Aid gross-up 1000 x 1.25 = 1250; adjusted net income 60000 - 1250 = 58750; basic and higher limits both raised by 1250 (ITA 2007 s.414): 37700 + 1250 = 38950, 125140 + 1250 = 126390. PA 12570 (no taper at adjusted net income 58750). Taxable 60000 - 12570 = 47430. Basic 38950 x 20% = 7790; higher 8480 x 40% = 3392; additional 0 x 45% = 0. Total 11182. 2027/28 figures: main rates 20%, 40% and 45% are announced, not yet law.",
    confidence: "medium",
    status: "VERIFIED",
    signedOffBy: "owner",
    signedOffAt: "2026-11-20",
    signedOffHash: "3698168122c6dd2cc55fb161a50265a077da07a83074540683a2ea70b816b4e4",
  },
  {
    id: "ewni.giftAid.2027-28.110000.net1000",
    taxYear: "2027/28",
    region: "ENGLAND_NI_WALES",
    kind: "giftAid",
    input: {
      grossIncome: 110000,
      giftAidNet: 1000,
    },
    expected: 32932,
    source:
      "https://www.gov.uk/government/publications/budget-2026-overview-of-tax-legislation-and-rates-ootlar/annex-a-rates-and-allowances",
    additionalSources: [
      "https://www.legislation.gov.uk/ukpga/2026/11/section/10/enacted",
      "https://www.gov.uk/government/publications/budget-2026-overview-of-tax-legislation-and-rates-ootlar/budget-2026-overview-of-tax-legislation-and-rates-ootlar",
      "https://www.gov.uk/donating-to-charity/gift-aid",
      "https://www.gov.uk/guidance/adjusted-net-income",
      "https://www.legislation.gov.uk/ukpga/2007/3/section/414",
    ],
    derivation:
      "Gross income 110000. Gift Aid gross-up 1000 x 1.25 = 1250; adjusted net income 110000 - 1250 = 108750; basic and higher limits both raised by 1250 (ITA 2007 s.414): 37700 + 1250 = 38950, 125140 + 1250 = 126390. Taper: (108750 - 100000) / 2 = 4375, PA 12570 - 4375 = 8195. Taxable 110000 - 8195 = 101805. Basic 38950 x 20% = 7790; higher 62855 x 40% = 25142; additional 0 x 45% = 0. Total 32932. 2027/28 figures: main rates 20%, 40% and 45% are announced, not yet law.",
    confidence: "medium",
    status: "VERIFIED",
    signedOffBy: "owner",
    signedOffAt: "2026-11-20",
    signedOffHash: "04eeb3c8585b0c74d9e4fb96cca19bc59f7cc9a969610159c15e35fdc998fdbc",
  },
  {
    id: "employeeNi.2027-28.30000",
    taxYear: "2027/28",
    region: "ENGLAND_NI_WALES",
    kind: "employeeNi",
    input: {
      grossEarnings: 30000,
    },
    expected: 1394.4,
    source:
      "https://www.gov.uk/government/publications/budget-2026-overview-of-tax-legislation-and-rates-ootlar/annex-a-rates-and-allowances",
    derivation:
      "Annual earnings 30000. Main band 30000 - PT 12570 = 17430 x 8% = 1394.4; above UEL 50270: 0 x 2% = 0. Total 1394.4. 2027/28 figures: primary threshold 12570, upper earnings limit 50270 and rates 8% and 2% are announced, not yet law.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "owner",
    signedOffAt: "2026-11-20",
    signedOffHash: "8837b3e2a3af19c93d2d70bfb965b6e9cd17b1ca7a984febcfbefba94c3c8a10",
  },
  {
    id: "employeeNi.2027-28.60000",
    taxYear: "2027/28",
    region: "ENGLAND_NI_WALES",
    kind: "employeeNi",
    input: {
      grossEarnings: 60000,
    },
    expected: 3210.6,
    source:
      "https://www.gov.uk/government/publications/budget-2026-overview-of-tax-legislation-and-rates-ootlar/annex-a-rates-and-allowances",
    derivation:
      "Annual earnings 60000. Main band 50270 - PT 12570 = 37700 x 8% = 3016; above UEL 50270: 9730 x 2% = 194.6. Total 3210.6. 2027/28 figures: primary threshold 12570, upper earnings limit 50270 and rates 8% and 2% are announced, not yet law.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "owner",
    signedOffAt: "2026-11-20",
    signedOffHash: "83fdc8d4031dc2448220af4f65b7d5713de999f9ff0f7c120157398c2ce289ee",
  },
  {
    id: "class4.2027-28.60000",
    taxYear: "2027/28",
    region: "ENGLAND_NI_WALES",
    kind: "class4",
    input: {
      profits: 60000,
    },
    expected: 2456.6,
    source:
      "https://www.gov.uk/government/publications/budget-2026-overview-of-tax-legislation-and-rates-ootlar/annex-a-rates-and-allowances",
    derivation:
      "Profits 60000. (50270 - LPL 12570) = 37700 x 6% = 2262; above UPL 50270: 9730 x 2% = 194.6. Total 2456.6. 2027/28 figures: lower profits limit 12570, upper profits limit 50270 and rates 6% and 2% are announced, not yet law.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "owner",
    signedOffAt: "2026-11-20",
    signedOffHash: "af0d7c73106a385d3214c55a22598e329dfbf5a3326ef39a06a4d49026d1181b",
  },
  {
    id: "employerNiSaving.2027-28.60000.3000",
    taxYear: "2027/28",
    region: "ENGLAND_NI_WALES",
    kind: "employerNiSaving",
    input: {
      grossSalary: 60000,
      salarySacrifice: 3000,
    },
    expected: 450,
    source:
      "https://www.gov.uk/government/publications/budget-2026-overview-of-tax-legislation-and-rates-ootlar/annex-a-rates-and-allowances",
    derivation:
      "Employer NI before = (60000 - ST 5000, floored at 0) = 55000; after sacrifice = (57000 - 5000, floored at 0) = 52000; reduction 3000 x 15% = 450. 2027/28 figures: secondary threshold 5000 and rate 15% are announced, not yet law.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "owner",
    signedOffAt: "2026-11-20",
    signedOffHash: "3b4d5e6e5f0e2617c81cbe7693f7c363b25726be9cbe31bde340b3151dce6587",
  },
  {
    id: "employerNiSaving.2027-28.6000.3000",
    taxYear: "2027/28",
    region: "ENGLAND_NI_WALES",
    kind: "employerNiSaving",
    input: {
      grossSalary: 6000,
      salarySacrifice: 3000,
    },
    expected: 150,
    source:
      "https://www.gov.uk/government/publications/budget-2026-overview-of-tax-legislation-and-rates-ootlar/annex-a-rates-and-allowances",
    derivation:
      "Employer NI before = (6000 - ST 5000, floored at 0) = 1000; after sacrifice = (3000 - 5000, floored at 0) = 0; reduction 1000 x 15% = 150. 2027/28 figures: secondary threshold 5000 and rate 15% are announced, not yet law.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "owner",
    signedOffAt: "2026-11-20",
    signedOffHash: "5c2fd17b128d871e479a58c5ef27b856c43ca7ddb3256363877ff01f74464404",
  },
  {
    id: "studentLoan.2027-28.plan2.35000",
    taxYear: "2027/28",
    region: "ENGLAND_NI_WALES",
    kind: "studentLoan",
    input: {
      grossIncome: 35000,
      plan: "plan2",
    },
    expected: 505.35,
    source: "https://www.gov.uk/government/news/student-loans-repayment-threshold-announcement",
    derivation:
      "plan2 threshold 29385; (35000 - 29385) = 5615 x 9% = 505.35. 2027/28 figures: plan2 threshold 29385 and rate 9% are announced, not yet law.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "owner",
    signedOffAt: "2026-11-20",
    signedOffHash: "21e4d3a11a90094091f0c48ae463b94c6f2cf23aa8fc775f138c93f573bb0904",
  },
  {
    id: "studentLoan.2027-28.plan5.35000",
    taxYear: "2027/28",
    region: "ENGLAND_NI_WALES",
    kind: "studentLoan",
    input: {
      grossIncome: 35000,
      plan: "plan5",
    },
    expected: 807.75,
    source: "https://www.gov.uk/government/news/student-loans-repayment-threshold-announcement",
    derivation:
      "plan5 threshold 26025; (35000 - 26025) = 8975 x 9% = 807.75. 2027/28 figures: plan5 threshold 26025 and rate 9% are announced, not yet law.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "owner",
    signedOffAt: "2026-11-20",
    signedOffHash: "209a435e3a995bf9362cff3d880740e7e2e4124ba3aa963e0b8c87855f023ee0",
  },
  {
    id: "studentLoan.2027-28.postgrad.35000",
    taxYear: "2027/28",
    region: "ENGLAND_NI_WALES",
    kind: "studentLoan",
    input: {
      grossIncome: 35000,
      plan: "postgrad",
    },
    expected: 840,
    source: "https://www.gov.uk/government/news/student-loans-repayment-threshold-announcement",
    derivation:
      "postgrad threshold 21000; (35000 - 21000) = 14000 x 6% = 840. 2027/28 figures: postgrad threshold 21000 and rate 6% are announced, not yet law.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "owner",
    signedOffAt: "2026-11-20",
    signedOffHash: "47d1085eaccbb8c3c986c3c3db37fc8f27be375964b24ffc9b0fc9b5221ff2a8",
  },
  {
    id: "studentLoan.2027-28.plan2.28385",
    taxYear: "2027/28",
    region: "ENGLAND_NI_WALES",
    kind: "studentLoan",
    input: {
      grossIncome: 28385,
      plan: "plan2",
    },
    expected: 0,
    source: "https://www.gov.uk/government/news/student-loans-repayment-threshold-announcement",
    derivation:
      "plan2 threshold 29385; income 28385 is below it, so repayment is 0. 2027/28 figures: plan2 threshold 29385 is announced, not yet law.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "owner",
    signedOffAt: "2026-11-20",
    signedOffHash: "6a7680e18a5058d73d0d7e9aaffe40c8390935aaeefecbd56dec83380e9ff12c",
  },
  {
    id: "dividends.2027-28.basic",
    taxYear: "2027/28",
    region: "ENGLAND_NI_WALES",
    kind: "dividends",
    input: {
      employmentIncome: 20000,
      dividendIncome: 5000,
    },
    expected: 483.75,
    source: "https://www.legislation.gov.uk/ukpga/2026/11/section/4/enacted",
    additionalSources: [
      "https://www.gov.uk/government/publications/budget-2026-overview-of-tax-legislation-and-rates-ootlar/annex-a-rates-and-allowances",
      "https://www.legislation.gov.uk/ukpga/2026/11/section/10/enacted",
      "https://www.gov.uk/tax-on-dividends",
    ],
    derivation:
      "Employment income 20000 less PA 12570 = 7430, inside the basic band 37700, so all dividends fall in the basic band. Dividend allowance 500: taxable dividends 5000 - 500 = 4500 x 10.75% = 483.75 (dividend tax only).",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "owner",
    signedOffAt: "2026-11-20",
    signedOffHash: "a27f5d39b559faa2bb75607d61b852047b4162e55ee5ab2bead970ec0c2b2e0e",
  },
  {
    id: "dividends.2027-28.higher",
    taxYear: "2027/28",
    region: "ENGLAND_NI_WALES",
    kind: "dividends",
    input: {
      employmentIncome: 60000,
      dividendIncome: 5000,
    },
    expected: 1608.75,
    source: "https://www.legislation.gov.uk/ukpga/2026/11/section/4/enacted",
    additionalSources: [
      "https://www.gov.uk/government/publications/budget-2026-overview-of-tax-legislation-and-rates-ootlar/annex-a-rates-and-allowances",
      "https://www.legislation.gov.uk/ukpga/2026/11/section/10/enacted",
      "https://www.gov.uk/tax-on-dividends",
    ],
    derivation:
      "Employment income 60000 less PA 12570 = 47430 already exceeds the basic band 37700, so all dividends fall in the higher band. Dividend allowance 500: taxable dividends 5000 - 500 = 4500 x 35.75% = 1608.75 (dividend tax only).",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "owner",
    signedOffAt: "2026-11-20",
    signedOffHash: "d385229677cffd1b573bde1631024c59c9da04bcdf0deeae78855c6e9151684d",
  },
  {
    id: "dividends.2027-28.additional",
    taxYear: "2027/28",
    region: "ENGLAND_NI_WALES",
    kind: "dividends",
    input: {
      employmentIncome: 200000,
      dividendIncome: 5000,
    },
    expected: 1770.75,
    source: "https://www.legislation.gov.uk/ukpga/2026/11/section/4/enacted",
    additionalSources: [
      "https://www.gov.uk/government/publications/budget-2026-overview-of-tax-legislation-and-rates-ootlar/annex-a-rates-and-allowances",
      "https://www.legislation.gov.uk/ukpga/2026/11/section/10/enacted",
      "https://www.gov.uk/tax-on-dividends",
    ],
    derivation:
      "Employment income 200000 gives PA 0 (taper from 100000 removes it all) and taxable income 200000 above 125140, so all dividends fall in the additional band. Dividend allowance 500: taxable dividends 5000 - 500 = 4500 x 39.35% = 1770.75 (dividend tax only).",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "owner",
    signedOffAt: "2026-11-20",
    signedOffHash: "4423e627e993181561b9d711c1c228d810a982584e41d491f49f641ffa3d5d67",
  },
];
