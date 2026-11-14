/**
 * Typed bank-provider failures (audit H5, M13).
 *
 * Every failed call to a bank or broker API surfaces as one of these, never as a raw `Error`
 * and never as a made-up value (a £0 balance or an empty list). Callers branch on `code`:
 * `AUTH_EXPIRED` means the user must reconnect; `RATE_LIMITED` and `UNAVAILABLE` mean try later;
 * `MALFORMED_RESPONSE` and `REQUEST_REJECTED` mean the provider answered with something we
 * cannot use. Messages never include response bodies, tokens or URLs with query strings: a
 * provider body can echo credentials back.
 */
export type BankProviderErrorCode =
  | "AUTH_EXPIRED"
  | "RATE_LIMITED"
  | "UNAVAILABLE"
  | "MALFORMED_RESPONSE"
  | "REQUEST_REJECTED";

export interface BankProviderErrorDetails {
  /** Provider name, for logs (for example "monzo"). */
  provider: string;
  /** What we were doing (for example "fetch balance"). */
  operation: string;
  /** HTTP status when the provider answered. */
  status?: number;
  /** Underlying cause, kept for debugging; never serialised to clients. */
  cause?: unknown;
}

export class BankProviderError extends Error {
  readonly code: BankProviderErrorCode;
  readonly provider: string;
  readonly operation: string;
  readonly status?: number;

  constructor(code: BankProviderErrorCode, message: string, details: BankProviderErrorDetails) {
    super(message, details.cause === undefined ? undefined : { cause: details.cause });
    this.name = new.target.name;
    this.code = code;
    this.provider = details.provider;
    this.operation = details.operation;
    this.status = details.status;
  }

  /** True when retrying later (without user action) may succeed. */
  get retryable(): boolean {
    return this.code === "RATE_LIMITED" || this.code === "UNAVAILABLE";
  }
}

/** The token was rejected or consent was revoked or expired (401, 403): the user must reconnect. */
export class BankAuthExpiredError extends BankProviderError {
  constructor(details: BankProviderErrorDetails) {
    super(
      "AUTH_EXPIRED",
      `${details.provider} ${details.operation}: access was rejected; the connection needs reconnecting`,
      details,
    );
  }
}

/** The provider throttled us (429). `retryAfterSeconds` is its `Retry-After`, when it sent one. */
export class BankRateLimitedError extends BankProviderError {
  readonly retryAfterSeconds?: number;

  constructor(details: BankProviderErrorDetails & { retryAfterSeconds?: number }) {
    super("RATE_LIMITED", `${details.provider} ${details.operation}: rate limited`, details);
    this.retryAfterSeconds = details.retryAfterSeconds;
  }
}

/** Timeout, network failure or 5xx, after the one permitted retry. */
export class BankUnavailableError extends BankProviderError {
  readonly reason: "timeout" | "network" | "server_error";

  constructor(
    details: BankProviderErrorDetails & { reason: "timeout" | "network" | "server_error" },
  ) {
    super(
      "UNAVAILABLE",
      `${details.provider} ${details.operation}: provider unavailable (${details.reason})`,
      details,
    );
    this.reason = details.reason;
  }
}

/** The provider answered 2xx but the body was not JSON or lacked a field we need. */
export class BankMalformedResponseError extends BankProviderError {
  constructor(details: BankProviderErrorDetails & { field?: string }) {
    super(
      "MALFORMED_RESPONSE",
      `${details.provider} ${details.operation}: unexpected response${details.field ? ` (${details.field})` : ""}`,
      details,
    );
  }
}

/** Any other 4xx: our request was refused (bad code, bad parameters). Not retryable. */
export class BankRequestRejectedError extends BankProviderError {
  constructor(details: BankProviderErrorDetails) {
    super(
      "REQUEST_REJECTED",
      `${details.provider} ${details.operation}: request rejected (HTTP ${details.status ?? "?"})`,
      details,
    );
  }
}

export function isBankProviderError(err: unknown): err is BankProviderError {
  return err instanceof BankProviderError;
}
