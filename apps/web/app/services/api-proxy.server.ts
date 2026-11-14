import {
  ErrorResponse,
  ETAG_HEADER,
  IDEMPOTENCY_KEY_HEADER,
  IdempotencyKey,
  IF_MATCH_HEADER,
  NEXT_CURSOR_HEADER,
  PageCursor,
  parseEtag,
} from "@flump/api-contract";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { apiConfig } from "~/config.server";
import { expectedOrigin } from "~/security/csrf.server";
import { withRequestIdHeader } from "~/security/request-id.server";
import { readSetCookies } from "~/security/session-cookies.server";
import { getAuthSession } from "~/utils/auth.server";
import { BackendError, kindFromStatus } from "./backend-error";
import { signedClientIpHeaders } from "./client-ip.server";

/**
 * Same-origin `/api/*` proxy (E20-N4). The browser never holds the access token: it calls
 * `/api/...` with a same-origin cookie session and this module attaches the Bearer token
 * server-side. It is a strict allow-list, not a relay: anything not listed is a 404.
 */

// Hex digits match in either case; the literal path segments are case-sensitive.
const UUID = "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}";

/** Checks one query value; the proxy forwards a parameter only when its check passes. */
type QueryCheck = (value: string) => boolean;

/** The paging parameters every GET may carry: `limit` (digits) and `cursor` (an X-Next-Cursor). */
const PAGE_QUERY: Readonly<Record<string, QueryCheck>> = {
  limit: (value) => /^\d{1,4}$/.test(value),
  cursor: (value) => PageCursor.safeParse(value).success,
};

export interface ProxyRule {
  methods: readonly string[];
  /** Path pattern relative to `/api`, matched against the whole normalised path. */
  pattern: string;
  /** Query parameters this route forwards on GET. Default: the paging parameters. */
  query?: Readonly<Record<string, QueryCheck>>;
}

/**
 * The browser calls, each a contract route. A snapshot test fails if this changes, and
 * api-proxy.allowlist.test.ts fails when a browser `apiFetch` call is not listed here.
 */
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
  // E30 monthly check-in and back-fill: one month (YYYY-MM) per request.
  { methods: ["PUT"], pattern: "/snapshots/\\d{4}-(0[1-9]|1[0-2])" },
  // AI connections (settings): list, create and revoke tokens, and preview the context pack.
  { methods: ["GET", "POST"], pattern: "/mcp-tokens" },
  { methods: ["DELETE"], pattern: `/mcp-tokens/${UUID}` },
  {
    methods: ["GET"],
    pattern: "/mcp-tokens/context-pack",
    query: { anonymize: (value) => value === "true" || value === "false" },
  },
  // Imports (E17): the review page's preview, commit and revert (the list and the batch load in
  // loaders, server-side). The backend answers 404 to a user the imports rollout does not include.
  { methods: ["POST"], pattern: `/imports/${UUID}/(preview|commit|revert)` },
];

const COMPILED = API_ALLOW_LIST.map((rule) => ({
  methods: rule.methods,
  regex: new RegExp(`^${rule.pattern}$`),
  query: rule.query ?? PAGE_QUERY,
}));

export const MAX_BODY_BYTES = 64 * 1024;
export const PROXY_TIMEOUT_MS = 10_000;

const WRITE_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);

// Rate limits (BE-07, M10): none here. The proxy used to keep its own per-process write window;
// the backend's per-user limits are authoritative (write 120 a minute, and the credential,
// destructive and other sensitive classes in the shared Postgres store), and its per-IP ceiling
// keys on the browser's address through the signed client-IP headers sent below (M9). A 429
// from the backend passes through to the browser with its message.

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

function findRule(method: string, path: string) {
  return COMPILED.find((rule) => rule.methods.includes(method) && rule.regex.test(path));
}

export function matchAllowList(method: string, path: string): boolean {
  return findRule(method, path) !== undefined;
}

/**
 * The query string forwarded upstream: on GET only, and only the parameters the matched rule
 * lists (by default `limit` and `cursor`), each passing its check. Empty string when there is
 * none; null when anything else is present, so the proxy stays an allow-list for query
 * parameters too.
 */
