/**
 * One take-home core (E25-T5): employee pay, a pension method, several student loan plans and the
 * High Income Child Benefit Charge, built only from the per-component calculators in uk-tax-year.ts
 * and uk-hicbc.ts. Every rate and threshold is read from `getUkTaxYearRules(year)`, so it comes from
 * the sourced rules registry (E25-T1).
 *
 * Pure: no formatting, no clock read unless `opts.now` is passed (the year falls back to the context
 * year when `taxYear` is omitted). Annual method, not pay-period.
 *
 * Rounding: each component is pence-rounded by its calculator (as a payslip is), and take-home is the
 * pence-rounded difference. What-if deltas are differences of pence values, so they are exact to the
 * penny and do not drift.
 *
 * This is the only take-home calculation (E25-T5): `calculateUkTax` in uk-tax.ts is an adapter that
 * maps its inputs onto a scenario here, so `selectTakeHome` and every calculator show the same figures.
 */

import { getTaxFeatureVerification, type UkTaxFeature } from "./tax-year-verification.js";
import type { UkTaxRegion, UkTaxYear } from "./types.js";
import { calculateChildBenefitAnnual, calculateHicbc } from "./uk-hicbc.js";
import { UK_RULE_SOURCES, type UkRuleKey } from "./uk-rule-sources.js";
import {
  salarySacrificeAboveCap,
  UK_SCHEDULED_RULES,
  type UkScheduledRuleId,
} from "./uk-scheduled-rules.js";
import {
  calculateClass4Ni,
  calculateEmployeeNi,
  calculateEmployerNiSaving,
  calculateIncomeTaxOnTaxable,
  calculatePersonalAllowanceForYear,
  calculateStudentLoanRepayment,
  getUkTaxYearContext,
  getUkTaxYearRules,
  resolveUkTaxYear,
  roundPence,
  type UkStudentLoanPlanKey,
  type UkTaxYearRules,
} from "./uk-tax-year.js";

export type UkPensionMethod = "salary-sacrifice" | "net-pay" | "relief-at-source";

/**
 * Employee pension contribution. Give `amount` (pounds a year) or `pct` (per cent of salary, bonus
 * excluded); `amount` wins when both are set.
 * - salary-sacrifice: salary given up. Lowers taxable pay, NI pay and student loan pay.
 * - net-pay: gross contribution taken before tax. Lowers taxable pay only.
 * - relief-at-source: the net contribution paid from take-home. The provider adds basic-rate relief
 *   (x 1.25), and the grossed-up figure extends the tax bands and lowers adjusted net income.
 */
export interface UkPensionInput {
  method: UkPensionMethod;
  amount?: number;
  pct?: number;
}

export interface UkChildBenefitInput {
  children: number;
  /**
   * Individual basis only: the charge falls on the higher earner. Defaults to true. When false the
   * charge would fall on a partner whose income is not known, so none is applied here.
   */
  claimantIsHigherEarner?: boolean;
}

export interface UkIncomeScenario {
  taxYear?: string;
  /** Assumed England, Wales and Northern Ireland when omitted (labelled). */
  region?: UkTaxRegion;
  salary: number;
  bonus?: number;
  /**
   * True when `salary` is self-employed profit, not pay from an employer: Class 4 National
   * Insurance is charged on it in place of Class 1. Salary sacrifice does not apply.
   */
  selfEmployed?: boolean;
  /**
   * Other income taxed with the pay but not through payroll, such as rental profit (pounds a
   * year). It is taxed as non-savings income and carries no National Insurance or student loan
   * repayment here.
   */
  otherIncome?: number;
  pension?: UkPensionInput;
  studentLoans?: readonly UkStudentLoanPlanKey[];
  /** Opt-in. Omitted means no Child Benefit is claimed. */
  childBenefit?: UkChildBenefitInput;
  /** Net Gift Aid donations a year (grossed up x 1.25). */
  giftAidNet?: number;
  /** Future-dated rules to apply as an illustration. Never applied implicitly. */
  scheduledRules?: readonly UkScheduledRuleId[];
}

export type UkTakeHomeAssumptionCode =
  | "annualMethod"
  | "regionAssumed"
  | "childBenefitExcluded"
  | "hicbcIndividualBasis"
  | "hicbcPartnerNotModelled"
  | "childBenefitWeeks"
  | "pensionPctOfSalary"
  | "pensionCappedAtEarnings"
  | "pensionMethodAssumed"
  | "reliefAtSourceBandExtension"
  | "reliefAtSourceScotland"
  | "multipleUndergraduatePlans"
  | "scheduledRuleIllustration"
  | "studentLoanUnderScheduledCap";

export interface UkTakeHomeAssumption {
  code: UkTakeHomeAssumptionCode;
  /** True when the assumption rests on a figure or ruling not yet confirmed. */
  unverified: boolean;
}

