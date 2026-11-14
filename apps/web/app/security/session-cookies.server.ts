import { devSessionClearCookie, isDevSessionEnabled } from "~/utils/devSession.server";
import { legacySessionCookieClear, sessionCookieClear } from "~/utils/sessionPolicy.server";

/**
 * Refreshed-session cookie forwarding (E20-N2). `authkitLoader` refreshes an expired access token
 * and hands back a sealed `Set-Cookie`; if that never reaches the browser the old refresh token is
 * used again on every request. `getAuthSession` records the cookie here, keyed by the per-request
 * router context (React Router hands loaders a fresh `Request`, but the same context object as the
 * root middleware), and the middleware appends it to the final response exactly once.
 */

const pending = new WeakMap<object, Map<string, string>>();

export function cookieName(setCookie: string): string {
  return setCookie.slice(0, Math.max(0, setCookie.indexOf("="))).trim();
}

/** Every Set-Cookie value in `headers` (a Headers, record or tuple list). */
export function readSetCookies(headers: unknown): string[] {
  if (!headers) return [];
  return new Headers(headers as HeadersInit).getSetCookie();
}

/**
 * Remember refreshed cookies for this request. One entry per cookie name, so several loaders that
 * each refresh in the same request still produce a single Set-Cookie per name (the last one wins).
 */
export function recordRefreshedCookies(key: object | undefined, headers: unknown): void {
  if (!key || typeof key !== "object") return;
  const cookies = readSetCookies(headers);
  if (cookies.length === 0) return;
  const store = pending.get(key) ?? new Map<string, string>();
  for (const cookie of cookies) store.set(cookieName(cookie), cookie);
  pending.set(key, store);
}

/**
 * Append the recorded cookies to `response`. A cookie is skipped when the response already sets
 * one with the same name (the logout destroy cookie, an authkit redirect, the proxy's own
 * forwarding), so nothing is duplicated or overwritten. Returns the same response when nothing
 * needed adding.
 */
export function applyRefreshedCookies(key: object, response: Response): Response {
  const store = pending.get(key);
  if (!store) return response;
  pending.delete(key);
  const present = new Set(readSetCookies(response.headers).map(cookieName));
  const toAdd = [...store].filter(([name]) => !present.has(name)).map(([, cookie]) => cookie);
  if (toAdd.length === 0) return response;
  const headers = new Headers(response.headers);
  for (const cookie of toAdd) headers.append("Set-Cookie", cookie);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

type Env = Record<string, string | undefined>;

/** The non-HttpOnly marker the client reads to know a session may exist. */
export const PRESENCE_COOKIE_NAME = "flump_has_session";

/** True when the request reached us over https, directly or through the trusted proxy. */
function isHttpsRequest(request: Request): boolean {
  if (new URL(request.url).protocol === "https:") return true;
  return request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase() === "https";
}

/**
 * The one list of Set-Cookie values that ends the web session, shared by `/logout` and the
 * account-delete action so the two can never drift: the authkit session cookie, the presence
 * cookie and (in production, when the name changed) the legacy session cookie; or, in the e2e
 * dev-session mode, the dev session cookie and the presence cookie. The WorkOS session itself is
 * ended separately by `/logout` (authkit `signOut`), not here.
 */
export function sessionClearCookies(request: Request, env: Env = process.env): string[] {
  if (isDevSessionEnabled(env)) {
    return [devSessionClearCookie, `${PRESENCE_COOKIE_NAME}=; Path=/; SameSite=Lax; Max-Age=0`];
  }
  const secure = isHttpsRequest(request) ? "; Secure" : "";
  const cookies = [
    sessionCookieClear(env),
    `${PRESENCE_COOKIE_NAME}=; Path=/; SameSite=Lax; Max-Age=0${secure}`,
  ];
  const legacy = legacySessionCookieClear(env);
  if (legacy) cookies.push(legacy);
  return cookies;
}

/**
 * `headers` with every `sessionClearCookies` value appended, except a cookie the headers already
 * set (authkit's own `signOut` destroy cookie wins over ours, so nothing is sent twice).
 */
export function appendSessionClearCookies(
  headers: Headers,
  request: Request,
  env: Env = process.env,
): Headers {
  const present = new Set(headers.getSetCookie().map(cookieName));
  for (const cookie of sessionClearCookies(request, env)) {
    if (!present.has(cookieName(cookie))) headers.append("Set-Cookie", cookie);
  }
  return headers;
}
