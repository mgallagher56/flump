import type { HouseholdJointSummaryItem, HouseholdResponse } from "@flump/api-contract";

/**
 * Households (E34 C3), behind the server's household switch. The web never holds a flag of its
 * own: the Settings tab and the join pages exist only when the backend answers GET /household, and
 * a 404 or any other failure means no tab and the ordinary "We cannot find that page" (fail closed).
 */

/** What the settings loader hands the Household tab. Null in the loader means no tab at all. */
export interface HouseholdSettingsData {
  state: HouseholdResponse;
  /** The read-only joint summary; null when the person is in no household or it could not be read. */
  jointSummary: HouseholdJointSummaryItem[] | null;
}

/** The settings route action's household intents. */
export const HOUSEHOLD_INTENT = {
  createLink: "household-create-link",
  cancelLink: "household-cancel-link",
  sharing: "household-sharing",
  leave: "household-leave",
} as const;
export type HouseholdIntent = (typeof HOUSEHOLD_INTENT)[keyof typeof HOUSEHOLD_INTENT];

export const isHouseholdIntent = (value: unknown): value is HouseholdIntent =>
  Object.values(HOUSEHOLD_INTENT).includes(value as HouseholdIntent);

export type HouseholdActionData =
  | { intent: typeof HOUSEHOLD_INTENT.createLink; link: string; expiresAt: string }
  | { intent: typeof HOUSEHOLD_INTENT.cancelLink | typeof HOUSEHOLD_INTENT.leave; success: true }
  | { intent: typeof HOUSEHOLD_INTENT.sharing; sharesJointSummary: boolean }
  | { success: false; error: string };

/** One message for every unusable link (expired, used, cancelled, unknown, your own): 410. */
export const INVITE_UNUSABLE_MESSAGE =
  "This invitation link cannot be used. If you still want to join, ask for a new link.";

/** 409 `already_in_household`. */
export const ALREADY_IN_HOUSEHOLD_MESSAGE =
  "You are already in a household. To join a different one, leave your current household first.";

/** 429 on preview or accept. */
export const JOIN_BUSY_MESSAGE =
  "We could not check this link right now. Wait a few minutes, then open it again.";
