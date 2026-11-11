import { BackendError, kindFromStatus } from "./backend-error";

export type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export interface ApiFetchOptions {
  accessToken: string | null | undefined;
  method?: HttpMethod;
  body?: unknown;
  /** Caller cancellation. A caller abort is rethrown as is, never reported as a backend failure. */
  signal?: AbortSignal;
  /** Timeout in milliseconds. Defaults to 15000. A timeout is reported as `unavailable`. */
  timeoutMs?: number;
  /** Set for endpoints that legitimately return no body (for example DELETE). */
  allowEmpty?: boolean;
}

const DEFAULT_TIMEOUT_MS = 15000;

function baseUrl(endpoint: string): string {
  const env =
    typeof window === "undefined"
      ? undefined
      : (window as Window & { ENV?: { VITE_API_URL?: string } }).ENV;
  const url = env?.VITE_API_URL;
  if (!url) throw new BackendError("unavailable", endpoint);
  return url.replace(/\/+$/, "");
}

/**
 * Browser-side API client. Reads the base URL from `window.ENV.VITE_API_URL` only and throws
 * `BackendError` for every failure so callers can show honest, generic messages.
 */
export async function apiFetch<T>(endpoint: string, opts: ApiFetchOptions): Promise<T> {
  const { accessToken, method = "GET", body, signal, timeoutMs = DEFAULT_TIMEOUT_MS } = opts;
  if (!accessToken) throw new BackendError("unauthorised", endpoint);
  const base = baseUrl(endpoint);

  const headers: Record<string, string> = { Authorization: `Bearer ${accessToken}` };
  if (body !== undefined) headers["Content-Type"] = "application/json";

  // A manual AbortController combines the timeout and the caller signal (same as backendFetch).
  const controller = new AbortController();
  const onCallerAbort = () => controller.abort(signal?.reason);
  if (signal?.aborted) onCallerAbort();
  else signal?.addEventListener("abort", onCallerAbort, { once: true });
  const timer = setTimeout(() => controller.abort(new Error("timeout")), timeoutMs);

  try {
    let res: Response;
    try {
      res = await fetch(`${base}${endpoint}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (cause) {
      if (signal?.aborted) throw cause;
      throw new BackendError("unavailable", endpoint, undefined, { cause });
    }

    if (!res.ok) {
      const error = new BackendError(kindFromStatus(res.status), endpoint, res.status);
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
          endpoint,
          res.status,
          { cause },
        );
      }
    }
    if (text.trim() === "") {
      if (opts.allowEmpty) return undefined as T;
      throw new BackendError("bad-response", endpoint, res.status);
    }
    try {
      return JSON.parse(text) as T;
    } catch (cause) {
      throw new BackendError("bad-response", endpoint, res.status, { cause });
    }
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onCallerAbort);
  }
}
