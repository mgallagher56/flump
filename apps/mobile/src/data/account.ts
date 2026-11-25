/**
 * The account check after sign-in and on launch: `GET /v1/user-profile` with the new access token
 * (plan section 9.5, S2b acceptance 3 and 7). The closed beta answers 403 `not_invited`.
 */
import { type ApiClient, BackendError, createApiClient } from "@flump/api-client";
import { UserProfileResponse } from "@flump/api-contract";
import type { AccountCheck } from "../auth/session";

export function createAccountCheck(client: ApiClient): () => Promise<AccountCheck> {
  return async () => {
    try {
      await client.request("/user-profile", { schema: UserProfileResponse });
      return "ok";
    } catch (error) {
      if (!(error instanceof BackendError)) return "unavailable";
      if (error.kind === "not-invited") return "not-invited";
      // The client has already refreshed once and retried: a 401 now means the session is over.
      if (error.kind === "unauthorised") return "unauthorised";
      return "unavailable";
    }
  };
}

/** The account check with exactly one token, for the dev sign-in check: no refresh, no retry. */
export function checkAccountWithToken(
  apiBaseUrl: string,
  accessToken: string,
  fetchImpl?: typeof fetch,
): Promise<AccountCheck> {
  const client = createApiClient({
    baseUrl: apiBaseUrl,
    getAccessToken: () => accessToken,
    fetch: fetchImpl,
  });
  return createAccountCheck(client)();
}
