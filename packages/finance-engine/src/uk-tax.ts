import {
  calculateScottishIncomeTaxOnTaxable,
  calculateUKEWNITakeHome,
  getCurrentUKTaxYear,
  STUDENT_LOAN_WRITE_OFF_YEARS,
  UK_STUDENT_LOANS,
} from "./tax-rules.js";
import type {
  TaxTrapAnalysis,
  UkAllowancesStatus,
  UkStudentLoanPlan,
  UkTaxCalculationInput,
  UkTaxCalculationResult,
  UkTaxRegion,
  UkTaxYear,
} from "./types.js";
import {
  calculateEmployerNiSaving,
  calculateIncomeTaxOnTaxable,
  calculatePersonalAllowanceForYear,
  calculateStudentLoanRepayment,
  getUkTaxYearRules,
  resolveUkTaxYear,
  roundPence,
  type UkStudentLoanPlanKey,
} from "./uk-tax-year.js";

/**
 * Owner decision D9-B (E4 T6). For Scottish taxpayers Gift Aid only feeds the
 * personal allowance taper (via adjusted net income). It does NOT extend the
 * Scottish bands. HMRC guidance on whether grossed-up Gift Aid extends the
 * Scottish bands was not verified, so the result may overstate tax for a
 * Scottish taxpayer who gives to charity. Carried on the calculateUkTax result
 * as `giftAidDisclaimer` for Scottish taxpayers with Gift Aid.
 */
export const SCOTLAND_GIFT_AID_DISCLAIMER =
  "Gift Aid band extension is not modelled for Scottish taxpayers: Gift Aid only affects the personal allowance taper here, so your Scottish income tax may be overstated.";

export const UK_TAX_CONSTANTS = {
  PERSONAL_ALLOWANCE_DEFAULT: 12570,
  TAX_TRAP_LOWER_THRESHOLD: 100000,
  TAX_TRAP_UPPER_THRESHOLD: 125140,
  ISA_ANNUAL_ALLOWANCE: 20000,
  PENSION_ANNUAL_ALLOWANCE: 60000,
  PSA_BASIC_RATE: 1000,
  PSA_HIGHER_RATE: 500,
  PSA_ADDITIONAL_RATE: 0,
  NI_PRIMARY_THRESHOLD: 12570,
  NI_UPPER_EARNINGS_LIMIT: 50270,
  NI_MAIN_RATE: 0.08,
  NI_HIGHER_RATE: 0.02,
} as const;

export { getCurrentUKTaxYear };

/**
 * Maps any student loan plan spelling ("PLAN_2", "plan2", "Plan 2", "POSTGRAD") to the
 * UK_STUDENT_LOANS plan key, or undefined for NONE / unrecognised values.
 */
export function toStudentLoanPlanKey(plan: string): UkStudentLoanPlanKey | undefined {
  const key = plan.toLowerCase().replace(/[^a-z0-9]/g, "");
  return key in STUDENT_LOAN_WRITE_OFF_YEARS ? (key as UkStudentLoanPlanKey) : undefined;
}

/**
 * @deprecated Year-less view of the CURRENT tax year's UK_STUDENT_LOANS entry, kept for
 * existing importers. Use getUkTaxYearRules(year).studentLoans or
 * calculateStudentLoanDeduction(gross, plan, taxYear) so the year is explicit.
 */
export const STUDENT_LOAN_THRESHOLDS: Record<
  string,
  { threshold: number; rate: number; writeOffYears: number }
> = (() => {
  const year = UK_STUDENT_LOANS[getCurrentUKTaxYear()] ?? UK_STUDENT_LOANS["2026/27"]!;
  const out: Record<string, { threshold: number; rate: number; writeOffYears: number }> = {};
  for (const [key, plan] of Object.entries(year.plans)) {
    const entry = {
      threshold: plan.threshold,
      rate: plan.rate,
      writeOffYears: STUDENT_LOAN_WRITE_OFF_YEARS[key as UkStudentLoanPlanKey],
    };
    out[key] = entry; // lowercase alias (plan1, postgrad)
    out[key === "postgrad" ? "POSTGRAD" : key.replace("plan", "PLAN_")] = entry;
  }
  return out;
})();

/**
 * Calculates effective Personal Allowance after £100,000 income taper.
 * Personal allowance is reduced by £1 for every £2 of adjusted net income over £100,000.
 */
