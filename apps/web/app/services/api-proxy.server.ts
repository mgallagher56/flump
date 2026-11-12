import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { apiConfig } from "~/config.server";
import { getAuthSession } from "~/utils/auth.server";
import { BackendError, kindFromStatus } from "./backend-error";

/**
 * Same-origin `/api/*` proxy (E20-N4). The browser never holds the access token: it calls
 * `/api/...` with a same-origin cookie session and this module attaches the Bearer token
 * server-side. It is a strict allow-list, not a relay: anything not listed is a 404.
 */

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

export interface ProxyRule {
  methods: readonly string[];
  /** Path pattern relative to `/api`, matched against the whole normalised path. */
  pattern: string;
}

/** Exactly the browser calls in the E20 inventory. A snapshot test fails if this grows. */
export const API_ALLOW_LIST: readonly ProxyRule[] = [
  { methods: ["PATCH"], pattern: "/user-profile" },
  { methods: ["PATCH"], pattern: "/user-profile/checklist" },
  { methods: ["POST"], pattern: "/user-profile/send-password-reset" },
  { methods: ["POST"], pattern: "/user-profile/reset-financial-data" },
  { methods: ["GET", "POST"], pattern: "/budget-entries" },
  { methods: ["PATCH", "DELETE"], pattern: `/budget-entries/${UUID}` },
  { methods: ["POST"], pattern: "/budget-entries/seed-defaults" },
  { methods: ["POST"], pattern: "/budget-entries/categories" },
  { methods: ["GET", "POST"], pattern: "/accounts" },
  { methods: ["PATCH"], pattern: `/accounts/${UUID}` },
];

const COMPILED = API_ALLOW_LIST.map((rule) => ({
  methods: rule.methods,
  regex: new RegExp(`^${rule.pattern}$`, "i"),
}));

export const MAX_BODY_BYTES = 64 * 1024;
export const PROXY_TIMEOUT_MS = 10_000;
export const WRITE_LIMIT = 120;
export const WRITE_WINDOW_MS = 60_000;

const WRITE_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);

/** Per-session-user sliding window of write timestamps. In memory, per server process. */
const writeLog = new Map<string, number[]>();

export function resetWriteLimiter(): void {
  writeLog.clear();
}

function takeWriteSlot(userId: string, now: number): boolean {
  const recent = (writeLog.get(userId) ?? []).filter((t) => now - t < WRITE_WINDOW_MS);
  if (recent.length >= WRITE_LIMIT) {
    writeLog.set(userId, recent);
    return false;
  }
  recent.push(now);
  writeLog.set(userId, recent);
  if (writeLog.size > 5000) {
    for (const [key, times] of writeLog) {
      if (times.every((t) => now - t >= WRITE_WINDOW_MS)) writeLog.delete(key);
    }
  }
  return true;
}

/**
 * Returns the normalised path below `/api`, or null when the raw path could be a traversal or
 * smuggling attempt (`..`, `%2e`, `%2f`, `%5c`, `//`, `\`) or is not under `/api/`.
 */
export function normaliseApiPath(rawPathname: string): string | null {
  if (!rawPathname.startsWith("/api/")) return null;
  const rest = rawPathname.slice("/api".length);
  if (/%2e|%2f|%5c/i.test(rest)) return null;
  if (rest.includes("..") || rest.includes("\\") || rest.includes("//")) return null;
  // biome-ignore lint/suspicious/noControlCharactersInRegex: rejecting control characters is the point
  if (/[\u0000-\u001f]/.test(rest)) return null;
  return rest.length > 1 && rest.endsWith("/") ? rest.slice(0, -1) : rest;
}

export function matchAllowList(method: string, path: string): boolean {
  return COMPILED.some((rule) => rule.methods.includes(method) && rule.regex.test(path));
}

function expectedOrigin(request: Request): string {
  const url = new URL(request.url);
  const proto =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase() ||
    url.protocol.replace(":", "");
  const host =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    request.headers.get("host") ||
    url.host;
  return `${proto}://${host}`;
}

function json(status: number, body: unknown, headers?: Headers): Response {
  const out = new Headers(headers);
  out.set("Content-Type", "application/json");
  out.set("Cache-Control", "no-store");
  return new Response(JSON.stringify(body), { status, headers: out });
}

async function readCappedBody(request: Request): Promise<string | "too-large"> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return "too-large";
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BODY_BYTES) {
      await reader.cancel().catch(() => undefined);
      return "too-large";
    }
    chunks.push(value);
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(merged);
}

export interface ProxySession {
  userId: string;
  accessToken: string;
  /** Session-refresh Set-Cookie headers from the auth helper, forwarded to the browser. */
  cookies: string[];
}

export type SessionResolver = (
  args: LoaderFunctionArgs | ActionFunctionArgs,
) => Promise<ProxySession | null>;

function splitSetCookie(headers: unknown): string[] {
  if (!headers) return [];
  const h = new Headers(headers as HeadersInit);
  if (typeof h.getSetCookie === "function") return h.getSetCookie();
  const single = h.get("set-cookie");
  return single ? [single] : [];
}

