/**
 * The household switch (E34 slice C3). Households, household invitations, "What I share" and the
 * shared joint summary are built, and stay switched off.
 *
 * The switch is `HOUSEHOLD_ENABLED`. Only the exact value `true` turns it on; unset, empty or any
 * other value is off, in every environment (production, Railway, local and tests). With it off,
 * every household route answers like a route that does not exist, the web shows no entry point, no
 * invitation can be created or accepted and AI connections see nothing new.
 *
 * Only the owner turns it on, and only once all three of these exist (owner ruling, 25 November
 * 2026, "Build it gated now"; plan docs/audit/plans/E34-shared-finances-research.md):
 * 1. The specialist charity's review of the safety design (decision CD7).
 * 2. The owner's signature on the household DPIA (docs/legal/dpia-household.md).
 * 3. The owner's approval of the help line wording on the sharing screen (decision CD10).
 *
 * Before turning it on, the public cookies page and the privacy notice must list the household
 * invitation cookie `flump_household_invite` (and the notice the household itself), and the
 * cookie's `NOT_LISTED` entry in apps/marketing/src/pages/CookiesPage/CookiesPage.test.tsx is
 * removed in the same change.
 *
 * A production-like process (NODE_ENV=production or Railway) refuses to boot with the switch on
 * while `HOUSEHOLD_LAUNCH_CONDITIONS_MET` is false (HouseholdGateError in boot-guards.ts). The owner
 * sets the constant to true in a PR of their own once the three conditions are met, then sets the
 * variable. `bun scripts/check-household-gate.ts` (in check:laws) fails if the switch's default
 * becomes on or if any checked-in configuration turns it on.
 */
export const HOUSEHOLD_LAUNCH_CONDITIONS_MET = false;

/** The three conditions, for the boot guard's message and the check. */
export const HOUSEHOLD_LAUNCH_CONDITIONS = [
  "the specialist charity's review (CD7)",
  "the owner's signature on the household DPIA",
  "the owner's approval of the help line wording (CD10)",
] as const;

/** True only for `HOUSEHOLD_ENABLED=true` (trimmed, any case). Everything else is off. */
export function isHouseholdEnabled(env: Record<string, string | undefined>): boolean {
  return env.HOUSEHOLD_ENABLED?.trim().toLowerCase() === "true";
}
