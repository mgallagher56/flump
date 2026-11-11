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
