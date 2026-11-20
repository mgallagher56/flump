import type { BetaMembershipCheck } from "../auth/beta-access";

/** An in-memory beta_members lookup for unit tests: `members` is the set of active members. */
export function fakeBetaMembership(
  initial: Iterable<string> = [],
): BetaMembershipCheck & { members: Set<string> } {
  const members = new Set(initial);
  return {
    members,
    isActiveMember: async (userId: string) => members.has(userId),
  };
}
