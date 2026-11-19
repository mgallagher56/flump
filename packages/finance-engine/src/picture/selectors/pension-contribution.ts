import type { ProfileFacts } from "../input.js";

/**
 * The employee's own pension contribution a month, estimated from the saved salary and pension
 * percentage: round(salary x percent / 100 / 12) to whole pounds. Null when the salary is not
 * set (or is 0) or the percentage is not set. The Dashboard's figure, moved here unchanged.
 */
export function selectPensionContributionMonthly(
  facts: Pick<ProfileFacts, "annualSalary" | "pensionPercent">,
): number | null {
  const { annualSalary, pensionPercent } = facts;
  if (!annualSalary || pensionPercent === null) return null;
  return Math.round((annualSalary * pensionPercent) / 100 / 12);
}
