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

export function isBetaUserAllowed(
  env: Record<string, string | undefined>,
  user: AuthenticatedUser,
): boolean {
  if (!isBetaRestricted(env)) return true;
  if (parseList(env.BETA_ALLOWED_USER_IDS, false).includes(user.id)) return true;
  const email = user.email?.trim().toLowerCase();
  return !!email && parseList(env.BETA_ALLOWED_EMAILS, true).includes(email);
}
