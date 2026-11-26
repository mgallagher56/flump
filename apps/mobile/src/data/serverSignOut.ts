/**
 * Ends this sign-in's WorkOS session on the server: `POST /v1/session/sign-out` with exactly the
 * given access token (E12 S2b). The backend takes the session from the verified token's `sid` and
 * revokes it with WorkOS, which only it can do (the revoke needs the API secret). No refresh and
 * no retry here: the session's sign-out decides what to do with `unauthorised`.
 */
import { BackendError, createApiClient } from "@flump/api-client";

export type ServerSignOutResult = "ended" | "unauthorised" | "unavailable";

/** Short: the device is already clear, and nobody should wait long for a best-effort call. */
const SIGN_OUT_TIMEOUT_MS = 5000;

export function createServerSignOut(
  apiBaseUrl: string,
  fetchImpl?: typeof fetch,
): (accessToken: string) => Promise<ServerSignOutResult> {
  return async (accessToken) => {
    const client = createApiClient({
      baseUrl: apiBaseUrl,
      getAccessToken: () => accessToken,
      fetch: fetchImpl,
      timeoutMs: SIGN_OUT_TIMEOUT_MS,
    });
    try {
      await client.request("/session/sign-out", { method: "POST", schema: null, allowEmpty: true });
      return "ended";
    } catch (error) {
      return error instanceof BackendError && error.kind === "unauthorised"
        ? "unauthorised"
        : "unavailable";
    }
  };
}
