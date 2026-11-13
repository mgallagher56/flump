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

/**
 * Strips ids so the feedback subject names the page, not the record. Every new dynamic route
 * segment (an id, slug or token) must be stripped here, or it leaks into the mailto subject.
 */
function routeKeyFor(pathname: string): string {
  return pathname.replace(ACCOUNT_DETAIL, "/app/accounts/:id");
}

function kindFromError(error: unknown): RouteErrorStateProps["kind"] {
  // A failed fetch in the browser has no status; show the connection copy, never the message.
  if (error instanceof TypeError && /fetch|network/i.test(error.message)) return "unavailable";
  if (!isRouteErrorResponse(error)) return "unknown";
  const kind = (error.data as { kind?: unknown } | null)?.kind;
  if (typeof kind === "string" && (BACKEND_ERROR_KINDS as readonly string[]).includes(kind)) {
    // A page the user may not open looks exactly like a page that does not exist.
    return kind === "forbidden" ? "not-found" : (kind as BackendErrorKind);
  }
  // A bare 404 (the catch-all splat route) is a missing page, not an unknown failure.
  return error.status === 404 ? "not-found" : "unknown";
}

export interface RouteErrorBoundaryProps {
  /** The root boundary has no page heading above it, so it asks for an h1. */
  headingLevel?: "h1" | "h2";
}

/** Shared route ErrorBoundary: reads the thrown payload and never renders raw error messages. */
export function RouteErrorBoundary({ headingLevel }: RouteErrorBoundaryProps = {}): ReactElement {
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
        status={isRouteErrorResponse(error) ? error.status : undefined}
        headingLevel={headingLevel}
        onRetry={revalidator.revalidate}
        retrying={revalidator.state === "loading"}
        routeKey={routeKeyFor(pathname)}
        primaryHref={onAccountDetail ? "/app/accounts" : "/"}
        primaryLabel={
          onAccountDetail ? "Back to accounts" : signedIn ? "Go to dashboard" : "Go to Flump"
        }
      />
    </div>
  );
}
