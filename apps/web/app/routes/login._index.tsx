import { configure, getSignInUrl } from "@workos-inc/authkit-react-router";
import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const reqUrl = new URL(request.url);
  if (reqUrl.hostname === "localhost" || reqUrl.hostname === "127.0.0.1") {
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
