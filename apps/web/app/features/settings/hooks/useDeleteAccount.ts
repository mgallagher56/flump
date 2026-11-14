import { useFetcher } from "react-router";
import {
  DELETE_ACCOUNT_CONFIRMATION,
  DELETE_ACCOUNT_INTENT,
  type DeleteAccountStatus,
  isDeleteAccountActionData,
} from "~/features/settings/account";

/** The settings route that handles the delete-account action. */
export const DELETE_ACCOUNT_ACTION_ROUTE = "/app/profile";

/**
 * Sends the delete-account request to the settings route action and reports its outcome. On
 * `deleted` the action redirects (with a full document load) to the signed-out notice.
 */
export function useDeleteAccount(): { status: DeleteAccountStatus; submit: () => void } {
  const fetcher = useFetcher();
  const status: DeleteAccountStatus =
    fetcher.state !== "idle"
      ? "submitting"
      : isDeleteAccountActionData(fetcher.data)
        ? fetcher.data.outcome
        : "idle";
  const submit = () => {
    void fetcher.submit(
      { intent: DELETE_ACCOUNT_INTENT, confirmation: DELETE_ACCOUNT_CONFIRMATION },
      { method: "post", action: DELETE_ACCOUNT_ACTION_ROUTE },
    );
  };
  return { status, submit };
}
