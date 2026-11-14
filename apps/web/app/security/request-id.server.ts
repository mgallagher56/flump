import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";

/**
 * Per-request correlation id (BE-07, audit M14). `server/accessLog.ts` resolves one id per
 * incoming request, echoes it as `x-request-id`, puts it on the access log line and runs the rest
 * of the request inside `runWithRequestId`. Everything the request does afterwards (React Router
 * loaders and actions, `backend-client.server.ts`, the `/api` proxy) reads it with `getRequestId()`
 * and forwards it to the backend as `x-request-id`, so one id follows a request across tiers.
 */

export const REQUEST_ID_HEADER = "x-request-id";

/** What an inbound or forwarded id may look like: short, URL-safe, no whitespace or separators. */
export const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{8,128}$/;

type HeaderValue = string | string[] | undefined;
type HeaderBag = Record<string, HeaderValue>;

/**
 * A valid inbound `x-request-id` is kept; otherwise a valid `x-railway-request-id` (the edge's own
 * id); otherwise a fresh UUID. Anything outside `REQUEST_ID_PATTERN` (a header injection attempt,
 * an oversize value, a repeated header) is discarded, never echoed or logged.
 */
export function resolveRequestId(headers: HeaderBag): string {
  for (const name of [REQUEST_ID_HEADER, "x-railway-request-id"]) {
    const value = headers[name];
    if (typeof value === "string" && REQUEST_ID_PATTERN.test(value)) return value;
  }
  return randomUUID();
}

interface RequestContext {
  requestId: string;
  /**
   * The browser's address as Express resolved it (`req.ip`, honouring `trust proxy`), for the
   * signed client-IP header on backend calls (BE-07, M9; `services/client-ip.server.ts`).
   */
  clientIp?: string;
}

/**
 * One storage for the whole process. `server/` (loaded by `server.ts`) and `app/` (bundled into
 * `build/server/index.js`) each get their own copy of this module, so the instance lives on
 * `globalThis` under a registered symbol: both copies share it, and the id set by the Express
 * middleware is visible inside the React Router build.
 */
const STORAGE_KEY = Symbol.for("flump.web.requestContext");

function storage(): AsyncLocalStorage<RequestContext> {
  const holder = globalThis as typeof globalThis & {
    [STORAGE_KEY]?: AsyncLocalStorage<RequestContext>;
  };
  holder[STORAGE_KEY] ??= new AsyncLocalStorage<RequestContext>();
  return holder[STORAGE_KEY];
}

/**
 * Runs `fn` (and every async continuation it starts) with `requestId` as the current id, and the
 * client address when the caller knows it.
 */
export function runWithRequestId<T>(
  requestId: string,
  fn: () => T,
  extra: { clientIp?: string } = {},
): T {
  return storage().run({ requestId, ...(extra.clientIp ? { clientIp: extra.clientIp } : {}) }, fn);
}

/** The current request's client address, or `undefined` outside a request or when unknown. */
export function getClientIp(): string | undefined {
  return storage().getStore()?.clientIp;
}

/** The current request's id, or `undefined` outside a request (boot, a timer, a unit test). */
export function getRequestId(): string | undefined {
  return storage().getStore()?.requestId;
}

/**
 * `headers` plus `x-request-id` when there is a current request. For outgoing backend calls; a
 * caller-supplied id is left alone.
 */
export function withRequestIdHeader(headers: Record<string, string>): Record<string, string> {
  const requestId = getRequestId();
  if (!requestId || Object.keys(headers).some((k) => k.toLowerCase() === REQUEST_ID_HEADER)) {
    return headers;
  }
  return { ...headers, [REQUEST_ID_HEADER]: requestId };
}