export function calculatePersonalAllowance(
  adjustedNetIncome: number,
  baseAllowance = UK_TAX_CONSTANTS.PERSONAL_ALLOWANCE_DEFAULT,
): { effectiveAllowance: number; taperAmount: number } {
  if (adjustedNetIncome <= UK_TAX_CONSTANTS.TAX_TRAP_LOWER_THRESHOLD) {
    return { effectiveAllowance: baseAllowance, taperAmount: 0 };
  }

  const excess = adjustedNetIncome - UK_TAX_CONSTANTS.TAX_TRAP_LOWER_THRESHOLD;
  const taper = Math.min(baseAllowance, Math.floor(excess / 2));
  const effectiveAllowance = Math.max(0, baseAllowance - taper);

  return { effectiveAllowance, taperAmount: taper };
}

/**
 * Analyses the £100k - £125,140 60% UK Tax Trap.
 */
export function analyzeTaxTrap(
  adjustedNetIncome: number,
  region: UkTaxRegion = "ENGLAND_NI_WALES",
): TaxTrapAnalysis {
  const isInTaxTrap =
    adjustedNetIncome > UK_TAX_CONSTANTS.TAX_TRAP_LOWER_THRESHOLD &&
    adjustedNetIncome <= UK_TAX_CONSTANTS.TAX_TRAP_UPPER_THRESHOLD;
  const isNearTaxTrap =
    adjustedNetIncome >= 95000 && adjustedNetIncome <= UK_TAX_CONSTANTS.TAX_TRAP_LOWER_THRESHOLD;

  const excessOver100k = Math.max(0, adjustedNetIncome - UK_TAX_CONSTANTS.TAX_TRAP_LOWER_THRESHOLD);
  const excessAbove100k = Math.min(excessOver100k, 25140);
  const { effectiveAllowance, taperAmount } = calculatePersonalAllowance(adjustedNetIncome);

  // In the trap: 40% income tax (EWNI) + 20% loss of allowance = 60% (+ 2% NI = 62%)
  // In Scotland: 45% advanced rate + 22.5% loss of allowance = 67.5% (+ 2% NI = 69.5%)
  const marginalRatePct = isInTaxTrap
    ? region === "SCOTLAND"
      ? 67.5
      : 60.0
    : adjustedNetIncome > UK_TAX_CONSTANTS.TAX_TRAP_UPPER_THRESHOLD
      ? region === "SCOTLAND"
        ? 48.0
        : 45.0
      : adjustedNetIncome > 50270
        ? region === "SCOTLAND"
          ? 42.0
          : 40.0
        : 20.0;

  const effectiveMarginalRatePct = isInTaxTrap
    ? region === "SCOTLAND"
      ? 69.5
      : 62.0
    : marginalRatePct + (adjustedNetIncome > 12570 ? (adjustedNetIncome <= 50270 ? 8.0 : 2.0) : 0);

  const contributionRequiredToEscapeGbp = excessOver100k;
  const estimatedTaxSavedByEscapingGbp = Math.round(excessOver100k * (marginalRatePct / 100));
  const estimatedTaxSaved = Math.round(excessOver100k * (effectiveMarginalRatePct / 100));

  return {
    isInTaxTrap,
    isNearTaxTrap,
    grossIncome: adjustedNetIncome,
    adjustedNetIncome,
    personalAllowanceTaperGbp: taperAmount,
    effectivePersonalAllowanceGbp: effectiveAllowance,
    excessOver100kGbp: excessOver100k,
    excessAbove100k,
    marginalRatePct,
    effectiveMarginalRatePct,
    contributionRequiredToEscapeGbp,
    recommendedSacrifice: excessOver100k,
    estimatedTaxSavedByEscapingGbp,
    estimatedTaxSaved,
    lostPersonalAllowance: taperAmount,
  };
}

/**
 * Convenience helper to calculate £100k tax trap analysis from gross income and pension %.
 */
export function calculate100kTaxTrap(
  grossIncome: number,
  pensionContributionPct = 0,
  _isSalarySacrifice = true,
  region: UkTaxRegion = "ENGLAND_NI_WALES",
): TaxTrapAnalysis {
  const pensionDeduction = grossIncome * (pensionContributionPct / 100);
  const adjustedNetIncome = Math.max(0, grossIncome - pensionDeduction);
  return analyzeTaxTrap(adjustedNetIncome, region);
}

/**
 * Calculates tax trap relief and marginal rate breakdown.
 */
