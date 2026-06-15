/**
 * taxRules.ts
 *
 * Centralised tax rules data for all supported countries and tax years.
 *
 * IMPORTANT: This file provides reference data for indicative tax estimate
 * calculations only. See TAX_DISCLAIMER below.
 *
 * Countries currently supported:
 *   - United Kingdom – England, Wales & Northern Ireland (EWNI)
 *   - United Kingdom – Scotland (Scottish Income Tax rates differ from EWNI)
 *   - Republic of Ireland
 *
 * Tax year notation:
 *   - UK uses "YYYY/YY"   e.g. "2024/25" (6 April to 5 April)
 *   - Ireland uses "YYYY" e.g. "2024"    (1 January to 31 December)
 *
 * Last data update: June 2025
 * Sources:
 *   - UK: HMRC (gov.uk/government/collections/tax-rates-and-allowances)
 *   - Scotland: Revenue Scotland / Scottish Government budget documents
 *   - Ireland: Revenue Commissioners (revenue.ie)
 */

// ---------------------------------------------------------------------------
// Legal Disclaimer
// ---------------------------------------------------------------------------

export const TAX_DISCLAIMER = {
  /**
   * Short one-line version — suitable for inline notices.
   */
  short:
    "Figures are estimates for guidance only. Always consult official guidance or a qualified adviser.",

  /**
   * Full legal disclaimer — render on all tax calculation pages.
   */
  full: `Disclaimer — Indicative Figures Only

The tax figures shown on this platform are estimates provided for general guidance and informational purposes only. They are based on publicly available tax rules understood to be in effect at the time this software was last updated, which may not reflect the most recent legislation, emergency budget changes, HMRC guidance, or Revenue Commissioners (Ireland) guidance.

These calculations do not account for — and will give incorrect results if you have — any of the following: changes to your individual tax code; Marriage Allowance; Blind Person's Allowance; Gift Aid; pension carry-forward; Enterprise Investment Scheme (EIS) or Seed EIS reliefs; share scheme or employment-related securities income; non-domiciled or non-resident status; split-year treatment; income from trusts or estates; additional property surcharge; High Income Child Benefit Charge; tax treaty provisions; or any other personal circumstance that modifies your tax liability.

Scottish taxpayers are subject to Scottish Income Tax rates set by the Scottish Parliament, which differ from those applied in England, Wales and Northern Ireland. All UK users on this platform are currently assumed to be subject to England/Wales/Northern Ireland rates unless stated otherwise.

These figures should not be relied upon for making financial decisions, completing self-assessment tax returns, or any legal purpose. You should always consult a qualified tax adviser or accountant, or refer directly to official guidance:
  • HMRC: www.gov.uk/guidance/tax-rates-and-allowances
  • Revenue (Ireland): www.revenue.ie/en/tax-professionals/legislation/index.aspx
  • Scottish Government: www.mygov.scot/income-tax-rates

Flump is not a regulated financial or tax adviser. No liability is accepted for any loss or damages arising from reliance on these estimates.`,

  /**
   * Condensed version for mobile screens where vertical space is limited.
   */
  mobile: `These tax figures are estimates for guidance only. Rules used may be out of date. Do not rely on these figures for tax returns or financial decisions. Consult HMRC (gov.uk), Revenue (revenue.ie), or a qualified adviser for accurate figures. Flump accepts no liability for any loss from reliance on these estimates.`,
} as const;

// ---------------------------------------------------------------------------
// UK — England, Wales & Northern Ireland (EWNI) Income Tax
// ---------------------------------------------------------------------------

export interface UKEWNIIncomeTaxYear {
  /** Description of what this configuration covers */
  description: string;
  /** Personal allowance (tapers by £1 for every £2 above £100,000) */
  personalAllowance: number;
  /** Width of the basic-rate band after personal allowance */
  basicRateBandWidth: number;
  /** Basic income tax rate (20%) */
  basicRate: number;
  /**
   * Threshold at which the higher rate begins (personal allowance + basicRateBandWidth).
   * E.g. 12,570 + 37,700 = 50,270.
   */
  higherRateThreshold: number;
  /** Higher income tax rate (40%) */
  higherRate: number;
  /**
   * Threshold at which the additional rate begins.
   * Was £150,000 until 2022/23; reduced to £125,140 from 2023/24.
   */
  additionalRateThreshold: number;
  /** Additional income tax rate (45%) */
  additionalRate: number;
  /** Threshold above which personal allowance begins tapering */
  personalAllowanceTaperStart: number;
}

