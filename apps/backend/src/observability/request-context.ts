import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Per-request context (M14). The request-context middleware opens one store per request, so every
 * log line and Sentry event written while serving it (controllers, services, async continuations)
 * can carry the request id without passing it around.
 */
export interface RequestContext {
  readonly requestId: string;
}

const storage = new AsyncLocalStorage<RequestContext>();

/**
 * An inbound `x-request-id` is kept only in this shape: no spaces, control characters or
 * separators, so it is safe to print verbatim in a log line or response header. The web server
 * forwards its own id (UUID) in the same header.
 */
const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{8,128}$/;

export const isSafeRequestId = (value: unknown): value is string =>
  typeof value === "string" && REQUEST_ID_PATTERN.test(value);

export function runWithRequestContext<T>(context: RequestContext, run: () => T): T {
  return storage.run(context, run);
}

/** The id of the request being served, or undefined outside one (boot, timers, jobs). */
export function currentRequestId(): string | undefined {
  return storage.getStore()?.requestId;
}
