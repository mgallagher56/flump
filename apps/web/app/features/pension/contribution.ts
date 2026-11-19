/**
 * Shared by the Pension page's contribution scenario and the Retirement planner, so both what-if
 * sliders offer the same range.
 */

/** Highest contribution the what-if sliders offer, as a percentage of pay. */
export const MAX_CONTRIBUTION_PERCENT = 40;

/** Helper text under a what-if contribution slider once it has been moved. */
export const CONTRIBUTION_EDITED_TEXT = "Edited. Not saved.";

/** The rates the backend gives a new profile row: the auto-enrolment minimums. */
export const CREATION_DEFAULT_PENSION_PERCENT = 5;
export const CREATION_DEFAULT_EMPLOYER_PERCENT = 3;

/**
 * True when the saved pension rates are still exactly the 5% and 3% the backend creates the
 * profile row with, so they are treated as a default the user may never have chosen. Shared by
 * the Pension page and the Profile tab so both read "Not set" in the same case.
 */
export const pensionRatesAssumed = (profile: {
  pensionPercent?: number | null;
  pensionEmployerPercent?: number | null;
}): boolean =>
  profile.pensionPercent === CREATION_DEFAULT_PENSION_PERCENT &&
  profile.pensionEmployerPercent === CREATION_DEFAULT_EMPLOYER_PERCENT;

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
