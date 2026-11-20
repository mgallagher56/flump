import { isProductionLike } from "./mcp-access";
import type { AuthenticatedUser } from "./token-verifier";

type Env = Record<string, string | undefined>;

/**
 * Closed-beta access (E19 A7, invite links). Public sign-up cannot be closed from code, so this is
 * the backstop: while the beta is invite-only, only these callers may use the API.
 *
 * - `BETA_ADMIN_USER_IDS`: comma-separated WorkOS user ids who create invite links. Always allowed.
 * - `BETA_ALLOWED_EMAILS`: comma-separated, case-insensitive. Needs an `email` claim in the token.
 * - `BETA_ALLOWED_USER_IDS`: comma-separated WorkOS user ids (`sub`). Works without an email claim.
 * - an active row in `beta_members` (removed_at null), written when someone redeems an invite link.
 *
 * The beta is open (no refusal) only when neither allowlist is set and either `BETA_OPEN=true` says
 * so, or the process is not production-like and no admin is set (a local or test run). Anything
 * else is invite-only, so a forgotten variable never opens the API to every WorkOS sign-up.
 * Production also refuses to boot with no allowlist, no admin and no `BETA_OPEN=true`
 * (`config/boot-guards.ts`).
 */
function parseList(value: string | undefined, lower: boolean): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => (lower ? item.trim().toLowerCase() : item.trim()))
    .filter(Boolean);
}

/** Either env allowlist is set. */
export function isBetaRestricted(env: Env): boolean {
  return (
    parseList(env.BETA_ALLOWED_EMAILS, true).length > 0 ||
    parseList(env.BETA_ALLOWED_USER_IDS, false).length > 0
  );
}

/** `BETA_OPEN=true` (trimmed, case-insensitive): an unrestricted beta is intended. */
export function isBetaOpen(env: Env): boolean {
  return env.BETA_OPEN?.trim().toLowerCase() === "true";
}

/** At least one `BETA_ADMIN_USER_IDS` entry is set. */
export function hasBetaAdmins(env: Env): boolean {
  return parseList(env.BETA_ADMIN_USER_IDS, false).length > 0;
}

/** The caller is listed in `BETA_ADMIN_USER_IDS`. */
export function isBetaAdmin(env: Env, userId: string | undefined): boolean {
  return !!userId && parseList(env.BETA_ADMIN_USER_IDS, false).includes(userId);
}

/**
 * The one rule for whether the beta is invite-only, used by the AuthGuard, AI connection tokens,
 * Retirement and GET /app/beta, so they can never disagree.
 */
export function isBetaInviteOnly(env: Env): boolean {
  if (isBetaRestricted(env)) return true;
  if (isBetaOpen(env)) return false;
  return isProductionLike(env) || hasBetaAdmins(env);
}

/** Allowed without a database read: open beta, an admin, or on an env allowlist. */
export function isBetaUserAllowedByEnv(env: Env, user: AuthenticatedUser): boolean {
  if (!isBetaInviteOnly(env)) return true;
  if (isBetaAdmin(env, user.id)) return true;
  if (parseList(env.BETA_ALLOWED_USER_IDS, false).includes(user.id)) return true;
  const email = user.email?.trim().toLowerCase();
  return !!email && parseList(env.BETA_ALLOWED_EMAILS, true).includes(email);
}

/**
 * Port for the `beta_members` lookup (the AuthGuard resolves it lazily; AI tokens and Retirement
 * inject it). Provided by the beta module, so the auth layer does not depend on the database. One
 * primary-key read; never cached, so a removal takes effect on the very next request.
 */
export interface BetaMembershipCheck {
  isActiveMember(userId: string): Promise<boolean>;
}

export const BETA_MEMBERSHIP_CHECK = "BETA_MEMBERSHIP_CHECK";

/**
 * A caller known only by user id (an AI connection token carries no email): an admin, on
 * `BETA_ALLOWED_USER_IDS`, or an active member. An email allowlist cannot be matched without an
 * email, so with only an email list and no id match the token is refused (fail closed).
 */
export async function isBetaUserIdAllowed(
  env: Env,
  userId: string,
  membership: BetaMembershipCheck | null,
): Promise<boolean> {
  if (!isBetaInviteOnly(env)) return true;
  if (isBetaAdmin(env, userId)) return true;
  if (parseList(env.BETA_ALLOWED_USER_IDS, false).includes(userId)) return true;
  return membership ? membership.isActiveMember(userId) : false;
}
