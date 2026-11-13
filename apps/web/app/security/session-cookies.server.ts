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

export function readSetCookies(headers: unknown): string[] {
  if (!headers) return [];
  const h = new Headers(headers as HeadersInit);
  if (typeof h.getSetCookie === "function") return h.getSetCookie();
  const single = h.get("set-cookie");
  return single ? [single] : [];
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
