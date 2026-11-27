/**
 * "Delete your account" (E12 S9, plan 9.10): `DELETE /v1/user-profile` with the typed phrase. The
 * backend checks the phrase, then a recent sign-in (`auth_time` within 15 minutes), then deletes
 * every row and the WorkOS login; repeating it is safe. Only the outcome comes back here; what the
 * device does with it (wipe, the last step, Sign in again) is the session's and the screen's.
 *
 * The client passed in is built with `DELETE_TIMEOUT_MS` (`authDeps.ts`), as web waits.
 */
import { type ApiClient, BackendError } from "@flump/api-client";
import { DELETE_USER_CONFIRMATION, DeleteUserResponse } from "@flump/api-contract";
import { ACCOUNT_DELETED_CODE } from "./account";

/** Deleting every row can take longer than an ordinary write: web's `DELETE_TIMEOUT_MS`. */
export const DELETE_TIMEOUT_MS = 30_000;

/**
 * The contract's answer read loosely: a field a newer backend adds is ignored, so a delete that
 * landed is never reported as failed and the device is still wiped. An unknown status still fails.
 */
const DeleteAnswer = DeleteUserResponse.loose();

const RECENT_LOGIN_REQUIRED_CODE = "recent_login_required";
const DELETION_UNAVAILABLE_CODE = "account_deletion_unavailable";

/**
 * `deleted`: data and login gone. `identityPending`: data gone, login not yet (repeat to finish).
 * `accountDeleted`: 410, an erased account whose login remains (repeat to finish).
 * `recentLoginRequired`: 403, sign in again first. `unavailable`: 503, nothing changed.
 * `rateLimited`: 429. `noAnswer`: no answer in time or the connection dropped, so whether it
 * landed is unknown. `failed`: anything else, an unknown status from a newer backend included.
 */
export type DeleteOutcome =
  | "deleted"
  | "identityPending"
  | "accountDeleted"
  | "recentLoginRequired"
  | "unavailable"
  | "rateLimited"
  | "noAnswer"
  | "failed";

export function createDeleteAccount(client: ApiClient): () => Promise<DeleteOutcome> {
  return async () => {
    try {
      const result = await client.request("/user-profile", {
        method: "DELETE",
        body: { confirmation: DELETE_USER_CONFIRMATION },
        schema: DeleteAnswer,
      });
      return result.status === "deleted" ? "deleted" : "identityPending";
    } catch (error) {
      if (!(error instanceof BackendError)) return "failed";
      if (error.status === 410 && error.code === ACCOUNT_DELETED_CODE) return "accountDeleted";
      if (error.status === 403 && error.code === RECENT_LOGIN_REQUIRED_CODE) {
        return "recentLoginRequired";
      }
      if (error.status === 503 && error.code === DELETION_UNAVAILABLE_CODE) return "unavailable";
      if (error.status === 429) return "rateLimited";
      if (error.kind === "unavailable") return "noAnswer";
      return "failed";
    }
  };
}
