import { z } from "zod";
import { IsoDateTime, ResponseMoney } from "../primitives.js";
import { AccountType } from "./accounts.js";

/**
 * Households for couples (E34 slice C3, plan docs/audit/plans/E34-shared-finances-research.md).
 *
 * Built and switched off: with the server's household switch off, every route here answers like a
 * route that does not exist (Nest's unknown-route 404). Only the owner turns it on, once the
 * specialist charity's review (CD7), the signed household DPIA and the approved help line wording
 * (CD10) all exist.
 *
 * Two equal people and no administrator (CD4, G6): there is no route to remove the other person,
 * change their settings or delete their data. Either person leaves at once, alone, and Flump tells
 * the other person nothing (CD6, G5). Nothing is shared until its owner shares it (CD1, G2); in
 * this slice the only thing a person can share is their joint accounts, in a read-only summary.
 *
 * Invitations are Flump's own links (CD3, I2): the inviter passes the link on themselves and Flump
 * sends no email. Nothing about the invited person is stored before they accept, and nothing about
 * the inviter (not their name, not a figure) is shown to the invited person (G8).
 */

/**
 * How long an unused invitation link works: 48 hours, replacing the plan's seven days (coordinator,
 * 25 November 2026). A link that grants a shared view should not wait long, and the inviter can
 * make a new one at any time.
 */
export const HOUSEHOLD_INVITATION_TTL_HOURS = 48;

/** A raw invitation token: 32 random bytes, base64url without padding (43 characters). */
export const HouseholdInvitationToken = z.string().regex(/^[A-Za-z0-9_-]{43}$/);

/**
 * The caller's own membership. Never the other person's id, settings or activity (G4), and no join
 * date: the screen does not need one (the person's own export says when they joined).
 */
export const HouseholdMembershipDto = z.strictObject({
  /** Whether the caller shows their joint accounts in the household summary. Off by default. */
  sharesJointSummary: z.boolean(),
  /**
   * Who the household is with, so the accepted state says it at once (coordinator, 25 November
   * 2026): the other member's first name from their own profile, else their display name, else
   * null (the screen then says "the other person"). Nothing else about them.
   */
  withName: z.string().nullable(),
});
export type HouseholdMembershipDto = z.infer<typeof HouseholdMembershipDto>;

/** The caller's own open invitation link. The token itself is shown only once, when made. */
export const HouseholdOpenInvitationDto = z.strictObject({
  expiresAt: IsoDateTime,
});
export type HouseholdOpenInvitationDto = z.infer<typeof HouseholdOpenInvitationDto>;

/**
 * GET /household: the caller's own state. `household` is null when they are in none, which reads
 * the same whether they never joined, left, or the other person left.
 */
export const HouseholdResponse = z.strictObject({
  household: HouseholdMembershipDto.nullable(),
  invitation: HouseholdOpenInvitationDto.nullable(),
});
export type HouseholdResponse = z.infer<typeof HouseholdResponse>;

/** POST /household/invitations takes nothing: no email, name or label of the invited person (G1). */
export const CreateHouseholdInvitationRequest = z.strictObject({});
export type CreateHouseholdInvitationRequest = z.infer<typeof CreateHouseholdInvitationRequest>;

/** POST /household/invitations: the only response that carries the raw token, shown once. */
export const CreateHouseholdInvitationResponse = z.strictObject({
  token: HouseholdInvitationToken,
  expiresAt: IsoDateTime,
});
export type CreateHouseholdInvitationResponse = z.infer<typeof CreateHouseholdInvitationResponse>;

/** POST /household/invitations/preview and /accept */
export const HouseholdInvitationTokenRequest = z.strictObject({
  token: HouseholdInvitationToken,
});
export type HouseholdInvitationTokenRequest = z.infer<typeof HouseholdInvitationTokenRequest>;

/**
 * POST /household/invitations/preview: what joining shares, which is nothing (G8). No inviter
 * name and no figure. Any unusable link (expired, used, cancelled, unknown, your own) is one 410
 * `invite_unusable` that does not say which.
 */
export const HouseholdInvitationPreviewResponse = z.strictObject({
  shares: z.array(z.never()).length(0),
});
export type HouseholdInvitationPreviewResponse = z.infer<typeof HouseholdInvitationPreviewResponse>;

/**
 * POST /household/invitations/accept. 410 `invite_unusable` for any unusable link; 409
 * `already_in_household` when the caller is already in one (their own state, checked first).
 */
export const AcceptHouseholdInvitationResponse = z.strictObject({
  status: z.literal("joined"),
});
export type AcceptHouseholdInvitationResponse = z.infer<typeof AcceptHouseholdInvitationResponse>;

/** PUT /household/sharing: the caller's own choice, never the other person's. */
export const UpdateHouseholdSharingRequest = z.strictObject({
  sharesJointSummary: z.boolean(),
});
export type UpdateHouseholdSharingRequest = z.infer<typeof UpdateHouseholdSharingRequest>;

export const UpdateHouseholdSharingResponse = z.strictObject({
  sharesJointSummary: z.boolean(),
});
export type UpdateHouseholdSharingResponse = z.infer<typeof UpdateHouseholdSharingResponse>;

/** POST /household/leave takes nothing: leaving needs no reason, approval or notice (CD6). */
export const LeaveHouseholdRequest = z.strictObject({});
export type LeaveHouseholdRequest = z.infer<typeof LeaveHouseholdRequest>;

/**
 * DELETE /household/invitations and POST /household/leave: the same answer whether or not there was
 * anything to cancel or leave, so neither says anything about the other person.
 */
export const HouseholdDoneResponse = z.strictObject({
  success: z.literal(true),
});
export type HouseholdDoneResponse = z.infer<typeof HouseholdDoneResponse>;

/**
 * One joint account in the read-only household summary. The whole balance as its owner holds it;
 * no share and no percentage. `addedBy` says whose record it is, so an account both people added
 * is understood when it appears twice (pairing the two copies waits for slice C2).
 */
export const HouseholdJointSummaryItem = z.strictObject({
  name: z.string(),
  type: AccountType,
  wholeBalance: ResponseMoney,
  addedBy: z.enum(["you", "other"]),
});
export type HouseholdJointSummaryItem = z.infer<typeof HouseholdJointSummaryItem>;

/**
 * GET /household/joint-summary: the joint accounts of each member who shares them, the caller
 * included. No total, count or placeholder for anything not shared (G3); 404 when the caller is in
 * no household.
 */
export const HouseholdJointSummaryResponse = z.strictObject({
  items: z.array(HouseholdJointSummaryItem),
});
export type HouseholdJointSummaryResponse = z.infer<typeof HouseholdJointSummaryResponse>;