export function forwardedQuery(
  params: URLSearchParams,
  method: string,
  path: string,
): string | null {
  const allowed = findRule(method, path)?.query ?? PAGE_QUERY;
  const out = new URLSearchParams();
  for (const [key, value] of params) {
    if (method !== "GET" || out.has(key)) return null;
    const check = Object.hasOwn(allowed, key) ? allowed[key] : undefined;
    if (check?.(value)) out.set(key, value);
    else return null;
  }
  const text = out.toString();
  return text === "" ? "" : `?${text}`;
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

/** Default resolver: reuses the loader auth helper. No session means null, never a redirect. */
export const resolveSession: SessionResolver = async (args) => {
  const { user, accessToken, headers } = await getAuthSession(args, { ensureSignedIn: false });
  if (!user || !accessToken) return null;
  return { userId: String(user.id), accessToken, cookies: readSetCookies(headers) };
};

export interface ProxyDeps {
  resolveSession?: SessionResolver;
  fetchImpl?: typeof fetch;
  baseUrl?: string;
  now?: () => number;
  timeoutMs?: number;
  /** Where the client-IP signing key is read from (default process.env). */
  env?: Record<string, string | undefined>;
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
  // Defence in depth: a browser that sends Sec-Fetch-Site must say same-origin (or none, GET only).
  const fetchSite = request.headers.get("sec-fetch-site");
  if (
    fetchSite !== null &&
    fetchSite !== "same-origin" &&
    !(fetchSite === "none" && !WRITE_METHODS.has(method))
  ) {
    return json(403, {});
  }
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

  // 4. Body: capped, JSON only.
  let body: string | undefined;
  if (method !== "GET" && method !== "HEAD") {
    let text: string;
    try {
      text = await readCappedBody(request);
    } catch {
      // The client aborted or the stream failed mid-body.
      return json(400, {}, cookieHeaders);
    }
    if (text === "too-large") return json(413, {}, cookieHeaders);
    if (text !== "") {
      const type = request.headers.get("content-type") ?? "";
      if (!/^application\/json(\s*;|$)/i.test(type)) return json(415, {}, cookieHeaders);
      body = text;
    }
  }

  // 5. Forward to the stable `/v1` surface (BE-10, D10). Only Content-Type, the Bearer token, the
  // request id, the signed client IP and the validated write-convention headers (Idempotency-Key
  // on POST, If-Match on updates) go upstream; only `limit` and `cursor` survive from the query.
  const headers: Record<string, string> = withRequestIdHeader({
    Authorization: `Bearer ${session.accessToken}`,
    ...signedClientIpHeaders(request, deps.env, now()),
  });
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const idempotencyKey = request.headers.get(IDEMPOTENCY_KEY_HEADER);
  if (idempotencyKey !== null) {
    if (method !== "POST" || !IdempotencyKey.safeParse(idempotencyKey).success) {
      return json(400, { kind: "client" }, cookieHeaders);
    }
    headers[IDEMPOTENCY_KEY_HEADER] = idempotencyKey;
  }
  const ifMatch = request.headers.get(IF_MATCH_HEADER);
  if (ifMatch !== null) {
    if (method === "GET" || method === "POST" || parseEtag(ifMatch) === null) {
      return json(400, { kind: "client" }, cookieHeaders);
    }
    headers[IF_MATCH_HEADER] = ifMatch;
  }
  const query = forwardedQuery(new URL(request.url).searchParams, method, endpoint);
  if (query === null) return json(400, { kind: "client" }, cookieHeaders);
  const controller = new AbortController();
  const onAbort = () => controller.abort(request.signal.reason);
  if (request.signal.aborted) onAbort();
  else request.signal.addEventListener("abort", onAbort, { once: true });
  const timer = setTimeout(() => controller.abort(new Error("timeout")), timeoutMs);

  try {
    let res: Response;
    try {
      res = await doFetch(`${deps.baseUrl ?? apiConfig.apiBaseUrl}/v1${endpoint}${query}`, {
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
      // From the BE-09 envelope only `code`, `requestId` and (not on 401/403) `message` pass.
      const out: { kind: string; code?: string; message?: string; requestId?: string } = { kind };
      const envelope = ErrorResponse.safeParse(await res.json().catch(() => null));
      if (envelope.success) {
        out.code = envelope.data.code;
        out.requestId = envelope.data.requestId;
        if (res.status !== 401 && res.status !== 403) out.message = envelope.data.message;
      }
      const errorHeaders = new Headers(cookieHeaders);
      // A backend 429 keeps its Retry-After, so the browser knows when to try again.
      const retryAfter = res.status === 429 ? res.headers.get("retry-after") : null;
      if (retryAfter && /^\d{1,6}$/.test(retryAfter)) errorHeaders.set("Retry-After", retryAfter);
      return json(res.status, out, errorHeaders);
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
    // Paging and versioning headers the browser client reads; each is validated before it passes.
    const nextCursor = res.headers.get(NEXT_CURSOR_HEADER);
    if (nextCursor !== null && PageCursor.safeParse(nextCursor).success) {
      out.set(NEXT_CURSOR_HEADER, nextCursor);
    }
    const etag = res.headers.get(ETAG_HEADER);
    if (etag !== null && parseEtag(etag) !== null) out.set(ETAG_HEADER, etag);
    return new Response(text, { status: res.status, headers: out });
  } finally {
    clearTimeout(timer);
    request.signal.removeEventListener("abort", onAbort);
  }
}
