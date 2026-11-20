import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
import type { BetaMembershipCheck } from "../auth/beta-access";
import { BetaMember } from "../entities/beta-member.entity";

/**
 * Whether a user is an active member of the invite-only beta: one primary-key read, never cached,
 * so removing a member refuses their very next request and their AI connection tokens at once.
 */
@Injectable()
export class BetaMembershipService implements BetaMembershipCheck {
  constructor(@InjectRepository(BetaMember) private readonly members: Repository<BetaMember>) {}

  async isActiveMember(userId: string): Promise<boolean> {
    if (!userId) return false;
    return this.members.exists({ where: { userId, removedAt: IsNull() } });
  }
}
