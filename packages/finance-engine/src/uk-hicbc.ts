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
 * Child Benefit is weekly rate x the Mondays in the tax year (52 or 53, `childBenefitWeeksInTaxYear`,
 * ITEPA s.681H(3)). Figures are UNVERIFIED until the `hicbc` vectors are signed off.
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

const DAY_MS = 86_400_000;

/**
 * Weeks of Child Benefit in a tax year: the Mondays from 6 April to the next 5 April. ITEPA 2003
 * s.681H(3) (https://www.legislation.gov.uk/ukpga/2003/1/section/681H) counts a week in the tax
 * year in which its Monday falls (decider ruling adopted 20 Nov 2026). Worked from the calendar for
 * any year, so 53-week years (2020/21, 2026/27, 2031/32, ...) need no table. The one home of the
 * week count.
 */
export function childBenefitWeeksInTaxYear(year: string): number {
  const m = /^(\d{4})\/(\d{2})$/.exec(year);
  const start = Number(m?.[1]);
  if (!m || (start + 1) % 100 !== Number(m[2])) throw new Error(`not a tax year: ${year}`);
  const first = Date.UTC(start, 3, 6);
  const last = Date.UTC(start + 1, 3, 5);
  // getUTCDay: 0 Sunday, 1 Monday. Days from 6 April to its first Monday on or after it.
  const toMonday = (8 - new Date(first).getUTCDay()) % 7;
  return Math.floor((last - first - toMonday * DAY_MS) / (7 * DAY_MS)) + 1;
}

/**
 * Annual Child Benefit for a number of children: eldest at the enhanced rate, the rest at the other
 * rate, for each week whose Monday falls in the tax year. The engine holds one weekly rate per tax
 * year: Child Benefit is uprated from the first Monday on or after 6 April, so every week that
 * counts in a tax year is paid at that year's rate.
 */
export function calculateChildBenefitAnnual(children: number, rules: UkTaxYearRules): number {
  const count = Number.isFinite(children) ? Math.max(0, Math.floor(children)) : 0;
  if (count === 0) return 0;
  const { eldestWeekly, otherWeekly } = rules.hicbc;
  return roundPence(
    (eldestWeekly + (count - 1) * otherWeekly) * childBenefitWeeksInTaxYear(rules.year),
  );
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
