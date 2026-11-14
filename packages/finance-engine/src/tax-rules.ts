/**
 * taxRules.ts
 *
 * Centralised UK tax rules data for all supported tax years (the UK is the only supported country).
 *
 * IMPORTANT: This file provides reference data for indicative tax estimate
 * calculations only. See TAX_DISCLAIMER below.
 *
 * Scope:
 *   - United Kingdom – England, Wales & Northern Ireland (EWNI)
 *   - United Kingdom – Scotland (Scottish Income Tax rates differ from EWNI)
 *
 * Tax year notation:
 *   - UK uses "YYYY/YY"   e.g. "2024/25" (6 April to 5 April)
 *
 * Last data update: June 2025
 * Sources:
 *   - UK: HMRC (gov.uk/government/collections/tax-rates-and-allowances)
 *   - Scotland: Revenue Scotland / Scottish Government budget documents
 */

import { getUkTaxYearContext } from "./uk-tax-year.js";

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
   * Taxable-income threshold (income after personal allowance) above which the additional
   * rate applies. Was £150,000 until 2022/23; reduced to £125,140 from 2023/24.
   */
  additionalRateThreshold: number;
  /** Additional income tax rate (45%) */
  additionalRate: number;
  /** Threshold above which personal allowance begins tapering */
  personalAllowanceTaperStart: number;
}

