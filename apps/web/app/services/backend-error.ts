export type BackendErrorKind =
  | "unauthorised"
  | "forbidden"
  | "not-found"
  | "client"
  | "server"
  | "unavailable"
  | "bad-response";

/** Serialisable payload thrown to route error boundaries. Never carries tokens, base URLs or bodies. */
export interface RouteErrorPayload {
  kind: BackendErrorKind;
  endpoint?: string;
}

export class BackendError extends Error {
  readonly kind: BackendErrorKind;
  readonly status?: number;
  readonly endpoint: string;

  constructor(kind: BackendErrorKind, endpoint: string, status?: number, options?: ErrorOptions) {
    super(`Backend request to ${endpoint} failed: ${kind}${status ? ` (${status})` : ""}`, options);
    this.name = "BackendError";
    this.kind = kind;
    this.status = status;
    this.endpoint = endpoint;
  }
}

export function kindFromStatus(status: number): BackendErrorKind {
  if (status === 401) return "unauthorised";
  if (status === 403) return "forbidden";
  if (status === 404) return "not-found";
  if (status >= 500) return "server";
  return "client";
}
