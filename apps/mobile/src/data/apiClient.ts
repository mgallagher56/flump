/**
 * The app's one `@flump/api-client` instance (O5 seam 2: only `src/data` talks to the API). The
 * client sends the access token from memory, and on a 401 asks the session for one shared refresh,
 * then retries once; a second 401 is `unauthorised`.
 */
import { type ApiClient, type ClientPlatform, createApiClient } from "@flump/api-client";
import type { Session } from "../auth/session";

export interface AppApiClientOptions {
  apiBaseUrl: string;
  session: Pick<Session, "getAccessToken" | "refresh">;
  client: { version: string; platform: ClientPlatform };
  fetch?: typeof fetch;
}

export function createAppApiClient(options: AppApiClientOptions): ApiClient {
  return createApiClient({
    baseUrl: options.apiBaseUrl,
    getAccessToken: () => options.session.getAccessToken(),
    onUnauthorised: () => options.session.refresh(),
    client: options.client,
    fetch: options.fetch,
  });
}
