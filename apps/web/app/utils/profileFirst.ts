/**
 * The saved profile is the one source of truth for salary (audit slice 8: no browser copy stands
 * in for it). An empty salary is not known (null), never shown as £0. A saved salary of 0 is a
 * real value. The share of a rental property comes from its account (owner decision 6).
 */

/** The profile fields these helpers read. */
export interface ProfileFigures {
  id?: string | null;
  annualSalary?: unknown;
}

const toFinite = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "string" ? Number.parseFloat(value) : Number(value);
  return Number.isFinite(n) ? n : null;
};

/**
 * Saved salary, including a saved 0. Null when it is not known, so pages show their "add your
 * salary" prompt rather than £0.
 */
export const salaryProfileFirst = (profile: ProfileFigures | null | undefined): number | null =>
  toFinite(profile?.annualSalary);
