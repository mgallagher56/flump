import { signOut } from "@workos-inc/authkit-react-router";
import type { LoaderFunctionArgs } from "react-router";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  return signOut(request, { returnTo: "/" });
};

export const action = async ({ request }: LoaderFunctionArgs) => {
  return signOut(request, { returnTo: "/" });
};

export default function LogoutIndex() {
  return null;
}
