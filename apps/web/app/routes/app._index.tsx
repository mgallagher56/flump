import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { backendFetch } from "~/services/backend-client.server";
import { throwRouteError } from "~/services/route-error.server";
import { getAuthSession } from "~/utils/auth.server";
import { isDemoMode } from "~/utils/demoData";

export const loader = async (args: LoaderFunctionArgs) => {
  if (isDemoMode(args.request.url)) {
    return redirect("/?demo=true");
  }

  const { user, accessToken } = await getAuthSession(args, { ensureSignedIn: false });
  if (!user) return redirect("/login");

  try {
    const profile = await backendFetch<{ onboardingCompleted?: boolean } | null>("/user-profile", {
      accessToken,
      signal: args.request.signal,
    });
    if (profile && profile.onboardingCompleted === false) {
      return redirect("/app/onboarding");
    }
  } catch (error) {
    throwRouteError(error);
  }

  return redirect("/");
};

export default function AppRoute() {
  return null;
}
