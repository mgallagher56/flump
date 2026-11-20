import {
  BETA_INVITE_LABEL_MAX,
  BETA_INVITE_TTL_DAYS,
  type BetaAdminDeleteResponse,
  type BetaInviteDto,
  type BetaInviteListResponse,
  type BetaInviteStatus,
  BetaInviteToken,
  type BetaMemberListResponse,
  type CreateBetaInviteResponse,
  type RedeemBetaInviteResponse,
} from "@flump/api-contract";
import {
  BadRequestException,
  GoneException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { DataSource } from "typeorm";
import { isBetaInviteOnly, isBetaUserAllowedByEnv } from "../auth/beta-access";
import type { AuthenticatedUser } from "../auth/token-verifier";
import { hashInviteToken, newInviteToken } from "./invite-token";

/** How long a closed invite (used, expired or cancelled) stays in the admin list and the table. */
const BETA_INVITE_CLOSED_DAYS = 30;

/**
 * First key of the two-key advisory lock taken per user while redeeming ("BETA" in ASCII), so two
 * links redeemed at once by the same person cannot both be used up.
 */
const REDEEM_LOCK_NAMESPACE = 0x42455441;

/** One 410 for every unusable link (used, cancelled, expired, unknown), saying nothing of which. */
const inviteUnusableException = () =>
  new GoneException({
    statusCode: 410,
    error: "invite_unusable",
    message: "This invite link cannot be used.",
  });

/** `query()` gives rows for SELECT and INSERT, and `[rows, count]` for UPDATE and DELETE. */
const rowsOf = <T>(result: unknown): T[] =>
  Array.isArray(result) && Array.isArray(result[0]) ? (result[0] as T[]) : (result as T[]);

const iso = (value: Date | string): string => new Date(value).toISOString();

/**
 * Invite links for the invite-only beta: redeeming one (any signed-in caller) and the admin's
 * create, list and cancel, plus the member list and removal. Logs carry ids and counts only, never
 * a token, its hash or a label.
 */
@Injectable()
export class BetaInvitesService {
  private readonly logger = new Logger(BetaInvitesService.name);

  constructor(private readonly dataSource: DataSource) {}

  /**
   * Redeems a link for the caller. Already allowed (open beta, admin, env-listed or an active
   * member): `already-member` and the link is left unused. Otherwise, in one transaction, the link
   * is claimed by a single conditional UPDATE (so two people racing for one link cannot both win)
   * and the caller's member row is written or re-activated.
   */
  async redeem(user: AuthenticatedUser, token: string): Promise<RedeemBetaInviteResponse> {
    if (!isBetaInviteOnly(process.env) || isBetaUserAllowedByEnv(process.env, user)) {
      return { status: "already-member" };
    }
    // The contract already checks the shape; an odd token is simply one no link has.
    if (!BetaInviteToken.safeParse(token).success) {
      this.logger.warn("beta_invite_redeem_refused reason=unusable");
      throw inviteUnusableException();
    }
    const tokenHash = hashInviteToken(token);
    const outcome = await this.dataSource.transaction(async (m) => {
      await m.query("SELECT pg_advisory_xact_lock($1, hashtext($2))", [
        REDEEM_LOCK_NAMESPACE,
        user.id,
      ]);
      const existing = rowsOf<{ active: boolean }>(
        await m.query(
          `SELECT ("removed_at" IS NULL) AS "active" FROM "beta_members" WHERE "user_id" = $1`,
          [user.id],
        ),
      );
      if (existing[0]?.active) return { status: "already-member" as const };
      const claimed = rowsOf<{ id: string }>(
        await m.query(
          `UPDATE "beta_invites" SET "redeemed_by_user_id" = $1, "redeemed_at" = now()
           WHERE "token_hash" = $2 AND "redeemed_at" IS NULL AND "revoked_at" IS NULL
             AND "expires_at" > now()
           RETURNING "id"`,
          [user.id, tokenHash],
        ),
      );
      const inviteId = claimed[0]?.id;
      if (!inviteId) return { status: "unusable" as const };
      // A removed member joins again with the new link: same row, re-activated.
      await m.query(
        `INSERT INTO "beta_members" ("user_id", "invite_id", "added_at", "removed_at")
         VALUES ($1, $2, now(), NULL)
         ON CONFLICT ("user_id") DO UPDATE
           SET "invite_id" = EXCLUDED."invite_id", "added_at" = EXCLUDED."added_at",
               "removed_at" = NULL`,
        [user.id, inviteId],
      );
      return { status: "joined" as const, inviteId };
    });
    if (outcome.status === "unusable") {
      this.logger.warn("beta_invite_redeem_refused reason=unusable");
      throw inviteUnusableException();
    }
    if (outcome.status === "joined") {
      this.logger.log(`beta_invite_redeemed inviteId=${outcome.inviteId}`);
      return { status: "joined" };
    }
    return { status: "already-member" };
  }

  /** A new link: the raw token is returned here once and never stored. */
  async createInvite(adminId: string, rawLabel?: unknown): Promise<CreateBetaInviteResponse> {
    const label = normaliseLabel(rawLabel);
    const token = newInviteToken();
    const rows = rowsOf<{ id: string; label: string | null; created_at: Date; expires_at: Date }>(
      await this.dataSource.query(
        `INSERT INTO "beta_invites" ("token_hash", "label", "created_by", "expires_at")
         VALUES ($1, $2, $3, now() + make_interval(days => $4))
         RETURNING "id", "label", "created_at", "expires_at"`,
        [hashInviteToken(token), label, adminId, BETA_INVITE_TTL_DAYS],
      ),
    );
    const row = rows[0];
    if (!row) throw new Error("beta invite insert returned no row");
    this.logger.log(`beta_invite_created inviteId=${row.id}`);
    return {
      id: row.id,
      token,
      label: row.label,
      createdAt: iso(row.created_at),
      expiresAt: iso(row.expires_at),
    };
  }

  /**
   * Unused links and those closed (used, expired or cancelled) in the last 30 days, newest first.
   * A link's closing time is when it was cancelled, used or expired, whichever applies.
   */
  async listInvites(): Promise<BetaInviteListResponse> {
    const rows = rowsOf<{
      id: string;
      label: string | null;
      status: BetaInviteStatus;
      created_at: Date;
      expires_at: Date;
      redeemed_at: Date | null;
    }>(
      await this.dataSource.query(
        `SELECT "id", "label", "created_at", "expires_at", "redeemed_at",
                CASE WHEN "revoked_at" IS NOT NULL THEN 'cancelled'
                     WHEN "redeemed_at" IS NOT NULL THEN 'used'
                     WHEN "expires_at" <= now() THEN 'expired'
                     ELSE 'unused' END AS "status"
         FROM "beta_invites"
         WHERE COALESCE("revoked_at", "redeemed_at", "expires_at")
               > now() - make_interval(days => $1)
         ORDER BY "created_at" DESC, "id" DESC`,
        [BETA_INVITE_CLOSED_DAYS],
      ),
    );
    const invites: BetaInviteDto[] = rows.map((r) => ({
      id: r.id,
      label: r.label,
      status: r.status,
      createdAt: iso(r.created_at),
      expiresAt: iso(r.expires_at),
      usedAt: r.redeemed_at ? iso(r.redeemed_at) : null,
    }));
    return { invites };
  }

  /** Cancels an unused link. Used, expired, cancelled or unknown: the same 404. */
  async cancelInvite(id: string): Promise<BetaAdminDeleteResponse> {
    const rows = rowsOf<{ id: string }>(
      await this.dataSource.query(
        `UPDATE "beta_invites" SET "revoked_at" = now()
         WHERE "id" = $1 AND "redeemed_at" IS NULL AND "revoked_at" IS NULL
           AND "expires_at" > now()
         RETURNING "id"`,
        [id],
      ),
    );
    if (rows.length === 0) throw new NotFoundException("Invite not found.");
    this.logger.log(`beta_invite_cancelled inviteId=${id}`);
    return { success: true };
  }

  /** Active members, newest first, with the label of the link they used. */
  async listMembers(): Promise<BetaMemberListResponse> {
    const rows = rowsOf<{ user_id: string; label: string | null; added_at: Date }>(
      await this.dataSource.query(
        `SELECT m."user_id", i."label", m."added_at"
         FROM "beta_members" m LEFT JOIN "beta_invites" i ON i."id" = m."invite_id"
         WHERE m."removed_at" IS NULL
         ORDER BY m."added_at" DESC, m."user_id" ASC`,
      ),
    );
    return {
      members: rows.map((r) => ({ userId: r.user_id, label: r.label, addedAt: iso(r.added_at) })),
    };
  }

  /**
   * Removes a member (soft: removed_at). Their next request and their AI connection tokens are
   * refused at once. No active member with that id: 404.
   */
  async removeMember(userId: string): Promise<BetaAdminDeleteResponse> {
    const rows = rowsOf<{ user_id: string }>(
      await this.dataSource.query(
        `UPDATE "beta_members" SET "removed_at" = now()
         WHERE "user_id" = $1 AND "removed_at" IS NULL
         RETURNING "user_id"`,
        [userId],
      ),
    );
    if (rows.length === 0) throw new NotFoundException("Member not found.");
    this.logger.log("beta_member_removed count=1");
    return { success: true };
  }
}

/** Trimmed; empty is no label. Longer than 60 characters or with control characters: 400. */
function normaliseLabel(raw: unknown): string | null {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== "string") throw new BadRequestException("Label must be text.");
  const label = raw.normalize("NFC").trim();
  if (label.length === 0) return null;
  if (label.length > BETA_INVITE_LABEL_MAX) {
    throw new BadRequestException(`Label must be ${BETA_INVITE_LABEL_MAX} characters or fewer.`);
  }
  if (/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u.test(label)) {
    throw new BadRequestException("Label must not contain control or invisible characters.");
  }
  return label;
}
