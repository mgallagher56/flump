import {
  calculateUkTax,
  getLatestSupportedUkTaxYear,
  getUkTaxYearRules,
  type OnboardingSeedPayload,
  persistOnboardingSeed,
} from "@flump/finance-engine";

/**
 * The pay rise tool's sums, kept apart from the component so the marketing copy guards read only
 * what a visitor sees. Every figure comes from the finance engine.
 */

/** The Personal Allowance taper band, used only to explain the rate a visitor's own figures hit. */
const LATEST_RULES = getUkTaxYearRules(getLatestSupportedUkTaxYear());
const TAPER_START_GBP = LATEST_RULES.ewni.personalAllowanceTaperStart;
const TAPER_END_GBP = LATEST_RULES.taperEnd;

/** "2026/27" as "2026 to 2027" (copy guide 4.3: tax years in words). */
export const taxYearInWords = (taxYear: string): string => {
  const start = Number.parseInt(taxYear.slice(0, 4), 10);
  return Number.isFinite(start) ? `${start} to ${start + 1}` : taxYear;
};

export interface PayRiseResult {
  keptAnnual: number;
  keptMonthly: number;
  extraIncomeTax: number;
  extraNationalInsurance: number;
  keptPct: number;
  entersTaperBand: boolean;
  taxYear: string;
}

/** What an employee on PAYE keeps from a rise, England, Wales and NI bands, no pension or loan. */
export function payRiseResult(salary: number, rise: number): PayRiseResult {
  const before = calculateUkTax({ grossSalary: Math.max(0, salary) });
  const after = calculateUkTax({ grossSalary: Math.max(0, salary + rise) });
  const keptAnnual = after.netTakeHomePayAnnualGbp - before.netTakeHomePayAnnualGbp;
  const top = salary + rise;
  return {
    keptAnnual,
    keptMonthly: keptAnnual / 12,
    extraIncomeTax: after.incomeTaxGbp - before.incomeTaxGbp,
    extraNationalInsurance: after.nationalInsuranceGbp - before.nationalInsuranceGbp,
    keptPct: rise > 0 ? (keptAnnual / rise) * 100 : 0,
    entersTaperBand: top > TAPER_START_GBP && salary < TAPER_END_GBP,
    taxYear: after.taxYear,
  };
}

/** Open sign-up only: hand the visitor's own salary to onboarding. Invite-only stores nothing. */
export function seedSalaryForOnboarding(salary: number): void {
  const payload: OnboardingSeedPayload = {
    timestamp: Date.now(),
    annualGrossSalary: salary,
    inferredModules: ["budget", "tax", "forecast"],
  };
  persistOnboardingSeed(payload);
}
