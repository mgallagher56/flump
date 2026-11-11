import { data } from "react-router";
import { BackendError, type BackendErrorKind, type RouteErrorPayload } from "./backend-error";

const STATUS_BY_KIND: Record<BackendErrorKind, number> = {
  unavailable: 503,
  server: 502,
  "bad-response": 502,
  "not-found": 404,
  forbidden: 403,
  client: 400,
  unauthorised: 401,
};

/**
 * Turns a BackendError into a thrown route response for the route error boundary. The payload
 * carries only the kind and endpoint path, never the token, base URL, body or cause. An expired
 * backend session is a 401 state, not a redirect (D1 option B). Anything that is not a
 * BackendError, such as an authkit redirect Response, is rethrown by identity.
 */
export function throwRouteError(err: unknown): never {
  if (!(err instanceof BackendError)) throw err;
  const payload: RouteErrorPayload = { kind: err.kind, endpoint: err.endpoint };
  throw data(payload, { status: STATUS_BY_KIND[err.kind] });
}

const ACTION_MESSAGE_BY_KIND: Record<BackendErrorKind, string> = {
  unavailable: "We couldn't reach the server. Please try again.",
  server: "Something went wrong on our side. Please try again.",
  "bad-response": "Something went wrong on our side. Please try again.",
  "not-found": "We couldn't find that. It may have been removed.",
  forbidden: "You don't have permission to do that.",
  client: "We couldn't save that. Check the details and try again.",
  unauthorised: "Your session has expired. Please sign in again.",
};

/**
 * Turns a failed mutation into the `{ success: false, error }` shape actions return. The status is
 * the backend's own (falling back to the kind's status for network failures) and the message is
 * generic: it never carries backend text, the token or the URL. Anything that is not a BackendError,
 * such as an authkit redirect Response, is rethrown by identity.
 */
export function actionErrorResponse(err: unknown) {
  if (!(err instanceof BackendError)) throw err;
  return data(
    { success: false as const, error: ACTION_MESSAGE_BY_KIND[err.kind] },
    { status: err.status ?? STATUS_BY_KIND[err.kind] },
  );
}
