import { createCookieSessionStorage } from "react-router";
import { LEGACY_SESSION_COOKIE_NAME } from "~/utils/sessionPolicy.server";

/**
 * True when the request carries the authkit session cookie and it holds a sealed `jwt`: exactly
 * what authkit's `signOut` (terminateSession) needs, otherwise it destructures null and throws.
 *
 * Deliberately not `getAuthSession`/`authkitLoader`: those verify and refresh, so a transient
 * WorkOS failure would look like "no session" and an expired access token would trigger a refresh.
 * Here nothing is unsealed, verified or refreshed (an expired access token still has a sealed
 * session, and `signOut` still ends it at WorkOS). The cookie is only checked for presence of the
 * `jwt` key; its value is never read, logged or returned. The storage mirrors authkit's own
 * (same cookie name, signed with WORKOS_COOKIE_PASSWORD), so a missing, unsigned or tampered
 * cookie reads as an empty session, as it does inside authkit.
 */
export async function hasSealedSession(
  request: Request,
  env: Record<string, string | undefined> = process.env,
): Promise<boolean> {
  const cookieHeader = request.headers.get("Cookie");
  if (!cookieHeader) return false;
  const secret = env.WORKOS_COOKIE_PASSWORD;
  if (!secret) return false;
  try {
    const { getSession } = createCookieSessionStorage({
      cookie: {
        name: env.WORKOS_COOKIE_NAME?.trim() || LEGACY_SESSION_COOKIE_NAME,
        secrets: [secret],
      },
    });
    return (await getSession(cookieHeader)).has("jwt");
  } catch {
    return false;
  }
}