export const UK_EWNI_INCOME_TAX: Record<string, UKEWNIIncomeTaxYear> = {
  "2020/21": {
    description: "England, Wales & Northern Ireland — 2020/21",
    personalAllowance: 12500,
    basicRateBandWidth: 37500,
    basicRate: 0.2,
    higherRateThreshold: 50000,
    higherRate: 0.4,
    additionalRateThreshold: 150000,
    additionalRate: 0.45,
    personalAllowanceTaperStart: 100000,
  },
  "2021/22": {
    description: "England, Wales & Northern Ireland — 2021/22",
    personalAllowance: 12570,
    basicRateBandWidth: 37700,
    basicRate: 0.2,
    higherRateThreshold: 50270,
    higherRate: 0.4,
    additionalRateThreshold: 150000,
    additionalRate: 0.45,
    personalAllowanceTaperStart: 100000,
  },
  "2022/23": {
    description: "England, Wales & Northern Ireland — 2022/23",
    personalAllowance: 12570,
    basicRateBandWidth: 37700,
    basicRate: 0.2,
    higherRateThreshold: 50270,
    higherRate: 0.4,
    additionalRateThreshold: 150000,
    additionalRate: 0.45,
    personalAllowanceTaperStart: 100000,
  },
  "2023/24": {
    description: "England, Wales & Northern Ireland — 2023/24",
    personalAllowance: 12570,
    basicRateBandWidth: 37700,
    basicRate: 0.2,
    higherRateThreshold: 50270,
    higherRate: 0.4,
    additionalRateThreshold: 125140,
    additionalRate: 0.45,
    personalAllowanceTaperStart: 100000,
  },
  "2024/25": {
    description: "England, Wales & Northern Ireland — 2024/25",
    personalAllowance: 12570,
    basicRateBandWidth: 37700,
    basicRate: 0.2,
    higherRateThreshold: 50270,
    higherRate: 0.4,
    additionalRateThreshold: 125140,
    additionalRate: 0.45,
    personalAllowanceTaperStart: 100000,
  },
  "2025/26": {
    description: "England, Wales & Northern Ireland — 2025/26",
    personalAllowance: 12570,
    basicRateBandWidth: 37700,
    basicRate: 0.2,
    higherRateThreshold: 50270,
    higherRate: 0.4,
    additionalRateThreshold: 125140,
    additionalRate: 0.45,
    personalAllowanceTaperStart: 100000,
  },
  "2026/27": {
    description: "England, Wales & Northern Ireland — 2026/27",
    personalAllowance: 12570,
    basicRateBandWidth: 37700,
    basicRate: 0.2,
    higherRateThreshold: 50270,
    higherRate: 0.4,
    additionalRateThreshold: 125140,
    additionalRate: 0.45,
    personalAllowanceTaperStart: 100000,
  },
};

// ---------------------------------------------------------------------------
// UK — Scotland Income Tax
// Scotland sets its own income tax rates on non-savings, non-dividend income.
// NI contributions remain UK-wide (same as EWNI).
// ---------------------------------------------------------------------------

export interface UKScotlandIncomeTaxBand {
  /** Band name */
  name: string;
  /** Annual income at which this band begins (cumulative from £0) */
  from: number;
  /** Annual income at which this band ends (exclusive) — null = no limit */
  to: number | null;
  /** Marginal tax rate */
  rate: number;
}

export interface UKScotlandIncomeTaxYear {
  description: string;
  /**
   * Scottish personal allowance matches the UK-wide personal allowance.
   * The income threshold for the Scottish starter rate begins at £0 of taxable income
   * (after personal allowance deduction), so 'from' values below are cumulative
   * taxable income, not gross income.
   */
  personalAllowance: number;
  personalAllowanceTaperStart: number;
  bands: UKScotlandIncomeTaxBand[];
}

export const UK_SCOTLAND_INCOME_TAX: Record<string, UKScotlandIncomeTaxYear> = {
  "2020/21": {
    description: "Scotland — 2020/21",
    personalAllowance: 12500,
    personalAllowanceTaperStart: 100000,
    bands: [
      { name: "Starter", from: 0, to: 2085, rate: 0.19 },
      { name: "Basic", from: 2085, to: 12658, rate: 0.2 },
      { name: "Intermediate", from: 12658, to: 30930, rate: 0.21 },
      { name: "Higher", from: 30930, to: 150000, rate: 0.41 },
      { name: "Top", from: 150000, to: null, rate: 0.46 },
    ],
  },
  "2021/22": {
    description: "Scotland — 2021/22",
    personalAllowance: 12570,
    personalAllowanceTaperStart: 100000,
    bands: [
      { name: "Starter", from: 0, to: 2097, rate: 0.19 },
      { name: "Basic", from: 2097, to: 12726, rate: 0.2 },
      { name: "Intermediate", from: 12726, to: 31092, rate: 0.21 },
      { name: "Higher", from: 31092, to: 150000, rate: 0.41 },
      { name: "Top", from: 150000, to: null, rate: 0.46 },
    ],
  },
  "2022/23": {
    description: "Scotland — 2022/23",
    personalAllowance: 12570,
    personalAllowanceTaperStart: 100000,
    bands: [
      { name: "Starter", from: 0, to: 2162, rate: 0.19 },
      { name: "Basic", from: 2162, to: 13118, rate: 0.2 },
      { name: "Intermediate", from: 13118, to: 31092, rate: 0.21 },
      { name: "Higher", from: 31092, to: 150000, rate: 0.41 },
      { name: "Top", from: 150000, to: null, rate: 0.46 },
    ],
  },
  "2023/24": {
    description: "Scotland — 2023/24",
    personalAllowance: 12570,
    personalAllowanceTaperStart: 100000,
    bands: [
      { name: "Starter", from: 0, to: 2162, rate: 0.19 },
      { name: "Basic", from: 2162, to: 13118, rate: 0.2 },
      { name: "Intermediate", from: 13118, to: 31092, rate: 0.21 },
      { name: "Higher", from: 31092, to: 125140, rate: 0.42 },
      { name: "Top", from: 125140, to: null, rate: 0.47 },
    ],
  },
  "2024/25": {
    description: "Scotland — 2024/25",
    personalAllowance: 12570,
    personalAllowanceTaperStart: 100000,
    bands: [
      { name: "Starter", from: 0, to: 2306, rate: 0.19 },
      { name: "Basic", from: 2306, to: 13991, rate: 0.2 },
      { name: "Intermediate", from: 13991, to: 31092, rate: 0.21 },
      { name: "Higher", from: 31092, to: 62430, rate: 0.42 },
      { name: "Advanced", from: 62430, to: 125140, rate: 0.45 },
      { name: "Top", from: 125140, to: null, rate: 0.48 },
    ],
  },
  "2025/26": {
    description: "Scotland — 2025/26",
    personalAllowance: 12570,
    personalAllowanceTaperStart: 100000,
    bands: [
      { name: "Starter", from: 0, to: 2827, rate: 0.19 },
      { name: "Basic", from: 2827, to: 14921, rate: 0.2 },
      { name: "Intermediate", from: 14921, to: 31092, rate: 0.21 },
      { name: "Higher", from: 31092, to: 62430, rate: 0.42 },
      { name: "Advanced", from: 62430, to: 125140, rate: 0.45 },
      { name: "Top", from: 125140, to: null, rate: 0.48 },
    ],
  },
  "2026/27": {
    description: "Scotland — 2026/27",
    personalAllowance: 12570,
    personalAllowanceTaperStart: 100000,
    bands: [
      { name: "Starter", from: 0, to: 3967, rate: 0.19 },
      { name: "Basic", from: 3967, to: 16956, rate: 0.2 },
      { name: "Intermediate", from: 16956, to: 31092, rate: 0.21 },
      { name: "Higher", from: 31092, to: 62430, rate: 0.42 },
      { name: "Advanced", from: 62430, to: 125140, rate: 0.45 },
      { name: "Top", from: 125140, to: null, rate: 0.48 },
    ],
  },
};