/** Default resolver: reuses the loader auth helper. No session means null, never a redirect. */
export const resolveSession: SessionResolver = async (args) => {
  const { user, accessToken, headers } = await getAuthSession(args, { ensureSignedIn: false });
  if (!user || !accessToken) return null;
  return { userId: String(user.id), accessToken, cookies: splitSetCookie(headers) };
};

export interface ProxyDeps {
  resolveSession?: SessionResolver;
  fetchImpl?: typeof fetch;
  baseUrl?: string;
  now?: () => number;
  timeoutMs?: number;
}

/** Handles one `/api/*` request. Never throws; every failure is a JSON response. */
export async function handleApiProxy(
  args: LoaderFunctionArgs | ActionFunctionArgs,
  deps: ProxyDeps = {},
): Promise<Response> {
  const { request } = args;
  const method = request.method.toUpperCase();
  const now = deps.now ?? Date.now;
  const doFetch = deps.fetchImpl ?? fetch;
  const timeoutMs = deps.timeoutMs ?? PROXY_TIMEOUT_MS;

  // 1. Path: normalise, then allow-list. Anything else is a 404 (also before any auth work).
  const path = normaliseApiPath(new URL(request.url).pathname);
  if (path === null || !matchAllowList(method, path)) return json(404, {});
  const endpoint = path;

  // 2. CSRF: custom header always, same-origin Origin on writes (and on any request that sends one).
  if (request.headers.get("x-flump-request") !== "1") return json(403, {});
  const origin = request.headers.get("origin");
  if (origin !== null ? origin !== expectedOrigin(request) : WRITE_METHODS.has(method)) {
    return json(403, {});
  }

  // 3. Session.
  let session: ProxySession | null;
  try {
    session = await (deps.resolveSession ?? resolveSession)(args);
  } catch {
    return json(401, {});
  }
  if (!session) return json(401, {});

  const cookieHeaders = new Headers();
  for (const cookie of session.cookies) cookieHeaders.append("Set-Cookie", cookie);

  // 4. Rate limit writes per session user.
  if (WRITE_METHODS.has(method) && !takeWriteSlot(session.userId, now())) {
    const limited = new Headers(cookieHeaders);
    limited.set("Retry-After", String(Math.ceil(WRITE_WINDOW_MS / 1000)));
    return json(429, {}, limited);
  }

  // 5. Body: capped, JSON only.
  let body: string | undefined;
  if (method !== "GET" && method !== "HEAD") {
    const text = await readCappedBody(request);
    if (text === "too-large") return json(413, {}, cookieHeaders);
    if (text !== "") {
      const type = request.headers.get("content-type") ?? "";
      if (!/^application\/json(\s*;|$)/i.test(type)) return json(415, {}, cookieHeaders);
      body = text;
    }
  }

  // 6. Forward. Only Content-Type and the Bearer token go upstream.
  const headers: Record<string, string> = { Authorization: `Bearer ${session.accessToken}` };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const controller = new AbortController();
  const onAbort = () => controller.abort(request.signal.reason);
  if (request.signal.aborted) onAbort();
  else request.signal.addEventListener("abort", onAbort, { once: true });
  const timer = setTimeout(() => controller.abort(new Error("timeout")), timeoutMs);

  try {
    let res: Response;
    try {
      res = await doFetch(`${deps.baseUrl ?? apiConfig.apiBaseUrl}${endpoint}`, {
        method,
        headers,
        body,
        signal: controller.signal,
        redirect: "manual",
      });
    } catch (cause) {
      const failure = new BackendError("unavailable", endpoint, undefined, { cause });
      return json(503, { kind: failure.kind }, cookieHeaders);
    }

    if (!res.ok) {
      // BackendError semantics: 401/403 keep their status, other 4xx may carry a validation
      // message, anything 5xx (or a redirect) is a generic 502. Never the body of a 5xx.
      const kind = kindFromStatus(res.status);
      if (kind === "server" || (res.status >= 300 && res.status < 400)) {
        return json(502, { kind: "server" }, cookieHeaders);
      }
      let message: string | undefined;
      if (res.status !== 401 && res.status !== 403) {
        try {
          const parsed = JSON.parse(await res.text()) as { message?: unknown };
          if (typeof parsed?.message === "string") message = parsed.message;
        } catch {
          // No usable error body
        }
      }
      return json(res.status, message === undefined ? { kind } : { kind, message }, cookieHeaders);
    }

    if (res.status === 204) {
      const out = new Headers(cookieHeaders);
      out.set("Cache-Control", "no-store");
      return new Response(null, { status: 204, headers: out });
    }
    let text: string;
    try {
      text = await res.text();
    } catch {
      return json(502, { kind: "bad-response" }, cookieHeaders);
    }
    const out = new Headers(cookieHeaders);
    out.set("Content-Type", "application/json");
    out.set("Cache-Control", "no-store");
    return new Response(text, { status: res.status, headers: out });
  } finally {
    clearTimeout(timer);
    request.signal.removeEventListener("abort", onAbort);
  }
}
