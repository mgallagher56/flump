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
    signedOffBy: null,
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
    signedOffBy: null,
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
    signedOffBy: null,
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
    signedOffBy: null,
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
    signedOffBy: null,
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
    signedOffBy: null,
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
    signedOffBy: null,
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
    signedOffBy: null,
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
    signedOffBy: null,
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
    signedOffBy: null,
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
    signedOffBy: null,
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
    signedOffBy: null,
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
    signedOffBy: null,
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
    signedOffBy: null,
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
    signedOffBy: null,
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
    signedOffBy: null,
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
    signedOffBy: null,
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
    signedOffBy: null,
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
    signedOffBy: null,
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
    signedOffBy: null,
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
    signedOffBy: null,
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
    signedOffBy: null,
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
    signedOffBy: null,
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
    signedOffBy: null,
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
    signedOffBy: null,
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
    signedOffBy: null,
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