// ---------------------------------------------------------------------------
// UK — National Insurance Contributions
// NI is set UK-wide — applies to both EWNI and Scotland.
// ---------------------------------------------------------------------------

export interface UKNationalInsuranceYear {
  description: string;
  /** Class 1 Primary (employees) */
  class1: {
    /** Lower Earnings Limit — no NI below this */
    lowerEarningsLimit: number;
    /** Primary Threshold — NI starts being charged here */
    primaryThreshold: number;
    /** Upper Earnings Limit — higher rate NI above this */
    upperEarningsLimit: number;
    /** Main rate (between primary threshold and UEL) */
    mainRate: number;
    /** Upper rate (above UEL) */
    upperRate: number;
  };
  /** Class 4 (self-employed on profits) */
  class4: {
    /** Lower Profits Limit */
    lowerProfitsLimit: number;
    /** Upper Profits Limit */
    upperProfitsLimit: number;
    /** Main rate (between lower and upper profits limits) */
    mainRate: number;
    /** Upper rate (above upper profits limit) */
    upperRate: number;
  };
  /** Class 2 (self-employed flat rate per week) — abolished from 2024/25 */
  class2: {
    abolished: boolean;
    weeklyRate: number;
    smallProfitsThreshold: number;
  };
}

export const UK_NATIONAL_INSURANCE: Record<string, UKNationalInsuranceYear> = {
  "2020/21": {
    description: "UK National Insurance — 2020/21",
    class1: {
      lowerEarningsLimit: 6240,
      primaryThreshold: 9500,
      upperEarningsLimit: 50000,
      mainRate: 0.12,
      upperRate: 0.02,
    },
    class4: {
      lowerProfitsLimit: 9500,
      upperProfitsLimit: 50000,
      mainRate: 0.09,
      upperRate: 0.02,
    },
    class2: { abolished: false, weeklyRate: 3.05, smallProfitsThreshold: 6475 },
  },
  "2021/22": {
    description: "UK National Insurance — 2021/22",
    class1: {
      lowerEarningsLimit: 6240,
      primaryThreshold: 9568,
      upperEarningsLimit: 50270,
      mainRate: 0.12,
      upperRate: 0.02,
    },
    class4: {
      lowerProfitsLimit: 9568,
      upperProfitsLimit: 50270,
      mainRate: 0.09,
      upperRate: 0.02,
    },
    class2: { abolished: false, weeklyRate: 3.05, smallProfitsThreshold: 6515 },
  },
  "2022/23": {
    description: "UK National Insurance — 2022/23 (rates changed mid-year)",
    class1: {
      lowerEarningsLimit: 6396,
      primaryThreshold: 12570,
      upperEarningsLimit: 50270,
      mainRate: 0.1325, // increased Apr–Oct 2022, then reduced Nov 2022 — we use the full-year blended effective rate approximation of 12%
      upperRate: 0.0325,
    },
    class4: {
      lowerProfitsLimit: 11908, // raised mid-year (annualised average threshold)
      upperProfitsLimit: 50270,
      mainRate: 0.0973,
      upperRate: 0.0273,
    },
    class2: { abolished: false, weeklyRate: 3.15, smallProfitsThreshold: 6725 },
  },
  "2023/24": {
    description: "UK National Insurance — 2023/24",
    class1: {
      lowerEarningsLimit: 6396,
      primaryThreshold: 12570,
      upperEarningsLimit: 50270,
      mainRate: 0.08, // reduced from 12% to 10% in Jan 2024, then to 8% in Apr 2024 (2024/25 full rate)
      upperRate: 0.02,
    },
    class4: {
      lowerProfitsLimit: 12570,
      upperProfitsLimit: 50270,
      mainRate: 0.09,
      upperRate: 0.02,
    },
    class2: { abolished: false, weeklyRate: 3.45, smallProfitsThreshold: 12570 },
  },
  "2024/25": {
    description: "UK National Insurance — 2024/25",
    class1: {
      lowerEarningsLimit: 6396,
      primaryThreshold: 12570,
      upperEarningsLimit: 50270,
      mainRate: 0.08,
      upperRate: 0.02,
    },
    class4: {
      lowerProfitsLimit: 12570,
      upperProfitsLimit: 50270,
      mainRate: 0.06,
      upperRate: 0.02,
    },
    class2: { abolished: true, weeklyRate: 0, smallProfitsThreshold: 0 },
  },
  "2025/26": {
    description: "UK National Insurance — 2025/26",
    class1: {
      lowerEarningsLimit: 6396,
      primaryThreshold: 12570,
      upperEarningsLimit: 50270,
      mainRate: 0.08,
      upperRate: 0.02,
    },
    class4: {
      lowerProfitsLimit: 12570,
      upperProfitsLimit: 50270,
      mainRate: 0.06,
      upperRate: 0.02,
    },
    class2: { abolished: true, weeklyRate: 0, smallProfitsThreshold: 0 },
  },
  "2026/27": {
    description: "UK National Insurance — 2026/27",
    class1: {
      lowerEarningsLimit: 6708,
      primaryThreshold: 12570,
      upperEarningsLimit: 50270,
      mainRate: 0.08,
      upperRate: 0.02,
    },
    class4: {
      lowerProfitsLimit: 12570,
      upperProfitsLimit: 50270,
      mainRate: 0.06,
      upperRate: 0.02,
    },
    class2: { abolished: true, weeklyRate: 0, smallProfitsThreshold: 0 },
  },
};

