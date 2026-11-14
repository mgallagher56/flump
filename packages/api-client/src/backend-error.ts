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

/**
 * The one error type for every backend call (web server, web browser and mobile). Its `message`
 * never contains a token, base URL or response body.
 */
export class BackendError extends Error {
  readonly kind: BackendErrorKind;
  readonly status?: number;
  readonly endpoint: string;
  /** Server-supplied message for browser callers (e.g. weak password). Never part of `message`. */
  detail?: string;
  /** The stable `code` from the BE-09 error envelope, for example `precondition_failed`. */
  code?: string;
  /** The request id to quote in a report: the envelope's, else `x-request-id`, else the one sent. */
  requestId?: string;
  /** For `bad-response` from a schema mismatch: the dotted paths that failed. Never values. */
  issuePaths?: string[];

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
