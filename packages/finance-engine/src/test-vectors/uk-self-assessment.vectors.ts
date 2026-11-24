/**
 * Self Assessment test-vector catalogue: the trading and property allowances and payments on
 * account.
 *
 * Every expected value is worked by hand from figures read on the GOV.UK page in `source` on the
 * date in `sourceReadOn`. No vector is computed by the engine. Every vector is unsigned
 * (`signedOffBy` null) until the owner signs it with `bun run tax:signoff`, so figures that rest on
 * these rules stay labelled as unverified estimates.
 *
 * Inputs by kind (money in pounds):
 * - tradingAllowance: { income, costs }; expected is the taxable trading profit.
 * - propertyAllowance: { income, costs, ownershipSharePct }; income and costs are for the whole
 *   property, with no finance costs; expected is the taxable profit on the person's own share.
 * - paymentsOnAccount: { bill, taxDeductedAtSource }; expected is the total due by 31 January
 *   after the tax year (the bill plus the first payment on account, when one is due).
 */
import type { UkTaxVector } from "./uk-tax.vectors.js";

export type UkSelfAssessmentVectorKind =
  | "tradingAllowance"
  | "propertyAllowance"
  | "paymentsOnAccount";

export type UkSelfAssessmentVector = Omit<UkTaxVector, "kind" | "input"> & {
  kind: UkSelfAssessmentVectorKind;
  input: Record<string, number>;
  /** ISO date the source page was read. */
  sourceReadOn: string;
};

