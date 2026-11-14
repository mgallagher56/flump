import type { LoaderFunctionArgs, MetaFunction } from "react-router";
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

export const meta: MetaFunction = () => [{ title: "We cannot find that page | Flump" }];

// The thrown 404 renders inside the root layout, so the page keeps the normal header for the
// user's state (signed in or out) and the error state's one way back, and still answers 404.
export { RouteErrorBoundary as ErrorBoundary } from "~/features/feedback/components/RouteErrorBoundary";

export default function FeatureRedirectRoute() {
  return null;
}
