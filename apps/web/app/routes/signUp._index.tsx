import { configure, getSignUpUrl } from "@workos-inc/authkit-react-router";
import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";

export const loader = async ({ request }: LoaderFunctionArgs) => {
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
  const { url, headers } = await getSignUpUrl("/app", request);
  return redirect(url, { headers });
};

export default function SignUpIndex() {
  return null;
}
