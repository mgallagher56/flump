import { configure, getSignInUrl } from "@workos-inc/authkit-react-router";
import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { devSessionSetCookie, isDevSessionEnabled } from "~/utils/devSession.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  if (isDevSessionEnabled(process.env)) {
    // Test-only: no WorkOS round trip, just the dev session cookie.
    return redirect("/app", { headers: { "Set-Cookie": devSessionSetCookie } });
  }
  const reqUrl = new URL(request.url);
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
  const { url, headers } = await getSignInUrl("/app", request);
  return redirect(url, { headers });
};

export default function LoginIndex() {
  return null;
}
