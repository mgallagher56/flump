import {
  ErrorResponse,
  IDEMPOTENCY_KEY_HEADER,
  IF_MATCH_HEADER,
  NEXT_CURSOR_HEADER,
} from "@flump/api-contract";
import { BackendError, kindFromStatus } from "./backend-error.js";

export type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

/** The stable API surface (docs/api/versioning.md). Every client calls `/v1`. */
export const API_VERSION_PREFIX = "/v1";

/** `path` under `/v1`, unless it is already there. */
export function versionedPath(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (p === API_VERSION_PREFIX || /^\/v1(?=[/?#])/.test(p)) return p;
  return `${API_VERSION_PREFIX}${p}`;
}

/** One failed check of a schema: only where, never the value. */
export interface ContractIssue {
  readonly path: ReadonlyArray<PropertyKey>;
  /** zod's issue code; `unrecognized_keys` issues also list the `keys`. */
  readonly code?: string;
  readonly keys?: ReadonlyArray<string>;
}

export type ContractParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: { issues: ReadonlyArray<ContractIssue> } };

/**
 * The part of a contract schema the transport uses. Structural, so a zod schema from
 * `@flump/api-contract` fits without this package naming zod.
 */
export interface ContractSchema<T> {
  safeParse(u: unknown): ContractParseResult<T>;
}

export interface TransportConfig {
  /** Origin (or proxy prefix) the path is appended to. Trailing slashes are ignored. */
  baseUrl: string;
  fetch?: typeof fetch;
  /** Headers for each attempt (auth, request id, client info). Read once per call. */
  headers?: () => Record<string, string> | Promise<Record<string, string>>;
  /**
   * `false` sends the path as given. For a proxy that adds `/v1` itself when it forwards
   * (the web app's same-origin `/api`). Default: prefix `/v1` with `versionedPath`.
   */
  version?: boolean;
  /** Passed to fetch, for example `same-origin` for the browser proxy. */
  credentials?: RequestCredentials;
}

export type QueryValue = string | number | boolean | null | undefined;

interface BaseCallOptions {
  method?: HttpMethod;
  body?: unknown;
  /** A caller abort is rethrown as is, never reported as a backend failure. */
  signal?: AbortSignal;
  /** Defaults to 15000. A timeout is reported as `unavailable`. */
  timeoutMs?: number;
  /** Appended to the path. `null` and `undefined` values are left out. */
  query?: Record<string, QueryValue>;
  /**
   * `Idempotency-Key` for a POST. Default: a fresh UUID per call (the backend ignores it on
   * routes that take none). A string is sent as given (reuse it to retry safely); `false` sends
   * none. Never sent on other methods.
   */
  idempotencyKey?: string | false;
  /** Sent as `If-Match` (the `ETag` last seen) on conditional updates. */
  ifMatch?: string;
}

/** A JSON endpoint: the body is required and must match `schema`. */
export interface SchemaCallOptions<T> extends BaseCallOptions {
  schema: ContractSchema<T>;
  allowEmpty?: false;
}

/** A JSON endpoint that may also answer with no body (data is then `undefined`). */
export interface MaybeEmptyCallOptions<T> extends BaseCallOptions {
  schema: ContractSchema<T>;
  allowEmpty: true;
}

/** An endpoint with no response body. Any body that does come back is ignored. */
export interface EmptyCallOptions extends BaseCallOptions {
  schema: null;
  allowEmpty: true;
}

export type CallOptions<T> = SchemaCallOptions<T> | MaybeEmptyCallOptions<T> | EmptyCallOptions;

export interface CallResult<T> {
  data: T;
  /** The `X-Next-Cursor` response header, `null` on the last page or a non-list. */
  nextCursor: string | null;
  status: number;
  /** The response's `x-request-id`, else the one this call sent. */
  requestId?: string;
}

export const DEFAULT_TIMEOUT_MS = 15000;
/** `callBackendAll` stops with `bad-response` after this many pages (a cursor loop). */
export const MAX_PAGES = 100;
const MAX_ISSUE_PATHS = 20;
const REQUEST_ID_HEADER = "x-request-id";

function headerIn(headers: Record<string, string>, name: string): string | undefined {
  const wanted = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === wanted) return value;
  }
  return undefined;
}

function withQuery(path: string, query?: Record<string, QueryValue>): string {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== null && value !== undefined) params.append(key, String(value));
  }
  const qs = params.toString();
  if (!qs) return path;
  return `${path}${path.includes("?") ? "&" : "?"}${qs}`;
}

