import { getSignInUrl } from "@workos-inc/authkit-react-router";
import { redirect } from "react-router";

export const loader = async () => {
  const { url, headers } = await getSignInUrl();
  return redirect(url, { headers });
};

export default function LoginIndex() {
  return null;
}
