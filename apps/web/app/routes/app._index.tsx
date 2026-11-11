import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { authHeader, getAuthSession } from "~/utils/auth.server";
import { isDemoMode } from "~/utils/demoData";

export const loader = async (args: LoaderFunctionArgs) => {
  if (isDemoMode(args.request.url)) {
    return redirect("/?demo=true");
  }

  const { user, accessToken } = await getAuthSession(args, { ensureSignedIn: false });
  const authz = authHeader({ accessToken });
  if (!user) return redirect("/login");

  const apiUrl = process.env.VITE_API_URL || "http://localhost:4000";
  try {
    const res = await fetch(`${apiUrl}/user-profile`, {
      headers: { ...authz },
    });
    const profile = res.ok ? await res.json() : null;
    if (profile && profile.onboardingCompleted === false) {
      return redirect("/app/onboarding");
    }
  } catch {}

  return redirect("/");
};

export default function AppRoute() {
  return null;
}
