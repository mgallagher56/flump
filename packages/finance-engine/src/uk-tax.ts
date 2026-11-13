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
  calculateEmployeeNi,
  calculateEmployerNiSaving,
  calculateIncomeTaxOnTaxable,
  calculatePersonalAllowanceForYear,
  calculateStudentLoanRepayment,
  getLatestSupportedUkTaxYear,
  getUkTaxYearRules,
  isSupportedUkTaxYear,
  resolveUkTaxYear,
  roundPence,
  SUPPORTED_UK_TAX_YEARS,
  type UkStudentLoanPlanKey,
  type UkTaxYearRules,
} from "./uk-tax-year.js";

const LATEST_RULES = getUkTaxYearRules(getLatestSupportedUkTaxYear());

/**
 * @deprecated Year-less constants (E25-T1). Values are derived from the latest supported tax
 * year's rules (`getUkTaxYearRules`), so they can no longer drift from the per-year tables.
 * New code must read the rules for the year it is computing; the callers below are migrated by
 * the later E25 tickets. Not year-correct for earlier years (e.g. 2020/21 taper ends at 125,000).
 */
export const UK_TAX_CONSTANTS = {
  PERSONAL_ALLOWANCE_DEFAULT: LATEST_RULES.ewni.personalAllowance,
  TAX_TRAP_LOWER_THRESHOLD: LATEST_RULES.ewni.personalAllowanceTaperStart,
  TAX_TRAP_UPPER_THRESHOLD: LATEST_RULES.taperEnd,
  ISA_ANNUAL_ALLOWANCE: LATEST_RULES.isaAllowance,
  PENSION_ANNUAL_ALLOWANCE: LATEST_RULES.pensionAnnualAllowance,
  PSA_BASIC_RATE: LATEST_RULES.savings.psaBasic,
  PSA_HIGHER_RATE: LATEST_RULES.savings.psaHigher,
  PSA_ADDITIONAL_RATE: LATEST_RULES.savings.psaAdditional,
  NI_PRIMARY_THRESHOLD: LATEST_RULES.ni.class1.primaryThreshold,
  NI_UPPER_EARNINGS_LIMIT: LATEST_RULES.ni.class1.upperEarningsLimit,
  NI_MAIN_RATE: LATEST_RULES.ni.class1.mainRate,
  NI_HIGHER_RATE: LATEST_RULES.ni.class1.upperRate,
};

export { getCurrentUKTaxYear };

/**
 * Maps any student loan plan spelling ("PLAN_2", "plan2", "Plan 2", "POSTGRAD") to the
 * UK_STUDENT_LOANS plan key, or undefined for NONE / unrecognised values.
 */
