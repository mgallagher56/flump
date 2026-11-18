/**
 * The saved profile is the one source of truth for salary and property share. The pre-sign-in
 * baseline (a browser cache from onboarding, possibly stale) is used only when there is no saved
 * profile row at all. Once the profile exists (it has an id), an empty figure is a saved choice:
 * no salary (0) or a whole property (100), never the stale baseline.
 */

/** The profile fields these helpers read; `id` is empty or missing before the profile exists. */
export interface ProfileFigures {
  id?: string | null;
  annualSalary?: unknown;
  propertyOwnershipShare?: unknown;
}

const toFinite = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "string" ? Number.parseFloat(value) : Number(value);
  return Number.isFinite(n) ? n : null;
};

const profileExists = (profile: ProfileFigures | null | undefined): boolean => Boolean(profile?.id);

/** Saved salary; 0 when the profile exists without one; the baseline only with no profile. */
export const salaryProfileFirst = (
  profile: ProfileFigures | null | undefined,
  baselineSalary?: number | null,
): number => {
  const saved = toFinite(profile?.annualSalary);
  if (saved !== null) return saved;
  if (profileExists(profile)) return 0;
  return baselineSalary && baselineSalary > 0 ? baselineSalary : 0;
};

/** Saved share; 100 when the profile exists without one; the baseline only with no profile. */
export const propertyShareProfileFirst = (
  profile: ProfileFigures | null | undefined,
  baselineShare?: number | null,
): number => {
  const saved = toFinite(profile?.propertyOwnershipShare);
  if (saved !== null) return saved;
  if (profileExists(profile)) return 100;
  return typeof baselineShare === "number" && Number.isFinite(baselineShare) ? baselineShare : 100;
};

/**
 * The client profile atom only once it holds this user's saved profile, otherwise the loader's.
 * The atom starts as DEFAULT_PROFILE (empty id, the 5% and 3% creation rates), so on the server
 * render and the first client render, before the seeding effect runs, it must not stand in for
 * the saved figures.
 */
export function seededProfile<A extends { id?: string | null }, L extends { id?: string | null }>(
  atomProfile: A,
  loaderProfile: L | null | undefined,
): A | L {
  if (!loaderProfile) return atomProfile;
  return atomProfile.id && atomProfile.id === loaderProfile.id ? atomProfile : loaderProfile;
}
