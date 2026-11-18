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
