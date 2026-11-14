import { configure, getSignInUrl } from "@workos-inc/authkit-react-router";
import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { isAllowedReturnPath } from "~/features/settings/account";
import { devSessionSetCookie, isDevSessionEnabled } from "~/utils/devSession.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const reqUrl = new URL(request.url);
  // Only the settings "Sign in again" return path is honoured (never an open redirect).
  const requested = reqUrl.searchParams.get("returnTo");
  const returnTo = isAllowedReturnPath(requested) ? requested : "/app";
  if (isDevSessionEnabled(process.env)) {
    // Test-only: no WorkOS round trip, just the dev session cookie.
    return redirect(returnTo, { headers: { "Set-Cookie": devSessionSetCookie } });
  }
  if (
    process.env.NODE_ENV === "development" &&
    (reqUrl.hostname === "localhost" || reqUrl.hostname === "127.0.0.1")
  ) {
    configure((key: string) => {
      if (key === "WORKOS_REDIRECT_URI") {
        return `${reqUrl.origin}/callback`;
      }
      return process.env[key];
    });
  }
  const { url, headers } = await getSignInUrl(returnTo, request);
  return redirect(url, { headers });
};

export default function LoginIndex() {
  return null;
}
