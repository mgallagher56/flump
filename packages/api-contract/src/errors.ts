import { z } from "zod";

/**
 * Stable, lowercase snake_case error codes (BE-09, audit M-API2). Clients branch on `code`, never
 * on `message`. Adding a code is additive; renaming or removing one is a breaking change.
 */
export const ERROR_CODES = [
  "bad_request",
  "validation_failed",
  "invalid_json",
  "unauthorized",
  "forbidden",
  "not_invited",
  "not_found",
  "feature_disabled",
  "method_not_allowed",
  "conflict",
  "constraint_violation",
  "gone",
  "precondition_failed",
  "payload_too_large",
  "unsupported_media_type",
  "rate_limited",
  "internal_error",
  "service_unavailable",
  "mcp_disabled",
  "idempotency_key_reused",
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

/** One request validation problem: where (dotted path, no values) and why. */
export const ErrorIssue = z.strictObject({
  /** Dotted path into the request, prefixed with the part: `body.balances.0.id`, `params.id`. */
  path: z.string(),
  /** The validator's issue code, for example `invalid_type` or `unrecognized_keys`. */
  code: z.string(),
  /** A short human-readable reason. Never contains the submitted value. */
  message: z.string(),
});
export type ErrorIssue = z.infer<typeof ErrorIssue>;

/**
 * The one error body every non-2xx JSON response carries (BE-09). `requestId` matches the
 * `x-request-id` response header, so a report can be traced in the logs. `issues` is present only
 * for `validation_failed`. Unknown codes may be added over time: clients treat an unknown `code`
 * like the generic one for its HTTP status.
 */
export const ErrorResponse = z.strictObject({
  code: z.string().regex(/^[a-z][a-z0-9_]*$/),
  message: z.string(),
  issues: z.array(ErrorIssue).optional(),
  requestId: z.string(),
});
export type ErrorResponse = z.infer<typeof ErrorResponse>;

/** The default code for an HTTP status, when the thrower did not name one. */
export const errorCodeForStatus = (status: number): ErrorCode => {
  switch (status) {
    // Every deliberate 400 in the backend is a field or rule check on the request.
    case 400:
      return "validation_failed";
    case 401:
      return "unauthorized";
    case 403:
      return "forbidden";
    case 404:
      return "not_found";
    case 405:
      return "method_not_allowed";
    case 409:
      return "conflict";
    case 410:
      return "gone";
    case 412:
      return "precondition_failed";
    case 413:
      return "payload_too_large";
    case 415:
      return "unsupported_media_type";
    case 422:
      return "validation_failed";
    case 429:
      return "rate_limited";
    case 503:
      return "service_unavailable";
    default:
      return status >= 500 ? "internal_error" : "bad_request";
  }
};