export type UkFeatureVerification = Partial<Record<UkTaxFeature, "verified" | "unverified">>;

export interface UkTakeHomeBreakdown {
  /** Tax year asked for, or the calendar year when none was given (may be unsupported). */
  taxYear: string;
  /** Supported year whose rates were used. */
  ratesYear: UkTaxYear;
  /** True when the clock is past the latest supported year and its rates stand in. */
  isFallback: boolean;
  region: UkTaxRegion;
  /** Salary plus bonus. */
  grossPay: number;
  /** Other income taxed with the pay (0 when none was given). */
  otherIncome: number;
  /** Income before the personal allowance: pay and other income, less a sacrifice or net-pay pension. */
  incomeBeforeAllowance: number;
  /** Which National Insurance class `nationalInsurance` is. */
  niClass: "class1" | "class4";
  /** What leaves pay for the pension: the sacrifice, the net-pay contribution or the net RAS payment. */
  pensionEmployee: number;
  /** What reaches the pension from the employee, after basic-rate relief at source. */
  pensionGross: number;
  pensionMethod: UkPensionMethod | null;
  adjustedNetIncome: number;
  personalAllowance: number;
  taxableIncome: number;
  /** Pay liable to Class 1 NI. */
  niPay: number;
  /** Pay student loan repayments are worked out on. */
  studentLoanPay: number;
  incomeTax: number;
  nationalInsurance: number;
  studentLoan: number;
  studentLoanByPlan: Partial<Record<UkStudentLoanPlanKey, number>>;
  /** Child Benefit received over the year (not part of take-home). */
  childBenefit: number;
  hicbcPercent: number;
  hicbc: number;
  /** grossPay + otherIncome - pensionEmployee - incomeTax - nationalInsurance - studentLoan - hicbc. */
  takeHome: number;
  assumptions: UkTakeHomeAssumption[];
  /** Grossed-up relief at source plus grossed-up Gift Aid: how far band edges above the basic rate move. */
  bandExtension: number;
  /** Rule groups this result rests on whose registry status is "unverified". */
  unverifiedRuleKeys: UkRuleKey[];
  /** Owner sign-off status of each feature this result uses. */
  verification: UkFeatureVerification;
  /** True when any feature is unsigned, any rule group is unverified or any assumption is. */
  isUnverifiedEstimate: boolean;
}

const UNDERGRADUATE_PLANS: readonly UkStudentLoanPlanKey[] = ["plan1", "plan2", "plan4", "plan5"];

const nonNeg = (x: number | undefined): number =>
  x !== undefined && Number.isFinite(x) ? Math.max(0, x) : 0;

/** Student loan plans the year's tables list. Selectors offer only these. */
export function availableStudentLoanPlans(rules: UkTaxYearRules): UkStudentLoanPlanKey[] {
  const plans = rules.studentLoans.plans;
  return (["plan1", "plan2", "plan4", "plan5", "postgrad"] as const).filter(
    (k) => plans[k] !== undefined,
  );
}

/** Employee pension contribution in pounds, before any gross-up. */
export function pensionContribution(salary: number, pension?: UkPensionInput): number {
  if (!pension) return 0;
  if (pension.amount !== undefined) return nonNeg(pension.amount);
  return (nonNeg(salary) * nonNeg(pension.pct)) / 100;
}

/**
 * Student loan repayment for several plans. One undergraduate plan charges its rate over its threshold.
 * With several undergraduate plans the rate is charged once over the lowest of their thresholds
 * (UNVERIFIED until the accountant ruling). Postgraduate is charged separately on top.
 */
function studentLoanRepayments(
  pay: number,
  plans: readonly UkStudentLoanPlanKey[],
  rules: UkTaxYearRules,
): { total: number; byPlan: Partial<Record<UkStudentLoanPlanKey, number>>; multiUg: boolean } {
  const unique = [...new Set(plans)];
  const ug = unique.filter((p) => UNDERGRADUATE_PLANS.includes(p));
  const byPlan: Partial<Record<UkStudentLoanPlanKey, number>> = {};
  if (ug.length > 0) {
    // Throws UnsupportedUkTaxYearError for a plan the year does not list (no substitution).
    for (const p of ug) calculateStudentLoanRepayment(0, p, rules);
    const threshold = (p: UkStudentLoanPlanKey) =>
      rules.studentLoans.plans[p]?.threshold ?? Number.POSITIVE_INFINITY;
    const lowest = ug.reduce((a, b) => (threshold(b) < threshold(a) ? b : a));
    byPlan[lowest] = calculateStudentLoanRepayment(pay, lowest, rules);
    for (const other of ug) if (other !== lowest) byPlan[other] = 0;
  }
  if (unique.includes("postgrad")) {
    byPlan.postgrad = calculateStudentLoanRepayment(pay, "postgrad", rules);
  }
  const total = roundPence(Object.values(byPlan).reduce((s, v) => s + (v ?? 0), 0));
  return { total, byPlan, multiUg: ug.length > 1 };
}