export function calculateTaxTrapRelief(
  grossIncome: number,
  _taxYear = getCurrentUKTaxYear(),
  region: UkTaxRegion = "ENGLAND_NI_WALES",
): TaxTrapAnalysis {
  const analysis = analyzeTaxTrap(grossIncome, region);
  return {
    ...analysis,
    marginalRatePct: analysis.isInTaxTrap
      ? region === "SCOTLAND"
        ? 69.5
        : 62
      : analysis.marginalRatePct,
  };
}

/**
 * Employer Class 1 NI saved by salary sacrifice, from the per-year table
 * (UK_EMPLOYER_NI_RATES via getUkTaxYearRules): the sacrificed amount that sat
 * above the secondary threshold, times the secondary rate, rounded to pence.
 * Unknown years throw UnsupportedUkTaxYearError.
 * Source: https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2025-to-2026
 */
export function calculateEmployerNISavings(
  grossSalary: number,
  sacrificeAmount: number,
  taxYear: string = resolveUkTaxYear(),
): number {
  const rules = getUkTaxYearRules(resolveUkTaxYear(taxYear));
  return calculateEmployerNiSaving(grossSalary, sacrificeAmount, rules);
}

/**
 * Calculates UK Income Tax for England, Wales & Northern Ireland on income
 * before the personal allowance. Delegates to the shared band function on
 * (income - personalAllowance); `basicBandExtension` is the grossed-up Gift Aid
 * that widens the basic and higher bands (ITA 2007 s.414).
 * Source: https://www.gov.uk/income-tax-rates
 */
export function calculateEwniIncomeTax(
  taxableIncome: number,
  personalAllowance: number,
  basicBandExtension = 0,
  taxYear: string = resolveUkTaxYear(),
): number {
  const rules = getUkTaxYearRules(resolveUkTaxYear(taxYear));
  return calculateIncomeTaxOnTaxable(
    Math.max(0, taxableIncome - personalAllowance),
    rules,
    "ENGLAND_NI_WALES",
    { bandExtension: basicBandExtension },
  ).total;
}

/**
 * Calculates Scottish Income Tax on income before the personal allowance,
 * using the year's Scottish band table (UK_SCOTLAND_INCOME_TAX). Bands are
 * thresholds on taxable income (income - personalAllowance), so a tapered
 * allowance raises taxable income and the advanced band starts at taxable
 * 62,430 regardless. Gift Aid never extends these bands (D9-B).
 * Sources: https://www.gov.uk/guidance/rates-and-thresholds-for-employers-YYYY-to-YYYY
 * (Scottish PAYE table for each year).
 */
export function calculateScottishIncomeTax(
  taxableIncome: number,
  personalAllowance: number,
  taxYear: string = resolveUkTaxYear(),
): number {
  const rules = getUkTaxYearRules(resolveUkTaxYear(taxYear));
  return roundPence(
    calculateScottishIncomeTaxOnTaxable(
      Math.max(0, taxableIncome - personalAllowance),
      rules.scotland,
    ),
  );
}

/**
 * Calculates UK Class 1 Employee National Insurance.
 */
export function calculateNationalInsurance(grossPay: number): number {
  if (grossPay <= UK_TAX_CONSTANTS.NI_PRIMARY_THRESHOLD) {
    return 0;
  }

  let ni = 0;
  const earningsInMainBand =
    Math.min(grossPay, UK_TAX_CONSTANTS.NI_UPPER_EARNINGS_LIMIT) -
    UK_TAX_CONSTANTS.NI_PRIMARY_THRESHOLD;
  ni += earningsInMainBand * UK_TAX_CONSTANTS.NI_MAIN_RATE;

  if (grossPay > UK_TAX_CONSTANTS.NI_UPPER_EARNINGS_LIMIT) {
    const excess = grossPay - UK_TAX_CONSTANTS.NI_UPPER_EARNINGS_LIMIT;
    ni += excess * UK_TAX_CONSTANTS.NI_HIGHER_RATE;
  }

  return Math.round(ni * 100) / 100;
}

/**
 * Calculates Student Loan repayment deduction based on repayment plan.
 */
export function calculateStudentLoanDeduction(
  grossPay: number,
  plan: UkStudentLoanPlan = "NONE",
  taxYear: string = resolveUkTaxYear(),
): number {
  const rules = getUkTaxYearRules(resolveUkTaxYear(taxYear));
  const key = toStudentLoanPlanKey(plan);
  if (!key) return 0;
  return calculateStudentLoanRepayment(grossPay, key, rules);
}

