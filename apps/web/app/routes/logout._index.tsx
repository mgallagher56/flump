import { signOut } from "@workos-inc/authkit-react-router";
import type { ActionFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { isAllowedReturnPath } from "~/features/settings/account";
import { ensureSessionStorage } from "~/utils/auth.server";
import { devSessionClearCookie, isDevSessionEnabled } from "~/utils/devSession.server";
import { getMarketingUrl } from "~/utils/marketingUrl";
import { safeErrorSummary } from "~/utils/safeErrorSummary";
import { hasSealedSession } from "~/utils/sessionCookie.server";
import { legacySessionCookieClear, sessionCookieClear } from "~/utils/sessionPolicy.server";

/**
 * The app's own origin, from configuration (WORKOS_REDIRECT_URI is required, https, in
 * production), never from request headers such as X-Forwarded-Host. Null when unset.
 */
const configuredAppOrigin = (): string | null => {
  try {
    return new URL(process.env.WORKOS_REDIRECT_URI ?? "").origin;
  } catch {
    return null;
  }
};

/**
 * Where the browser ends up. Normally the marketing site; for the "Sign in again" flow (a
 * destructive action needs a recent sign-in) the app's own /login with one of the allowed return
 * paths, so the person signs in afresh and lands back where they were. Without a configured
 * origin the path stays relative (fine for a Location header).
 */
const destination = (request: Request, next: FormDataEntryValue | null): string =>
  isAllowedReturnPath(next)
    ? `${configuredAppOrigin() ?? ""}/login?returnTo=${encodeURIComponent(next)}`
    : getMarketingUrl(request.url);

const readNext = async (request: Request): Promise<FormDataEntryValue | null> => {
  try {
    return (await request.formData()).get("next");
  } catch {
    return null;
  }
};

const handleSignOut = async (request: Request, next: FormDataEntryValue | null = null) => {
  const url = new URL(request.url);
  const returnUrl = destination(request, next);

  if (isDevSessionEnabled(process.env)) {
    // Test-only: clear the dev session cookie; there is no WorkOS session to end.
    const headers = new Headers({ Location: returnUrl });
    headers.append("Set-Cookie", devSessionClearCookie);
    headers.append("Set-Cookie", "flump_has_session=; Path=/; SameSite=Lax; Max-Age=0");
    return new Response(null, { status: 302, headers });
  }

  const behindHttpsProxy =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase() === "https";
  const secure = url.protocol === "https:" || behindHttpsProxy ? "; Secure" : "";
  const clearPresenceCookie = `flump_has_session=; Path=/; SameSite=Lax; Max-Age=0${secure}`;

  // Logout must never 500: with no sealed session cookie (authkit's signOut would crash on it),
  // or if signOut itself fails, still send the browser home with every session cookie cleared.
  // Nothing here reads or refreshes the session, so no refreshed cookie can resurrect it.
  const clearedRedirect = () => {
    const headers = new Headers({ Location: returnUrl });
    headers.append("Set-Cookie", sessionCookieClear(process.env));
    headers.append("Set-Cookie", clearPresenceCookie);
    const legacyClear = legacySessionCookieClear(process.env);
    if (legacyClear) headers.append("Set-Cookie", legacyClear);
    return new Response(null, { status: 302, headers });
  };

  await ensureSessionStorage(request);
  if (!(await hasSealedSession(request))) return clearedRedirect();

  let response: unknown;
  try {
    response = await signOut(request, { returnTo: returnUrl });
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

export const action = async ({ request }: ActionFunctionArgs) => {
  return handleSignOut(request, await readNext(request));
};

export default function LogoutIndex() {
  return null;
}