function resolveYear(
  taxYear: string | undefined,
  now: Date | undefined,
): { taxYear: string; ratesYear: UkTaxYear; isFallback: boolean } {
  if (taxYear === undefined) {
    const ctx = getUkTaxYearContext(now);
    return { taxYear: ctx.calendarYear, ratesYear: ctx.ratesYear, isFallback: ctx.isFallback };
  }
  const ratesYear = resolveUkTaxYear(taxYear);
  return { taxYear: ratesYear, ratesYear, isFallback: false };
}

// The vector catalogues are static, so each (year, feature) status is worked out once. The curve
// calls the core hundreds of times and must not re-scan thousands of vectors each time.
const verificationCache = new Map<string, "verified" | "unverified">();
function featureVerification(year: UkTaxYear, feature: UkTaxFeature): "verified" | "unverified" {
  const key = `${year}|${feature}`;
  let status = verificationCache.get(key);
  if (status === undefined) {
    status = getTaxFeatureVerification(year, feature);
    verificationCache.set(key, status);
  }
  return status;
}

export interface UkTakeHomeOptions {
  now?: Date;
}

export function computeUkTakeHome(
  s: UkIncomeScenario,
  opts: UkTakeHomeOptions = {},
): UkTakeHomeBreakdown {
  const year = resolveYear(s.taxYear, opts.now);
  const rules = getUkTaxYearRules(year.ratesYear);
  const region = s.region ?? "ENGLAND_NI_WALES";
  const assumptions: UkTakeHomeAssumption[] = [{ code: "annualMethod", unverified: false }];
  const assume = (code: UkTakeHomeAssumptionCode, unverified = false) => {
    if (!assumptions.some((a) => a.code === code)) assumptions.push({ code, unverified });
  };
  if (s.region === undefined) assume("regionAssumed");

  const salary = nonNeg(s.salary);
  const bonus = nonNeg(s.bonus);
  const grossPay = salary + bonus;
  const otherIncome = nonNeg(s.otherIncome);
  const selfEmployed = s.selfEmployed === true;

  const method = s.pension ? s.pension.method : null;
  if (s.pension && s.pension.amount === undefined && nonNeg(s.pension.pct) > 0) {
    assume("pensionPctOfSalary");
  }
  // Basic-rate relief added at source: net x 1 / (1 - basic rate), i.e. x 1.25 at 20%.
  const rasGrossUp = 1 / (1 - rules.ewni.basicRate);
  // A contribution cannot exceed the pay it comes out of. For relief at source, tax relief is limited to
  // relevant earnings, so the grossed-up figure is capped at gross pay. The GBP3,600 minimum for people
  // with low earnings is not in the sourced registry and is not modelled.
  const rawContribution = pensionContribution(salary, s.pension);
  const cap =
    method === "relief-at-source" ? grossPay / rasGrossUp : method === null ? 0 : grossPay;
  const contribution = Math.min(rawContribution, cap);
  if (rawContribution > cap + 1e-9) assume("pensionCappedAtEarnings");
  const sacrifice = method === "salary-sacrifice" ? contribution : 0;
  const netPay = method === "net-pay" ? contribution : 0;
  const rasNet = method === "relief-at-source" ? contribution : 0;
  const rasGross = rasNet * rasGrossUp;
  if (rasNet > 0) {
    assume("reliefAtSourceBandExtension", true);
    if (region === "SCOTLAND") assume("reliefAtSourceScotland", true);
  }
  const giftAidGross = nonNeg(s.giftAidNet) * rules.giftAidGrossUp;

  const employmentIncome = grossPay - sacrifice;
  const incomeBeforeAllowance = Math.max(0, employmentIncome + otherIncome - netPay);
  const adjustedNetIncome = Math.max(0, incomeBeforeAllowance - rasGross - giftAidGross);
  const personalAllowance = calculatePersonalAllowanceForYear(adjustedNetIncome, rules);
  const taxableIncome = Math.max(0, incomeBeforeAllowance - personalAllowance);
  const incomeTax = calculateIncomeTaxOnTaxable(taxableIncome, rules, region, {
    bandExtension: rasGross + giftAidGross,
  }).total;

  let niPay = employmentIncome;
  const scheduled = [...new Set(s.scheduledRules ?? [])];
  if (scheduled.length > 0) assume("scheduledRuleIllustration", true);
  if (scheduled.includes("ni.salarySacrificePensionCap2029")) {
    niPay += salarySacrificeAboveCap(
      sacrifice,
      UK_SCHEDULED_RULES["ni.salarySacrificePensionCap2029"],
    );
    if ((s.studentLoans ?? []).length > 0 && sacrifice > 0) {
      assume("studentLoanUnderScheduledCap", true);
    }
  }
  const nationalInsurance = selfEmployed
    ? calculateClass4Ni(niPay, rules)
    : calculateEmployeeNi(niPay, rules);

  const studentLoanPay = employmentIncome;
  const loans = studentLoanRepayments(studentLoanPay, s.studentLoans ?? [], rules);
  if (loans.multiUg) assume("multipleUndergraduatePlans", true);

  let childBenefit = 0;
  let hicbcPercent = 0;
  let hicbc = 0;
  const children = s.childBenefit ? Math.max(0, Math.floor(nonNeg(s.childBenefit.children))) : 0;
  if (children > 0) {
    assume("childBenefitExcluded");
    assume("childBenefitWeeks", true);
    childBenefit = calculateChildBenefitAnnual(children, rules);
    if (s.childBenefit?.claimantIsHigherEarner === false) {
      assume("hicbcPartnerNotModelled");
    } else {
      assume("hicbcIndividualBasis");
      const r = calculateHicbc(adjustedNetIncome, childBenefit, rules);
      hicbcPercent = r.chargePercent;
      hicbc = r.charge;
    }
  }

  const pensionEmployee = roundPence(contribution);
  const takeHome = roundPence(
    grossPay + otherIncome - pensionEmployee - incomeTax - nationalInsurance - loans.total - hicbc,
  );

  const touched: UkRuleKey[] = [
    "personalAllowance",
    region === "SCOTLAND" ? "incomeTaxScotland" : "incomeTaxEwni",
    selfEmployed ? "niClass4" : "niClass1",
  ];
  if (adjustedNetIncome > rules.ewni.personalAllowanceTaperStart)
    touched.push("personalAllowanceTaper");
  if ((s.studentLoans ?? []).length > 0) touched.push("studentLoan");
  if (children > 0) touched.push("childBenefit", "hicbc");
  if (giftAidGross > 0 || rasGross > 0) touched.push("giftAid");
  const sources = UK_RULE_SOURCES[year.ratesYear];
  const unverifiedRuleKeys = touched.filter((k) => sources[k].status === "unverified");

  const features: UkTaxFeature[] = ["core", "whatIf"];
  if (children > 0) features.push("hicbc");
  if (scheduled.length > 0) features.push("scheduled");
  const verification: UkFeatureVerification = {};
  for (const f of features) verification[f] = featureVerification(year.ratesYear, f);

  return {
    ...year,
    region,
    grossPay: roundPence(grossPay),
    otherIncome: roundPence(otherIncome),
    incomeBeforeAllowance: roundPence(incomeBeforeAllowance),
    niClass: selfEmployed ? "class4" : "class1",
    pensionEmployee,
    pensionGross: roundPence(method === "relief-at-source" ? rasGross : contribution),
    pensionMethod: method,
    bandExtension: roundPence(rasGross + giftAidGross),
    adjustedNetIncome: roundPence(adjustedNetIncome),
    personalAllowance,
    taxableIncome: roundPence(taxableIncome),
    niPay: roundPence(niPay),
    studentLoanPay: roundPence(studentLoanPay),
    incomeTax,
    nationalInsurance,
    studentLoan: loans.total,
    studentLoanByPlan: loans.byPlan,
    childBenefit,
    hicbcPercent,
    hicbc,
    takeHome,
    assumptions,
    unverifiedRuleKeys,
    verification,
    isUnverifiedEstimate:
      unverifiedRuleKeys.length > 0 ||
      assumptions.some((a) => a.unverified) ||
      Object.values(verification).some((v) => v !== "verified"),
  };
}

/**
 * Extra NI the announced April 2029 cap would add for a salary sacrifice (E25-T7). An illustration at
 * the given year's rates: never applied unless asked for, and always labelled as not yet law.
 */
export function salarySacrificeCapExtraNi(
  salary: number,
  sacrifice: number,
  rules: UkTaxYearRules,
): { employee: number; employer: number } {
  const pay = nonNeg(salary);
  const sac = Math.min(nonNeg(sacrifice), pay);
  const excess = salarySacrificeAboveCap(
    sac,
    UK_SCHEDULED_RULES["ni.salarySacrificePensionCap2029"],
  );
  const post = pay - sac;
  return {
    employee: roundPence(
      calculateEmployeeNi(post + excess, rules) - calculateEmployeeNi(post, rules),
    ),
    employer: calculateEmployerNiSaving(post + excess, excess, rules),
  };
}
