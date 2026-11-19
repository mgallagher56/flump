import { useRouteLoaderData } from "react-router";

/**
 * Browser only: the user the root loader last gave. Never set on the server, where module state
 * is shared between requests.
 */
let lastBrowserUser: unknown = null;

/**
 * The signed-in user for the app chrome (header, sign-out, bottom bar, error pages). It reads the
 * root loader's data by route id, so it works from any route and the root error boundary.
 *
 * In the browser, a page whose data request fails (a dropped connection on a link) fails the root
 * loader's revalidation too, and React Router then drops the root data. Without a fallback the
 * error page showed a signed-out header with "Sign in" and no bottom bar to a signed-in reader
 * (P17). So in the browser it falls back to the user the root loader last gave. Signing out
 * reloads the root data with no user, which replaces the remembered one.
 */
export function useRootUser(): unknown {
  const rootData = useRouteLoaderData("root") as { user?: unknown } | undefined;
  if (typeof document === "undefined") return rootData?.user ?? null;
  if (rootData) lastBrowserUser = rootData.user ?? null;
  return rootData ? (rootData.user ?? null) : lastBrowserUser;
}

/** Test seam: forget the remembered user between tests. */
export function resetRememberedRootUser(): void {
  lastBrowserUser = null;
}
