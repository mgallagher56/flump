/**
 * High Income Child Benefit Charge (E25-T3), individual basis only.
 *
 * The claimant is taken to be the higher earner, so the charge depends on their own adjusted net
 * income. No household (partner) comparison is made. The charge is 1% of the Child Benefit received
 * for every full step of adjusted net income over the threshold (GBP100 up to 2023/24, GBP200 from
 * 2024/25), the percentage is floored to a whole per cent and capped at 100%.
 *
 * Child Benefit is weekly rate x `weeksPerYear` (52, pending the owner ruling on 52 or 53 Mondays).
 * Figures are UNVERIFIED until the owner signs off the `hicbc` vectors.
 */

import { roundPence, type UkTaxYearRules } from "./uk-tax-year.js";

export interface HicbcResult {
  /** Annual Child Benefit before the charge (weekly rate x weeks), pence-rounded. */
  childBenefitAnnual: number;
  /** Whole per cent of Child Benefit charged, 0 to 100. */
  chargePercent: number;
  /** The charge itself, pence-rounded. */
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
  const chargePercent = calculateHicbcPercent(adjustedNetIncome, rules);
  const charge = roundPence((benefit * chargePercent) / 100);
  return {
    childBenefitAnnual: benefit,
    chargePercent,
    charge,
    netChildBenefit: roundPence(benefit - charge),
  };
}
