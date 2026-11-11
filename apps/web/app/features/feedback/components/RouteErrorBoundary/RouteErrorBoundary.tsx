import type { ReactElement } from "react";
import { isRouteErrorResponse, useLocation, useRevalidator, useRouteError } from "react-router";
import type { BackendErrorKind } from "../../../../services/backend-error";
import { RouteErrorState, type RouteErrorStateProps } from "../RouteErrorState";

const KNOWN_KINDS: readonly BackendErrorKind[] = [
  "unauthorised",
  "forbidden",
  "not-found",
  "client",
  "server",
  "unavailable",
  "bad-response",
];

const ACCOUNT_DETAIL = /^\/app\/accounts\/[^/]+/;

function kindFromError(error: unknown): RouteErrorStateProps["kind"] {
  if (!isRouteErrorResponse(error)) return "unknown";
  const kind = (error.data as { kind?: unknown } | null)?.kind;
  if (typeof kind === "string" && (KNOWN_KINDS as readonly string[]).includes(kind)) {
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
    <RouteErrorState
      kind={kind}
      onRetry={revalidator.revalidate}
      retrying={revalidator.state === "loading"}
      primaryHref={onAccountDetail ? "/app/accounts" : "/"}
      primaryLabel={onAccountDetail ? "Back to accounts" : "Go to dashboard"}
    />
  );
}
