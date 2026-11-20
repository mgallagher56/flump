import { IsNull, type Repository } from "typeorm";
import { describe, expect, it, vi } from "vitest";
import type { BetaMember } from "../entities/beta-member.entity";
import { BetaMembershipService } from "./beta-membership.service";

function fakeMembers(activeIds: string[]) {
  const exists = vi.fn(async ({ where }: { where: { userId: string } }) =>
    activeIds.includes(where.userId),
  );
  return { repo: { exists } as unknown as Repository<BetaMember>, exists };
}

describe("BetaMembershipService.isActiveMember", () => {
  it("is true for an active member and false for anyone else", async () => {
    const { repo } = fakeMembers(["user_member"]);
    const service = new BetaMembershipService(repo);
    await expect(service.isActiveMember("user_member")).resolves.toBe(true);
    await expect(service.isActiveMember("user_stranger")).resolves.toBe(false);
  });

  it("looks up only that user's row, and only while it is not removed", async () => {
    const { repo, exists } = fakeMembers(["user_member"]);
    await new BetaMembershipService(repo).isActiveMember("user_member");
    // The tenancy and removal filter is the contract: one user, removed_at null.
    expect(exists).toHaveBeenCalledWith({ where: { userId: "user_member", removedAt: IsNull() } });
  });

  it("is false for an empty user id, without a lookup", async () => {
    const { repo, exists } = fakeMembers([""]);
    await expect(new BetaMembershipService(repo).isActiveMember("")).resolves.toBe(false);
    expect(exists).not.toHaveBeenCalled();
  });
});
