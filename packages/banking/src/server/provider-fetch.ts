import {
  BankAuthExpiredError,
  BankMalformedResponseError,
  BankRateLimitedError,
  BankRequestRejectedError,
  BankUnavailableError,
} from "./provider-errors.js";

/**
 * The one way bank-provider code talks HTTP (audit H5). Every call gets:
 *
 * - an 8 s deadline covering the response body as well as the headers;
 * - for GET only, one retry after a jittered pause on timeout, network failure or 5xx;
 * - on 429, the provider's `Retry-After` honoured: a GET waits and retries once when the wait is
 *   short (at most `maxRetryAfterMs`), otherwise a `BankRateLimitedError` carries the wait back;
 * - 401 and 403 as `BankAuthExpiredError`, other 4xx as `BankRequestRejectedError`.
 *
 * POST (token exchange, refresh, revoke) is never retried: a retried refresh could spend a
 * rotating refresh token twice. Response bodies of failed calls are discarded unread, so no
 * provider text (which can echo credentials) reaches an error message or a log.
 */

export const PROVIDER_TIMEOUT_MS = 8_000;
export const PROVIDER_MAX_RETRY_AFTER_MS = 2_000;
const RETRY_BASE_MS = 250;
const RETRY_JITTER_MS = 500;

export interface ProviderCallContext {
  /** Provider name, for error messages and logs (for example "monzo"). */
  provider: string;
  /** What the call is for (for example "fetch balance"). */
  operation: string;
  /**
   * An overall deadline for a whole sync (several calls). Once it aborts, the current call stops
   * and no retry starts; the failure is `BankUnavailableError` with reason `timeout`.
   */
  deadline?: AbortSignal;
}

export interface ProviderFetchOptions extends ProviderCallContext {
  timeoutMs?: number;
  maxRetryAfterMs?: number;
  /** Injected for tests; defaults to the global `fetch`. */
  fetchImpl?: typeof fetch;
  /** Injected for tests; defaults to `Math.random`. */
  random?: () => number;
}

export interface ProviderRequestInit {
  method?: "GET" | "POST";
  headers?: Record<string, string>;
  body?: string;
}

export interface ProviderResponse {
  status: number;
  headers: Headers;
  /** The full body, read inside the deadline. */
  text: string;
}

type AttemptOutcome =
  | { kind: "response"; response: ProviderResponse }
  | { kind: "timeout" }
  | { kind: "deadline" }
  | { kind: "network"; cause: unknown };

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** `Retry-After` as milliseconds: delta-seconds or an HTTP date. Undefined when absent or junk. */
export function parseRetryAfterMs(
  header: string | null,
  now: number = Date.now(),
): number | undefined {
  if (header === null) return undefined;
  const trimmed = header.trim();
  if (trimmed === "") return undefined;
  if (/^\d+$/.test(trimmed)) return Number(trimmed) * 1000;
  // An HTTP date always names a weekday or month; anything else ("-3", "soon") is junk.
  if (!/[a-z]{3}/i.test(trimmed)) return undefined;
  const at = Date.parse(trimmed);
  if (Number.isNaN(at)) return undefined;
  return Math.max(0, at - now);
}

async function discardBody(res: Response): Promise<void> {
  // The body of a failed call is unwanted; a failure to cancel it changes nothing.
  await res.body?.cancel().catch(() => undefined);
}

async function attempt(
  url: string,
  init: ProviderRequestInit,
  fetchImpl: typeof fetch,
  timeoutMs: number,
  deadline: AbortSignal | undefined,
): Promise<AttemptOutcome> {
  if (deadline?.aborted) return { kind: "deadline" };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onDeadline = () => controller.abort();
  deadline?.addEventListener("abort", onDeadline, { once: true });
  try {
    const res = await fetchImpl(url, {
      method: init.method ?? "GET",
      headers: init.headers,
      body: init.body,
      signal: controller.signal,
      // No bank API redirects; following one would resend the Authorization header or the
      // token form (client secret, refresh token) to wherever it pointed.
      redirect: "error",
    });
    if (!res.ok) {
      await discardBody(res);
      return { kind: "response", response: { status: res.status, headers: res.headers, text: "" } };
    }
    const text = await res.text();
    return { kind: "response", response: { status: res.status, headers: res.headers, text } };
  } catch (cause) {
    if (deadline?.aborted) return { kind: "deadline" };
    if (controller.signal.aborted) return { kind: "timeout" };
    return { kind: "network", cause };
  } finally {
    clearTimeout(timer);
    deadline?.removeEventListener("abort", onDeadline);
  }
}

/**
 * Makes one provider call under the policy above. Resolves only for a 2xx response; every
 * failure rejects with a typed `BankProviderError`.
 */
