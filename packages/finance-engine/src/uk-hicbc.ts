/**
 * High Income Child Benefit Charge (E25-T3), individual basis only.
 *
 * The claimant is taken to be the higher earner, so the charge depends on their own adjusted net
 * income. No household (partner) comparison is made. The charge is 1% of the Child Benefit received
 * for every full step of adjusted net income over the threshold (GBP100 over GBP50,000 up to 2023/24,
 * GBP200 over GBP60,000 from 2024/25), capped at 100%. The step rule is taken from GOV.UK
 * (https://www.gov.uk/child-benefit-tax-charge), because the ITEPA 2003 s.681C(2)(b) formula is an
 * image on legislation.gov.uk.
 *
 * Rounding, ITEPA 2003 s.681C(3) (https://www.legislation.gov.uk/ukpga/2003/1/section/681C): the
 * total Child Benefit is rounded down to whole pounds, the percentage down to a whole number, and the
 * charge down to whole pounds, in that order.
 *
 * Child Benefit is weekly rate x `weeksPerYear` (52; ITEPA s.681H(3) counts a week whose Monday is in
 * the tax year, and some years have 53 Mondays, a ruling still open). Figures are UNVERIFIED until the
 * `hicbc` vectors are signed off.
 */

import { roundPence, type UkTaxYearRules } from "./uk-tax-year.js";

export interface HicbcResult {
  /** Annual Child Benefit before the charge (weekly rate x weeks), pence-rounded. */
  childBenefitAnnual: number;
  /** Whole per cent of Child Benefit charged, 0 to 100. */
  chargePercent: number;
  /** The charge in whole pounds: floor(floor(total) x percentage / 100) (ITEPA s.681C(3)). */
  charge: number;
  /** Child Benefit left after the charge. */
  netChildBenefit: number;
}

/** Annual Child Benefit for a number of children: eldest at the enhanced rate, the rest at the other rate. */
export function calculateChildBenefitAnnual(children: number, rules: UkTaxYearRules): number {
  const count = Number.isFinite(children) ? Math.max(0, Math.floor(children)) : 0;
  if (count === 0) return 0;
  const { eldestWeekly, otherWeekly, weeksPerYear } = rules.hicbc;
  return roundPence((eldestWeekly + (count - 1) * otherWeekly) * weeksPerYear);
}

/** Whole per cent of Child Benefit charged at an adjusted net income. */
export function calculateHicbcPercent(adjustedNetIncome: number, rules: UkTaxYearRules): number {
  const { hicbcThresholdStart, hicbcStepWidth } = rules.hicbc;
  if (!Number.isFinite(adjustedNetIncome) || adjustedNetIncome <= hicbcThresholdStart) return 0;
  const steps = Math.floor((adjustedNetIncome - hicbcThresholdStart) / hicbcStepWidth);
  return Math.min(100, steps);
}

/**
 * High Income Child Benefit Charge on the individual basis.
 * `childBenefitAnnual` is the Child Benefit received over the year (see `calculateChildBenefitAnnual`).
 */
export function calculateHicbc(
  adjustedNetIncome: number,
  childBenefitAnnual: number,
  rules: UkTaxYearRules,
): HicbcResult {
  const benefit = roundPence(
    Math.max(0, Number.isFinite(childBenefitAnnual) ? childBenefitAnnual : 0),
  );
  // ITEPA 2003 s.681C(3): the total Child Benefit, the percentage and the charge are each rounded
  // down to a whole number. Order: total, then percentage, then multiply, then the charge.
  // Integer x integer / 100 is exact enough in floating point for the floor to be right.
  const wholePoundsBenefit = Math.floor(benefit);
  const chargePercent = calculateHicbcPercent(adjustedNetIncome, rules);
  const charge = Math.floor((wholePoundsBenefit * chargePercent) / 100);
  return {
    childBenefitAnnual: benefit,
    chargePercent,
    charge,
    netChildBenefit: roundPence(benefit - charge),
  };
}
