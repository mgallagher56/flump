import type { ReactElement } from "react";
import { isRouteErrorResponse, useLocation, useRevalidator, useRouteError } from "react-router";
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
  if (!isRouteErrorResponse(error)) return "unknown";
  const kind = (error.data as { kind?: unknown } | null)?.kind;
  if (typeof kind === "string" && (BACKEND_ERROR_KINDS as readonly string[]).includes(kind)) {
    // A page the user may not open looks exactly like a page that does not exist.
    return kind === "forbidden" ? "not-found" : (kind as BackendErrorKind);
  }
  return "unknown";
}

/** Shared route ErrorBoundary: reads the thrown payload and never renders raw error messages. */
export function RouteErrorBoundary(): ReactElement {
  const error = useRouteError();
  const revalidator = useRevalidator();
  const { pathname } = useLocation();
  const kind = kindFromError(error);
  const onAccountDetail = ACCOUNT_DETAIL.test(pathname);

  return (
    <div className={boundaryRoot()}>
      <RouteErrorState
        kind={kind}
        onRetry={revalidator.revalidate}
        retrying={revalidator.state === "loading"}
        routeKey={routeKeyFor(pathname)}
        primaryHref={onAccountDetail ? "/app/accounts" : "/"}
        primaryLabel={onAccountDetail ? "Back to accounts" : "Go to dashboard"}
      />
    </div>
  );
}