// ---------------------------------------------------------------------------
// UK — Student Loan Repayment Plans
// ---------------------------------------------------------------------------

export interface UKStudentLoanPlan {
  name: string;
  /** Annual repayment threshold */
  threshold: number;
  /** Repayment rate on income above threshold */
  rate: number;
}

export interface UKStudentLoanYear {
  description: string;
  plans: {
    plan1: UKStudentLoanPlan;
    plan2: UKStudentLoanPlan;
    plan4: UKStudentLoanPlan; // Scotland
    plan5: UKStudentLoanPlan;
    postgrad: UKStudentLoanPlan;
  };
}

export const UK_STUDENT_LOANS: Record<string, UKStudentLoanYear> = {
  "2023/24": {
    description: "Student Loans — 2023/24",
    plans: {
      plan1: { name: "Plan 1", threshold: 22015, rate: 0.09 },
      plan2: { name: "Plan 2", threshold: 27295, rate: 0.09 },
      plan4: { name: "Plan 4 (Scotland)", threshold: 27660, rate: 0.09 },
      plan5: { name: "Plan 5", threshold: 25000, rate: 0.09 },
      postgrad: { name: "Postgrad", threshold: 21000, rate: 0.06 },
    },
  },
  "2024/25": {
    description: "Student Loans — 2024/25",
    plans: {
      plan1: { name: "Plan 1", threshold: 24990, rate: 0.09 },
      plan2: { name: "Plan 2", threshold: 27295, rate: 0.09 },
      plan4: { name: "Plan 4 (Scotland)", threshold: 31395, rate: 0.09 },
      plan5: { name: "Plan 5", threshold: 25000, rate: 0.09 },
      postgrad: { name: "Postgrad", threshold: 21000, rate: 0.06 },
    },
  },
  "2025/26": {
    description: "Student Loans — 2025/26",
    plans: {
      plan1: { name: "Plan 1", threshold: 26900, rate: 0.09 },
      plan2: { name: "Plan 2", threshold: 29385, rate: 0.09 },
      plan4: { name: "Plan 4 (Scotland)", threshold: 33795, rate: 0.09 },
      plan5: { name: "Plan 5", threshold: 25000, rate: 0.09 },
      postgrad: { name: "Postgrad", threshold: 21000, rate: 0.06 },
    },
  },
  "2026/27": {
    description: "Student Loans — 2026/27",
    plans: {
      plan1: { name: "Plan 1", threshold: 26900, rate: 0.09 },
      plan2: { name: "Plan 2", threshold: 29385, rate: 0.09 },
      plan4: { name: "Plan 4 (Scotland)", threshold: 33795, rate: 0.09 },
      plan5: { name: "Plan 5", threshold: 25000, rate: 0.09 },
      postgrad: { name: "Postgrad", threshold: 21000, rate: 0.06 },
    },
  },
};

// ---------------------------------------------------------------------------
// UK — Combined per-year config used by legacy TaxCalculator.ts
// Kept for backwards compatibility with existing calculateUKTax() calls.
// ---------------------------------------------------------------------------

export interface UKLegacyTaxYearConfig {
  personalAllowance: number;
  basicRateBand: number;
  higherRateLimit: number;
  class4LowerLimit: number;
  class4UpperLimit: number;
  class4BasicRate: number;
  class4HigherRate: number;
}