export const UK_SELF_ASSESSMENT_VECTORS: readonly UkSelfAssessmentVector[] = [
  {
    id: "tradingAllowance.2020-21.5000.300",
    taxYear: "2020/21",
    region: "ENGLAND_NI_WALES",
    kind: "tradingAllowance",
    input: {
      income: 5000,
      costs: 300,
    },
    expected: 4000,
    source: "https://www.gov.uk/guidance/tax-free-allowances-on-property-and-trading-income",
    sourceReadOn: "2026-11-14",
    derivation:
      "Income 5000, recorded costs 300. The 1000 trading allowance is larger than the costs, so it is deducted in their place: 5000 - 1000 = 4000.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: trading allowance 1,000 is only confirmed as current guidance on GOV.UK, not for this tax year.",
    signedOffBy: null,
  },
  {
    id: "propertyAllowance.2020-21.6000.400.100",
    taxYear: "2020/21",
    region: "ENGLAND_NI_WALES",
    kind: "propertyAllowance",
    input: {
      income: 6000,
      costs: 400,
      ownershipSharePct: 100,
    },
    expected: 5000,
    source: "https://www.gov.uk/guidance/tax-free-allowances-on-property-and-trading-income",
    sourceReadOn: "2026-11-14",
    derivation:
      "Sole owner. Rent 6000, recorded costs 400, no finance costs. The 1000 property allowance is larger than the costs, so it is deducted in their place: 6000 - 1000 = 5000.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: property allowance 1,000 is only confirmed as current guidance on GOV.UK, not for this tax year.",
    signedOffBy: null,
  },
  {
    id: "paymentsOnAccount.2020-21.3000.0",
    taxYear: "2020/21",
    region: "ENGLAND_NI_WALES",
    kind: "paymentsOnAccount",
    input: {
      bill: 3000,
      taxDeductedAtSource: 0,
    },
    expected: 4500,
    source: "https://www.gov.uk/understand-self-assessment-bill/payments-on-account",
    sourceReadOn: "2026-11-14",
    derivation:
      "Bill 3000, nothing taken at source. The bill is not less than 1000 and no more than 80% was taken at source, so payments on account are due: each is 3000 / 2 = 1500. Due by 31 January: 3000 + 1500 = 4500 (the GOV.UK page's second example).",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: payments on account thresholds (1,000 and 80%) is only confirmed as current guidance on GOV.UK, not for this tax year.",
    signedOffBy: null,
  },
  {
    id: "tradingAllowance.2021-22.5000.300",
    taxYear: "2021/22",
    region: "ENGLAND_NI_WALES",
    kind: "tradingAllowance",
    input: {
      income: 5000,
      costs: 300,
    },
    expected: 4000,
    source: "https://www.gov.uk/guidance/tax-free-allowances-on-property-and-trading-income",
    sourceReadOn: "2026-11-14",
    derivation:
      "Income 5000, recorded costs 300. The 1000 trading allowance is larger than the costs, so it is deducted in their place: 5000 - 1000 = 4000.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: trading allowance 1,000 is only confirmed as current guidance on GOV.UK, not for this tax year.",
    signedOffBy: null,
  },
  {
    id: "propertyAllowance.2021-22.6000.400.100",
    taxYear: "2021/22",
    region: "ENGLAND_NI_WALES",
    kind: "propertyAllowance",
    input: {
      income: 6000,
      costs: 400,
      ownershipSharePct: 100,
    },
    expected: 5000,
    source: "https://www.gov.uk/guidance/tax-free-allowances-on-property-and-trading-income",
    sourceReadOn: "2026-11-14",
    derivation:
      "Sole owner. Rent 6000, recorded costs 400, no finance costs. The 1000 property allowance is larger than the costs, so it is deducted in their place: 6000 - 1000 = 5000.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: property allowance 1,000 is only confirmed as current guidance on GOV.UK, not for this tax year.",
    signedOffBy: null,
  },
  {
    id: "paymentsOnAccount.2021-22.3000.0",
    taxYear: "2021/22",
    region: "ENGLAND_NI_WALES",
    kind: "paymentsOnAccount",
    input: {
      bill: 3000,
      taxDeductedAtSource: 0,
    },
    expected: 4500,
    source: "https://www.gov.uk/understand-self-assessment-bill/payments-on-account",
    sourceReadOn: "2026-11-14",
    derivation:
      "Bill 3000, nothing taken at source. The bill is not less than 1000 and no more than 80% was taken at source, so payments on account are due: each is 3000 / 2 = 1500. Due by 31 January: 3000 + 1500 = 4500 (the GOV.UK page's second example).",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: payments on account thresholds (1,000 and 80%) is only confirmed as current guidance on GOV.UK, not for this tax year.",
    signedOffBy: null,
  },
  {
    id: "tradingAllowance.2022-23.5000.300",
    taxYear: "2022/23",
    region: "ENGLAND_NI_WALES",
    kind: "tradingAllowance",
    input: {
      income: 5000,
      costs: 300,
    },
    expected: 4000,
    source: "https://www.gov.uk/guidance/tax-free-allowances-on-property-and-trading-income",
    sourceReadOn: "2026-11-14",
    derivation:
      "Income 5000, recorded costs 300. The 1000 trading allowance is larger than the costs, so it is deducted in their place: 5000 - 1000 = 4000.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: trading allowance 1,000 is only confirmed as current guidance on GOV.UK, not for this tax year.",
    signedOffBy: null,
  },
  {
    id: "propertyAllowance.2022-23.6000.400.100",
    taxYear: "2022/23",
    region: "ENGLAND_NI_WALES",
    kind: "propertyAllowance",
    input: {
      income: 6000,
      costs: 400,
      ownershipSharePct: 100,
    },
    expected: 5000,
    source: "https://www.gov.uk/guidance/tax-free-allowances-on-property-and-trading-income",
    sourceReadOn: "2026-11-14",
    derivation:
      "Sole owner. Rent 6000, recorded costs 400, no finance costs. The 1000 property allowance is larger than the costs, so it is deducted in their place: 6000 - 1000 = 5000.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: property allowance 1,000 is only confirmed as current guidance on GOV.UK, not for this tax year.",
    signedOffBy: null,
  },
  {
    id: "paymentsOnAccount.2022-23.3000.0",
    taxYear: "2022/23",
    region: "ENGLAND_NI_WALES",
    kind: "paymentsOnAccount",
    input: {
      bill: 3000,
      taxDeductedAtSource: 0,
    },
    expected: 4500,
    source: "https://www.gov.uk/understand-self-assessment-bill/payments-on-account",
    sourceReadOn: "2026-11-14",
    derivation:
      "Bill 3000, nothing taken at source. The bill is not less than 1000 and no more than 80% was taken at source, so payments on account are due: each is 3000 / 2 = 1500. Due by 31 January: 3000 + 1500 = 4500 (the GOV.UK page's second example).",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: payments on account thresholds (1,000 and 80%) is only confirmed as current guidance on GOV.UK, not for this tax year.",
    signedOffBy: null,
  },
  {
    id: "tradingAllowance.2023-24.5000.300",
    taxYear: "2023/24",
    region: "ENGLAND_NI_WALES",
    kind: "tradingAllowance",
    input: {
      income: 5000,
      costs: 300,
    },
    expected: 4000,
    source: "https://www.gov.uk/guidance/tax-free-allowances-on-property-and-trading-income",
    sourceReadOn: "2026-11-14",
    derivation:
      "Income 5000, recorded costs 300. The 1000 trading allowance is larger than the costs, so it is deducted in their place: 5000 - 1000 = 4000.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: trading allowance 1,000 is only confirmed as current guidance on GOV.UK, not for this tax year.",
    signedOffBy: null,
  },
  {
    id: "propertyAllowance.2023-24.6000.400.100",
    taxYear: "2023/24",
    region: "ENGLAND_NI_WALES",
    kind: "propertyAllowance",
    input: {
      income: 6000,
      costs: 400,
      ownershipSharePct: 100,
    },
    expected: 5000,
    source: "https://www.gov.uk/guidance/tax-free-allowances-on-property-and-trading-income",
    sourceReadOn: "2026-11-14",
    derivation:
      "Sole owner. Rent 6000, recorded costs 400, no finance costs. The 1000 property allowance is larger than the costs, so it is deducted in their place: 6000 - 1000 = 5000.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: property allowance 1,000 is only confirmed as current guidance on GOV.UK, not for this tax year.",
    signedOffBy: null,
  },
  {
    id: "paymentsOnAccount.2023-24.3000.0",
    taxYear: "2023/24",
    region: "ENGLAND_NI_WALES",
    kind: "paymentsOnAccount",
    input: {
      bill: 3000,
      taxDeductedAtSource: 0,
    },
    expected: 4500,
    source: "https://www.gov.uk/understand-self-assessment-bill/payments-on-account",
    sourceReadOn: "2026-11-14",
    derivation:
      "Bill 3000, nothing taken at source. The bill is not less than 1000 and no more than 80% was taken at source, so payments on account are due: each is 3000 / 2 = 1500. Due by 31 January: 3000 + 1500 = 4500 (the GOV.UK page's second example).",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: payments on account thresholds (1,000 and 80%) is only confirmed as current guidance on GOV.UK, not for this tax year.",
    signedOffBy: null,
  },
  {
    id: "tradingAllowance.2024-25.5000.300",
    taxYear: "2024/25",
    region: "ENGLAND_NI_WALES",
    kind: "tradingAllowance",
    input: {
      income: 5000,
      costs: 300,
    },
    expected: 4000,
    source: "https://www.gov.uk/guidance/tax-free-allowances-on-property-and-trading-income",
    sourceReadOn: "2026-11-14",
    derivation:
      "Income 5000, recorded costs 300. The 1000 trading allowance is larger than the costs, so it is deducted in their place: 5000 - 1000 = 4000.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: trading allowance 1,000 is only confirmed as current guidance on GOV.UK, not for this tax year.",
    signedOffBy: null,
  },
  {
    id: "propertyAllowance.2024-25.6000.400.100",
    taxYear: "2024/25",
    region: "ENGLAND_NI_WALES",
    kind: "propertyAllowance",
    input: {
      income: 6000,
      costs: 400,
      ownershipSharePct: 100,
    },
    expected: 5000,
    source: "https://www.gov.uk/guidance/tax-free-allowances-on-property-and-trading-income",
    sourceReadOn: "2026-11-14",
    derivation:
      "Sole owner. Rent 6000, recorded costs 400, no finance costs. The 1000 property allowance is larger than the costs, so it is deducted in their place: 6000 - 1000 = 5000.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: property allowance 1,000 is only confirmed as current guidance on GOV.UK, not for this tax year.",
    signedOffBy: null,
  },
  {
    id: "paymentsOnAccount.2024-25.3000.0",
    taxYear: "2024/25",
    region: "ENGLAND_NI_WALES",
    kind: "paymentsOnAccount",
    input: {
      bill: 3000,
      taxDeductedAtSource: 0,
    },
    expected: 4500,
    source: "https://www.gov.uk/understand-self-assessment-bill/payments-on-account",
    sourceReadOn: "2026-11-14",
    derivation:
      "Bill 3000, nothing taken at source. The bill is not less than 1000 and no more than 80% was taken at source, so payments on account are due: each is 3000 / 2 = 1500. Due by 31 January: 3000 + 1500 = 4500 (the GOV.UK page's second example).",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: payments on account thresholds (1,000 and 80%) is only confirmed as current guidance on GOV.UK, not for this tax year.",
    signedOffBy: null,
  },
  {
    id: "tradingAllowance.2025-26.5000.300",
    taxYear: "2025/26",
    region: "ENGLAND_NI_WALES",
    kind: "tradingAllowance",
    input: {
      income: 5000,
      costs: 300,
    },
    expected: 4000,
    source: "https://www.gov.uk/guidance/tax-free-allowances-on-property-and-trading-income",
    sourceReadOn: "2026-11-14",
    derivation:
      "Income 5000, recorded costs 300. The 1000 trading allowance is larger than the costs, so it is deducted in their place: 5000 - 1000 = 4000.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: trading allowance 1,000 is only confirmed as current guidance on GOV.UK, not for this tax year.",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:a139665764f1523caebf05a45dc8eb603828c9624922b243498312c7c0fdfced",
    rulingRef:
      "GOV.UK tax-free allowances guidance gives the 1,000 trading allowance for each tax year from 6 April 2017, deducted instead of expenses, so 5,000 less 1,000 is right.",
  },
  {
    id: "tradingAllowance.2025-26.800.0",
    taxYear: "2025/26",
    region: "ENGLAND_NI_WALES",
    kind: "tradingAllowance",
    input: {
      income: 800,
      costs: 0,
    },
    expected: 0,
    source: "https://www.gov.uk/guidance/tax-free-allowances-on-property-and-trading-income",
    sourceReadOn: "2026-11-14",
    derivation:
      "Income 800 is not more than the 1000 trading allowance, so the allowance covers all of it: profit 0.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: trading allowance 1,000 is only confirmed as current guidance on GOV.UK, not for this tax year.",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:f411d0b613f3a0f521392c1da35e16f39e79fd45e8b3467ed2c1387e35a53f21",
    rulingRef:
      "GOV.UK tax-free allowances guidance applies the 1,000 allowance to each tax year from 6 April 2017; income of 1,000 or less is fully covered, so profit is 0.",
  },
  {
    id: "tradingAllowance.2025-26.1000.200",
    taxYear: "2025/26",
    region: "ENGLAND_NI_WALES",
    kind: "tradingAllowance",
    input: {
      income: 1000,
      costs: 200,
    },
    expected: 0,
    source: "https://www.gov.uk/guidance/tax-free-allowances-on-property-and-trading-income",
    sourceReadOn: "2026-11-14",
    derivation:
      "Income 1000 equals the 1000 trading allowance. The allowance (1000) is larger than the costs (200): 1000 - 1000 = 0.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: trading allowance 1,000 is only confirmed as current guidance on GOV.UK, not for this tax year.",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:1a592c54319608da91ea9c6cc1099b304f02231ebfe83d505e5df603278abc6f",
    rulingRef:
      "GOV.UK tax-free allowances guidance applies the 1,000 allowance to each tax year from 6 April 2017; income of exactly 1,000 is 1,000 or less and fully relieved, so profit is 0.",
  },
  {
    id: "tradingAllowance.2025-26.5000.1800",
    taxYear: "2025/26",
    region: "ENGLAND_NI_WALES",
    kind: "tradingAllowance",
    input: {
      income: 5000,
      costs: 1800,
    },
    expected: 3200,
    source: "https://www.gov.uk/guidance/tax-free-allowances-on-property-and-trading-income",
    sourceReadOn: "2026-11-14",
    derivation:
      "Income 5000, recorded costs 1800. The costs are larger than the 1000 trading allowance, so the costs are deducted and the allowance is not: 5000 - 1800 = 3200.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: trading allowance 1,000 is only confirmed as current guidance on GOV.UK, not for this tax year.",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:e96cca667df6ecd7b1a138082238fe69aba33421f96b8af6358d920eb05fe107",
    rulingRef:
      "GOV.UK tax-free allowances guidance makes the 1,000 allowance an alternative to expenses; deducting the larger actual expenses of 1,800 is permitted, giving 3,200.",
  },
  {
    id: "propertyAllowance.2025-26.6000.400.100",
    taxYear: "2025/26",
    region: "ENGLAND_NI_WALES",
    kind: "propertyAllowance",
    input: {
      income: 6000,
      costs: 400,
      ownershipSharePct: 100,
    },
    expected: 5000,
    source: "https://www.gov.uk/guidance/tax-free-allowances-on-property-and-trading-income",
    sourceReadOn: "2026-11-14",
    derivation:
      "Sole owner. Rent 6000, recorded costs 400, no finance costs. The 1000 property allowance is larger than the costs, so it is deducted in their place: 6000 - 1000 = 5000.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: property allowance 1,000 is only confirmed as current guidance on GOV.UK, not for this tax year.",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:de62909dfb79dd34013f57d270e88b72f22f5d0bab741baba3247f0cd7a08a92",
    rulingRef:
      "GOV.UK tax-free allowances guidance gives the 1,000 property allowance for each tax year from 6 April 2017, deducted instead of expenses, giving 5,000.",
  },
  {
    id: "propertyAllowance.2025-26.900.0.100",
    taxYear: "2025/26",
    region: "ENGLAND_NI_WALES",
    kind: "propertyAllowance",
    input: {
      income: 900,
      costs: 0,
      ownershipSharePct: 100,
    },
    expected: 0,
    source: "https://www.gov.uk/guidance/tax-free-allowances-on-property-and-trading-income",
    sourceReadOn: "2026-11-14",
    derivation:
      "Sole owner. Rent 900 is not more than the 1000 property allowance, so the allowance covers all of it: profit 0.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: property allowance 1,000 is only confirmed as current guidance on GOV.UK, not for this tax year.",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:ea882ed5550a7c612359c7d7014eaa7be1b5ee56bf22cb1680888bd6727f1486",
    rulingRef:
      "GOV.UK tax-free allowances guidance applies to each tax year from 6 April 2017; gross property income of 1,000 or less is fully covered, so profit is 0.",
  },
  {
    id: "propertyAllowance.2025-26.6000.2500.100",
    taxYear: "2025/26",
    region: "ENGLAND_NI_WALES",
    kind: "propertyAllowance",
    input: {
      income: 6000,
      costs: 2500,
      ownershipSharePct: 100,
    },
    expected: 3500,
    source: "https://www.gov.uk/guidance/tax-free-allowances-on-property-and-trading-income",
    sourceReadOn: "2026-11-14",
    derivation:
      "Sole owner. Rent 6000, recorded costs 2500. The costs are larger than the 1000 property allowance, so the costs are deducted: 6000 - 2500 = 3500.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: property allowance 1,000 is only confirmed as current guidance on GOV.UK, not for this tax year.",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:f7d5d2f96938a7d8039ad5132a39658f0cb02e4afbac984161d3827dad1afd5e",
    rulingRef:
      "GOV.UK tax-free allowances guidance makes the allowance an alternative to expenses; deducting actual costs of 2,500 gives 3,500.",
  },
  {
    id: "propertyAllowance.2025-26.3000.0.50",
    taxYear: "2025/26",
    region: "ENGLAND_NI_WALES",
    kind: "propertyAllowance",
    input: {
      income: 3000,
      costs: 0,
      ownershipSharePct: 50,
    },
    expected: 500,
    source: "https://www.gov.uk/guidance/tax-free-allowances-on-property-and-trading-income",
    sourceReadOn: "2026-11-14",
    derivation:
      "Joint owner with a 50% share. Own share of rent 3000 x 50% = 1500, no costs. Each owner has the 1000 allowance against their own share: 1500 - 1000 = 500.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: property allowance 1,000 is only confirmed as current guidance on GOV.UK, not for this tax year.",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:e09d0af165f7c0b7312d3e586964e3cd3da38524a970173f6dce3ee7e418dee9",
    rulingRef:
      "GOV.UK tax-free allowances guidance: joint owners each get the 1,000 allowance against their share of gross rental income; a 50% share of 1,500 less 1,000 gives 500.",
  },
  {
    id: "paymentsOnAccount.2025-26.3000.0",
    taxYear: "2025/26",
    region: "ENGLAND_NI_WALES",
    kind: "paymentsOnAccount",
    input: {
      bill: 3000,
      taxDeductedAtSource: 0,
    },
    expected: 4500,
    source: "https://www.gov.uk/understand-self-assessment-bill/payments-on-account",
    sourceReadOn: "2026-11-14",
    derivation:
      "Bill 3000, nothing taken at source. The bill is not less than 1000 and no more than 80% was taken at source, so payments on account are due: each is 3000 / 2 = 1500. Due by 31 January: 3000 + 1500 = 4500 (the GOV.UK page's second example).",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: payments on account thresholds (1,000 and 80%) is only confirmed as current guidance on GOV.UK, not for this tax year.",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:b01993264e8e4d26a40df24742cc8a7fbbeadfbef7f0b41403603447efc01b29",
    rulingRef:
      "The 1,000 threshold applies from 2009-10 (SI 2008/838 amending SI 1996/1654 reg 3) and the 80% test is reg 4 as corrected by SI 1997/2491; GOV.UK's own example gives 4,500 for a 3,000 bill.",
  },
  {
    id: "paymentsOnAccount.2025-26.999.99.0",
    taxYear: "2025/26",
    region: "ENGLAND_NI_WALES",
    kind: "paymentsOnAccount",
    input: {
      bill: 999.99,
      taxDeductedAtSource: 0,
    },
    expected: 999.99,
    source: "https://www.gov.uk/understand-self-assessment-bill/payments-on-account",
    sourceReadOn: "2026-11-14",
    derivation:
      "Bill 999.99 is less than 1000, so no payments on account. Due by 31 January: 999.99.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: payments on account thresholds (1,000 and 80%) is only confirmed as current guidance on GOV.UK, not for this tax year.",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:bf0b83e444866111e9fb559962f8d2460b7d0b10ac6c9de3a5e8f041ee8064a5",
    rulingRef:
      "TMA 1970 s.59A(1)(c) requires the relevant amount to be not less than the prescribed 1,000 (SI 2008/838); GOV.UK says no payments on account below 1,000, so 999.99 alone is due.",
  },
  {
    id: "paymentsOnAccount.2025-26.1000.0",
    taxYear: "2025/26",
    region: "ENGLAND_NI_WALES",
    kind: "paymentsOnAccount",
    input: {
      bill: 1000,
      taxDeductedAtSource: 0,
    },
    expected: 1500,
    source: "https://www.gov.uk/understand-self-assessment-bill/payments-on-account",
    sourceReadOn: "2026-11-14",
    derivation:
      "Bill 1000 is not less than 1000, so payments on account are due: each is 1000 / 2 = 500. Due by 31 January: 1000 + 500 = 1500.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: payments on account thresholds (1,000 and 80%) is only confirmed as current guidance on GOV.UK, not for this tax year.",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:9ff87fe7d29df2eb89c71ceafbd6bda6e0c462dd8a18cc9726e1e65165debcd8",
    rulingRef:
      "TMA 1970 s.59A(1)(c) uses not less than the prescribed 1,000 (SI 2008/838), so a bill of exactly 1,000 triggers payments on account of 500 each, 1,500 by 31 January.",
  },
  {
    id: "paymentsOnAccount.2025-26.2000.9000",
    taxYear: "2025/26",
    region: "ENGLAND_NI_WALES",
    kind: "paymentsOnAccount",
    input: {
      bill: 2000,
      taxDeductedAtSource: 9000,
    },
    expected: 2000,
    source: "https://www.gov.uk/understand-self-assessment-bill/payments-on-account",
    sourceReadOn: "2026-11-14",
    derivation:
      "Bill 2000, 9000 taken at source. Tax owed in all 11000; 9000 / 11000 = 81.8%, more than 80%, so no payments on account. Due by 31 January: 2000.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: payments on account thresholds (1,000 and 80%) is only confirmed as current guidance on GOV.UK, not for this tax year.",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:a053b36761a98980e2c10abd1cc5c1a99d4f278a27e7288d70a1b21d1e8bdd98",
    rulingRef:
      "GOV.UK exempts cases where more than 80% was paid outside Self Assessment, matching s.59A(1)(d) with the one-to-five proportion (SI 1996/1654 reg 4 as amended by SI 1997/2491); 81.8% deducted means no payments on account.",
  },
  {
    id: "paymentsOnAccount.2025-26.2000.8000",
    taxYear: "2025/26",
    region: "ENGLAND_NI_WALES",
    kind: "paymentsOnAccount",
    input: {
      bill: 2000,
      taxDeductedAtSource: 8000,
    },
    expected: 3000,
    source: "https://www.gov.uk/understand-self-assessment-bill/payments-on-account",
    sourceReadOn: "2026-11-14",
    derivation:
      "Bill 2000, 8000 taken at source. Tax owed in all 10000; 8000 / 10000 = 80%, which is not more than 80%, so payments on account are due: each is 2000 / 2 = 1000. Due by 31 January: 2000 + 1000 = 3000.",
    confidence: "medium",
    status: "UNVERIFIED",
    unverifiedReason:
      "UNVERIFIED: payments on account thresholds (1,000 and 80%) is only confirmed as current guidance on GOV.UK, not for this tax year.",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:137bb16db8daf321172fc89acfb19b036509c863e8531aeeeeed76ed051e8144",
    rulingRef:
      "s.59A(1)(d) requires the relevant amount to be not less than one fifth of the assessed amount (SI 1996/1654 reg 4, SI 1997/2491); at exactly 80% deducted payments on account are due, so 3,000 is right.",
  },
  {
    id: "tradingAllowance.2026-27.5000.300",
    taxYear: "2026/27",
    region: "ENGLAND_NI_WALES",
    kind: "tradingAllowance",
    input: {
      income: 5000,
      costs: 300,
    },
    expected: 4000,
    source: "https://www.gov.uk/guidance/tax-free-allowances-on-property-and-trading-income",
    sourceReadOn: "2026-11-14",
    derivation:
      "Income 5000, recorded costs 300. The 1000 trading allowance is larger than the costs, so it is deducted in their place: 5000 - 1000 = 4000.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:af28ff63f9f0a60f976dd6473fd74a13efe88ec2ca7c038171045d846c1ff005",
  },
  {
    id: "tradingAllowance.2026-27.800.0",
    taxYear: "2026/27",
    region: "ENGLAND_NI_WALES",
    kind: "tradingAllowance",
    input: {
      income: 800,
      costs: 0,
    },
    expected: 0,
    source: "https://www.gov.uk/guidance/tax-free-allowances-on-property-and-trading-income",
    sourceReadOn: "2026-11-14",
    derivation:
      "Income 800 is not more than the 1000 trading allowance, so the allowance covers all of it: profit 0.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:d7b8c34224ca8851a94de1d3d98f8d71cf16bb27b1772d7217e42f418f06910b",
  },
  {
    id: "tradingAllowance.2026-27.1000.200",
    taxYear: "2026/27",
    region: "ENGLAND_NI_WALES",
    kind: "tradingAllowance",
    input: {
      income: 1000,
      costs: 200,
    },
    expected: 0,
    source: "https://www.gov.uk/guidance/tax-free-allowances-on-property-and-trading-income",
    sourceReadOn: "2026-11-14",
    derivation:
      "Income 1000 equals the 1000 trading allowance. The allowance (1000) is larger than the costs (200): 1000 - 1000 = 0.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:6059c607424c540bb9fc47be913d593def04e1d9ff7ce51f613510a37e24a57f",
  },
  {
    id: "tradingAllowance.2026-27.5000.1800",
    taxYear: "2026/27",
    region: "ENGLAND_NI_WALES",
    kind: "tradingAllowance",
    input: {
      income: 5000,
      costs: 1800,
    },
    expected: 3200,
    source: "https://www.gov.uk/guidance/tax-free-allowances-on-property-and-trading-income",
    sourceReadOn: "2026-11-14",
    derivation:
      "Income 5000, recorded costs 1800. The costs are larger than the 1000 trading allowance, so the costs are deducted and the allowance is not: 5000 - 1800 = 3200.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:52d02f29bf1cc415f1ba145d85928a377961565cc4b9ff0227c94011a19e9d5f",
  },
  {
    id: "propertyAllowance.2026-27.6000.400.100",
    taxYear: "2026/27",
    region: "ENGLAND_NI_WALES",
    kind: "propertyAllowance",
    input: {
      income: 6000,
      costs: 400,
      ownershipSharePct: 100,
    },
    expected: 5000,
    source: "https://www.gov.uk/guidance/tax-free-allowances-on-property-and-trading-income",
    sourceReadOn: "2026-11-14",
    derivation:
      "Sole owner. Rent 6000, recorded costs 400, no finance costs. The 1000 property allowance is larger than the costs, so it is deducted in their place: 6000 - 1000 = 5000.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:918d87404a17c0b2330df1adf77941de6b63398316f8161fb87b5f084b0fa9c5",
  },
  {
    id: "propertyAllowance.2026-27.900.0.100",
    taxYear: "2026/27",
    region: "ENGLAND_NI_WALES",
    kind: "propertyAllowance",
    input: {
      income: 900,
      costs: 0,
      ownershipSharePct: 100,
    },
    expected: 0,
    source: "https://www.gov.uk/guidance/tax-free-allowances-on-property-and-trading-income",
    sourceReadOn: "2026-11-14",
    derivation:
      "Sole owner. Rent 900 is not more than the 1000 property allowance, so the allowance covers all of it: profit 0.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:1e721e72eea065dad6b42c6c6ebf9fbf3f0c386d5e37280d254c0bd8af5c8540",
  },
  {
    id: "propertyAllowance.2026-27.6000.2500.100",
    taxYear: "2026/27",
    region: "ENGLAND_NI_WALES",
    kind: "propertyAllowance",
    input: {
      income: 6000,
      costs: 2500,
      ownershipSharePct: 100,
    },
    expected: 3500,
    source: "https://www.gov.uk/guidance/tax-free-allowances-on-property-and-trading-income",
    sourceReadOn: "2026-11-14",
    derivation:
      "Sole owner. Rent 6000, recorded costs 2500. The costs are larger than the 1000 property allowance, so the costs are deducted: 6000 - 2500 = 3500.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:e8ed396f8fc50f3fec8161b4b40e6dad70f1924d204cb69caa0b13b7bbf7c8ad",
  },
  {
    id: "propertyAllowance.2026-27.3000.0.50",
    taxYear: "2026/27",
    region: "ENGLAND_NI_WALES",
    kind: "propertyAllowance",
    input: {
      income: 3000,
      costs: 0,
      ownershipSharePct: 50,
    },
    expected: 500,
    source: "https://www.gov.uk/guidance/tax-free-allowances-on-property-and-trading-income",
    sourceReadOn: "2026-11-14",
    derivation:
      "Joint owner with a 50% share. Own share of rent 3000 x 50% = 1500, no costs. Each owner has the 1000 allowance against their own share: 1500 - 1000 = 500.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:be1308d0ddb639116de6fe41da4f5fb61107d335a7e1c182962c3ee40c94261f",
  },
  {
    id: "paymentsOnAccount.2026-27.3000.0",
    taxYear: "2026/27",
    region: "ENGLAND_NI_WALES",
    kind: "paymentsOnAccount",
    input: {
      bill: 3000,
      taxDeductedAtSource: 0,
    },
    expected: 4500,
    source: "https://www.gov.uk/understand-self-assessment-bill/payments-on-account",
    sourceReadOn: "2026-11-14",
    derivation:
      "Bill 3000, nothing taken at source. The bill is not less than 1000 and no more than 80% was taken at source, so payments on account are due: each is 3000 / 2 = 1500. Due by 31 January: 3000 + 1500 = 4500 (the GOV.UK page's second example).",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:4e986ddafe23b8380f9397fc930149cb56197d85e3726ae4401596ab2cc24b9f",
  },
  {
    id: "paymentsOnAccount.2026-27.999.99.0",
    taxYear: "2026/27",
    region: "ENGLAND_NI_WALES",
    kind: "paymentsOnAccount",
    input: {
      bill: 999.99,
      taxDeductedAtSource: 0,
    },
    expected: 999.99,
    source: "https://www.gov.uk/understand-self-assessment-bill/payments-on-account",
    sourceReadOn: "2026-11-14",
    derivation:
      "Bill 999.99 is less than 1000, so no payments on account. Due by 31 January: 999.99.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:4d5f2be416abb0cb11b171b59868dfbdbfd867f25489f69be145f7ee2fe23b2f",
  },
  {
    id: "paymentsOnAccount.2026-27.1000.0",
    taxYear: "2026/27",
    region: "ENGLAND_NI_WALES",
    kind: "paymentsOnAccount",
    input: {
      bill: 1000,
      taxDeductedAtSource: 0,
    },
    expected: 1500,
    source: "https://www.gov.uk/understand-self-assessment-bill/payments-on-account",
    sourceReadOn: "2026-11-14",
    derivation:
      "Bill 1000 is not less than 1000, so payments on account are due: each is 1000 / 2 = 500. Due by 31 January: 1000 + 500 = 1500.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:9b7bc15a973a76a407f6703c3e00b9e441ff191fab340f97bb36dea3852e572e",
  },
  {
    id: "paymentsOnAccount.2026-27.2000.9000",
    taxYear: "2026/27",
    region: "ENGLAND_NI_WALES",
    kind: "paymentsOnAccount",
    input: {
      bill: 2000,
      taxDeductedAtSource: 9000,
    },
    expected: 2000,
    source: "https://www.gov.uk/understand-self-assessment-bill/payments-on-account",
    sourceReadOn: "2026-11-14",
    derivation:
      "Bill 2000, 9000 taken at source. Tax owed in all 11000; 9000 / 11000 = 81.8%, more than 80%, so no payments on account. Due by 31 January: 2000.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:724a881fd46a60dba47a86d752a3d7b692662b1aecd7b025cf3de4986f46b233",
  },
  {
    id: "paymentsOnAccount.2026-27.2000.8000",
    taxYear: "2026/27",
    region: "ENGLAND_NI_WALES",
    kind: "paymentsOnAccount",
    input: {
      bill: 2000,
      taxDeductedAtSource: 8000,
    },
    expected: 3000,
    source: "https://www.gov.uk/understand-self-assessment-bill/payments-on-account",
    sourceReadOn: "2026-11-14",
    derivation:
      "Bill 2000, 8000 taken at source. Tax owed in all 10000; 8000 / 10000 = 80%, which is not more than 80%, so payments on account are due: each is 2000 / 2 = 1000. Due by 31 January: 2000 + 1000 = 3000.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "fable-decider",
    signedOffAt: "2026-11-24",
    signedOffHash: "v2:997f2c60311c09a0a0e5a3bdaa23722e14a23926f7c5e77e95eb4f617098be9d",
  },
  {
    id: "tradingAllowance.2027-28.5000.300",
    taxYear: "2027/28",
    region: "ENGLAND_NI_WALES",
    kind: "tradingAllowance",
    input: {
      income: 5000,
      costs: 300,
    },
    expected: 4000,
    source: "https://www.gov.uk/guidance/tax-free-allowances-on-property-and-trading-income",
    sourceReadOn: "2026-11-14",
    derivation:
      "Income 5000, recorded costs 300. The 1000 trading allowance is larger than the costs, so it is deducted in their place: 5000 - 1000 = 4000.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "owner",
    signedOffAt: "2026-11-20",
    signedOffHash: "18ec1b93dbbfcbfed4d824548c0dca658c583deacb334f26c03fb872ae96e779",
  },
  {
    id: "tradingAllowance.2027-28.800.0",
    taxYear: "2027/28",
    region: "ENGLAND_NI_WALES",
    kind: "tradingAllowance",
    input: {
      income: 800,
      costs: 0,
    },
    expected: 0,
    source: "https://www.gov.uk/guidance/tax-free-allowances-on-property-and-trading-income",
    sourceReadOn: "2026-11-14",
    derivation:
      "Income 800 is not more than the 1000 trading allowance, so the allowance covers all of it: profit 0.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "owner",
    signedOffAt: "2026-11-20",
    signedOffHash: "e6991a323a0cfe51baaf1fab65e5f4eb95cf09d60e61b5098a628771aab26edf",
  },
  {
    id: "tradingAllowance.2027-28.1000.200",
    taxYear: "2027/28",
    region: "ENGLAND_NI_WALES",
    kind: "tradingAllowance",
    input: {
      income: 1000,
      costs: 200,
    },
    expected: 0,
    source: "https://www.gov.uk/guidance/tax-free-allowances-on-property-and-trading-income",
    sourceReadOn: "2026-11-14",
    derivation:
      "Income 1000 equals the 1000 trading allowance. The allowance (1000) is larger than the costs (200): 1000 - 1000 = 0.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "owner",
    signedOffAt: "2026-11-20",
    signedOffHash: "84a545a930ae0076210e13c8616e450c3f48202f889b174040cda707f53484d7",
  },
  {
    id: "tradingAllowance.2027-28.5000.1800",
    taxYear: "2027/28",
    region: "ENGLAND_NI_WALES",
    kind: "tradingAllowance",
    input: {
      income: 5000,
      costs: 1800,
    },
    expected: 3200,
    source: "https://www.gov.uk/guidance/tax-free-allowances-on-property-and-trading-income",
    sourceReadOn: "2026-11-14",
    derivation:
      "Income 5000, recorded costs 1800. The costs are larger than the 1000 trading allowance, so the costs are deducted and the allowance is not: 5000 - 1800 = 3200.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "owner",
    signedOffAt: "2026-11-20",
    signedOffHash: "99daad83a85c2d379bb3eeba4266c9695576448cc20bc6bb9b2d7790e18e443c",
  },
  {
    id: "propertyAllowance.2027-28.6000.400.100",
    taxYear: "2027/28",
    region: "ENGLAND_NI_WALES",
    kind: "propertyAllowance",
    input: {
      income: 6000,
      costs: 400,
      ownershipSharePct: 100,
    },
    expected: 5000,
    source: "https://www.gov.uk/guidance/tax-free-allowances-on-property-and-trading-income",
    sourceReadOn: "2026-11-14",
    derivation:
      "Sole owner. Rent 6000, recorded costs 400, no finance costs. The 1000 property allowance is larger than the costs, so it is deducted in their place: 6000 - 1000 = 5000.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "owner",
    signedOffAt: "2026-11-20",
    signedOffHash: "9cb08074f8a86f86d3f622d2d2654e16cbed5d81475d0af529a6ad02bdd24177",
  },
  {
    id: "propertyAllowance.2027-28.900.0.100",
    taxYear: "2027/28",
    region: "ENGLAND_NI_WALES",
    kind: "propertyAllowance",
    input: {
      income: 900,
      costs: 0,
      ownershipSharePct: 100,
    },
    expected: 0,
    source: "https://www.gov.uk/guidance/tax-free-allowances-on-property-and-trading-income",
    sourceReadOn: "2026-11-14",
    derivation:
      "Sole owner. Rent 900 is not more than the 1000 property allowance, so the allowance covers all of it: profit 0.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "owner",
    signedOffAt: "2026-11-20",
    signedOffHash: "e2c56ba481407e4c501883bf4db77f8eef73ccca306fd937a700f2a5d9059257",
  },
  {
    id: "propertyAllowance.2027-28.6000.2500.100",
    taxYear: "2027/28",
    region: "ENGLAND_NI_WALES",
    kind: "propertyAllowance",
    input: {
      income: 6000,
      costs: 2500,
      ownershipSharePct: 100,
    },
    expected: 3500,
    source: "https://www.gov.uk/guidance/tax-free-allowances-on-property-and-trading-income",
    sourceReadOn: "2026-11-14",
    derivation:
      "Sole owner. Rent 6000, recorded costs 2500. The costs are larger than the 1000 property allowance, so the costs are deducted: 6000 - 2500 = 3500.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "owner",
    signedOffAt: "2026-11-20",
    signedOffHash: "8c31d02f8f478948ee01f62129a819bc4eab7d6e9281bcaaed754c78a7ca5435",
  },
  {
    id: "propertyAllowance.2027-28.3000.0.50",
    taxYear: "2027/28",
    region: "ENGLAND_NI_WALES",
    kind: "propertyAllowance",
    input: {
      income: 3000,
      costs: 0,
      ownershipSharePct: 50,
    },
    expected: 500,
    source: "https://www.gov.uk/guidance/tax-free-allowances-on-property-and-trading-income",
    sourceReadOn: "2026-11-14",
    derivation:
      "Joint owner with a 50% share. Own share of rent 3000 x 50% = 1500, no costs. Each owner has the 1000 allowance against their own share: 1500 - 1000 = 500.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "owner",
    signedOffAt: "2026-11-20",
    signedOffHash: "c52ed9a50b8cbfb0acd2bb69b9ad1c01b300ef8fab38f635b5c866f83c625cb7",
  },
  {
    id: "paymentsOnAccount.2027-28.3000.0",
    taxYear: "2027/28",
    region: "ENGLAND_NI_WALES",
    kind: "paymentsOnAccount",
    input: {
      bill: 3000,
      taxDeductedAtSource: 0,
    },
    expected: 4500,
    source: "https://www.gov.uk/understand-self-assessment-bill/payments-on-account",
    sourceReadOn: "2026-11-14",
    derivation:
      "Bill 3000, nothing taken at source. The bill is not less than 1000 and no more than 80% was taken at source, so payments on account are due: each is 3000 / 2 = 1500. Due by 31 January: 3000 + 1500 = 4500 (the GOV.UK page's second example).",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "owner",
    signedOffAt: "2026-11-20",
    signedOffHash: "3d375ed6e17a6c6fec87cc9498ffb01a5e142aca8e434ad85a5319d219898569",
  },
  {
    id: "paymentsOnAccount.2027-28.999.99.0",
    taxYear: "2027/28",
    region: "ENGLAND_NI_WALES",
    kind: "paymentsOnAccount",
    input: {
      bill: 999.99,
      taxDeductedAtSource: 0,
    },
    expected: 999.99,
    source: "https://www.gov.uk/understand-self-assessment-bill/payments-on-account",
    sourceReadOn: "2026-11-14",
    derivation:
      "Bill 999.99 is less than 1000, so no payments on account. Due by 31 January: 999.99.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "owner",
    signedOffAt: "2026-11-20",
    signedOffHash: "e10eb5ec4f1fa2598fba2ba3358fc3eff5fd4f965d9abd8575d017dea9262d82",
  },
  {
    id: "paymentsOnAccount.2027-28.1000.0",
    taxYear: "2027/28",
    region: "ENGLAND_NI_WALES",
    kind: "paymentsOnAccount",
    input: {
      bill: 1000,
      taxDeductedAtSource: 0,
    },
    expected: 1500,
    source: "https://www.gov.uk/understand-self-assessment-bill/payments-on-account",
    sourceReadOn: "2026-11-14",
    derivation:
      "Bill 1000 is not less than 1000, so payments on account are due: each is 1000 / 2 = 500. Due by 31 January: 1000 + 500 = 1500.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "owner",
    signedOffAt: "2026-11-20",
    signedOffHash: "a37e392ca6a2a714d7594295575bda3d3b7371ec3ff157dfed0ab70f219ed86c",
  },
  {
    id: "paymentsOnAccount.2027-28.2000.9000",
    taxYear: "2027/28",
    region: "ENGLAND_NI_WALES",
    kind: "paymentsOnAccount",
    input: {
      bill: 2000,
      taxDeductedAtSource: 9000,
    },
    expected: 2000,
    source: "https://www.gov.uk/understand-self-assessment-bill/payments-on-account",
    sourceReadOn: "2026-11-14",
    derivation:
      "Bill 2000, 9000 taken at source. Tax owed in all 11000; 9000 / 11000 = 81.8%, more than 80%, so no payments on account. Due by 31 January: 2000.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "owner",
    signedOffAt: "2026-11-20",
    signedOffHash: "deac4d1df546e9092857e87b4d0c632a36a358b4ebf4ddb24a25c3f85bfe6e21",
  },
  {
    id: "paymentsOnAccount.2027-28.2000.8000",
    taxYear: "2027/28",
    region: "ENGLAND_NI_WALES",
    kind: "paymentsOnAccount",
    input: {
      bill: 2000,
      taxDeductedAtSource: 8000,
    },
    expected: 3000,
    source: "https://www.gov.uk/understand-self-assessment-bill/payments-on-account",
    sourceReadOn: "2026-11-14",
    derivation:
      "Bill 2000, 8000 taken at source. Tax owed in all 10000; 8000 / 10000 = 80%, which is not more than 80%, so payments on account are due: each is 2000 / 2 = 1000. Due by 31 January: 2000 + 1000 = 3000.",
    confidence: "high",
    status: "VERIFIED",
    signedOffBy: "owner",
    signedOffAt: "2026-11-20",
    signedOffHash: "52341592ea0965d5987c93cea538ba3fd3747fe7b5d9c95e1fdc8a0569545821",
  },
];

export function selectUkSelfAssessmentVectors(
  filter: { taxYear?: string; kind?: UkSelfAssessmentVectorKind } = {},
  vectors: readonly UkSelfAssessmentVector[] = UK_SELF_ASSESSMENT_VECTORS,
): UkSelfAssessmentVector[] {
  return vectors.filter(
    (v) =>
      (filter.taxYear === undefined || v.taxYear === filter.taxYear) &&
      (filter.kind === undefined || v.kind === filter.kind),
  );
}
