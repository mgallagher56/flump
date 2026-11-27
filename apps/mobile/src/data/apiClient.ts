/**
 * The app's one `@flump/api-client` instance (O5 seam 2: only `src/data` talks to the API). The
 * client sends the access token from memory, and on a 401 asks the session for one shared refresh,
 * then retries once; a second 401 is `unauthorised`.
 */
import { type ApiClient, type ClientPlatform, createApiClient } from "@flump/api-client";

export type { ApiClient };

import type { Session } from "../auth/session";

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
}

export function createAppApiClient(options: AppApiClientOptions): ApiClient {
  return createApiClient({
    baseUrl: options.apiBaseUrl,
    getAccessToken: () => options.session.getAccessToken(),
    onUnauthorised: () => options.session.refresh(),
    client: options.client,
    fetch: options.fetch,
    timeoutMs: options.timeoutMs,
  });
}
