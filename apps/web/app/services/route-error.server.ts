import { data, redirect } from "react-router";
import {
  ACCOUNT_ERASED_PATH,
  BackendError,
  type BackendErrorKind,
  isAccountErased,
  type RouteErrorPayload,
} from "./backend-error";

const STATUS_BY_KIND: Record<BackendErrorKind, number> = {
  unavailable: 503,
  server: 502,
  "bad-response": 502,
  "not-found": 404,
  forbidden: 403,
  "not-invited": 403,
  client: 400,
  unauthorised: 401,
};

/**
 * Turns a BackendError into a thrown route response for the route error boundary. The payload
 * carries only the kind and endpoint path, never the token, base URL, body or cause. An expired
 * backend session is a 401 state, not a redirect (D1 option B). Anything that is not a
 * BackendError, such as an authkit redirect Response, is rethrown by identity. A 410 (erased
 * account) redirects to the page that finishes the deletion.
 */
export function throwRouteError(err: unknown): never {
  if (!(err instanceof BackendError)) throw err;
  // An erased account (410) is not an error page: send the person to finish the deletion.
  if (isAccountErased(err)) throw redirect(ACCOUNT_ERASED_PATH);
  const payload: RouteErrorPayload = { kind: err.kind, endpoint: err.endpoint };
  throw data(payload, { status: STATUS_BY_KIND[err.kind] });
}

const ACTION_MESSAGE_BY_KIND: Record<BackendErrorKind, string> = {
  unavailable: "We could not reach Flump. Check your connection and try again.",
  server: "That did not work because of a problem on our side. Try again in a moment.",
  "bad-response": "That did not work because of a problem on our side. Try again in a moment.",
  "not-found": "We could not find that. It may have been deleted.",
  forbidden: "Your account does not have permission to do that.",
  "not-invited": "This account has not been invited to the Flump beta yet.",
  client: "We could not save that. Check the details and try again.",
  unauthorised: "Your session has ended. Sign in again.",
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
