import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";

const LEGACY_REDIRECTS: Record<string, string> = {
  accounts: "/app/accounts",
  budget: "/app/budget",
  debt: "/app/debt",
  forecast: "/app/savings#forecast",
  mortgage: "/app/mortgage",
  onboarding: "/app/onboarding",
  pension: "/app/pension",
  profile: "/app/profile",
  savings: "/app/savings",
  tax: "/app/self-assessment",
};

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const key = params.feature?.toLowerCase();
  const target = key && Object.hasOwn(LEGACY_REDIRECTS, key) ? LEGACY_REDIRECTS[key] : undefined;
  if (target) {
    return redirect(target);
  }
  // Unknown top-level URLs are a real 404, not a bounce to "/" (which lands on login or marketing).
  throw new Response("Not Found", { status: 404, statusText: "Not Found" });
};

export default function FeatureRedirectRoute() {
  return null;
}
