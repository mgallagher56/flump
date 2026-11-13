import { signOut } from "@workos-inc/authkit-react-router";
import type { ActionFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { ensureSessionStorage, getAuthSession } from "~/utils/auth.server";
import { devSessionClearCookie, isDevSessionEnabled } from "~/utils/devSession.server";
import { getMarketingUrl } from "~/utils/marketingUrl";
import { safeErrorSummary } from "~/utils/safeErrorSummary";
import { legacySessionCookieClear, sessionCookieClear } from "~/utils/sessionPolicy.server";

/**
 * True only when there is a live session. An expired session whose refresh fails makes authkit
 * throw a redirect Response (to WorkOS, carrying a PKCE cookie we must not forward); any other
 * failure to read the session also means there is nothing to sign out of.
 */
const hasSession = async (args: ActionFunctionArgs): Promise<boolean> => {
  try {
    const session = await getAuthSession(args, { ensureSignedIn: false });
    return Boolean(session.user);
  } catch {
    return false;
  }
};

const handleSignOut = async (args: ActionFunctionArgs) => {
  const { request } = args;
  const url = new URL(request.url);
  const marketingUrl = getMarketingUrl(request.url);

  if (isDevSessionEnabled(process.env)) {
    // Test-only: clear the dev session cookie; there is no WorkOS session to end.
    const headers = new Headers({ Location: marketingUrl });
    headers.append("Set-Cookie", devSessionClearCookie);
    headers.append("Set-Cookie", "flump_has_session=; Path=/; SameSite=Lax; Max-Age=0");
    return new Response(null, { status: 302, headers });
  }

  const behindHttpsProxy =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase() === "https";
  const secure = url.protocol === "https:" || behindHttpsProxy ? "; Secure" : "";
  const clearPresenceCookie = `flump_has_session=; Path=/; SameSite=Lax; Max-Age=0${secure}`;

  // Logout must never 500: with no usable session, or if signOut itself fails, still send the
  // browser home with every session cookie cleared. The session cookie clear is appended before
  // the presence and legacy clears; the root middleware skips a refreshed cookie of the same name.
  const clearedRedirect = () => {
    const headers = new Headers({ Location: marketingUrl });
    headers.append("Set-Cookie", sessionCookieClear(process.env));
    headers.append("Set-Cookie", clearPresenceCookie);
    const legacyClear = legacySessionCookieClear(process.env);
    if (legacyClear) headers.append("Set-Cookie", legacyClear);
    return new Response(null, { status: 302, headers });
  };

  await ensureSessionStorage(request);
  if (!(await hasSession(args))) return clearedRedirect();

  let response: unknown;
  try {
    response = await signOut(request, { returnTo: marketingUrl });
  } catch (error) {
    console.warn("logout: signOut failed, clearing cookies locally:", safeErrorSummary(error));
    return clearedRedirect();
  }

  if (response instanceof Response) {
    const headers = new Headers(response.headers);
    headers.append("Set-Cookie", clearPresenceCookie);
    const legacyClear = legacySessionCookieClear(process.env);
    if (legacyClear) headers.append("Set-Cookie", legacyClear);
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  return response;
};

// GET must never sign out or set cookies (logout CSRF); sign-out is POST-only.
export const loader = async () => redirect("/");

export const action = async (args: ActionFunctionArgs) => {
  return handleSignOut(args);
};

export default function LogoutIndex() {
  return null;
}
