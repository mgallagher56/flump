import { normalizeStudentLoanPlan, pickEnginePlan } from "../../profile.js";
import type { UkStudentLoanPlan, UkTaxRegion, UkTaxYear } from "../../types.js";
import { calculateUkTax, toStudentLoanPlanKey } from "../../uk-tax.js";
import {
  getUkTaxYearRules,
  resolveUkTaxYear,
  scottishRatesRefusal,
  studentLoanThresholdRefusal,
  UnsupportedUkTaxYearError,
} from "../../uk-tax-year.js";
import { type Figure, figureKnown, figureRefused, figureUnknown } from "../figure.js";
import type { FactKey, ProfileFacts } from "../input.js";

/**
 * Take-home pay. `basis` says where it comes from:
 * - "worked-out": from the saved salary, less tax, National Insurance, pension and student loan;
 *   every part is a number;
 * - "typed": the monthly take-home the person typed (onboarding's take-home option, owner
 *   decision 2 option A), used when no salary is saved. It is net pay as given, so the parts that
 *   need pay before tax are null ("Not set"), never worked out backwards.
 */
export type TakeHome =
  | {
      basis: "worked-out";
      monthly: number;
      annual: number;
      incomeTax: number;
      nationalInsurance: number;
      studentLoan: number;
      pension: number;
      taxYear: UkTaxYear;
      region: UkTaxRegion;
    }
  | {
      basis: "typed";
      monthly: number;
      annual: number;
      incomeTax: null;
      nationalInsurance: null;
      studentLoan: null;
      pension: null;
      taxYear: null;
      region: null;
    };

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

  // No salary saved, but a take-home typed as net pay: that is the take-home (decision 2). A
  // saved salary always wins, since tax, pension and student loan are worked out from it.
  const salarySaved = f.annualSalary !== null && f.annualSalary > 0;
  const typed = f.monthlyTakeHome;
  if (!salarySaved && typed !== null && typed !== undefined && typed > 0) {
    return figureKnown<TakeHome>(
      {
        basis: "typed",
        monthly: Math.round(typed),
        annual: Math.round(typed * 12),
        incomeTax: null,
        nationalInsurance: null,
        studentLoan: null,
        pension: null,
        taxYear: null,
        region: null,
      },
      "user",
    );
  }

  const missing: FactKey[] = [];
  if (f.annualSalary === null || !(f.annualSalary > 0)) missing.push("annualSalary");
  if (f.employmentType !== "employed" && f.employmentType !== "self-employed") {
    missing.push("employmentType");
  }
  if (f.pensionPercent === null) missing.push("pensionPercent");
  // Salary sacrifice is a payroll arrangement: only employees are asked about it.
  if (f.employmentType !== "self-employed" && f.isSalarySacrifice === null) {
    missing.push("isSalarySacrifice");
  }
  if (missing.length > 0) return figureUnknown(missing, "not-set");

  const salary = f.annualSalary as number;
  const pensionPercent = f.pensionPercent as number;

  let taxYear: UkTaxYear;
  try {
    taxYear = resolveUkTaxYear(opts.taxYear);
  } catch (error) {
    if (error instanceof UnsupportedUkTaxYearError) return figureUnknown([], "unsupported-year");
    throw error;
  }

  const assumptions: string[] = [];
  const region: UkTaxRegion = f.taxRegion === "SCOTLAND" ? "SCOTLAND" : "ENGLAND_NI_WALES";
  if (f.taxRegion === null) assumptions.push(ASSUMED_REGION_NOTE);

  // Refused, never carried forward: no Scottish rates for the year means no take-home figure.
  const rules = getUkTaxYearRules(taxYear);
  const scottish = scottishRatesRefusal(rules, region);
  if (scottish) return figureRefused(scottish);

  let studentLoanPlan: UkStudentLoanPlan = "NONE";
  if (f.studentLoanPlans === null) {
    assumptions.push(ASSUMED_NO_STUDENT_LOAN_NOTE);
  } else if (f.studentLoanPlans.length > 0) {
    studentLoanPlan = normalizeStudentLoanPlan(pickEnginePlan(f.studentLoanPlans));
  }
  // A plan with no published threshold for the year is left out, and the figure says so.
  const planKey = toStudentLoanPlanKey(studentLoanPlan);
  const loanRefusal = planKey ? studentLoanThresholdRefusal(rules, planKey) : null;
  if (loanRefusal) {
    studentLoanPlan = "NONE";
    assumptions.push(loanRefusal.notice);
  }

  const selfEmployed = f.employmentType === "self-employed";
  const result = calculateUkTax({
    grossSalary: salary,
    pensionContributionPct: pensionPercent,
    isSalarySacrifice: selfEmployed ? false : f.isSalarySacrifice === true,
    // A saved "relief at source" answer wins; salary sacrifice is a payroll arrangement only.
    pensionMethod: selfEmployed
      ? f.pensionMethod === "relief-at-source"
        ? "relief-at-source"
        : undefined
      : (f.pensionMethod ?? undefined),
    // Self-employed: the saved income is profit, so Class 4 National Insurance applies.
    selfEmployed,
    studentLoanPlan,
    region,
    taxYear,
  });

  const nationalInsurance = result.nationalInsuranceGbp;
  const pension = result.employeePensionDeductionGbp;
  const annualRaw = result.netTakeHomePayAnnualGbp;
  const annual = Math.round(annualRaw);

  return figureKnown<TakeHome>(
    {
      basis: "worked-out",
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
