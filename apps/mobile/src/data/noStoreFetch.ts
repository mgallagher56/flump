/**
 * Every API request asks not to be stored (E12 S7, after the coordinator's device check found
 * Android's HTTP cache, `cache/http-cache`, holding the money endpoints' answers in plain files).
 * The server sends `Cache-Control: no-store` too; this does not rely on it.
 *
 * - Android: React Native's OkHttp client keeps a 10 MB HTTP cache, and OkHttp stores nothing for a
 *   request that carries `Cache-Control: no-store`.
 * - iOS: React Native's NSURLSession uses the shared URL cache (`Cache.db`). It is kept out by the
 *   server's `no-store` answer; the request header is sent there too. Leftovers from before are
 *   removed by `httpCacheSweep.ts`.
 *
 * Not fetch's `cache: "no-store"` option: React Native's fetch turns that into a `_=<time>` query
 * parameter on GET, which the API would see as an unknown parameter.
 */
export function noStoreFetch(base: () => typeof fetch = () => fetch): typeof fetch {
  return (input, init) => {
    const headers = new Headers(init?.headers);
    headers.set("Cache-Control", "no-store");
    return base()(input, { ...init, headers });
  };
}
