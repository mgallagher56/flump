import type { ReactElement } from "react";
import { isRouteErrorResponse, useLocation, useRevalidator, useRouteError } from "react-router";
import { BACKEND_ERROR_KINDS, type BackendErrorKind } from "../../../../services/backend-error";
import { RouteErrorState, type RouteErrorStateProps } from "../RouteErrorState";
import { boundaryRoot } from "./RouteErrorBoundary.styles";

const ACCOUNT_DETAIL = /^\/app\/accounts\/[^/]+/;

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
        primaryHref={onAccountDetail ? "/app/accounts" : "/"}
        primaryLabel={onAccountDetail ? "Back to accounts" : "Go to dashboard"}
      />
    </div>
  );
}
