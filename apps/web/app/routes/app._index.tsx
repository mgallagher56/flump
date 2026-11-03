import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { getAuthSession } from "~/utils/utils";

export const loader = async (args: LoaderFunctionArgs) => {
  const { user, accessToken } = await getAuthSession(args, { ensureSignedIn: false });
  if (!user) return redirect("/login");

  const apiUrl = process.env.VITE_API_URL || "http://localhost:4000";
  try {
    const res = await fetch(`${apiUrl}/user-profile`, {
      headers: { Authorization: `Bearer ${accessToken || "mock-session-token"}` },
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
