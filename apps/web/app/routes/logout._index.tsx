import { signOut } from "@workos-inc/authkit-react-router";
import type { LoaderFunctionArgs } from "react-router";

const handleSignOut = async (request: Request) => {
  const url = new URL(request.url);
  const marketingUrl =
    process.env.VITE_MARKETING_URL ||
    (url.hostname === "localhost" || url.hostname === "127.0.0.1"
      ? "http://localhost:3001"
      : "https://flump.co.uk");

  const response = await signOut(request, { returnTo: marketingUrl });
  const cookieDomain = url.hostname.endsWith("flump.co.uk") ? "; Domain=.flump.co.uk" : "";
  const clearPresenceCookie = `flump_has_session=; Path=/; SameSite=Lax; Max-Age=0${cookieDomain}`;

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

export const loader = async ({ request }: LoaderFunctionArgs) => {
  return handleSignOut(request);
};

export const action = async ({ request }: LoaderFunctionArgs) => {
  return handleSignOut(request);
};

export default function LogoutIndex() {
  return null;
}
