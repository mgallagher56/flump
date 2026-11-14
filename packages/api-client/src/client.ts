import { BackendError } from "./backend-error.js";
import {
  type CallOptions,
  type ContractSchema,
  callBackend,
  DEFAULT_TIMEOUT_MS,
  type EmptyCallOptions,
  type MaybeEmptyCallOptions,
  type SchemaCallOptions,
  stringField,
} from "./transport.js";

export type { HttpMethod } from "./transport.js";

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

type ClientOwned = "timeoutMs";
/** Options of one request: a contract schema for the body, or `schema: null` with `allowEmpty`. */
export type RequestOptions<T = unknown> =
  | Omit<SchemaCallOptions<T>, ClientOwned>
  | Omit<MaybeEmptyCallOptions<T>, ClientOwned>
  | Omit<EmptyCallOptions, ClientOwned>;

export interface ClientPolicy {
  minVersion: string;
  recommendedVersion: string;
}

/** A policy failure is its own result so callers can fail open. */
export type ClientPolicyResult =
  | { ok: true; policy: ClientPolicy }
  | { ok: false; error: BackendError };

export interface ApiClient {
  /** Calls `/v1<path>`. The body is validated with `options.schema`. */
  request(path: string, options: Omit<EmptyCallOptions, ClientOwned>): Promise<undefined>;
  request<T>(
    path: string,
    options: Omit<MaybeEmptyCallOptions<T>, ClientOwned>,
  ): Promise<T | undefined>;
  request<T>(path: string, options: Omit<SchemaCallOptions<T>, ClientOwned>): Promise<T>;
  getClientPolicy(signal?: AbortSignal): Promise<ClientPolicyResult>;
}

/**
 * Not in the contract manifest yet (the mobile plan, E12), so it has no contract schema: the
 * body is checked by `policyFrom` field by field.
 */
const POLICY_PATH = "/app/client-policy";

/** Accepts any JSON body; `policyFrom` then reads it without casts. */
const ANY_JSON: ContractSchema<unknown> = {
  safeParse: (u: unknown) => ({ success: true, data: u }),
};

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

function policyFrom(u: unknown): ClientPolicy | null {
  const minVersion = stringField(u, "minVersion");
  const recommendedVersion = stringField(u, "recommendedVersion");
  return minVersion !== undefined && recommendedVersion !== undefined
    ? { minVersion, recommendedVersion }
    : null;
}

export function createApiClient(options: ApiClientOptions): ApiClient {
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
    opts: CallOptions<T>,
  ): Promise<T | undefined> {
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    if (clientHeader) headers["X-Flump-Client"] = clientHeader;
    const cfg = { baseUrl: options.baseUrl, fetch: doFetch, headers: () => headers };
    const { data } = await callBackend<T>(cfg, path, { ...opts, timeoutMs });
    return data;
  }

  const isUnauthorised = (e: unknown) => e instanceof BackendError && e.status === 401;

  function request(path: string, opts: Omit<EmptyCallOptions, ClientOwned>): Promise<undefined>;
  function request<T>(
    path: string,
    opts: Omit<MaybeEmptyCallOptions<T>, ClientOwned>,
  ): Promise<T | undefined>;
  function request<T>(path: string, opts: Omit<SchemaCallOptions<T>, ClientOwned>): Promise<T>;
  async function request<T>(path: string, opts: RequestOptions<T>): Promise<T | undefined> {
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
      const raw = await attempt(POLICY_PATH, null, { schema: ANY_JSON, signal });
      const platform = options.client?.platform;
      const candidate: unknown =
        platform && typeof raw === "object" && raw !== null && platform in raw
          ? Reflect.get(raw, platform)
          : raw;
      const policy = policyFrom(candidate);
      if (!policy) {
        return { ok: false, error: new BackendError("bad-response", POLICY_PATH, 200) };
      }
      return { ok: true, policy };
    } catch (err) {
      if (err instanceof BackendError) return { ok: false, error: err };
      throw err;
    }
  }

  return { request, getClientPolicy };
}