export async function providerFetch(
  url: string,
  init: ProviderRequestInit,
  options: ProviderFetchOptions,
): Promise<ProviderResponse> {
  const method = init.method ?? "GET";
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const timeoutMs = options.timeoutMs ?? PROVIDER_TIMEOUT_MS;
  const maxRetryAfterMs = options.maxRetryAfterMs ?? PROVIDER_MAX_RETRY_AFTER_MS;
  const random = options.random ?? Math.random;
  const ctx = { provider: options.provider, operation: options.operation };
  const maxAttempts = method === "GET" ? 2 : 1;

  for (let attemptNo = 1; ; attemptNo++) {
    const canRetry = attemptNo < maxAttempts;
    const outcome = await attempt(url, init, fetchImpl, timeoutMs, options.deadline);
    const backoff = () => sleep(RETRY_BASE_MS + random() * RETRY_JITTER_MS);

    if (outcome.kind === "deadline") {
      throw new BankUnavailableError({ ...ctx, reason: "timeout" });
    }

    if (outcome.kind === "timeout" || outcome.kind === "network") {
      if (canRetry) {
        await backoff();
        continue;
      }
      throw new BankUnavailableError({
        ...ctx,
        reason: outcome.kind,
        cause: outcome.kind === "network" ? outcome.cause : undefined,
      });
    }

    const { response } = outcome;
    const { status } = response;
    if (status >= 200 && status < 300) return response;

    if (status === 401 || status === 403) {
      throw new BankAuthExpiredError({ ...ctx, status });
    }

    if (status === 429) {
      const retryAfterMs = parseRetryAfterMs(response.headers.get("retry-after"));
      if (canRetry && retryAfterMs !== undefined && retryAfterMs <= maxRetryAfterMs) {
        await sleep(retryAfterMs + random() * RETRY_BASE_MS);
        continue;
      }
      throw new BankRateLimitedError({
        ...ctx,
        status,
        retryAfterSeconds: retryAfterMs === undefined ? undefined : Math.ceil(retryAfterMs / 1000),
      });
    }

    if (status >= 500) {
      if (canRetry) {
        await backoff();
        continue;
      }
      throw new BankUnavailableError({ ...ctx, status, reason: "server_error" });
    }

    throw new BankRequestRejectedError({ ...ctx, status });
  }
}

/** `providerFetch`, then the body parsed as JSON; a non-JSON body is `BankMalformedResponseError`. */
export async function providerFetchJson(
  url: string,
  init: ProviderRequestInit,
  options: ProviderFetchOptions,
): Promise<unknown> {
  const response = await providerFetch(url, init, options);
  try {
    return JSON.parse(response.text) as unknown;
  } catch {
    // No `cause`: a JSON parse error quotes the start of the body, which for a token call is the
    // token itself.
    throw new BankMalformedResponseError({
      provider: options.provider,
      operation: options.operation,
      status: response.status,
      field: "body",
    });
  }
}

// ---------------------------------------------------------------------------------------------
// Body readers. A provider answer we cannot read is a failure, never a default: a missing balance
// must not become 0 and a missing list must not become [] (audit H2).
// ---------------------------------------------------------------------------------------------

function malformed(ctx: ProviderCallContext, field: string): BankMalformedResponseError {
  return new BankMalformedResponseError({ ...ctx, field });
}

export function asRecord(
  value: unknown,
  field: string,
  ctx: ProviderCallContext,
): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    throw malformed(ctx, field);
  return value as Record<string, unknown>;
}

export function asArray(value: unknown, field: string, ctx: ProviderCallContext): unknown[] {
  if (!Array.isArray(value)) throw malformed(ctx, field);
  return value;
}

export function asString(value: unknown, field: string, ctx: ProviderCallContext): string {
  if (typeof value !== "string" || value === "") throw malformed(ctx, field);
  return value;
}

/** A finite number, or a numeric string (Open Banking sends amounts as strings). */
export function asFiniteNumber(value: unknown, field: string, ctx: ProviderCallContext): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && /^-?\d+(\.\d+)?$/.test(value.trim())) return Number(value);
  throw malformed(ctx, field);
}

/** An integer count of minor units (pence), converted to major units. */
export function minorUnitsToMajor(value: unknown, field: string, ctx: ProviderCallContext): number {
  const n = asFiniteNumber(value, field, ctx);
  if (!Number.isInteger(n)) throw malformed(ctx, field);
  return n / 100;
}

/** A parseable date-time string. */
export function asDate(value: unknown, field: string, ctx: ProviderCallContext): Date {
  const s = asString(value, field, ctx);
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) throw malformed(ctx, field);
  return d;
}

/**
 * A provider id about to go into a URL path, percent-encoded. `.` and `..` survive
 * `encodeURIComponent` and would move the request to another path on the bank's host, so they
 * are rejected.
 */
export function pathSegment(value: string, field: string, ctx: ProviderCallContext): string {
  if (value === "" || value === "." || value === "..") throw malformed(ctx, field);
  return encodeURIComponent(value);
}

export function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value !== "" ? value : undefined;
}
