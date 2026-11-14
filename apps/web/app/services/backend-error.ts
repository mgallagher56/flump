import { BackendError, type BackendErrorKind } from "@flump/api-client";

/** The one BackendError class lives in `@flump/api-client` (audit L5); web re-exports it. */
export {
  BACKEND_ERROR_KINDS,
  BackendError,
  type BackendErrorKind,
  kindFromStatus,
} from "@flump/api-client";

/** Serialisable payload thrown to route error boundaries. Never carries tokens, base URLs or bodies. */
export interface RouteErrorPayload {
  kind: BackendErrorKind;
  endpoint?: string;
}

/**
 * Where a signed-in person goes when the backend says their account is erased (BE-04: every
 * authenticated route except DELETE /user-profile answers 410 `account_deleted`). Their data is
 * gone but removing the login did not finish; that page lets them finish it.
 */
export const ACCOUNT_ERASED_PATH = "/account-deleted?state=pending";

/** True for the backend's 410 "This account has been deleted." answer. */
export function isAccountErased(err: unknown): boolean {
  return err instanceof BackendError && err.status === 410;
}
