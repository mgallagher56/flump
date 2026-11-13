import { normalizeStudentLoanPlan, pickEnginePlan } from "../../profile.js";
import type { UkStudentLoanPlan, UkTaxRegion, UkTaxYear } from "../../types.js";
import { calculateUkTax } from "../../uk-tax.js";
import {
  calculateClass4Ni,
  getUkTaxYearRules,
  resolveUkTaxYear,
  UnsupportedUkTaxYearError,
} from "../../uk-tax-year.js";
import { type Figure, known, unknown } from "../figure.js";
import type { FactKey, ProfileFacts } from "../input.js";

export interface TakeHome {
  monthly: number;
  annual: number;
  incomeTax: number;
  nationalInsurance: number;
  studentLoan: number;
  pension: number;
  taxYear: UkTaxYear;
  region: UkTaxRegion;
}

export interface SelectTakeHomeOptions {
  taxYear?: UkTaxYear;
  overrides?: Partial<ProfileFacts>;
}

export const ASSUMED_REGION_NOTE = "Assuming England, Wales and Northern Ireland rates.";
export const ASSUMED_NO_STUDENT_LOAN_NOTE = "Assuming no student loan.";

/** Take-home pay: the one selector every signed-in take-home figure uses. */
export function selectTakeHome(
  facts: ProfileFacts,
  opts: SelectTakeHomeOptions = {},
): Figure<TakeHome> {
  const f: ProfileFacts = { ...facts, ...opts.overrides };

  const missing: FactKey[] = [];
  if (f.annualSalary === null || !(f.annualSalary > 0)) missing.push("annualSalary");
  if (f.employmentType !== "employed" && f.employmentType !== "self-employed") {
    missing.push("employmentType");
  }
  if (f.pensionPercent === null) missing.push("pensionPercent");
  if (f.isSalarySacrifice === null) missing.push("isSalarySacrifice");
  if (missing.length > 0) return unknown(missing, "not-set");

  const salary = f.annualSalary as number;
  const pensionPercent = f.pensionPercent as number;

  let taxYear: UkTaxYear;
  try {
    taxYear = resolveUkTaxYear(opts.taxYear);
  } catch (error) {
    if (error instanceof UnsupportedUkTaxYearError) return unknown([], "unsupported-year");
    throw error;
  }

  const assumptions: string[] = [];
  const region: UkTaxRegion = f.taxRegion === "SCOTLAND" ? "SCOTLAND" : "ENGLAND_NI_WALES";
  if (f.taxRegion === null) assumptions.push(ASSUMED_REGION_NOTE);

  let studentLoanPlan: UkStudentLoanPlan = "NONE";
  if (f.studentLoanPlans === null) {
    assumptions.push(ASSUMED_NO_STUDENT_LOAN_NOTE);
  } else if (f.studentLoanPlans.length > 0) {
    studentLoanPlan = normalizeStudentLoanPlan(pickEnginePlan(f.studentLoanPlans));
  }

  const selfEmployed = f.employmentType === "self-employed";
  const result = calculateUkTax({
    grossSalary: salary,
    pensionContributionPct: pensionPercent,
    isSalarySacrifice: selfEmployed ? false : f.isSalarySacrifice === true,
    studentLoanPlan,
    region,
    taxYear,
  });

  const nationalInsurance = selfEmployed
    ? calculateClass4Ni(salary, getUkTaxYearRules(taxYear))
    : result.nationalInsuranceGbp;
  const pension = result.employeePensionDeductionGbp;
  const annualRaw =
    salary - pension - result.incomeTaxGbp - nationalInsurance - result.studentLoanDeductionGbp;
  const annual = Math.round(annualRaw);

  return known<TakeHome>(
    {
      monthly: Math.round(annualRaw / 12),
      annual,
      incomeTax: result.incomeTaxGbp,
      nationalInsurance,
      studentLoan: result.studentLoanDeductionGbp,
      pension,
      taxYear,
      region,
    },
    assumptions.length > 0 ? "assumption" : "derived",
    assumptions,
  );
}
