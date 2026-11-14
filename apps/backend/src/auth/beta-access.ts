import type { AuthenticatedUser } from "./token-verifier";

/**
 * Closed-beta allowlist (E19 A7). Public sign-up cannot be closed from code, so this is the
 * backstop: when either list is set, only listed accounts may use the API.
 *
 * - `BETA_ALLOWED_EMAILS`: comma-separated, case-insensitive. Needs an `email` claim in the token.
 * - `BETA_ALLOWED_USER_IDS`: comma-separated WorkOS user ids (`sub`). Works without an email claim.
 *
 * Neither set: access is not restricted. In production that is refused at boot unless
 * `BETA_OPEN=true` says the open beta is deliberate (D8, M12; see `config/boot-guards.ts`), so a
 * forgotten variable can no longer open the API to every WorkOS sign-up. Set means closed, and an
 * unlisted or email-less caller is refused.
 */
function parseList(value: string | undefined, lower: boolean): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => (lower ? item.trim().toLowerCase() : item.trim()))
    .filter(Boolean);
}

export function isBetaRestricted(env: Record<string, string | undefined>): boolean {
  return (
    parseList(env.BETA_ALLOWED_EMAILS, true).length > 0 ||
    parseList(env.BETA_ALLOWED_USER_IDS, false).length > 0
  );
}

/** `BETA_OPEN=true` (trimmed, case-insensitive): an unrestricted beta is intended. */
export function isBetaOpen(env: Record<string, string | undefined>): boolean {
  return env.BETA_OPEN?.trim().toLowerCase() === "true";
}

/**
 * The beta decision for a caller known only by user id (an AI connection token carries no email).
 * It refuses only when the answer is certain: the beta is gated by user ids alone and this id is
 * not listed. While an email allowlist is set, an unlisted id may still be an invited email, which
 * cannot be told from a token, so the token is left to its own expiry and revocation instead of
 * locking every email-invited user out of their tokens.
 */
export function isBetaUserIdRemoved(
  env: Record<string, string | undefined>,
  userId: string,
): boolean {
  const ids = parseList(env.BETA_ALLOWED_USER_IDS, false);
  if (ids.length === 0 || parseList(env.BETA_ALLOWED_EMAILS, true).length > 0) return false;
  return !ids.includes(userId);
}

export function isBetaUserAllowed(
  env: Record<string, string | undefined>,
  user: AuthenticatedUser,
): boolean {
  if (!isBetaRestricted(env)) return true;
  if (parseList(env.BETA_ALLOWED_USER_IDS, false).includes(user.id)) return true;
  const email = user.email?.trim().toLowerCase();
  return !!email && parseList(env.BETA_ALLOWED_EMAILS, true).includes(email);
}
