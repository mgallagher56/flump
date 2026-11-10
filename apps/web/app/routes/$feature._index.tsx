import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";

const LEGACY_REDIRECTS: Record<string, string> = {
  accounts: "/app/accounts",
  budget: "/app/budget",
  debt: "/app/debt",
  forecast: "/app/forecast",
  mortgage: "/app/mortgage",
  onboarding: "/app/onboarding",
  pension: "/app/pension",
  profile: "/app/profile",
  savings: "/app/savings",
  tax: "/app/tax",
};

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const target = params.feature ? LEGACY_REDIRECTS[params.feature] : undefined;
  if (target) {
    return redirect(target);
  }
  return redirect("/");
};

export default function FeatureRedirectRoute() {
  return null;
}
