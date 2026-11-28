/**
 * The account check after sign-in and on launch: `GET /v1/user-profile` with the new access token
 * (plan section 9.5, S2b acceptance 3 and 7). The closed beta answers 403 `not_invited`; a person
 * who has not agreed to the terms in force gets 403 `terms_not_accepted`.
 *
 * Only the status matters, so the body is not parsed (Fable decider, PR #951): the app meets older
 * and newer backends, and a field added to the profile since (such as `partnerMode`, missing on a
 * backend that predates it) must never stop anyone signing in.
 */
import { type ApiClient, BackendError, createApiClient } from "@flump/api-client";
import type { AccountCheck } from "../auth/session";
import { TERMS_NOT_ACCEPTED_CODE } from "./problems";

/** The backend's code for an erased account (`auth/recent-login.ts`, 410 Gone). */
export const ACCOUNT_DELETED_CODE = "account_deleted";

export function createAccountCheck(client: ApiClient): () => Promise<AccountCheck> {
  return async () => {
    try {
      await client.request("/user-profile", { schema: null, allowEmpty: true });
      return "ok";
    } catch (error) {
      if (!(error instanceof BackendError)) return "unavailable";
      if (error.kind === "not-invited") return "not-invited";
      // PR #939: until the terms in force are agreed, every authenticated route answers this.
      if (error.kind === "forbidden" && error.code === TERMS_NOT_ACCEPTED_CODE) {
        return "terms-not-accepted";
      }
      // An erased account (E12 S9): its data is gone but its login remains, so the last step of
      // the deletion shows, never the offline screen.
      if (error.status === 410 && error.code === ACCOUNT_DELETED_CODE) return "account-deleted";
      // The client has already refreshed once and retried: a 401 now means the session is over.
      if (error.kind === "unauthorised") return "unauthorised";
      // With no body parsed, a `bad-response` here can only be a body cut off mid-stream (a dropped
      // connection), so it falls through to `unavailable` with the other network failures.
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