export const UK_EWNI_INCOME_TAX: Record<string, UKEWNIIncomeTaxYear> = {
  "2020/21": {
    description: "England, Wales and Northern Ireland, 2020/21",
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
    description: "England, Wales and Northern Ireland, 2021/22",
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
    description: "England, Wales and Northern Ireland, 2022/23",
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
    description: "England, Wales and Northern Ireland, 2023/24",
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
    description: "England, Wales and Northern Ireland, 2024/25",
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
    description: "England, Wales and Northern Ireland, 2025/26",
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
    description: "England, Wales and Northern Ireland, 2026/27",
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
    description: "Scotland, 2020/21",
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
    description: "Scotland, 2021/22",
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
    description: "Scotland, 2022/23",
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
    description: "Scotland, 2023/24",
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
    description: "Scotland, 2024/25",
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
    description: "Scotland, 2025/26",
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
    description: "Scotland, 2026/27",
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

export interface UKEmployerNIRate {
  /** Earnings threshold above which employer pays secondary NI */
  secondaryThreshold: number;
  /** Secondary Class 1 NI rate */
  rate: number;
}

/**
 * UK Employer (Secondary Class 1) National Insurance rates & thresholds.
 * In the Autumn Budget 2024, the secondary threshold was reduced to £5,000/yr
 * and the rate increased from 13.8% to 15.0% starting April 2025 (2025/26 tax year).
 */
export const UK_EMPLOYER_NI_RATES: Record<string, UKEmployerNIRate> = {
  "2020/21": { secondaryThreshold: 8788, rate: 0.138 },
  "2021/22": { secondaryThreshold: 8840, rate: 0.138 },
  "2022/23": { secondaryThreshold: 9100, rate: 0.1453 }, // blended 15.05% / 13.8%
  "2023/24": { secondaryThreshold: 9100, rate: 0.138 },
  "2024/25": { secondaryThreshold: 9100, rate: 0.138 },
  "2025/26": { secondaryThreshold: 5000, rate: 0.15 },
  "2026/27": { secondaryThreshold: 5000, rate: 0.15 },
};

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
    description: "UK National Insurance, 2020/21",
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
    description: "UK National Insurance, 2021/22",
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
    description: "UK National Insurance, 2022/23 (rates changed mid-year)",
    class1: {
      lowerEarningsLimit: 6396,
      // APPROXIMATION of mid-year changes (annual method). Per-period figures: PT 9,880 to 5 Jul 2022 then
      // 12,570; main rate 13.25% to 5 Nov 2022 then 12%; additional rate 3.25% then 2%. We use the whole-year
      // annual-method figures GOV.UK prints for directors: PT 11,908, 12.73% / 2.73% (7 months at the higher
      // rate, 5 at the lower: (7*13.25 + 5*12)/12 = 12.73). 11,908 is HMRC's own annual figure, not a
      // time-weighted average. Source: https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2022-to-2023
      primaryThreshold: 11908,
      upperEarningsLimit: 50270,
      mainRate: 0.1273,
      upperRate: 0.0273,
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
    description: "UK National Insurance, 2023/24",
    class1: {
      lowerEarningsLimit: 6396,
      primaryThreshold: 12570,
      upperEarningsLimit: 50270,
      // APPROXIMATION: 12% from 6 Apr 2023 to 5 Jan 2024, 10% from 6 Jan 2024 (8% only starts 6 Apr 2024).
      // 11.5% IS printed on the GOV.UK 2023 to 2024 employer page, as the directors' rate for the whole year
      // (annual method). Applying it to ordinary employees (who are on 12% then 10% by period) is an
      // approximation; it equals the evenly paid blend (9*12 + 3*10)/12.
      // Source: https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2023-to-2024
      mainRate: 0.115,
      upperRate: 0.02,
    },
    class4: {
      lowerProfitsLimit: 12570,
      upperProfitsLimit: 50270,
      mainRate: 0.09,
      upperRate: 0.02,
    },
    // Small profits threshold 6,725 (rates-and-allowances-national-insurance-contributions page). Class 2 is unused by any calculation.
    class2: { abolished: false, weeklyRate: 3.45, smallProfitsThreshold: 6725 },
  },
  "2024/25": {
    description: "UK National Insurance, 2024/25",
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
    description: "UK National Insurance, 2025/26",
    class1: {
      // 6,500 (125 a week): https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2025-to-2026
      lowerEarningsLimit: 6500,
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
    description: "UK National Insurance, 2026/27",
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
    /** Scotland. Absent where the year's source page lists no Plan 4 threshold. */
    plan4?: UKStudentLoanPlan;
    /** Absent before Plan 5 existed (it starts in the 2023/24 era, first listed 2026/27). */
    plan5?: UKStudentLoanPlan;
    postgrad: UKStudentLoanPlan;
  };
}

/**
 * Statutory write-off periods in years, by plan. Not tax-year dependent, so kept
 * apart from UK_STUDENT_LOANS. Simplified: the age-65 rules for older Plan 1 and
 * Plan 4 loans are not modelled.
 * Source: https://www.gov.uk/repaying-your-student-loan/when-your-student-loan-gets-written-off-or-cancelled
 * (current rules; per-tax-year variation not checked, so the dates by year are UNVERIFIED).
 */
export const STUDENT_LOAN_WRITE_OFF_YEARS = {
  plan1: 25,
  plan2: 30,
  plan4: 30,
  plan5: 40,
  postgrad: 30,
} as const satisfies Record<keyof UKStudentLoanYear["plans"], number>;

export const UK_STUDENT_LOANS: Record<string, UKStudentLoanYear> = {
  // 2020/21 to 2022/23 added in E4 T2. Source for each year: the "Student loan and
  // postgraduate loan recovery" table on
  // https://www.gov.uk/guidance/rates-and-thresholds-for-employers-YYYY-to-YYYY
  // (2020 to 2021, 2021 to 2022, 2022 to 2023). Plan 5 did not exist yet.
  // UNVERIFIED: 2020/21 Plan 4 is not listed on the 2020 to 2021 page, so it is omitted, not guessed.
  "2020/21": {
    description: "Student loans, 2020/21",
    plans: {
      plan1: { name: "Plan 1", threshold: 19390, rate: 0.09 },
      plan2: { name: "Plan 2", threshold: 26575, rate: 0.09 },
      postgrad: { name: "Postgrad", threshold: 21000, rate: 0.06 },
    },
  },
  "2021/22": {
    description: "Student loans, 2021/22",
    plans: {
      plan1: { name: "Plan 1", threshold: 19895, rate: 0.09 },
      plan2: { name: "Plan 2", threshold: 27295, rate: 0.09 },
      plan4: { name: "Plan 4 (Scotland)", threshold: 25000, rate: 0.09 },
      postgrad: { name: "Postgrad", threshold: 21000, rate: 0.06 },
    },
  },
  "2022/23": {
    description: "Student loans, 2022/23",
    plans: {
      plan1: { name: "Plan 1", threshold: 20195, rate: 0.09 },
      plan2: { name: "Plan 2", threshold: 27295, rate: 0.09 },
      plan4: { name: "Plan 4 (Scotland)", threshold: 25375, rate: 0.09 },
      postgrad: { name: "Postgrad", threshold: 21000, rate: 0.06 },
    },
  },
  "2023/24": {
    description: "Student loans, 2023/24",
    plans: {
      plan1: { name: "Plan 1", threshold: 22015, rate: 0.09 },
      plan2: { name: "Plan 2", threshold: 27295, rate: 0.09 },
      plan4: { name: "Plan 4 (Scotland)", threshold: 27660, rate: 0.09 },
      plan5: { name: "Plan 5", threshold: 25000, rate: 0.09 },
      postgrad: { name: "Postgrad", threshold: 21000, rate: 0.06 },
    },
  },
  "2024/25": {
    description: "Student loans, 2024/25",
    plans: {
      plan1: { name: "Plan 1", threshold: 24990, rate: 0.09 },
      plan2: { name: "Plan 2", threshold: 27295, rate: 0.09 },
      plan4: { name: "Plan 4 (Scotland)", threshold: 31395, rate: 0.09 },
      plan5: { name: "Plan 5", threshold: 25000, rate: 0.09 },
      postgrad: { name: "Postgrad", threshold: 21000, rate: 0.06 },
    },
  },
  // E4 T3a: 2025/26 Plan 1/2/4 corrected (this key previously held the 2026/27 figures).
  // Source: https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2025-to-2026
  // UNVERIFIED: Plan 5 25,000 is not listed on the 2025 to 2026 page (kept from the previous code).
  "2025/26": {
    description: "Student loans, 2025/26",
    plans: {
      plan1: { name: "Plan 1", threshold: 26065, rate: 0.09 },
      plan2: { name: "Plan 2", threshold: 28470, rate: 0.09 },
      plan4: { name: "Plan 4 (Scotland)", threshold: 32745, rate: 0.09 },
      plan5: { name: "Plan 5", threshold: 25000, rate: 0.09 },
      postgrad: { name: "Postgrad", threshold: 21000, rate: 0.06 },
    },
  },
  "2026/27": {
    description: "Student loans, 2026/27",
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
// UK — Child Benefit weekly rates and HICBC parameters (E25-T3)
// ---------------------------------------------------------------------------

export interface UKChildBenefitYear {
  /** Weekly rate for the eldest or only child ("enhanced rate"), GBP. */
  eldestWeekly: number;
  /** Weekly rate for each other child ("other cases"), GBP. */
  otherWeekly: number;
  /** Weeks of Child Benefit assumed per year. 52 pending the owner ruling on 52 or 53 Mondays. */
  weeksPerYear: number;
  /** Adjusted net income above which the High Income Child Benefit Charge starts. */
  hicbcThresholdStart: number;
  /** The charge is 1% of Child Benefit per full step of adjusted net income over the start. */
  hicbcStepWidth: number;
}

/**
 * Child Benefit weekly rates per tax year and the High Income Child Benefit Charge
 * thresholds (GOV.UK child-benefit-tax-charge: over 50,000 at 1% per 100 up to 2023/24,
 * over 60,000 at 1% per 200 from 2024/25). 2020/21 and 2021/22 weekly rates are UNVERIFIED
 * (see `docs/tax-sources/hicbc-child-benefit.md` and the `childBenefit` registry key).
 */
export const UK_CHILD_BENEFIT: Record<string, UKChildBenefitYear> = {
  "2020/21": {
    eldestWeekly: 21.05,
    otherWeekly: 13.95,
    weeksPerYear: 52,
    hicbcThresholdStart: 50000,
    hicbcStepWidth: 100,
  },
  "2021/22": {
    eldestWeekly: 21.15,
    otherWeekly: 14.0,
    weeksPerYear: 52,
    hicbcThresholdStart: 50000,
    hicbcStepWidth: 100,
  },
  "2022/23": {
    eldestWeekly: 21.8,
    otherWeekly: 14.45,
    weeksPerYear: 52,
    hicbcThresholdStart: 50000,
    hicbcStepWidth: 100,
  },
  "2023/24": {
    eldestWeekly: 24.0,
    otherWeekly: 15.9,
    weeksPerYear: 52,
    hicbcThresholdStart: 50000,
    hicbcStepWidth: 100,
  },
  "2024/25": {
    eldestWeekly: 25.6,
    otherWeekly: 16.95,
    weeksPerYear: 52,
    hicbcThresholdStart: 60000,
    hicbcStepWidth: 200,
  },
  "2025/26": {
    eldestWeekly: 26.05,
    otherWeekly: 17.25,
    weeksPerYear: 52,
    hicbcThresholdStart: 60000,
    hicbcStepWidth: 200,
  },
  "2026/27": {
    eldestWeekly: 27.05,
    otherWeekly: 17.9,
    weeksPerYear: 52,
    hicbcThresholdStart: 60000,
    hicbcStepWidth: 200,
  },
};

// ---------------------------------------------------------------------------
// Helper utilities
// ---------------------------------------------------------------------------

/**
 * Returns the tax year whose RATES apply today, e.g. "2025/26". Never throws once the clock
 * passes the last supported year: it then returns the latest supported year (see
 * getUkTaxYearContext, which also says it is a fallback so the UI can show a banner).
 * @deprecated Use getUkTaxYearContext() so `isFallback` is not lost.
 */
export function getCurrentUKTaxYear(): string {
  return getUkTaxYearContext().ratesYear;
}

/** Returns all supported UK tax year keys in chronological order. */
export function getAvailableUKTaxYears(): string[] {
  return Object.keys(UK_EWNI_INCOME_TAX).sort();
}
