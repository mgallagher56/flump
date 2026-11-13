// Pure session policy helpers; no authkit import so routes and tests can use them cheaply.

export const MAX_SESSION_COOKIE_AGE_SECONDS = 60 * 60 * 24 * 14;
export const PRODUCTION_SESSION_COOKIE_NAME = "__Host-wos-session";
export const LEGACY_SESSION_COOKIE_NAME = "wos-session";

/**
 * Session lifetime policy (E20-N19). Mutates `env` so authkit, which reads WORKOS_COOKIE_MAX_AGE
 * and WORKOS_COOKIE_NAME from it at request time, sees the policy values.
 * - Max-Age defaults to 14 days (authkit's own default is 400 days). Production fails boot above
 *   14 days; an unparseable value makes authkit emit a cookie with no Max-Age (a browser-session
 *   cookie), so it is rejected too.
 * - Production requires an https WORKOS_REDIRECT_URI (authkit sets Secure from it).
 * - Production defaults the cookie name to `__Host-wos-session` (needs Secure, Path=/ and no Domain,
 *   all of which authkit applies once the redirect URI is https). Dev and test keep `wos-session`
 *   because `__Host-` cookies are rejected over plain http.
 */
export function applySessionPolicy(env: Record<string, string | undefined>): void {
  const production = env.NODE_ENV === "production";

  const rawMaxAge = env.WORKOS_COOKIE_MAX_AGE?.trim();
  if (!rawMaxAge) {
    env.WORKOS_COOKIE_MAX_AGE = String(MAX_SESSION_COOKIE_AGE_SECONDS);
  } else if (production) {
    const maxAge = /^\d+$/.test(rawMaxAge) ? Number.parseInt(rawMaxAge, 10) : Number.NaN;
    if (!Number.isFinite(maxAge) || maxAge <= 0 || maxAge > MAX_SESSION_COOKIE_AGE_SECONDS) {
      throw new Error(
        `WORKOS_COOKIE_MAX_AGE must be a positive number of seconds no greater than ${MAX_SESSION_COOKIE_AGE_SECONDS} (14 days) in production`,
      );
    }
  }

  if (production) {
    let redirectProtocol: string | undefined;
    try {
      redirectProtocol = new URL(env.WORKOS_REDIRECT_URI ?? "").protocol;
    } catch {
      redirectProtocol = undefined;
    }
    if (redirectProtocol !== "https:") {
      throw new Error("WORKOS_REDIRECT_URI must be an https URL in production");
    }
    if (!env.WORKOS_COOKIE_NAME?.trim()) {
      env.WORKOS_COOKIE_NAME = PRODUCTION_SESSION_COOKIE_NAME;
    }
  }
}

/**
 * Set-Cookie value that expires the pre-rename `wos-session` cookie (400-day sealed refresh token).
 * Only in production and only when the configured name differs; otherwise null.
 * Callers must append it, never set, so authkit's own Set-Cookie headers survive.
 */
export function legacySessionCookieClear(env: Record<string, string | undefined>): string | null {
  if (env.NODE_ENV !== "production") return null;
  const name = env.WORKOS_COOKIE_NAME?.trim() || LEGACY_SESSION_COOKIE_NAME;
  if (name === LEGACY_SESSION_COOKIE_NAME) return null;
  return `${LEGACY_SESSION_COOKIE_NAME}=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Lax`;
}

/**
 * Set-Cookie value that expires the configured session cookie (`__Host-wos-session` in production,
 * `wos-session` elsewhere), for logout when there is no session to hand to authkit's `signOut`.
 * Same attributes authkit's destroySession emits: Path=/, HttpOnly, SameSite=Lax, no Domain, and
 * Secure in production (or for any `__Host-` name, which browsers reject without it).
 */
export function sessionCookieClear(env: Record<string, string | undefined>): string {
  const production = env.NODE_ENV === "production";
  const name =
    env.WORKOS_COOKIE_NAME?.trim() ||
    (production ? PRODUCTION_SESSION_COOKIE_NAME : LEGACY_SESSION_COOKIE_NAME);
  const secure = production || name.startsWith("__Host-") ? "; Secure" : "";
  return `${name}=; Path=/; Max-Age=0${secure}; HttpOnly; SameSite=Lax`;
}
