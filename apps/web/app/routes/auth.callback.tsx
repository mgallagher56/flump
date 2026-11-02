import { authLoader } from "@workos-inc/authkit-react-router";
import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";

const workosLoader = authLoader({
  returnPathname: "/app/accounts",
});

export const loader = async (args: LoaderFunctionArgs) => {
  const url = new URL(args.request.url);
  if (!url.searchParams.get("code")) {
    return redirect("/login");
  }
  return workosLoader(args);
};

export default function AuthCallbackRoute() {
  return null;
}
