/**
 * Shared by the Pension page's contribution scenario and the Retirement planner, so both what-if
 * sliders offer the same range.
 */

/** Highest contribution the what-if sliders offer, as a percentage of pay. */
export const MAX_CONTRIBUTION_PERCENT = 40;

/** Helper text under a what-if contribution slider once it has been moved. */
export const CONTRIBUTION_EDITED_TEXT = "Edited. Not saved.";

/** Shown wherever a pension answer has not been given (owner decision 3). Never 0 or 5%. */
export const NOT_SET = "Not set";

/**
 * A saved pension rate as the user gave it, or null when it was never answered. The profile
 * stores null for an unanswered rate (owner decision 3), so a stored 5 and 3 is the user's own
 * choice like any other value.
 */
export const savedPensionRate = (value: number | null | undefined): number | null =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;

/**
 * How a contribution is entered or shown. The profile stores the percentage only; pounds a month
 * are worked out from it and the saved salary by the finance engine
 * (`contributionMonthlyFromPercent`, `contributionPercentFromMonthly`).
 */
export type ContributionUnit = "percent" | "monthly";

/** The one switch between the two forms (the shared Tabs), on the Profile tab. */
export const CONTRIBUTION_UNIT_LABEL = "Enter pension contributions as";
export const CONTRIBUTION_UNIT_ITEMS: { value: ContributionUnit; label: string }[] = [
  { value: "percent", label: "% of salary" },
  { value: "monthly", label: "£ a month" },
];

/** Why "£ a month" is off: pounds turn into the stored percentage only with a saved salary. */
export const NO_SALARY_FOR_MONTHLY = "Add your salary to enter pounds a month.";

const percentFormat = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 });

/** "5% of salary", or undefined when the rate is not known. */
export const contributionPercentHint = (percent: number | null | undefined): string | undefined =>
  typeof percent === "number" && Number.isFinite(percent)
    ? `${percentFormat.format(percent)}% of salary`
    : undefined;

/** "About £175 a month", or undefined when the pounds are not known (no salary saved). */
export const contributionMonthlyHint = (
  monthly: number | null | undefined,
  formatPounds: (value: number) => string,
): string | undefined =>
  typeof monthly === "number" && Number.isFinite(monthly)
    ? `About ${formatPounds(monthly)} a month`
    : undefined;

/**
 * The helper under a what-if contribution slider: the pounds a month the rate comes to (left out
 * without a salary), then "Edited. Not saved." once the slider has been moved.
 */
export const contributionSliderHelper = (
  monthly: number | null | undefined,
  edited: boolean,
  formatPounds: (value: number) => string,
): string | undefined => {
  const parts: string[] = [];
  const pounds = contributionMonthlyHint(monthly, formatPounds);
  if (pounds) parts.push(`${pounds}.`);
  if (edited) parts.push(CONTRIBUTION_EDITED_TEXT);
  return parts.length > 0 ? parts.join(" ") : undefined;
};

/**
 * Where the rate is the fact being described: "5% of salary, about £175 a month", or the
 * percentage alone when the pounds are not known (no salary saved) or the rate is 0%.
 */
export const contributionRateText = (
  percent: number,
  monthly: number | null | undefined,
  formatPounds: (value: number) => string,
): string => {
  const rate = `${percentFormat.format(percent)}% of salary`;
  return percent > 0 && typeof monthly === "number" && Number.isFinite(monthly)
    ? `${rate}, about ${formatPounds(monthly)} a month`
    : rate;
};