/** Maps from the new canonical data into the legacy TaxYearConfig shape. */
export function buildLegacyUKConfig(taxYear: string): UKLegacyTaxYearConfig {
  const it = UK_EWNI_INCOME_TAX[taxYear] ?? UK_EWNI_INCOME_TAX["2024/25"];
  const ni = UK_NATIONAL_INSURANCE[taxYear] ?? UK_NATIONAL_INSURANCE["2024/25"];
  return {
    personalAllowance: it.personalAllowance,
    basicRateBand: it.basicRateBandWidth,
    higherRateLimit: it.additionalRateThreshold,
    class4LowerLimit: ni.class4.lowerProfitsLimit,
    class4UpperLimit: ni.class4.upperProfitsLimit,
    class4BasicRate: ni.class4.mainRate,
    class4HigherRate: ni.class4.upperRate,
  };
}

// ---------------------------------------------------------------------------
// Republic of Ireland Tax Rules
// ---------------------------------------------------------------------------

export interface IrelandIncomeTaxYear {
  description: string;
  /**
   * Standard rate band for a single filer (married/civil partnership bands differ).
   * Income up to this amount is taxed at 20%; above at 40%.
   */
  standardRateBandSingle: number;
  standardRate: number;
  higherRate: number;
  /**
   * Tax credits reduce the final tax bill directly (not the taxable income).
   * All credits listed are annual amounts.
   */
  credits: {
    /** Personal Tax Credit (every individual) */
    personal: number;
    /** Employee Tax Credit (PAYE workers only) */
    employee: number;
    /** Earned Income Tax Credit (self-employed in lieu of Employee credit) */
    earnedIncome: number;
  };
}

export const IRELAND_INCOME_TAX: Record<string, IrelandIncomeTaxYear> = {
  "2020": {
    description: "Republic of Ireland — Income Tax 2020",
    standardRateBandSingle: 35300,
    standardRate: 0.2,
    higherRate: 0.4,
    credits: { personal: 1650, employee: 1650, earnedIncome: 1500 },
  },
  "2021": {
    description: "Republic of Ireland — Income Tax 2021",
    standardRateBandSingle: 35300,
    standardRate: 0.2,
    higherRate: 0.4,
    credits: { personal: 1650, employee: 1650, earnedIncome: 1650 },
  },
  "2022": {
    description: "Republic of Ireland — Income Tax 2022",
    standardRateBandSingle: 36800,
    standardRate: 0.2,
    higherRate: 0.4,
    credits: { personal: 1700, employee: 1700, earnedIncome: 1700 },
  },
  "2023": {
    description: "Republic of Ireland — Income Tax 2023",
    standardRateBandSingle: 40000,
    standardRate: 0.2,
    higherRate: 0.4,
    credits: { personal: 1775, employee: 1775, earnedIncome: 1775 },
  },
  "2024": {
    description: "Republic of Ireland — Income Tax 2024",
    standardRateBandSingle: 42000,
    standardRate: 0.2,
    higherRate: 0.4,
    credits: { personal: 1875, employee: 1875, earnedIncome: 1875 },
  },
  "2025": {
    description: "Republic of Ireland — Income Tax 2025",
    standardRateBandSingle: 44000,
    standardRate: 0.2,
    higherRate: 0.4,
    credits: { personal: 2000, employee: 2000, earnedIncome: 2000 },
  },
  "2026": {
    description: "Republic of Ireland — Income Tax 2026",
    standardRateBandSingle: 44000,
    standardRate: 0.2,
    higherRate: 0.4,
    credits: { personal: 2000, employee: 2000, earnedIncome: 2000 },
  },
};

export interface IrelandUSCYear {
  description: string;
  bands: Array<{
    name: string;
    /** Lower bound (inclusive) */
    from: number;
    /** Upper bound (inclusive) — null = no ceiling */
    to: number | null;
    rate: number;
  }>;
  /** Reduced rate for earners under €13,000 gross (exempt from USC) */
  exemptionThreshold: number;
  /** Reduced 2% rate for earners over 70 or with full medical card */
  reducedRateThreshold: number | null;
}

