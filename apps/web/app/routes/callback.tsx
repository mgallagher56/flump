import { authLoader } from "@workos-inc/authkit-react-router";
import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";

const workosLoader = authLoader({
  returnPathname: "/app",
});

export const loader = async (args: LoaderFunctionArgs) => {
  const url = new URL(args.request.url);
  if (!url.searchParams.get("code")) {
    return redirect("/login");
  }

  const response = await workosLoader(args);
  const cookieDomain = url.hostname.endsWith("flump.co.uk") ? "; Domain=.flump.co.uk" : "";
  const sessionPresenceCookie = `flump_has_session=1; Path=/; SameSite=Lax; Max-Age=2592000${cookieDomain}`;

  if (response instanceof Response) {
    const headers = new Headers(response.headers);
    headers.append("Set-Cookie", sessionPresenceCookie);
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  return response;
};

export default function CallbackRoute() {
  return null;
}
