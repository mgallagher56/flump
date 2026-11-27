/**
 * The app's one `@flump/api-client` instance (O5 seam 2: only `src/data` talks to the API). The
 * client sends the access token from memory, and on a 401 asks the session for one shared refresh,
 * then retries once; a second 401 is `unauthorised`.
 */
import { type ApiClient, type ClientPlatform, createApiClient } from "@flump/api-client";

export type { ApiClient };

import type { Session } from "../auth/session";
import { noStoreFetch } from "./noStoreFetch";

export interface AppApiClientOptions {
  apiBaseUrl: string;
  session: Pick<Session, "refresh"> & {
    /** May wait: restored offline, it first tries one quiet reconnect (E12 S7, `offlineAccess.ts`). */
    getAccessToken(): string | null | Promise<string | null>;
  };
  client: { version: string; platform: ClientPlatform };
  fetch?: typeof fetch;
  /** Defaults to the client's 15 seconds; the account deletion waits 30 (E12 S9). */
  timeoutMs?: number;
  /**
   * A fresh Idempotency-Key for a POST that names none: expo-crypto's UUID in the app (authDeps),
   * passed in so this file stays loadable on Node (the e2e tooling).
   */
  newIdempotencyKey: () => string;
}

export function createAppApiClient(options: AppApiClientOptions): ApiClient {
  const client = createApiClient({
    baseUrl: options.apiBaseUrl,
    getAccessToken: () => options.session.getAccessToken(),
    onUnauthorised: () => options.session.refresh(),
    client: options.client,
    // Never stored by the phone's HTTP cache (E12 S7, `noStoreFetch.ts`).
    fetch: noStoreFetch(() => options.fetch ?? fetch),
    timeoutMs: options.timeoutMs,
  });
  const newKey = options.newIdempotencyKey;
  // The shared client's default key for a POST reads the global `crypto.randomUUID`, which Hermes
  // does not have, so a POST naming no key threw before it was sent (the S10 device check's add).
  // Every POST from the phone gets one here; a caller's own key (one per retried add) or `false`
  // (no key at all, as sign-out sends) is kept.
  const request = ((path: string, opts: { method?: string; idempotencyKey?: string | false }) =>
    client.request(
      path,
      (opts.method === "POST" && opts.idempotencyKey === undefined
        ? { ...opts, idempotencyKey: newKey() }
        : opts) as never,
    )) as ApiClient["request"];
  return { ...client, request };
}
