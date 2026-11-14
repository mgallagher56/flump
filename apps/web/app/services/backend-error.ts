export const BACKEND_ERROR_KINDS = [
  "unauthorised",
  "forbidden",
  "not-invited",
  "not-found",
  "client",
  "server",
  "unavailable",
  "bad-response",
] as const;

export type BackendErrorKind = (typeof BACKEND_ERROR_KINDS)[number];

/** Serialisable payload thrown to route error boundaries. Never carries tokens, base URLs or bodies. */
export interface RouteErrorPayload {
  kind: BackendErrorKind;
  endpoint?: string;
}

export class BackendError extends Error {
  readonly kind: BackendErrorKind;
  readonly status?: number;
  readonly endpoint: string;
  /** Server-supplied message for browser callers (e.g. weak password). Never part of `message`. */
  detail?: string;

  constructor(kind: BackendErrorKind, endpoint: string, status?: number, options?: ErrorOptions) {
    super(`Backend request to ${endpoint} failed: ${kind}${status ? ` (${status})` : ""}`, options);
    this.name = "BackendError";
    this.kind = kind;
    this.status = status;
    this.endpoint = endpoint;
  }
}

/**
 * Where a signed-in person goes when the backend says their account is erased (BE-04: every
 * authenticated route except DELETE /user-profile answers 410 `account_deleted`). Their data is
 * gone but removing the login did not finish; that page lets them finish it.
 */
export const ACCOUNT_ERASED_PATH = "/account-deleted?state=pending";

/** True for the backend's 410 "This account has been deleted." answer. */
export function isAccountErased(err: unknown): boolean {
  return err instanceof BackendError && err.status === 410;
}

export function kindFromStatus(status: number): BackendErrorKind {
  if (status === 401) return "unauthorised";
  if (status === 403) return "forbidden";
  if (status === 404) return "not-found";
  if (status >= 500) return "server";
  return "client";
}
