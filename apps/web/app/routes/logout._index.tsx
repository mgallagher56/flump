import { isFlumpHost } from "@flump/finance-engine";
import { signOut } from "@workos-inc/authkit-react-router";
import type { ActionFunctionArgs } from "react-router";
import { redirect } from "react-router";

const handleSignOut = async (request: Request) => {
  const url = new URL(request.url);
  const marketingUrl =
    process.env.VITE_MARKETING_URL ||
    (url.hostname === "localhost" || url.hostname === "127.0.0.1"
      ? "http://localhost:3001"
      : "https://flump.co.uk");

  const response = await signOut(request, { returnTo: marketingUrl });
  const onFlumpHost = isFlumpHost(url.hostname);
  const cookieDomain = onFlumpHost ? "; Domain=.flump.co.uk" : "";
  const behindHttpsProxy =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase() === "https";
  const secure = onFlumpHost || url.protocol === "https:" || behindHttpsProxy ? "; Secure" : "";
  const clearPresenceCookie = `flump_has_session=; Path=/; SameSite=Lax; Max-Age=0${cookieDomain}${secure}`;

  if (response instanceof Response) {
    const headers = new Headers(response.headers);
    headers.append("Set-Cookie", clearPresenceCookie);
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