export const IRELAND_USC: Record<string, IrelandUSCYear> = {
  "2020": {
    description: "Republic of Ireland — USC 2020",
    exemptionThreshold: 13000,
    reducedRateThreshold: null,
    bands: [
      { name: "Band 1", from: 0, to: 12012, rate: 0.005 },
      { name: "Band 2", from: 12012, to: 20484, rate: 0.02 },
      { name: "Band 3", from: 20484, to: 70044, rate: 0.045 },
      { name: "Band 4", from: 70044, to: null, rate: 0.08 },
    ],
  },
  "2021": {
    description: "Republic of Ireland — USC 2021",
    exemptionThreshold: 13000,
    reducedRateThreshold: null,
    bands: [
      { name: "Band 1", from: 0, to: 12012, rate: 0.005 },
      { name: "Band 2", from: 12012, to: 20484, rate: 0.02 },
      { name: "Band 3", from: 20484, to: 70044, rate: 0.045 },
      { name: "Band 4", from: 70044, to: null, rate: 0.08 },
    ],
  },
  "2022": {
    description: "Republic of Ireland — USC 2022",
    exemptionThreshold: 13000,
    reducedRateThreshold: null,
    bands: [
      { name: "Band 1", from: 0, to: 12012, rate: 0.005 },
      { name: "Band 2", from: 12012, to: 21295, rate: 0.02 },
      { name: "Band 3", from: 21295, to: 70044, rate: 0.045 },
      { name: "Band 4", from: 70044, to: null, rate: 0.08 },
    ],
  },
  "2023": {
    description: "Republic of Ireland — USC 2023",
    exemptionThreshold: 13000,
    reducedRateThreshold: null,
    bands: [
      { name: "Band 1", from: 0, to: 12012, rate: 0.005 },
      { name: "Band 2", from: 12012, to: 22920, rate: 0.02 },
      { name: "Band 3", from: 22920, to: 70044, rate: 0.04 },
      { name: "Band 4", from: 70044, to: null, rate: 0.08 },
    ],
  },
  "2024": {
    description: "Republic of Ireland — USC 2024",
    exemptionThreshold: 13000,
    reducedRateThreshold: null,
    bands: [
      { name: "Band 1", from: 0, to: 12012, rate: 0.005 },
      { name: "Band 2", from: 12012, to: 25760, rate: 0.02 },
      { name: "Band 3", from: 25760, to: 70044, rate: 0.04 },
      { name: "Band 4", from: 70044, to: null, rate: 0.08 },
    ],
  },
  "2025": {
    description: "Republic of Ireland — USC 2025",
    exemptionThreshold: 13000,
    reducedRateThreshold: null,
    bands: [
      { name: "Band 1", from: 0, to: 12012, rate: 0.005 },
      { name: "Band 2", from: 12012, to: 27382, rate: 0.02 },
      { name: "Band 3", from: 27382, to: 70044, rate: 0.03 },
      { name: "Band 4", from: 70044, to: null, rate: 0.08 },
    ],
  },
  "2026": {
    description: "Republic of Ireland — USC 2026",
    exemptionThreshold: 13000,
    reducedRateThreshold: null,
    bands: [
      { name: "Band 1", from: 0, to: 12012, rate: 0.005 },
      { name: "Band 2", from: 12012, to: 28700, rate: 0.02 },
      { name: "Band 3", from: 28700, to: 70044, rate: 0.03 },
      { name: "Band 4", from: 70044, to: null, rate: 0.08 },
    ],
  },
};

export interface IrelandPRSIYear {
  description: string;
  /** Class A (employees — most common) */
  classA: {
    /** Weekly earnings below this are exempt */
    weeklyExemptionThreshold: number;
    /** Annual equivalent of weekly exemption */
    annualExemptionThreshold: number;
    /** Employer + employee combined — employee portion is subEmployeeRate */
    rate: number;
    /** Employee-only portion */
    employeeRate: number;
    /** Annual threshold above which the full rate kicks in (no rebate) */
    creditThreshold: number;
    /** PRSI credit for low earners (reduces below creditThreshold) */
    maxCredit: number;
  };
  /** Class S (self-employed) */
  classS: {
    /** Minimum annual liability if profits exceed exemption */
    minimumContribution: number;
    annualExemptionThreshold: number;
    rate: number;
  };
}

export const IRELAND_PRSI: Record<string, IrelandPRSIYear> = {
  "2020": {
    description: "Republic of Ireland — PRSI 2020",
    classA: {
      weeklyExemptionThreshold: 352,
      annualExemptionThreshold: 18304,
      rate: 0.04,
      employeeRate: 0.04,
      creditThreshold: 26000,
      maxCredit: 12,
    },
    classS: { minimumContribution: 500, annualExemptionThreshold: 5000, rate: 0.04 },
  },
  "2021": {
    description: "Republic of Ireland — PRSI 2021",
    classA: {
      weeklyExemptionThreshold: 352,
      annualExemptionThreshold: 18304,
      rate: 0.04,
      employeeRate: 0.04,
      creditThreshold: 26000,
      maxCredit: 12,
    },
    classS: { minimumContribution: 500, annualExemptionThreshold: 5000, rate: 0.04 },
  },
  "2022": {
    description: "Republic of Ireland — PRSI 2022",
    classA: {
      weeklyExemptionThreshold: 352,
      annualExemptionThreshold: 18304,
      rate: 0.04,
      employeeRate: 0.04,
      creditThreshold: 26000,
      maxCredit: 12,
    },
    classS: { minimumContribution: 500, annualExemptionThreshold: 5000, rate: 0.04 },
  },
  "2023": {
    description: "Republic of Ireland — PRSI 2023",
    classA: {
      weeklyExemptionThreshold: 352,
      annualExemptionThreshold: 18304,
      rate: 0.04,
      employeeRate: 0.04,
      creditThreshold: 26000,
      maxCredit: 12,
    },
    classS: { minimumContribution: 500, annualExemptionThreshold: 5000, rate: 0.04 },
  },
  "2024": {
    description: "Republic of Ireland — PRSI 2024",
    classA: {
      weeklyExemptionThreshold: 352,
      annualExemptionThreshold: 18304,
      rate: 0.041, // increased to 4.1% from Oct 2024 — using new rate
      employeeRate: 0.041,
      creditThreshold: 26000,
      maxCredit: 12,
    },
    classS: { minimumContribution: 500, annualExemptionThreshold: 5000, rate: 0.041 },
  },
  "2025": {
    description: "Republic of Ireland — PRSI 2025",
    classA: {
      weeklyExemptionThreshold: 352,
      annualExemptionThreshold: 18304,
      rate: 0.043, // progressive PRSI increases toward 4.7% by 2028
      employeeRate: 0.043,
      creditThreshold: 26000,
      maxCredit: 12,
    },
    classS: { minimumContribution: 500, annualExemptionThreshold: 5000, rate: 0.043 },
  },
  "2026": {
    description: "Republic of Ireland — PRSI 2026",
    classA: {
      weeklyExemptionThreshold: 352,
      annualExemptionThreshold: 18304,
      rate: 0.0435, // progressive PRSI increases: 4.2% pre-Oct 2026, 4.35% from 1 Oct 2026
      employeeRate: 0.0435,
      creditThreshold: 26000,
      maxCredit: 12,
    },
    classS: { minimumContribution: 500, annualExemptionThreshold: 5000, rate: 0.0435 },
  },
};