export function toStudentLoanPlanKey(plan: string): UkStudentLoanPlanKey | undefined {
  const key = plan.toLowerCase().replace(/[^a-z0-9]/g, "");
  return Object.hasOwn(STUDENT_LOAN_WRITE_OFF_YEARS, key)
    ? (key as UkStudentLoanPlanKey)
    : undefined;
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
  const year = UK_STUDENT_LOANS[resolveUkTaxYear()]!;
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
 * Rate of the band containing the last pound of `taxable` (taxable income is
 * after the personal allowance): from < taxable <= to. Zero taxable income has
 * a zero marginal rate. EWNI bands come from rules.ewni (basic up to
 * basicRateBandWidth, higher up to additionalRateThreshold, additional above),
 * Scottish bands from rules.scotland.bands. Returns a fraction (0.4 = 40%).
 */
function marginalIncomeTaxRate(
  taxable: number,
  rules: UkTaxYearRules,
  region: UkTaxRegion,
): number {
  if (taxable <= 0) return 0;
  if (region === "SCOTLAND") {
    const bands = rules.scotland.bands;
    const band = bands.find((b) => taxable > b.from && (b.to === null || taxable <= b.to));
    return band?.rate ?? bands.at(-1)?.rate ?? 0;
  }
  const e = rules.ewni;
  if (taxable <= e.basicRateBandWidth) return e.basicRate;
  if (taxable <= e.additionalRateThreshold) return e.higherRate;
  return e.additionalRate;
}

/** Income tax on adjusted net income `ani`: allowance (with the 100k taper) then the shared band function. */
function incomeTaxOnAdjustedNetIncome(
  ani: number,
  rules: UkTaxYearRules,
  region: UkTaxRegion,
): number {
  const allowance = calculatePersonalAllowanceForYear(ani, rules);
  return calculateIncomeTaxOnTaxable(Math.max(0, ani - allowance), rules, region).total;
}

/**
 * Analyses the £100k - £125,140 60% UK Tax Trap for `taxYear`. With no year
 * argument it uses the current tax year if supported, otherwise falls back to the
 * latest supported year (it does not throw); an explicitly passed unsupported
 * year throws UnsupportedUkTaxYearError.
 *
 * Rates and escape savings are derived from the year's tables, not flat-rate
 * arithmetic. `marginalRatePct` is income tax only: the rate of the band that
 * holds the next pound of taxable income (zero while income is within the
 * personal allowance), multiplied by 1.5 inside the taper zone because each
 * extra pound also removes 50p of allowance. `effectiveMarginalRatePct` adds the
 * employee NI rate for that income (decision D7-a).
 * `estimatedTaxSavedByEscapingGbp` is income tax at the current income minus income tax
 * at 100,000 (the escape level); `estimatedTaxSaved` also adds the employee
 * NI saved. Both are rounded to pence.
 */
/**
 * Default year for the UI-facing trap entry points (no year passed): the current UK tax
 * year if supported, otherwise the latest supported year, so the banner, hero widget,
 * pension container and calculator do not crash once the clock passes the last supported
 * year (same degradation as calculateUKEWNITakeHome). An explicitly passed unsupported
 * year still throws UnsupportedUkTaxYearError. Recorded as known issue (c).
 */
function defaultTrapTaxYear(): string {
  return resolveUkTaxYear();
}

export function analyzeTaxTrap(
  adjustedNetIncome: number,
  region: UkTaxRegion = "ENGLAND_NI_WALES",
  taxYear: string = defaultTrapTaxYear(),
): TaxTrapAnalysis {
  const rules = getUkTaxYearRules(resolveUkTaxYear(taxYear));
  const isInTaxTrap =
    adjustedNetIncome > UK_TAX_CONSTANTS.TAX_TRAP_LOWER_THRESHOLD &&
    adjustedNetIncome <= UK_TAX_CONSTANTS.TAX_TRAP_UPPER_THRESHOLD;
  const isNearTaxTrap =
    adjustedNetIncome >= 95000 && adjustedNetIncome <= UK_TAX_CONSTANTS.TAX_TRAP_LOWER_THRESHOLD;

  const excessOver100k = Math.max(0, adjustedNetIncome - UK_TAX_CONSTANTS.TAX_TRAP_LOWER_THRESHOLD);
  const excessAbove100k = Math.min(excessOver100k, 25140);
  const { effectiveAllowance, taperAmount } = calculatePersonalAllowance(adjustedNetIncome);

  const taxable = Math.max(
    0,
    adjustedNetIncome - calculatePersonalAllowanceForYear(adjustedNetIncome, rules),
  );
  const bandRate = marginalIncomeTaxRate(taxable, rules, region);
  // Inside the trap each extra pound of income adds 1 to taxable income plus 0.5 from the
  // lost allowance, so the income tax rate is 1.5 times the band rate (40% -> 60%, 45% -> 67.5%).
  const marginalRatePct = roundPence(bandRate * (isInTaxTrap ? 1.5 : 1) * 100);

  const { primaryThreshold, upperEarningsLimit, mainRate, upperRate } = rules.ni.class1;
  const niRate =
    adjustedNetIncome <= primaryThreshold
      ? 0
      : adjustedNetIncome <= upperEarningsLimit
        ? mainRate
        : upperRate;
  const effectiveMarginalRatePct = roundPence(marginalRatePct + niRate * 100);

  const escapeLevel = UK_TAX_CONSTANTS.TAX_TRAP_LOWER_THRESHOLD;
  const contributionRequiredToEscapeGbp = excessOver100k;
  const incomeTaxSaved =
    excessOver100k > 0
      ? roundPence(
          incomeTaxOnAdjustedNetIncome(adjustedNetIncome, rules, region) -
            incomeTaxOnAdjustedNetIncome(escapeLevel, rules, region),
        )
      : 0;
  const niSaved =
    excessOver100k > 0
      ? calculateEmployeeNi(adjustedNetIncome, rules) - calculateEmployeeNi(escapeLevel, rules)
      : 0;
  const estimatedTaxSavedByEscapingGbp = incomeTaxSaved;
  const estimatedTaxSaved = roundPence(incomeTaxSaved + niSaved);

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
  taxYear: string = defaultTrapTaxYear(),
): TaxTrapAnalysis {
  const pensionDeduction = grossIncome * (pensionContributionPct / 100);
  const adjustedNetIncome = Math.max(0, grossIncome - pensionDeduction);
  return analyzeTaxTrap(adjustedNetIncome, region, taxYear);
}

/**
 * Calculates tax trap relief and marginal rate breakdown (decision D7-a).
 * `marginalRatePct` is the income tax rate only (60 in the England, Wales and
 * Northern Ireland trap, 67.5 in Scotland) and `effectiveMarginalRatePct` adds
 * employee NI (62 / 69.5). Both come from analyzeTaxTrap unchanged; this used
 * to overwrite marginalRatePct with the NI-inclusive figure.
 */
export function calculateTaxTrapRelief(
  grossIncome: number,
  taxYear: string = defaultTrapTaxYear(),
  region: UkTaxRegion = "ENGLAND_NI_WALES",
): TaxTrapAnalysis {
  return analyzeTaxTrap(grossIncome, region, taxYear);
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
 * 62,430 regardless. This helper takes no Gift Aid: calculateUkTax
 * extends the Basic band's upper limit and the bands above it by the grossed-up
 * gift (ITA 2007 s.414(2)(b)).
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

  // Income before allowance: Gift Aid does NOT reduce it (it extends the bands instead; for Scotland
  // the Basic upper limit and the bands above it, ITA 2007 s.414(2)(b)).
  const incomeBeforeAllowance = Math.max(0, totalGrossIncome - employeePensionContribution);
  const taxableIncome = Math.max(0, incomeBeforeAllowance - effectiveAllowance);

  // Income Tax
  const incomeTax = calculateIncomeTaxOnTaxable(taxableIncome, rules, region, {
    bandExtension: grossGiftAid,
  }).total;

  // National Insurance (calculated on payroll gross pay)
  const nationalInsurance = calculateEmployeeNi(grossPayForNi, rules);

  // Student Loan deduction (calculated on payroll gross pay)
  const studentLoanDeduction = calculateStudentLoanDeduction(
    grossPayForNi,
    studentLoanPlan,
    taxYear,
  );

  // Total deductions from salary. The pension leaves pay either way: under salary sacrifice the
  // employee gives up that much salary, otherwise it is deducted from net pay (E23 D10).
  const totalDeductions =
    incomeTax + nationalInsurance + studentLoanDeduction + employeePensionContribution;

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
    pensionAnnualAllowanceGbp: rules.pensionAnnualAllowance,
    pensionAllowanceUsedGbp: Math.round(totalPensionUsed),
    pensionAllowanceRemainingGbp: roundPence(
      Math.max(0, rules.pensionAnnualAllowance - totalPensionUsed),
    ),
    personalSavingsAllowanceGbp: personalSavingsAllowance,
    marginalIncomeTaxBand: marginalBand,
    taxYearEndDate: endDateFormatted,
    daysRemainingInTaxYear: daysRemaining,
  };

  const taxTrap = analyzeTaxTrap(adjustedNetIncome, region, taxYear);

  return {
    taxYear,
    grossIncomeGbp: roundPence(totalGrossIncome),
    adjustedNetIncomeGbp: roundPence(adjustedNetIncome),
    taxableIncomeGbp: roundPence(taxableIncome),
    incomeTaxGbp: incomeTax,
    nationalInsuranceGbp: nationalInsurance,
    studentLoanDeductionGbp: studentLoanDeduction,
    employeePensionDeductionGbp: roundPence(employeePensionContribution),
    employerPensionContributionGbp: roundPence(employerPensionContribution),
    employerNiSavingsGbp: roundPence(employerNiSavings),
    giftAidContributionsGbp: roundPence(netGiftAid),
    totalDeductionsGbp: roundPence(totalDeductions),
    netTakeHomePayAnnualGbp: netTakeHomeAnnual,
    netTakeHomePayMonthlyGbp: netTakeHomeMonthly,
    effectiveTaxRatePct,
    taxTrap,
    allowances,
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

  const trapAnalysis = calculateTaxTrapRelief(grossSalary, taxYear);

  return {
    ...result,
    trapAnalysis,
  };
}

/**
 * Marginal rate to display to users. Inside the £100k trap this is the
 * NI-inclusive effective rate (62 / 69.5); outside it stays the income tax
 * rate only (20 / 40 / 45), as it was before the engine change.
 */
export function getDisplayMarginalRatePct(analysis: TaxTrapAnalysis): number {
  return analysis.isInTaxTrap ? analysis.effectiveMarginalRatePct : analysis.marginalRatePct;
}

/**
 * Estimated annual tax saved by sacrificing `contributionPct` of `annualIncome`
 * into a pension, at the display marginal rate. Unrounded (pence preserved).
 */
export function estimateSalarySacrificeTaxSaving(
  annualIncome: number,
  contributionPct: number,
  analysis: TaxTrapAnalysis,
): number {
  return annualIncome * (contributionPct / 100) * (getDisplayMarginalRatePct(analysis) / 100);
}

/**
 * Annual income tax plus employee Class 1 NI saved by sacrificing `sacrifice` of
 * `annualIncome` (salary sacrifice reduces both the taxed and the NI-able pay).
 * Computed as the difference between the full calculations at `annualIncome` and
 * `annualIncome - sacrifice`, so it is exact across band edges and the 100k
 * allowance taper (unlike a flat marginal rate at the starting income). The
 * sacrifice is clamped to [0, annualIncome]. Rounded to pence. Defaults to the
 * same year as the trap helpers; an explicitly unsupported year throws.
 */
export function calculateSalarySacrificeSaving(
  annualIncome: number,
  sacrifice: number,
  taxYear: string = defaultTrapTaxYear(),
  region: UkTaxRegion = "ENGLAND_NI_WALES",
): number {
  const rules = getUkTaxYearRules(resolveUkTaxYear(taxYear));
  const income = Math.max(0, annualIncome);
  const reduced = income - Math.min(income, Math.max(0, sacrifice));
  const tax =
    incomeTaxOnAdjustedNetIncome(income, rules, region) -
    incomeTaxOnAdjustedNetIncome(reduced, rules, region);
  const ni = calculateEmployeeNi(income, rules) - calculateEmployeeNi(reduced, rules);
  return roundPence(tax + ni);
}