/**
 * Computes remaining days until UK tax year end (5 April).
 */
export function getTaxYearRemainingDays(
  referenceDate = new Date(),
  taxYear: UkTaxYear = "2025/26",
): { daysRemaining: number; endDateFormatted: string } {
  const endYear = Number.parseInt(taxYear.slice(0, 4), 10) + 1;
  const taxYearEnd = new Date(Date.UTC(endYear, 3, 5, 23, 59, 59)); // 5 April
  const diffMs = taxYearEnd.getTime() - referenceDate.getTime();
  const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

  return {
    daysRemaining,
    endDateFormatted: `5 April ${endYear}`,
  };
}

/**
 * Primary UK Tax & Allowance Calculator.
 */
export function calculateUkTax(input: UkTaxCalculationInput): UkTaxCalculationResult {
  const taxYear = resolveUkTaxYear(input.taxYear);
  const rules = getUkTaxYearRules(taxYear);
  const region = input.region ?? "ENGLAND_NI_WALES";
  const grossSalary = Math.max(0, input.grossSalary);
  const bonusOrSideIncome = Math.max(0, input.bonusOrSideIncome ?? 0);
  const taxableSavingsInterest = Math.max(0, input.taxableSavingsInterestGbp ?? 0);
  const netBtlProfit = Math.max(0, input.netBtlProfitGbp ?? 0);
  const pensionPct = Math.max(0, input.pensionContributionPct ?? 0);
  const employerMatchPct = Math.max(0, input.employerPensionMatchPct ?? 0);
  const isSalarySacrifice = input.isSalarySacrifice ?? false;
  const studentLoanPlan = input.studentLoanPlan ?? "NONE";
  const netGiftAid = Math.max(0, input.giftAidContributionsGbp ?? 0);
  const grossGiftAid = netGiftAid * 1.25;

  const totalGrossIncome = grossSalary + bonusOrSideIncome + taxableSavingsInterest + netBtlProfit;

  // Pension calculations
  const employeePensionContribution = (grossSalary * pensionPct) / 100;
  const employerPensionContribution = (grossSalary * employerMatchPct) / 100;

  // Employer NI savings if salary sacrifice
  const employerNiSavings =
    isSalarySacrifice && input.includeEmployerNiRebate
      ? calculateEmployerNISavings(grossSalary, employeePensionContribution, taxYear)
      : 0;

  // Under salary sacrifice, gross pay subject to NI and Tax is reduced
  const grossPayForNi = isSalarySacrifice
    ? Math.max(0, grossSalary - employeePensionContribution) + bonusOrSideIncome
    : grossSalary + bonusOrSideIncome;

  // Adjusted Net Income (used ONLY for the personal allowance taper) = total gross income
  // minus gross pension contributions minus gross Gift Aid.
  // Pension is pinned as net-pay (deducted from taxable income too): UNVERIFIED, owner ruling pending.
  const adjustedNetIncome = Math.max(
    0,
    totalGrossIncome - employeePensionContribution - grossGiftAid,
  );

  // Personal Allowance after taper (year-specific)
  const effectiveAllowance = calculatePersonalAllowanceForYear(adjustedNetIncome, rules);

  // Income before allowance: Gift Aid does NOT reduce it (it extends the bands instead).
  const incomeBeforeAllowance = Math.max(0, totalGrossIncome - employeePensionContribution);
  const taxableIncome = Math.max(0, incomeBeforeAllowance - effectiveAllowance);

  // Income Tax
  const incomeTax =
    region === "SCOTLAND"
      ? calculateScottishIncomeTax(incomeBeforeAllowance, effectiveAllowance, taxYear)
      : calculateIncomeTaxOnTaxable(taxableIncome, rules, region, { bandExtension: grossGiftAid })
          .total;

  // National Insurance (calculated on payroll gross pay)
  const nationalInsurance = calculateNationalInsurance(grossPayForNi);

  // Student Loan deduction (calculated on payroll gross pay)
  const studentLoanDeduction = calculateStudentLoanDeduction(
    grossPayForNi,
    studentLoanPlan,
    taxYear,
  );

  // Total deductions from salary
  const totalDeductions =
    incomeTax +
    nationalInsurance +
    studentLoanDeduction +
    (isSalarySacrifice ? 0 : employeePensionContribution);

  const netTakeHomeAnnual = Math.round((totalGrossIncome - totalDeductions) * 100) / 100;
  const netTakeHomeMonthly = Math.round((netTakeHomeAnnual / 12) * 100) / 100;
  const effectiveTaxRatePct =
    totalGrossIncome > 0
      ? Math.round(((incomeTax + nationalInsurance) / totalGrossIncome) * 1000) / 10
      : 0;

  // Marginal band determination for Personal Savings Allowance (PSA)
  let marginalBand: UkAllowancesStatus["marginalIncomeTaxBand"] = "PERSONAL_ALLOWANCE";
  let personalSavingsAllowance: number = UK_TAX_CONSTANTS.PSA_BASIC_RATE;

  const basicTop = rules.ewni.basicRateBandWidth + grossGiftAid;
  const additionalFrom = rules.ewni.additionalRateThreshold + grossGiftAid;
  const isAdditional =
    region === "SCOTLAND"
      ? incomeBeforeAllowance > UK_TAX_CONSTANTS.TAX_TRAP_UPPER_THRESHOLD
      : taxableIncome > additionalFrom;
  const isHigher = region === "SCOTLAND" ? incomeBeforeAllowance > 50270 : taxableIncome > basicTop;
  if (isAdditional) {
    marginalBand = "ADDITIONAL";
    personalSavingsAllowance = UK_TAX_CONSTANTS.PSA_ADDITIONAL_RATE;
  } else if (isHigher) {
    marginalBand = "HIGHER";
    personalSavingsAllowance = UK_TAX_CONSTANTS.PSA_HIGHER_RATE;
  } else if (taxableIncome > 0) {
    marginalBand = "BASIC";
    personalSavingsAllowance = UK_TAX_CONSTANTS.PSA_BASIC_RATE;
  }

  const { daysRemaining, endDateFormatted } = getTaxYearRemainingDays(new Date(), taxYear);

  const totalPensionUsed = employeePensionContribution + employerPensionContribution;

  const allowances: UkAllowancesStatus = {
    isaAllowanceGbp: UK_TAX_CONSTANTS.ISA_ANNUAL_ALLOWANCE,
    isaAllowanceUsedGbp: 0,
    isaAllowanceRemainingGbp: UK_TAX_CONSTANTS.ISA_ANNUAL_ALLOWANCE,
    pensionAnnualAllowanceGbp: UK_TAX_CONSTANTS.PENSION_ANNUAL_ALLOWANCE,
    pensionAllowanceUsedGbp: Math.round(totalPensionUsed),
    pensionAllowanceRemainingGbp: Math.max(
      0,
      UK_TAX_CONSTANTS.PENSION_ANNUAL_ALLOWANCE - totalPensionUsed,
    ),
    personalSavingsAllowanceGbp: personalSavingsAllowance,
    marginalIncomeTaxBand: marginalBand,
    taxYearEndDate: endDateFormatted,
    daysRemainingInTaxYear: daysRemaining,
  };

  const taxTrap = analyzeTaxTrap(adjustedNetIncome, region);

  return {
    taxYear,
    grossIncomeGbp: totalGrossIncome,
    adjustedNetIncomeGbp: adjustedNetIncome,
    taxableIncomeGbp: taxableIncome,
    incomeTaxGbp: incomeTax,
    nationalInsuranceGbp: nationalInsurance,
    studentLoanDeductionGbp: studentLoanDeduction,
    employeePensionDeductionGbp: employeePensionContribution,
    employerPensionContributionGbp: employerPensionContribution,
    employerNiSavingsGbp: employerNiSavings,
    giftAidContributionsGbp: netGiftAid,
    totalDeductionsGbp: totalDeductions,
    netTakeHomePayAnnualGbp: netTakeHomeAnnual,
    netTakeHomePayMonthlyGbp: netTakeHomeMonthly,
    effectiveTaxRatePct,
    taxTrap,
    allowances,
    ...(region === "SCOTLAND" && netGiftAid > 0
      ? { giftAidDisclaimer: SCOTLAND_GIFT_AID_DISCLAIMER }
      : {}),
  };
}

export function calculateUKTakeHome(
  grossSalary: number,
  pensionContributionPct = 5,
  salarySacrifice = true,
  taxYear: string = getCurrentUKTaxYear(),
) {
  const result = calculateUKEWNITakeHome(
    grossSalary,
    "employed",
    pensionContributionPct,
    salarySacrifice,
    taxYear,
  );

  const trapAnalysis = calculateTaxTrapRelief(grossSalary, taxYear as any);

  return {
    ...result,
    trapAnalysis,
  };
}
