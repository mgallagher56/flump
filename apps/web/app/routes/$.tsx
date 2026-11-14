import type { MetaFunction } from "react-router";

// Catch-all splat route (E20-N1). Unmatched URLs would otherwise be answered by React Router
// outside the root middleware pipeline and miss the security headers. Matching this route makes
// them run the root middleware. More specific routes (api.$, healthz, robots.txt, ...) still win.
//
// The route needs a default component: a route module without one is a resource route, and a
// Response thrown from a resource route is sent as-is (a bare "Not Found" text body). With a
// component, the thrown 404 renders this route's ErrorBoundary inside the root layout, so an
// unknown /app/* URL keeps the header and navigation, gets an h1 and a link home, and still
// answers with HTTP 404.
export const loader = () => {
  throw new Response("Not Found", { status: 404, statusText: "Not Found" });
};

export const action = () => {
  throw new Response("Not Found", { status: 404, statusText: "Not Found" });
};

export const meta: MetaFunction = () => [{ title: "Page not found | Flump" }];

export { RouteErrorBoundary as ErrorBoundary } from "~/features/feedback/components/RouteErrorBoundary";

export default function NotFoundRoute() {
  return null;
}
