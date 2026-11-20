import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
import type { BetaMembershipLookup } from "../auth/beta-access";
import { BetaMember } from "../entities/beta-member.entity";

/** How long a positive answer may stand in for a synchronous check (MCP tool list only). */
const RECENT_MS = 60_000;
/** Bound on the recent-answers map (cleared whole when full). */
const RECENT_MAX = 10_000;

/**
 * Whether a user is an active member of the invite-only beta: one primary-key read, never cached
 * for access decisions, so removing a member refuses their very next request and their AI
 * connection tokens at once.
 */
@Injectable()
export class BetaMembershipService implements BetaMembershipLookup {
  private readonly recent = new Map<string, number>();

  constructor(@InjectRepository(BetaMember) private readonly members: Repository<BetaMember>) {}

  async isActiveMember(userId: string): Promise<boolean> {
    if (!userId) return false;
    const active = await this.members.exists({ where: { userId, removedAt: IsNull() } });
    if (active) {
      if (this.recent.size >= RECENT_MAX) this.recent.clear();
      this.recent.set(userId, Date.now() + RECENT_MS);
    } else {
      this.recent.delete(userId);
    }
    return active;
  }

  wasActiveMemberRecently(userId: string): boolean {
    const until = this.recent.get(userId);
    return until !== undefined && until > Date.now();
  }

  /** Called when an admin removes a member, so this process forgets them at once. */
  forget(userId: string): void {
    this.recent.delete(userId);
  }
}
