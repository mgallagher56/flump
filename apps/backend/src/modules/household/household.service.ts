import {
  type AcceptHouseholdInvitationResponse,
  type CreateHouseholdInvitationResponse,
  HOUSEHOLD_INVITATION_TTL_HOURS,
  type HouseholdDoneResponse,
  type HouseholdInvitationPreviewResponse,
  HouseholdInvitationToken,
  type HouseholdJointSummaryItem,
  type HouseholdJointSummaryResponse,
  type HouseholdResponse,
  type UpdateHouseholdSharingResponse,
} from "@flump/api-contract";
import { selectJointSummaryItems } from "@flump/finance-engine";
import {
  ConflictException,
  GoneException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { DataSource, type EntityManager } from "typeorm";
import { hashInviteToken, newInviteToken } from "../../beta/invite-token";
import { isHouseholdEnabled } from "../../config/household-gate";
import { AccountDeletionService } from "../privacy/account-deletion.service";
import { leaveHousehold } from "../privacy/household-leave";
import { lockUserDataShared } from "../privacy/user-data-lock";
import { jointSummarySourceUserIds } from "./household-visibility";

/**
 * First key of the two-key advisory lock taken per person while their household state changes
 * ("HOUS" in ASCII): creating a link, accepting one (both people, in sorted order) and leaving.
 */
const HOUSEHOLD_LOCK_NAMESPACE = 0x484f5553;

/** One 410 for every unusable link, saying nothing of why (G8). */
const householdInviteUnusable = () =>
  new GoneException({
    statusCode: 410,
    error: "invite_unusable",
    message: "This invitation link cannot be used.",
  });

/** The caller is already in a household: their own state, so it tells them nothing new. */
const alreadyInHousehold = () =>
  new ConflictException({
    statusCode: 409,
    error: "already_in_household",
    message: "You are already in a household.",
  });

/** The caller is in no household (not the switch's 404: that one is the unknown-route answer). */
const householdNotFound = () =>
  new NotFoundException({
    statusCode: 404,
    error: "household_not_found",
    message: "You are not in a household.",
  });

/** The switch is off: the same answer as a route that does not exist. Defence in depth only. */
const switchedOff = () => new NotFoundException("Not found");

/** Thrown inside the accept transaction to roll it back, so the link is not used up. */
class AcceptRefused extends Error {
  constructor(readonly outcome: "unusable" | "already-in-household") {
    super(outcome);
  }
}

/** `query()` gives rows for SELECT and INSERT, and `[rows, count]` for UPDATE and DELETE. */
const rowsOf = <T>(result: unknown): T[] =>
  Array.isArray(result) && Array.isArray(result[0]) ? (result[0] as T[]) : (result as T[]);

const iso = (value: Date | string): string => new Date(value).toISOString();

const PG_UNIQUE_VIOLATION = "23505";
const isUniqueViolation = (err: unknown): boolean =>
  typeof err === "object" &&
  err !== null &&
  ((err as { code?: unknown }).code === PG_UNIQUE_VIOLATION ||
    (err as { driverError?: { code?: unknown } }).driverError?.code === PG_UNIQUE_VIOLATION);

/**
 * Households for couples (E34 C3), behind the household switch. Two equal people, no administrator:
 * nothing here changes the other person's settings or reads anything of theirs except the joint
 * accounts they chose to share, and their first name. Every method refuses while the switch is off
 * (the routes' middleware already answers first); erasure and export run whatever the switch says
 * and live in the privacy module.
 *
 * Logs carry event names and counts only: never a token, its hash or a user id.
 */
@Injectable()
export class HouseholdService {
  private readonly logger = new Logger(HouseholdService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly deletion: AccountDeletionService,
  ) {}

  private assertEnabled(): void {
    if (!isHouseholdEnabled(process.env)) throw switchedOff();
  }

  /** The two-key advisory lock on each person's household state, in sorted order. */
  private async lockHouseholdState(m: EntityManager, userIds: string[]): Promise<void> {
    for (const id of [...new Set(userIds)].sort()) {
      await m.query("SELECT pg_advisory_xact_lock($1, hashtext($2))", [
        HOUSEHOLD_LOCK_NAMESPACE,
        id,
      ]);
    }
  }

  private async isMember(m: EntityManager | DataSource, userId: string): Promise<boolean> {
    const rows: unknown[] = await m.query(
      `SELECT 1 FROM "household_members" WHERE "user_id" = $1`,
      [userId],
    );
    return rows.length > 0;
  }

  /**
   * The caller's own state. `withName` is the other member's first name from their own profile,
   * else their display name, else null; nothing else about them (coordinator ruling, 25 Nov 2026).
   */
  async get(userId: string): Promise<HouseholdResponse> {
    this.assertEnabled();
    const members: Array<{
      household_id: string;
      shares_joint_summary: boolean;
      joined_at: Date;
    }> = await this.dataSource.query(
      `SELECT "household_id", "shares_joint_summary", "joined_at"
       FROM "household_members" WHERE "user_id" = $1`,
      [userId],
    );
    const invitations: Array<{ expires_at: Date }> = await this.dataSource.query(
      `SELECT "expires_at" FROM "household_invitations"
       WHERE "inviter_user_id" = $1 AND "expires_at" > now()`,
      [userId],
    );
    const member = members[0];
    let household: HouseholdResponse["household"] = null;
    if (member) {
      const names: Array<{ name: string | null }> = await this.dataSource.query(
        `SELECT COALESCE(NULLIF(btrim(p."first_name"), ''), NULLIF(btrim(p."display_name"), '')) AS "name"
         FROM "household_members" o
         LEFT JOIN "user_profiles" p ON p."user_id" = o."user_id"
         WHERE o."household_id" = $1 AND o."user_id" <> $2`,
        [member.household_id, userId],
      );
      household = {
        sharesJointSummary: member.shares_joint_summary === true,
        joinedAt: iso(member.joined_at),
        withName: names[0]?.name ?? null,
      };
    }
    const invitation = invitations[0];
    return {
      household,
      invitation: invitation ? { expiresAt: iso(invitation.expires_at) } : null,
    };
  }

  /**
   * A new link, replacing the caller's previous one. The raw token is returned here once and never
   * stored or logged: only its SHA-256 hash is kept. 409 when the caller is already in a household.
   */
  async createInvitation(userId: string): Promise<CreateHouseholdInvitationResponse> {
    this.assertEnabled();
    const token = newInviteToken();
    const expiresAt = await this.dataSource.transaction(async (m) => {
      await lockUserDataShared(m, userId);
      await this.lockHouseholdState(m, [userId]);
      if (await this.isMember(m, userId)) throw alreadyInHousehold();
      const rows = rowsOf<{ expires_at: Date }>(
        await m.query(
          `INSERT INTO "household_invitations" ("token_hash", "inviter_user_id", "expires_at")
           VALUES ($1, $2, now() + make_interval(hours => $3))
           ON CONFLICT ("inviter_user_id") DO UPDATE
             SET "token_hash" = EXCLUDED."token_hash", "created_at" = now(),
                 "expires_at" = EXCLUDED."expires_at"
           RETURNING "expires_at"`,
          [hashInviteToken(token), userId, HOUSEHOLD_INVITATION_TTL_HOURS],
        ),
      );
      const row = rows[0];
      if (!row) throw new Error("household invitation insert returned no row");
      return row.expires_at;
    });
    this.logger.log("household_invitation_created");
    return { token, expiresAt: iso(expiresAt) };
  }

  /** Cancels the caller's open link. The same answer whether or not there was one. */
  async cancelInvitation(userId: string): Promise<HouseholdDoneResponse> {
    this.assertEnabled();
    await this.dataSource.transaction(async (m) => {
      await lockUserDataShared(m, userId);
      await this.lockHouseholdState(m, [userId]);
      await m.query(`DELETE FROM "household_invitations" WHERE "inviter_user_id" = $1`, [userId]);
    });
    return { success: true };
  }

  /**
   * The usable link's inviter, or null for any unusable one: malformed, unknown, expired, the
   * caller's own, an erased inviter, or an inviter now in a household.
   */
  private async usableInviter(
    m: EntityManager,
    callerId: string,
    tokenHash: string,
  ): Promise<string | null> {
    const rows: Array<{ inviter_user_id: string }> = await m.query(
      `SELECT "inviter_user_id" FROM "household_invitations"
       WHERE "token_hash" = $1 AND "expires_at" > now() AND "inviter_user_id" <> $2`,
      [tokenHash, callerId],
    );
    const inviter = rows[0]?.inviter_user_id;
    if (!inviter) return null;
    if (await this.deletion.isErasedForWrite(inviter, m)) return null;
    if (await this.isMember(m, inviter)) return null;
    return inviter;
  }

  /**
   * What joining shares: nothing (G8). The same checks as accepting, without using the link up.
   * No inviter name and no figure.
   */
  async previewInvitation(
    userId: string,
    token: unknown,
  ): Promise<HouseholdInvitationPreviewResponse> {
    this.assertEnabled();
    if (await this.isMember(this.dataSource, userId)) throw alreadyInHousehold();
    if (!HouseholdInvitationToken.safeParse(token).success) {
      this.logger.warn("household_invitation_preview_refused reason=unusable");
      throw householdInviteUnusable();
    }
    const inviter = await this.dataSource.transaction((m) =>
      this.usableInviter(m, userId, hashInviteToken(token as string)),
    );
    if (!inviter) {
      this.logger.warn("household_invitation_preview_refused reason=unusable");
      throw householdInviteUnusable();
    }
    return { shares: [] };
  }

  /**
   * Accepts a link: single use, bound to the accepting account by the membership row. The caller's
   * own state is checked first (409), before any token lookup, so the answer is no oracle. Then, in
   * one transaction: the shared user-data lock on both people in sorted order (so an erasure of
   * either serialises with this), the link claimed by one conditional DELETE (so two people racing
   * for one link cannot both win), the inviter checked (not erased, not in a household), the
   * household and both member rows (sharing off for both, G2) written, and the caller's own open
   * link removed. Any refusal or unique violation rolls the whole transaction back, so the link is
   * not used up by a refused attempt.
   */
  async acceptInvitation(
    userId: string,
    token: unknown,
  ): Promise<AcceptHouseholdInvitationResponse> {
    this.assertEnabled();
    if (await this.isMember(this.dataSource, userId)) throw alreadyInHousehold();
    if (!HouseholdInvitationToken.safeParse(token).success) {
      this.logger.warn("household_invitation_accept_refused reason=unusable");
      throw householdInviteUnusable();
    }
    const tokenHash = hashInviteToken(token as string);
    try {
      await this.dataSource.transaction(async (m) => {
        const found: Array<{ inviter_user_id: string }> = await m.query(
          `SELECT "inviter_user_id" FROM "household_invitations" WHERE "token_hash" = $1`,
          [tokenHash],
        );
        const inviter = found[0]?.inviter_user_id;
        if (!inviter || inviter === userId) throw new AcceptRefused("unusable");
        for (const id of [inviter, userId].sort()) await lockUserDataShared(m, id);
        await this.lockHouseholdState(m, [inviter, userId]);
        if (await this.isMember(m, userId)) throw new AcceptRefused("already-in-household");
        const claimed: Array<{ inviter_user_id: string }> = rowsOf(
          await m.query(
            `DELETE FROM "household_invitations"
             WHERE "token_hash" = $1 AND "expires_at" > now() AND "inviter_user_id" <> $2
             RETURNING "inviter_user_id"`,
            [tokenHash, userId],
          ),
        );
        if (claimed[0]?.inviter_user_id !== inviter) throw new AcceptRefused("unusable");
        if (await this.deletion.isErasedForWrite(inviter, m)) throw new AcceptRefused("unusable");
        if (await this.isMember(m, inviter)) throw new AcceptRefused("unusable");
        const households = rowsOf<{ id: string }>(
          await m.query(`INSERT INTO "households" DEFAULT VALUES RETURNING "id"`),
        );
        const householdId = households[0]?.id;
        if (!householdId) throw new Error("household insert returned no row");
        await m.query(
          `INSERT INTO "household_members" ("household_id", "user_id", "slot", "shares_joint_summary")
           VALUES ($1, $2, 1, false), ($1, $3, 2, false)`,
          [householdId, inviter, userId],
        );
        await m.query(`DELETE FROM "household_invitations" WHERE "inviter_user_id" = $1`, [userId]);
      });
    } catch (err) {
      if (err instanceof AcceptRefused) {
        this.logger.warn(`household_invitation_accept_refused reason=${err.outcome}`);
        throw err.outcome === "already-in-household"
          ? alreadyInHousehold()
          : householdInviteUnusable();
      }
      if (isUniqueViolation(err)) {
        this.logger.warn("household_invitation_accept_refused reason=conflict");
        if (await this.isMember(this.dataSource, userId)) throw alreadyInHousehold();
        throw householdInviteUnusable();
      }
      throw err;
    }
    this.logger.log("household_invitation_accepted");
    return { status: "joined" };
  }

  /** The caller's own sharing choice; never the other person's. 404 when in no household. */
  async updateSharing(
    userId: string,
    sharesJointSummary: boolean,
  ): Promise<UpdateHouseholdSharingResponse> {
    this.assertEnabled();
    const rows = await this.dataSource.transaction(async (m) => {
      await lockUserDataShared(m, userId);
      return rowsOf<{ shares_joint_summary: boolean }>(
        await m.query(
          `UPDATE "household_members" SET "shares_joint_summary" = $2
           WHERE "user_id" = $1 RETURNING "shares_joint_summary"`,
          [userId, sharesJointSummary === true],
        ),
      );
    });
    const row = rows[0];
    if (!row) throw householdNotFound();
    return { sharesJointSummary: row.shares_joint_summary === true };
  }

  /**
   * Leave at once, alone: the household closes and the caller's open link goes. No approval, no
   * notice, no message (CD6, G5). The same answer whether or not there was anything to leave.
   */
  async leave(userId: string): Promise<HouseholdDoneResponse> {
    this.assertEnabled();
    await this.dataSource.transaction(async (m) => {
      await lockUserDataShared(m, userId);
      await this.lockHouseholdState(m, [userId]);
      await leaveHousehold(m, userId);
    });
    return { success: true };
  }

  /**
   * The read-only joint summary: the joint accounts of each member who shares them, the caller
   * included, whole balances, no total (selectJointSummaryItems). Who may be read is decided by
   * jointSummarySourceUserIds alone; the accounts query rechecks the membership and the sharing
   * choice in the same statement, so someone who left a moment ago is not read.
   */
  async jointSummary(userId: string): Promise<HouseholdJointSummaryResponse> {
    this.assertEnabled();
    const visible = await jointSummarySourceUserIds(this.dataSource.manager, userId);
    if (!visible) throw householdNotFound();
    const ids = visible.members.map((m) => m.userId);
    const accounts: Array<{
      user_id: string;
      name: string;
      type: string;
      balance: string | number;
      ownership: string;
      account_subtype: string | null;
    }> =
      ids.length === 0
        ? []
        : await this.dataSource.query(
            `SELECT a."user_id", a."name", a."type", a."balance", a."ownership", a."account_subtype"
             FROM "accounts" a
             WHERE a."user_id" = ANY($1::varchar[]) AND a."ownership" = 'joint'
               AND EXISTS (
                 SELECT 1 FROM "household_members" m
                 WHERE m."user_id" = a."user_id" AND m."household_id" = $2
                   AND m."shares_joint_summary" = true
               )`,
            [ids, visible.householdId],
          );
    const items = selectJointSummaryItems(
      visible.members.map((member) => ({
        addedBy: member.addedBy,
        sharesJointSummary: true,
        accounts: accounts
          .filter((a) => a.user_id === member.userId)
          .map((a) => ({
            name: a.name,
            type: a.type,
            balance: Number(a.balance),
            ownership: a.ownership,
            accountSubtype: a.account_subtype,
          })),
      })),
    );
    return {
      items: items.map((i) => ({ ...i, type: i.type as HouseholdJointSummaryItem["type"] })),
    };
  }
}
