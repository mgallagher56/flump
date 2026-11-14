import type { ReactElement } from "react";
import {
  isRouteErrorResponse,
  useLocation,
  useRevalidator,
  useRouteError,
  useRouteLoaderData,
} from "react-router";
import { BACKEND_ERROR_KINDS, type BackendErrorKind } from "../../../../services/backend-error";
import { RouteErrorState, type RouteErrorStateProps } from "../RouteErrorState";
import { boundaryRoot } from "./RouteErrorBoundary.styles";

const ACCOUNT_DETAIL = /^\/app\/accounts\/[^/]+/;

/** Dynamic routes whose segment is always a record id, whatever it looks like. */
const ID_ROUTES: readonly RegExp[] = [
  /^(\/app\/accounts\/)[^/]+/,
  /^(\/app\/tax\/receipts\/)[^/]+/,
];

/**
 * Dynamic routes whose segment is a public slug, never a record id: kept as is even when it mixes
 * letters and digits (`uk-100k-tax-trap-calculator`).
 */
const PUBLIC_SLUG_ROUTES: readonly RegExp[] = [/^\/tools\/[a-z0-9-]+$/];

/**
 * A segment that looks like a record id or token: all digits, a UUID, or 8+ characters mixing
 * letters and digits. Plain words (`debt`, `take-home`, a tool slug) are kept.
 */
function looksLikeId(segment: string): boolean {
  if (/^\d+$/.test(segment)) return true;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)) return true;
  return segment.length >= 8 && /\d/.test(segment) && /^[\w-]+$/.test(segment);
}

/**
 * Strips ids so the feedback subject names the page, not the record. Known id routes are replaced
 * by `:id` whatever the segment looks like; any other id-like segment is replaced too, so a new
 * dynamic route cannot leak its id into the mailto subject.
 */
export function routeKeyFor(pathname: string): string {
  if (PUBLIC_SLUG_ROUTES.some((route) => route.test(pathname))) return pathname;
  const known = ID_ROUTES.reduce((path, route) => path.replace(route, "$1:id"), pathname);
  return known
    .split("/")
    .map((segment) => (segment !== ":id" && looksLikeId(segment) ? ":id" : segment))
    .join("/");
}

/** Safari reports a dropped connection as "Load failed"; Chrome and Firefox mention fetch or network. */
const CONNECTION_FAILURE = /fetch|network|load failed/i;

function kindFromError(error: unknown): RouteErrorStateProps["kind"] {
  // A failed fetch in the browser has no status; show the connection copy, never the message.
  if (error instanceof TypeError && CONNECTION_FAILURE.test(error.message)) return "unavailable";
  if (!isRouteErrorResponse(error)) return "unknown";
  const kind = (error.data as { kind?: unknown } | null)?.kind;
  if (typeof kind === "string" && (BACKEND_ERROR_KINDS as readonly string[]).includes(kind)) {
    // A page the user may not open looks exactly like a page that does not exist.
    return kind === "forbidden" ? "not-found" : (kind as BackendErrorKind);
  }
  // A bare 404 (the catch-all splat route) is a missing page, not an unknown failure.
  return error.status === 404 ? "not-found" : "unknown";
}

/**
 * The status shown under the copy. A forbidden page is shown as not found, so it must not reveal
 * its real 403 either; it reports the 404 it is pretending to be.
 */
function statusFor(error: unknown, kind: RouteErrorStateProps["kind"]): number | undefined {
  if (!isRouteErrorResponse(error)) return undefined;
  return kind === "not-found" ? 404 : error.status;
}

export interface RouteErrorBoundaryProps {
  /**
   * The boundary replaces the route, and with it the route's PageHeader h1; the app shell has no
   * h1 of its own, so the error heading is the page h1 by default.
   */
  headingLevel?: "h1" | "h2";
}

/** Shared route ErrorBoundary: reads the thrown payload and never renders raw error messages. */
export function RouteErrorBoundary({
  headingLevel = "h1",
}: RouteErrorBoundaryProps = {}): ReactElement {
  const error = useRouteError();
  const revalidator = useRevalidator();
  const { pathname } = useLocation();
  // Signed-out visitors have no dashboard, so the home link gets a neutral label for them.
  const rootData = useRouteLoaderData("root") as { user?: unknown } | undefined;
  const signedIn = Boolean(rootData?.user);
  const kind = kindFromError(error);
  const onAccountDetail = ACCOUNT_DETAIL.test(pathname);

  return (
    <div className={boundaryRoot()}>
      <RouteErrorState
        kind={kind}
        status={statusFor(error, kind)}
        headingLevel={headingLevel}
        onRetry={revalidator.revalidate}
        retrying={revalidator.state === "loading"}
        routeKey={routeKeyFor(pathname)}
        primaryHref={onAccountDetail ? "/app/accounts" : "/"}
        primaryLabel={
          onAccountDetail ? "Back to accounts" : signedIn ? "Back to home" : "Go to Flump"
        }
      />
    </div>
  );
}
