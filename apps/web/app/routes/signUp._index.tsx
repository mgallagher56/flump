import { getSignUpUrl } from "@workos-inc/authkit-react-router";
import { redirect } from "react-router";

export const loader = async () => {
  const { url, headers } = await getSignUpUrl();
  return redirect(url, { headers });
};

export default function SignUpIndex() {
  return null;
}