// ---------------------------------------------------------------------------
// Helper: Compute Irish take-home (simple single filer, PAYE employee)
// ---------------------------------------------------------------------------

export interface IrelandTakeHomeResult {
  gross: number;
  incomeTax: number;
  usc: number;
  prsi: number;
  totalDeductions: number;
  netAnnual: number;
  monthlyTakeHome: number;
}

export function calculateIrishTakeHome(
  gross: number,
  calendarYear: string,
  employmentType: "employed" | "self-employed" | "other" | null = "employed",
): IrelandTakeHomeResult {
  const defaultResult: IrelandTakeHomeResult = {
    gross,
    incomeTax: 0,
    usc: 0,
    prsi: 0,
    totalDeductions: 0,
    netAnnual: gross,
    monthlyTakeHome: Math.round(gross / 12),
  };

  if (!gross || gross <= 0 || !employmentType || employmentType === "other") {
    return defaultResult;
  }

  const itRules = IRELAND_INCOME_TAX[calendarYear] ?? IRELAND_INCOME_TAX["2026"];
  const uscRules = IRELAND_USC[calendarYear] ?? IRELAND_USC["2026"];
  const prsiRules = IRELAND_PRSI[calendarYear] ?? IRELAND_PRSI["2026"];

  // 1. Income Tax
  const standardBandIncome = Math.min(gross, itRules.standardRateBandSingle);
  const higherBandIncome = Math.max(0, gross - itRules.standardRateBandSingle);
  const grossTax =
    standardBandIncome * itRules.standardRate + higherBandIncome * itRules.higherRate;

  // Apply tax credits (PAYE employee gets personal + employee; self-employed gets personal + earned income)
  const credits =
    employmentType === "employed"
      ? itRules.credits.personal + itRules.credits.employee
      : itRules.credits.personal + itRules.credits.earnedIncome;
  const incomeTax = Math.max(0, grossTax - credits);

  // 2. USC
  let usc = 0;
  if (gross > uscRules.exemptionThreshold) {
    for (const band of uscRules.bands) {
      const bandFrom = band.from;
      const bandTo = band.to ?? Number.POSITIVE_INFINITY;
      if (gross > bandFrom) {
        const taxableInBand = Math.min(gross, bandTo) - bandFrom;
        usc += taxableInBand * band.rate;
      }
    }
  }

  // 3. PRSI
  let prsi = 0;
  if (employmentType === "employed") {
    if (gross > prsiRules.classA.annualExemptionThreshold) {
      prsi = gross * prsiRules.classA.employeeRate;
    }
  } else if (employmentType === "self-employed") {
    if (gross > prsiRules.classS.annualExemptionThreshold) {
      prsi = Math.max(prsiRules.classS.minimumContribution, gross * prsiRules.classS.rate);
    }
  }

  const totalDeductions = Math.round(incomeTax) + Math.round(usc) + Math.round(prsi);
  const netAnnual = Math.max(0, gross - totalDeductions);

  return {
    gross,
    incomeTax: Math.round(incomeTax),
    usc: Math.round(usc),
    prsi: Math.round(prsi),
    totalDeductions,
    netAnnual,
    monthlyTakeHome: Math.round(netAnnual / 12),
  };
}

// ---------------------------------------------------------------------------
// Helper utilities
// ---------------------------------------------------------------------------

/**
 * Returns the current UK tax year key e.g. "2025/26".
 * UK tax year runs 6 April to 5 April.
 */
export function getCurrentUKTaxYear(): string {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-indexed
  const year = now.getFullYear();
  if (month >= 4) {
    return `${year}/${(year + 1).toString().slice(-2)}`;
  }
  return `${year - 1}/${year.toString().slice(-2)}`;
}

/**
 * Returns the current Irish tax year key e.g. "2025".
 * Irish tax year runs 1 January to 31 December.
 */
export function getCurrentIrishTaxYear(): string {
  return new Date().getFullYear().toString();
}

/** Returns all supported UK tax year keys in chronological order. */
export function getAvailableUKTaxYears(): string[] {
  return Object.keys(UK_EWNI_INCOME_TAX).sort();
}

/** Returns all supported Irish tax year keys in chronological order. */
export function getAvailableIrishTaxYears(): string[] {
  return Object.keys(IRELAND_INCOME_TAX).sort();
}

/**
 * Derives the Irish calendar year key from a date string (YYYY-MM-DD).
 * Ireland uses calendar years so this is simply the year component.
 */
export function getIrishTaxYearForDate(dateStr: string): string {
  return dateStr.substring(0, 4);
}

/**
 * Calculates UK EWNI income tax on a given taxable income (after personal allowance deduction).
 * Used internally by calculateUKEWNITakeHome.
 */
