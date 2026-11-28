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
  /** Not invited only: whether the page offers "Download your data" (false hides it). */
  offerDataDownload?: boolean;
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

/** The terms acceptance page (mirrors TERMS_ACCEPTANCE_PATH in features/settings/account.ts). */
export const TERMS_ACCEPTANCE_REDIRECT_PATH = "/terms-acceptance";

/**
 * True for the backend's 403 `terms_not_accepted`: the caller has not agreed to the terms in
 * force (terms acceptance). A new version can come into force while the app is open.
 */
export function isTermsNotAccepted(err: unknown): boolean {
  return err instanceof BackendError && err.status === 403 && err.code === "terms_not_accepted";
}
