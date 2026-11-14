/**
 * Account deletion and data export (BE-04): shared between the settings UI and its server code.
 * The web app does not depend on @flump/api-contract, so the contract values are mirrored here
 * (as RESET_FINANCIAL_DATA_CONFIRMATION is): keep them equal to the contract.
 */

/** Must equal DELETE_USER_CONFIRMATION in @flump/api-contract; the backend requires it in the body. */
export const DELETE_ACCOUNT_CONFIRMATION = "DELETE";

/** Mirrors DeleteUserResponse in @flump/api-contract (`profile.deleteUser`). */
export interface DeleteUserResponse {
  status: "deleted" | "identity_pending";
}

/** Form intent the settings route action dispatches on. */
export const DELETE_ACCOUNT_INTENT = "delete-account";

/** Route that streams the export file (`profile.export`) through the web session. */
export const ACCOUNT_EXPORT_PATH = "/account/export";

/** Signed-out page shown once an account is deleted. */
export const ACCOUNT_DELETED_PATH = "/account-deleted";

/** What the delete action returns when it does not redirect. */
export interface DeleteAccountActionData {
  outcome: "identity_pending" | "rate_limited" | "failed";
}

export type DeleteAccountStatus = "idle" | "submitting" | DeleteAccountActionData["outcome"];

/** Narrows unknown fetcher data to the delete action's shape. */
export function isDeleteAccountActionData(value: unknown): value is DeleteAccountActionData {
  const outcome = (value as { outcome?: unknown } | null | undefined)?.outcome;
  return outcome === "identity_pending" || outcome === "rate_limited" || outcome === "failed";
}
