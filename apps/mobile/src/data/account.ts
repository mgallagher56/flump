/**
 * The account check after sign-in and on launch: `GET /v1/user-profile` with the new access token
 * (plan section 9.5, S2b acceptance 3 and 7). The closed beta answers 403 `not_invited`; a person
 * who has not agreed to the terms in force gets 403 `terms_not_accepted`.
 *
 * Only the status matters, so the body is not parsed (Fable decider, PR #951): the app meets older
 * and newer backends, and a field added to the profile since (E35's `wellbeingQuestions`, missing
 * on a backend that predates it) must never stop anyone signing in.
 */
import { type ApiClient, BackendError, createApiClient } from "@flump/api-client";
import type { AccountCheck } from "../auth/session";
import { TERMS_NOT_ACCEPTED_CODE } from "./problems";

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
      // The client has already refreshed once and retried: a 401 now means the session is over.
      if (error.kind === "unauthorised") return "unauthorised";
      // The server answered, but not in a shape this version understands: out of step, not offline.
      if (error.kind === "bad-response") return "out-of-step";
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
