import type { TermsAcceptanceCheck } from "../auth/terms-acceptance";

/** An in-memory terms check for unit tests: `agreed` is the set of users who have agreed. */
export function fakeTermsAcceptance(
  initial: Iterable<string> | "everyone" = "everyone",
): TermsAcceptanceCheck & { agreed: Set<string> | "everyone" } {
  const agreed = initial === "everyone" ? "everyone" : new Set(initial);
  return {
    agreed,
    hasAgreedToTermsInForce: async (userId: string) => agreed === "everyone" || agreed.has(userId),
  };
}
