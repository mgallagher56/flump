import { z } from "zod";
import { IsoDateTime, Uuid } from "../primitives.js";

/**
 * Invite links for the invite-only beta. The owner (an admin listed in `BETA_ADMIN_USER_IDS`)
 * creates a link, sends it however they like, and whoever opens it and signs in becomes a member.
 * No email is sent or stored. The raw token is shown once, in the create response, and only its
 * SHA-256 hash is kept.
 */

/** The longest label an admin may type to remember who an invite was for. */
export const BETA_INVITE_LABEL_MAX = 60;

/** How long an unused invite link works. */
export const BETA_INVITE_TTL_DAYS = 14;

/** A raw invite token: 32 random bytes, base64url without padding (43 characters). */
export const BetaInviteToken = z.string().regex(/^[A-Za-z0-9_-]{43}$/);

/** POST /beta/invites/redeem */
export const RedeemBetaInviteRequest = z.strictObject({
  token: BetaInviteToken,
});
export type RedeemBetaInviteRequest = z.infer<typeof RedeemBetaInviteRequest>;

/**
 * POST /beta/invites/redeem. `joined`: the caller is now a member. `already-member`: nothing
 * changed and the link was not used up. Any unusable link (used, cancelled, expired, unknown) is
 * one 410 `invite_unusable` that does not say which.
 */
export const RedeemBetaInviteResponse = z.strictObject({
  status: z.enum(["joined", "already-member"]),
});
export type RedeemBetaInviteResponse = z.infer<typeof RedeemBetaInviteResponse>;

/** POST /beta/admin/invites */
export const CreateBetaInviteRequest = z.strictObject({
  label: z.string().trim().max(BETA_INVITE_LABEL_MAX).optional(),
});
export type CreateBetaInviteRequest = z.infer<typeof CreateBetaInviteRequest>;

/** POST /beta/admin/invites: the only response that carries the raw token, shown once. */
export const CreateBetaInviteResponse = z.strictObject({
  id: Uuid,
  token: BetaInviteToken,
  label: z.string().nullable(),
  createdAt: IsoDateTime,
  expiresAt: IsoDateTime,
});
export type CreateBetaInviteResponse = z.infer<typeof CreateBetaInviteResponse>;

export const BetaInviteStatus = z.enum(["unused", "used", "expired", "cancelled"]);
export type BetaInviteStatus = z.infer<typeof BetaInviteStatus>;

/** One invite in the admin list. Never the token or its hash, never who used it. */
export const BetaInviteDto = z.strictObject({
  id: Uuid,
  label: z.string().nullable(),
  status: BetaInviteStatus,
  createdAt: IsoDateTime,
  expiresAt: IsoDateTime,
  usedAt: IsoDateTime.nullable(),
});
export type BetaInviteDto = z.infer<typeof BetaInviteDto>;

/**
 * GET /beta/admin/invites: unused invites and those used, expired or cancelled in the last 30 days
 * (older ones are deleted by retention), newest first. Bounded, so not paged.
 */
export const BetaInviteListResponse = z.strictObject({
  invites: z.array(BetaInviteDto),
});
export type BetaInviteListResponse = z.infer<typeof BetaInviteListResponse>;

/** One person with access through an invite. Never an email. */
export const BetaMemberDto = z.strictObject({
  userId: z.string().min(1),
  /** The label of the invite they used, if it had one. */
  label: z.string().nullable(),
  addedAt: IsoDateTime,
});
export type BetaMemberDto = z.infer<typeof BetaMemberDto>;

/** GET /beta/admin/members: active members, newest first. */
export const BetaMemberListResponse = z.strictObject({
  members: z.array(BetaMemberDto),
});
export type BetaMemberListResponse = z.infer<typeof BetaMemberListResponse>;

/** GET /beta/admin: 200 for an admin, the same 404 as an unknown route for anyone else. */
export const BetaAdminStatusResponse = z.strictObject({
  admin: z.literal(true),
});
export type BetaAdminStatusResponse = z.infer<typeof BetaAdminStatusResponse>;

/** DELETE /beta/admin/invites/:id and DELETE /beta/admin/members/:userId */
export const BetaAdminDeleteResponse = z.strictObject({
  success: z.literal(true),
});
export type BetaAdminDeleteResponse = z.infer<typeof BetaAdminDeleteResponse>;

export const BetaMemberParams = z.strictObject({ userId: z.string().min(1).max(128) });
