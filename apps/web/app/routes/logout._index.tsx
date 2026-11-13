import { signOut } from "@workos-inc/authkit-react-router";
import type { ActionFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { ensureSessionStorage } from "~/utils/auth.server";
import { devSessionClearCookie, isDevSessionEnabled } from "~/utils/devSession.server";
import { getMarketingUrl } from "~/utils/marketingUrl";
import { legacySessionCookieClear } from "~/utils/sessionPolicy.server";

const handleSignOut = async (request: Request) => {
  const url = new URL(request.url);
  const marketingUrl = getMarketingUrl(request.url);

  if (isDevSessionEnabled(process.env)) {
    // Test-only: clear the dev session cookie; there is no WorkOS session to end.
    const headers = new Headers({ Location: marketingUrl });
    headers.append("Set-Cookie", devSessionClearCookie);
    headers.append("Set-Cookie", "flump_has_session=; Path=/; SameSite=Lax; Max-Age=0");
    return new Response(null, { status: 302, headers });
  }

  await ensureSessionStorage(request);
  const response = await signOut(request, { returnTo: marketingUrl });
  const behindHttpsProxy =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase() === "https";
  const secure = url.protocol === "https:" || behindHttpsProxy ? "; Secure" : "";
  const clearPresenceCookie = `flump_has_session=; Path=/; SameSite=Lax; Max-Age=0${secure}`;

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
  return handleSignOut(request);
};

export default function LogoutIndex() {
  return null;
}
