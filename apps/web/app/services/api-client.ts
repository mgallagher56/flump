import { BackendError, kindFromStatus } from "./backend-error";

export type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export interface ApiFetchOptions {
  accessToken: string | null | undefined;
  method?: HttpMethod;
  body?: unknown;
}

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
  const { accessToken, method = "GET", body } = opts;
  if (!accessToken) throw new BackendError("unauthorised", endpoint);
  const base = baseUrl(endpoint);

  const headers: Record<string, string> = { Authorization: `Bearer ${accessToken}` };
  if (body !== undefined) headers["Content-Type"] = "application/json";

  let res: Response;
  try {
    res = await fetch(`${base}${endpoint}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (cause) {
    throw new BackendError("unavailable", endpoint, undefined, { cause });
  }

  if (!res.ok) {
    const error = new BackendError(kindFromStatus(res.status), endpoint, res.status);
    try {
      const parsed = JSON.parse(await res.text()) as { message?: unknown };
      if (typeof parsed?.message === "string") error.detail = parsed.message;
    } catch {
      // No usable error body
    }
    throw error;
  }
  if (res.status === 204) return undefined as T;

  let text: string;
  try {
    text = await res.text();
  } catch (cause) {
    throw new BackendError("bad-response", endpoint, res.status, { cause });
  }
  if (text.trim() === "") return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch (cause) {
    throw new BackendError("bad-response", endpoint, res.status, { cause });
  }
}