export function calculateUKEWNIIncomeTaxOnTaxable(
  taxableIncome: number,
  year: UKEWNIIncomeTaxYear,
): number {
  if (taxableIncome <= 0) return 0;

  const basicBandTax = Math.min(taxableIncome, year.basicRateBandWidth) * year.basicRate;

  const higherBandWidth =
    year.additionalRateThreshold - year.personalAllowance - year.basicRateBandWidth;
  const higherBandTax =
    Math.max(0, Math.min(taxableIncome - year.basicRateBandWidth, higherBandWidth)) *
    year.higherRate;

  const additionalBandTaxable = Math.max(
    0,
    taxableIncome - year.basicRateBandWidth - higherBandWidth,
  );
  const additionalBandTax = additionalBandTaxable * year.additionalRate;

  return basicBandTax + higherBandTax + additionalBandTax;
}

/**
 * Calculates Scottish income tax on a given taxable income (after personal allowance).
 */
export function calculateScottishIncomeTaxOnTaxable(
  taxableIncome: number,
  yearRules: UKScotlandIncomeTaxYear,
): number {
  if (taxableIncome <= 0) return 0;
  let tax = 0;
  for (const band of yearRules.bands) {
    if (taxableIncome <= band.from) break;
    const upper = band.to ?? Number.POSITIVE_INFINITY;
    const taxableInBand = Math.min(taxableIncome, upper) - band.from;
    tax += taxableInBand * band.rate;
  }
  return tax;
}

export interface UKTakeHomeResult {
  gross: number;
  pension: number;
  personalAllowance: number;
  taxableIncome: number;
  incomeTax: number;
  ni: number;
  studentLoan: number;
  netAnnual: number;
  monthlyTakeHome: number;
}

/**
 * Full UK take-home calculation (EWNI — not Scottish rates) for a single employed/self-employed filer.
 * Pension deduction is assumed to be salary sacrifice (reduces both taxable income and NI base if employed).
 *
 * NOTE: This is an approximation. See TAX_DISCLAIMER.
 */
export function calculateUKEWNITakeHome(
  gross: number,
  employmentType: "employed" | "self-employed" | "other" | null,
  pensionPercent: number,
  isSalarySacrifice: boolean,
  taxYear: string,
  studentLoanPlan: keyof UKStudentLoanYear["plans"] | "none" = "none",
): UKTakeHomeResult {
  const itRules = UK_EWNI_INCOME_TAX[taxYear] ?? UK_EWNI_INCOME_TAX["2026/27"];
  const niRules = UK_NATIONAL_INSURANCE[taxYear] ?? UK_NATIONAL_INSURANCE["2026/27"];
  const slRules = UK_STUDENT_LOANS[taxYear] ?? UK_STUDENT_LOANS["2026/27"];

  const defaultResult: UKTakeHomeResult = {
    gross,
    pension: 0,
    personalAllowance: 0,
    taxableIncome: 0,
    incomeTax: 0,
    ni: 0,
    studentLoan: 0,
    netAnnual: gross,
    monthlyTakeHome: gross ? Math.round(gross / 12) : 0,
  };

  if (!gross || gross <= 0) return defaultResult;
  if (employmentType !== "employed" && employmentType !== "self-employed") return defaultResult;

  // 1. Pension
  const pension = Math.round(gross * (pensionPercent / 100));
  const adjustedGrossForTax = Math.max(0, gross - pension);
  const adjustedGrossForNI = isSalarySacrifice ? adjustedGrossForTax : gross;

  // 2. Personal Allowance (tapered above £100k)
  let personalAllowance = itRules.personalAllowance;
  if (adjustedGrossForTax > itRules.personalAllowanceTaperStart) {
    const reduction = (adjustedGrossForTax - itRules.personalAllowanceTaperStart) / 2;
    personalAllowance = Math.max(0, itRules.personalAllowance - reduction);
  }

  // 3. Income Tax
  const taxableIncome = Math.max(0, adjustedGrossForTax - personalAllowance);
  const incomeTax = Math.round(calculateUKEWNIIncomeTaxOnTaxable(taxableIncome, itRules));

  // 4. National Insurance
  let ni = 0;
  if (employmentType === "employed") {
    const { primaryThreshold, upperEarningsLimit, mainRate, upperRate } = niRules.class1;
    if (adjustedGrossForNI > primaryThreshold) {
      const mainBand = Math.min(adjustedGrossForNI, upperEarningsLimit) - primaryThreshold;
      const upperBand = Math.max(0, adjustedGrossForNI - upperEarningsLimit);
      ni = mainBand * mainRate + upperBand * upperRate;
    }
  } else {
    // Self-employed Class 4
    const { lowerProfitsLimit, upperProfitsLimit, mainRate, upperRate } = niRules.class4;
    if (gross > lowerProfitsLimit) {
      const mainBand = Math.min(gross, upperProfitsLimit) - lowerProfitsLimit;
      const upperBand = Math.max(0, gross - upperProfitsLimit);
      ni = mainBand * mainRate + upperBand * upperRate;
    }
  }
  ni = Math.round(ni);

  // 5. Student Loan
  let studentLoan = 0;
  if (studentLoanPlan !== "none" && slRules.plans[studentLoanPlan]) {
    const plan = slRules.plans[studentLoanPlan];
    if (adjustedGrossForTax > plan.threshold) {
      studentLoan = Math.round((adjustedGrossForTax - plan.threshold) * plan.rate);
    }
  }

  const netAnnual = Math.max(0, gross - pension - incomeTax - ni - studentLoan);

  return {
    gross,
    pension,
    personalAllowance: Math.round(personalAllowance),
    taxableIncome: Math.round(taxableIncome),
    incomeTax,
    ni,
    studentLoan,
    netAnnual,
    monthlyTakeHome: Math.round(netAnnual / 12),
  };
}
