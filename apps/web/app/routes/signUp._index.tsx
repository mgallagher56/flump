import { getSignUpUrl } from "@workos-inc/authkit-react-router";
import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { url, headers } = await getSignUpUrl("/app/accounts", request);
  return redirect(url, { headers });
};

export default function SignUpIndex() {
  return null;
}
