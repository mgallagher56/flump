import { BackendError, kindFromStatus } from "./backend-error.js";

export type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

/** Structural stand-in for a zod schema, so this package needs no zod dependency. */
export interface ResponseSchema<T> {
  parse(u: unknown): T;
}

export type ClientPlatform = "ios" | "android";

export interface ClientInfo {
  version: string;
  platform: ClientPlatform | (string & {});
}

/**
 * `refreshed`: a new token is available, retry once. `ended`: the session is over.
 * `retryable`: refresh failed transiently, so report `unavailable`, never `unauthorised`.
 */
export type RefreshOutcome = "refreshed" | "ended" | "retryable";

export interface ApiClientOptions {
  baseUrl: string;
  getAccessToken: () => string | null | undefined | Promise<string | null | undefined>;
  /** Called once for all concurrent 401s. Without it a 401 is `unauthorised`. */
  onUnauthorised?: () => Promise<RefreshOutcome>;
  /** Sent as `X-Flump-Client: mobile/<version> (<platform>)` on every request. */
  client?: ClientInfo;
  fetch?: typeof fetch;
  /** Defaults to 15000. A timeout is reported as `unavailable`. */
  timeoutMs?: number;
}

export interface RequestOptions<T = unknown> {
  method?: HttpMethod;
  body?: unknown;
  /** A caller abort is rethrown as is, never reported as a backend failure. */
  signal?: AbortSignal;
  /** Set for endpoints that legitimately return no body (for example DELETE). */
  allowEmpty?: boolean;
  schema?: ResponseSchema<T>;
}

export interface ClientPolicy {
  minVersion: string;
  recommendedVersion: string;
}

/** A policy failure is its own result so callers can fail open. */
export type ClientPolicyResult =
  | { ok: true; policy: ClientPolicy }
  | { ok: false; error: BackendError };

export interface ApiClient {
  request<T = unknown>(path: string, options?: RequestOptions<T>): Promise<T>;
  getClientPolicy(signal?: AbortSignal): Promise<ClientPolicyResult>;
}

const DEFAULT_TIMEOUT_MS = 15000;
const POLICY_PATH = "/app/client-policy";

function parseVersion(version: string): number[] {
  const core = version.trim().replace(/^v/i, "").split(/[-+]/)[0] ?? "";
  return core.split(".").map((part) => {
    const n = Number.parseInt(part, 10);
    return Number.isNaN(n) ? 0 : n;
  });
}

/** True when `version` is strictly lower than `policy.minVersion` (numeric semver compare). */
export function isBelowMin(version: string, policy: Pick<ClientPolicy, "minVersion">): boolean {
  const a = parseVersion(version);
  const b = parseVersion(policy.minVersion);
  const len = Math.max(a.length, b.length, 3);
  for (let i = 0; i < len; i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return diff < 0;
  }
  return false;
}

function isPolicy(u: unknown): u is ClientPolicy {
  if (typeof u !== "object" || u === null) return false;
  const p = u as Record<string, unknown>;
  return typeof p.minVersion === "string" && typeof p.recommendedVersion === "string";
}