function issuePathsOf(issues: ReadonlyArray<ContractIssue>): string[] {
  return issues
    .slice(0, MAX_ISSUE_PATHS)
    .map((issue) =>
      issue.path
        .map((part) => (typeof part === "symbol" ? (part.description ?? "symbol") : String(part)))
        .join("."),
    );
}

/** `u[key]` when `u` is an object and that field is a string. */
export function stringField(u: unknown, key: string): string | undefined {
  if (typeof u !== "object" || u === null) return undefined;
  const value: unknown = Reflect.get(u, key);
  return typeof value === "string" ? value : undefined;
}

/** Reads the error envelope. Only 4xx other than 401 and 403 may surface backend text. */
async function errorFor(
  res: Response,
  endpoint: string,
  sentRequestId: string | undefined,
): Promise<BackendError> {
  let body: unknown = null;
  try {
    const text = await res.text();
    body = text.trim() === "" ? null : JSON.parse(text);
  } catch {
    body = null;
  }
  const envelope = ErrorResponse.safeParse(body);
  // A body that is not the envelope (an older backend or a proxy) is read field by field.
  const code = envelope.success ? envelope.data.code : stringField(body, "code");

  let kind = kindFromStatus(res.status);
  // A closed-beta refusal (E19 A7): `code` in the envelope (`error` was the field before BE-09).
  if (
    res.status === 403 &&
    (code === "not_invited" || stringField(body, "error") === "not_invited")
  ) {
    kind = "not-invited";
  }
  const error = new BackendError(kind, endpoint, res.status);
  if (code) error.code = code;
  error.requestId =
    (envelope.success ? envelope.data.requestId : undefined) ??
    res.headers.get(REQUEST_ID_HEADER) ??
    sentRequestId;
  if (res.status >= 400 && res.status < 500 && res.status !== 401 && res.status !== 403) {
    const message = envelope.success ? envelope.data.message : stringField(body, "message");
    if (message !== undefined) error.detail = message;
  }
  return error;
}

/**
 * The one client core for the Flump backend. Adds `/v1` (unless `cfg.version` is false), the
 * JSON body, `Idempotency-Key` on POST and `If-Match` when given; bounds the call with a timeout;
 * validates the 2xx body with the contract schema; and reports every failure as a BackendError
 * whose message never carries a token, base URL or body. A BackendError's `endpoint` is `path`
 * as the caller gave it (with the query), without the `/v1` prefix.
 *
 * The timeout and caller signal are combined with a manual AbortController rather than
 * AbortSignal.any/timeout, so it behaves the same under fake timers and on older runtimes.
 */
