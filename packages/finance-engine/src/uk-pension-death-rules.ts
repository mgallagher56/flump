/**
 * UK rules for pension savings left at death and for self-employed pension saving (E33 S7).
 *
 * The one home for every figure and date the Retirement page's "What happens to unused pension
 * savings" and "Pensions when you are self-employed" sections show. Flump does not estimate
 * inheritance tax: these are facts, read from primary sources by an independent decider on
 * `checkedOn` (packages/finance-engine/docs/tax-sources/pensions-inheritance-tax.md).
 *
 * When the law changes, edit this file only. If the rules stop being law as written (for example a
 * later Finance Bill changes them before they apply), set `status` to "draft" and the page shows a
 * "proposed, not yet law" notice instead of stating them as settled.
 */
import type { UkRatesYear } from "./types.js";

/** "enacted": in an Act with Royal Assent. "draft": in a Bill or announcement only. */
export type UkLawStatus = "enacted" | "draft";

export interface UkPensionInheritanceRules {
  status: UkLawStatus;
  /** The Act and sections, for the record. */
  enactedBy: string;
  /** First date of death the rules apply to (ISO date). */
  appliesToDeathsFrom: string;
  /** When an independent decider last read the sources (ISO date), and who. */
  checkedOn: string;
  checkedBy: string;
  /** Inheritance tax rate above the thresholds (the 36% charity rate is not shown). */
  rate: number;
  nilRateBandGbp: number;
  residenceNilRateBandGbp: number;
  /** Estate value above which the residence nil-rate band tapers, £1 for every `residenceTaperDivisor` pounds. */
  residenceTaperThresholdGbp: number;
  residenceTaperDivisor: number;
  /** Last day of the thresholds freeze (ISO date). */
  thresholdsFixedUntil: string;
  /** Inheritance tax is due by the end of this month after the death. */
  paymentDueMonthAfterDeath: number;
  /** Death before this age: inherited pensions usually free of income tax. */
  incomeTaxFreeBeforeAge: number;
  /** The lump sum and death benefit allowance for most people. */
  lumpSumAndDeathBenefitAllowanceGbp: number;
  sources: {
    act: string;
    inheritanceTax: string;
    inheritedPensionTax: string;
    technicalNote: string;
  };
}

export const UK_PENSION_INHERITANCE_RULES: UkPensionInheritanceRules = {
  status: "enacted",
  // Royal Assent 18 March 2026; s.71: deaths on or after 6 April 2027, no commencement regulations.
  enactedBy: "Finance Act 2026, sections 66 to 71",
  appliesToDeathsFrom: "2027-04-06",
  checkedOn: "2026-11-25",
  checkedBy: "fable-decider",
  rate: 0.4,
  nilRateBandGbp: 325_000,
  residenceNilRateBandGbp: 175_000,
  residenceTaperThresholdGbp: 2_000_000,
  residenceTaperDivisor: 2,
  // FA 2026 s.72 amending FA 2021 s.86: frozen to the end of the 2030-31 tax year.
  thresholdsFixedUntil: "2031-04-05",
  paymentDueMonthAfterDeath: 6,
  incomeTaxFreeBeforeAge: 75,
  lumpSumAndDeathBenefitAllowanceGbp: 1_073_100,
  sources: {
    act: "https://www.legislation.gov.uk/ukpga/2026/11",
    inheritanceTax: "https://www.gov.uk/inheritance-tax",
    inheritedPensionTax: "https://www.gov.uk/tax-on-pension-death-benefits",
    technicalNote:
      "https://www.gov.uk/government/publications/inheritance-tax-on-pensions-technical-note/technical-note-inheritance-tax-on-pensions",
  },
};

/** True on and after the first date of death the rules apply to. `today` is an ISO date (yyyy-mm-dd). */
export function arePensionInheritanceRulesInForce(
  todayIso: string,
  rules: UkPensionInheritanceRules = UK_PENSION_INHERITANCE_RULES,
): boolean {
  return todayIso >= rules.appliesToDeathsFrom;
}

/** Self-employed pension facts for one tax year (relief at source and Class 2 National Insurance). */
export interface UkSelfEmployedPensionRules {
  taxYear: UkRatesYear;
  /** Gross contributions that get relief when UK earnings are lower than this (FA 2004 s.190). */
  basicAmountGbp: number;
  /** Profits at or above which Class 2 National Insurance is treated as paid. */
  class2SmallProfitsThresholdGbp: number;
  /** Weekly voluntary Class 2 rate below that threshold. */
  class2VoluntaryWeeklyGbp: number;
  checkedOn: string;
  checkedBy: string;
  sources: {
    taxRelief: string;
    nationalInsurance: string;
  };
}

export const UK_SELF_EMPLOYED_PENSION_RULES: UkSelfEmployedPensionRules = {
  taxYear: "2026/27",
  basicAmountGbp: 3_600,
  class2SmallProfitsThresholdGbp: 7_105,
  class2VoluntaryWeeklyGbp: 3.65,
  checkedOn: "2026-11-25",
  checkedBy: "fable-decider",
  sources: {
    taxRelief: "https://www.gov.uk/tax-on-your-private-pension/pension-tax-relief",
    nationalInsurance: "https://www.gov.uk/self-employed-national-insurance-rates",
  },
};