export function createApiClient(options: ApiClientOptions): ApiClient {
  const base = options.baseUrl.replace(/\/+$/, "");
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const doFetch = (...args: Parameters<typeof fetch>) => (options.fetch ?? fetch)(...args);
  const clientHeader = options.client
    ? `mobile/${options.client.version} (${options.client.platform})`
    : undefined;

  let refreshing: Promise<RefreshOutcome> | null = null;
  function refreshOnce(): Promise<RefreshOutcome> {
    if (!refreshing) {
      const onUnauthorised = options.onUnauthorised;
      const run = onUnauthorised
        ? Promise.resolve().then(onUnauthorised)
        : Promise.resolve<RefreshOutcome>("ended");
      refreshing = run
        .catch((): RefreshOutcome => "retryable")
        .finally(() => {
          refreshing = null;
        });
    }
    return refreshing;
  }

  /** Waits for the shared refresh, bounded by the caller's signal and `timeoutMs`. */
  function waitForRefresh(path: string, signal?: AbortSignal): Promise<RefreshOutcome> {
    return new Promise<RefreshOutcome>((resolve, reject) => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const onAbort = () => finish(() => reject(signal?.reason));
      const finish = (settle: () => void) => {
        clearTimeout(timer);
        signal?.removeEventListener("abort", onAbort);
        settle();
      };
      if (signal?.aborted) return onAbort();
      signal?.addEventListener("abort", onAbort, { once: true });
      timer = setTimeout(
        () => finish(() => reject(new BackendError("unavailable", path))),
        timeoutMs,
      );
      refreshOnce().then(
        (outcome) => finish(() => resolve(outcome)),
        (cause) =>
          finish(() => reject(new BackendError("unavailable", path, undefined, { cause }))),
      );
    });
  }

  async function readToken(path: string): Promise<string | null> {
    try {
      return (await options.getAccessToken()) || null;
    } catch (cause) {
      throw new BackendError("unavailable", path, undefined, { cause });
    }
  }

  async function attempt<T>(
    path: string,
    token: string | null,
    opts: RequestOptions<T>,
  ): Promise<T> {
    const { method = "GET", body, signal, schema } = opts;
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    if (clientHeader) headers["X-Flump-Client"] = clientHeader;
    if (body !== undefined) headers["Content-Type"] = "application/json";

    const controller = new AbortController();
    const onCallerAbort = () => controller.abort(signal?.reason);
    if (signal?.aborted) onCallerAbort();
    else signal?.addEventListener("abort", onCallerAbort, { once: true });
    const timer = setTimeout(() => controller.abort(new Error("timeout")), timeoutMs);

    try {
      let res: Response;
      try {
        res = await doFetch(`${base}${path}`, {
          method,
          headers,
          body: body === undefined ? undefined : JSON.stringify(body),
          signal: controller.signal,
        });
      } catch (cause) {
        if (signal?.aborted) throw cause;
        throw new BackendError("unavailable", path, undefined, { cause });
      }

      if (!res.ok) {
        const error = new BackendError(kindFromStatus(res.status), path, res.status);
        // Only 4xx other than 401 and 403 may surface backend text (for example validation messages).
        if (res.status >= 400 && res.status < 500 && res.status !== 401 && res.status !== 403) {
          try {
            const parsed = JSON.parse(await res.text()) as { message?: unknown };
            if (typeof parsed?.message === "string") error.detail = parsed.message;
          } catch {
            // No usable error body
          }
        }
        throw error;
      }

      let text = "";
      if (res.status !== 204) {
        try {
          text = await res.text();
        } catch (cause) {
          if (signal?.aborted) throw cause;
          throw new BackendError(
            controller.signal.aborted ? "unavailable" : "bad-response",
            path,
            res.status,
            { cause },
          );
        }
      }
      if (text.trim() === "") {
        if (opts.allowEmpty) return undefined as T;
        throw new BackendError("bad-response", path, res.status);
      }
      // Parse failures deliberately drop the cause: it can quote the response body.
      let json: unknown;
      try {
        json = JSON.parse(text);
      } catch {
        throw new BackendError("bad-response", path, res.status);
      }
      if (!schema) return json as T;
      try {
        return schema.parse(json);
      } catch {
        throw new BackendError("bad-response", path, res.status);
      }
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onCallerAbort);
    }
  }

  const isUnauthorised = (e: unknown) => e instanceof BackendError && e.status === 401;

  async function request<T = unknown>(path: string, opts: RequestOptions<T> = {}): Promise<T> {
    const token = await readToken(path);
    if (!token) throw new BackendError("unauthorised", path);
    try {
      return await attempt(path, token, opts);
    } catch (err) {
      if (!isUnauthorised(err)) throw err;
    }

    // A request that raced a refresh may hold a stale token: retry with the new one, no second refresh.
    let current = await readToken(path);
    if (current === token || !current) {
      const outcome = await waitForRefresh(path, opts.signal);
      if (outcome === "retryable") throw new BackendError("unavailable", path);
      if (outcome === "ended") throw new BackendError("unauthorised", path, 401);
      current = await readToken(path);
      if (!current) throw new BackendError("unauthorised", path, 401);
    }
    // Retry exactly once; a second 401 propagates as `unauthorised`.
    return attempt(path, current, opts);
  }

  async function getClientPolicy(signal?: AbortSignal): Promise<ClientPolicyResult> {
    try {
      // Unauthenticated: fetched directly so a missing token cannot block the version gate.
      const raw = await attempt<unknown>(POLICY_PATH, null, { signal });
      const platform = options.client?.platform;
      const record = raw as Record<string, unknown> | null;
      const candidate =
        platform && record && typeof record === "object" && platform in record
          ? record[platform]
          : raw;
      if (!isPolicy(candidate)) {
        return { ok: false, error: new BackendError("bad-response", POLICY_PATH, 200) };
      }
      return {
        ok: true,
        policy: {
          minVersion: candidate.minVersion,
          recommendedVersion: candidate.recommendedVersion,
        },
      };
    } catch (err) {
      if (err instanceof BackendError) return { ok: false, error: err };
      throw err;
    }
  }

  return { request, getClientPolicy };
}