export function callBackend(
  cfg: TransportConfig,
  path: string,
  opts: EmptyCallOptions,
): Promise<CallResult<undefined>>;
export function callBackend<T>(
  cfg: TransportConfig,
  path: string,
  opts: MaybeEmptyCallOptions<T>,
): Promise<CallResult<T | undefined>>;
export function callBackend<T>(
  cfg: TransportConfig,
  path: string,
  opts: SchemaCallOptions<T>,
): Promise<CallResult<T>>;
export function callBackend<T>(
  cfg: TransportConfig,
  path: string,
  opts: CallOptions<T>,
): Promise<CallResult<T | undefined>>;
export async function callBackend<T>(
  cfg: TransportConfig,
  path: string,
  opts: CallOptions<T>,
): Promise<CallResult<T | undefined>> {
  const { method = "GET", body, signal, timeoutMs = DEFAULT_TIMEOUT_MS } = opts;
  // Errors name the path the caller asked for; the URL carries the version.
  // The error endpoint is the bare path: a cursor can encode a row's sort key, so no query in errors.
  const endpoint = path;
  const target = withQuery(cfg.version === false ? path : versionedPath(path), opts.query);
  const base = cfg.baseUrl.replace(/\/+$/, "");
  const doFetch = cfg.fetch ?? fetch;

  // The caller's signal is linked before anything is awaited, so an abort that lands while the
  // headers resolve still reaches fetch.
  const controller = new AbortController();
  const onCallerAbort = () => controller.abort(signal?.reason);
  if (signal?.aborted) onCallerAbort();
  else signal?.addEventListener("abort", onCallerAbort, { once: true });
  const timer = setTimeout(() => controller.abort(new Error("timeout")), timeoutMs);

  try {
    let headers: Record<string, string>;
    try {
      // Awaited only when async, so a call with sync headers reaches fetch in the same tick.
      const given = cfg.headers?.();
      headers = { ...((given instanceof Promise ? await given : given) ?? {}) };
    } catch (cause) {
      throw new BackendError("unavailable", endpoint, undefined, { cause });
    }
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (method === "POST" && opts.idempotencyKey !== false) {
      headers[IDEMPOTENCY_KEY_HEADER] = opts.idempotencyKey ?? crypto.randomUUID();
    }
    if (opts.ifMatch) headers[IF_MATCH_HEADER] = opts.ifMatch;
    const sentRequestId = headerIn(headers, REQUEST_ID_HEADER);

    let res: Response;
    try {
      res = await doFetch(`${base}${target}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
        ...(cfg.credentials ? { credentials: cfg.credentials } : {}),
      });
    } catch (cause) {
      if (signal?.aborted) throw cause;
      throw new BackendError("unavailable", endpoint, undefined, { cause });
    }

    if (!res.ok) throw await errorFor(res, endpoint, sentRequestId);

    const requestId = res.headers.get(REQUEST_ID_HEADER) ?? sentRequestId;
    const nextCursor = res.headers.get(NEXT_CURSOR_HEADER);
    const result = (data: T | undefined): CallResult<T | undefined> => ({
      data,
      nextCursor: nextCursor || null,
      status: res.status,
      ...(requestId ? { requestId } : {}),
    });
    const badResponse = (issuePaths?: string[]) => {
      const error = new BackendError("bad-response", endpoint, res.status);
      if (requestId) error.requestId = requestId;
      if (issuePaths) error.issuePaths = issuePaths;
      return error;
    };

    let text = "";
    if (res.status !== 204) {
      try {
        text = await res.text();
      } catch (cause) {
        if (signal?.aborted) throw cause;
        if (controller.signal.aborted) {
          throw new BackendError("unavailable", endpoint, res.status, { cause });
        }
        throw badResponse();
      }
    }
    if (opts.schema === null) return result(undefined);
    if (text.trim() === "") {
      if (opts.allowEmpty) return result(undefined);
      throw badResponse();
    }
    // Parse failures deliberately drop the cause: it can quote the response body.
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      throw badResponse();
    }
    const parsed = parseResponse(opts.schema, json);
    if (!parsed.success) throw badResponse(issuePathsOf(parsed.error.issues));
    return result(parsed.data);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onCallerAbort);
  }
}

const MAX_STRIP_ROUNDS = 20;

/**
 * Parses a response body with a contract schema, ignoring fields the client does not know
 * (docs/api/versioning.md: v1 changes are additive, so a newer backend may add a field). The
 * contract's response schemas are strict for the server's own tests; here an issue that is only
 * `unrecognized_keys` drops those keys from a copy and parses again. Any other issue (a missing
 * field, a wrong type) is still a failure.
 */
export function parseResponse<T>(schema: ContractSchema<T>, body: unknown): ContractParseResult<T> {
  let parsed = schema.safeParse(body);
  let current = body;
  for (let round = 0; round < MAX_STRIP_ROUNDS && !parsed.success; round++) {
    const issues = parsed.error.issues;
    if (issues.length === 0 || !issues.every((i) => i.code === "unrecognized_keys" && i.keys)) {
      return parsed;
    }
    current = structuredClone(current);
    for (const issue of issues) {
      let target: unknown = current;
      for (const segment of issue.path) {
        target =
          target !== null && typeof target === "object"
            ? (target as Record<PropertyKey, unknown>)[segment]
            : undefined;
      }
      if (target === null || typeof target !== "object") return parsed;
      for (const key of issue.keys ?? []) delete (target as Record<string, unknown>)[key];
    }
    parsed = schema.safeParse(current);
  }
  return parsed;
}

export type ListCallOptions<T> = Omit<SchemaCallOptions<T[]>, "method" | "body" | "idempotencyKey">;

/**
 * GETs every page of a list: follows `X-Next-Cursor` (sent back as `cursor=`) until it is
 * absent. More than MAX_PAGES pages is a `bad-response` (a server that never stops paging).
 */
export async function callBackendAll<T>(
  cfg: TransportConfig,
  path: string,
  opts: ListCallOptions<T>,
): Promise<CallResult<T[]>> {
  const rows: T[] = [];
  let cursor: string | null = null;
  let last: CallResult<T[]> | undefined;
  for (let page = 0; page < MAX_PAGES; page++) {
    const query: Record<string, QueryValue> = cursor
      ? { ...opts.query, cursor }
      : { ...opts.query };
    last = await callBackend(cfg, path, { ...opts, method: "GET", query });
    rows.push(...last.data);
    cursor = last.nextCursor;
    if (!cursor) return { ...last, data: rows, nextCursor: null };
  }
  const error = new BackendError("bad-response", path, last?.status);
  if (last?.requestId) error.requestId = last.requestId;
  throw error;
}
