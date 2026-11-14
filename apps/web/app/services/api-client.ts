import {
  type ContractSchema,
  callBackend,
  callBackendAll,
  type HttpMethod,
  type TransportConfig,
} from "@flump/api-client";

export type { HttpMethod } from "@flump/api-client";

interface ApiFetchBase {
  method?: HttpMethod;
  body?: unknown;
  /** Caller cancellation. A caller abort is rethrown as is, never reported as a backend failure. */
  signal?: AbortSignal;
  /** Timeout in milliseconds. Defaults to 15000. A timeout is reported as `unavailable`. */
  timeoutMs?: number;
  /** `Idempotency-Key` on a POST: a fresh UUID by default, `false` for none. */
  idempotencyKey?: string | false;
  /** Sent as `If-Match` (the entity's `ETag`, `"<updatedAt>"`) on a conditional update. */
  ifMatch?: string;
}

/** The 2xx body must match `schema`, the route's contract `*Response`. */
export interface ApiFetchSchemaOptions<T> extends ApiFetchBase {
  schema: ContractSchema<T>;
  allowEmpty?: false;
}
/** As above, but an empty body resolves `undefined`. */
export interface ApiFetchMaybeEmptyOptions<T> extends ApiFetchBase {
  schema: ContractSchema<T>;
  allowEmpty: true;
}
/** An endpoint with no response body. */
export interface ApiFetchEmptyOptions extends ApiFetchBase {
  schema: null;
  allowEmpty: true;
}
export type ApiFetchOptions<T> =
  | ApiFetchSchemaOptions<T>
  | ApiFetchMaybeEmptyOptions<T>
  | ApiFetchEmptyOptions;

/**
 * Same-origin proxy prefix (E20-N4). The server attaches the credentials and adds `/v1` when it
 * forwards, so this client sends paths unversioned (`version: false`).
 */
const PROXY: TransportConfig = {
  baseUrl: "/api",
  version: false,
  credentials: "same-origin",
  // Read through a wrapper so tests that replace globalThis.fetch are honoured.
  fetch: (input, init) => fetch(input, init),
  headers: () => ({ "X-Flump-Request": "1" }),
};

/**
 * Browser-side API client on the shared `callBackend` core. Calls the same-origin `/api` proxy
 * with no token, validates the body with the route's contract schema, and throws `BackendError`
 * for every failure so callers can show honest, generic messages.
 */
export function apiFetch(endpoint: string, opts: ApiFetchEmptyOptions): Promise<undefined>;
export function apiFetch<T>(
  endpoint: string,
  opts: ApiFetchMaybeEmptyOptions<T>,
): Promise<T | undefined>;
export function apiFetch<T>(endpoint: string, opts: ApiFetchSchemaOptions<T>): Promise<T>;
export async function apiFetch<T>(
  endpoint: string,
  opts: ApiFetchOptions<T>,
): Promise<T | undefined> {
  const { data } = await callBackend<T>(PROXY, endpoint, opts);
  return data;
}

/** GETs every page of a list: follows `X-Next-Cursor` until it is absent. */
export async function apiFetchAll<T>(
  endpoint: string,
  opts: { schema: ContractSchema<T[]>; signal?: AbortSignal; timeoutMs?: number },
): Promise<T[]> {
  const { data } = await callBackendAll<T>(PROXY, endpoint, opts);
  return data;
}
