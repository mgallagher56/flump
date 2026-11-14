import { Button, Card, ConfirmDialog } from "@repo/ui";
import { type FC, useEffect, useRef, useState } from "react";
import {
  DELETE_ACCOUNT_CONFIRMATION,
  type DeleteAccountStatus,
  RECENT_LOGIN_MESSAGE,
} from "~/features/settings/account";
import { SignInAgainButton } from "~/features/settings/components/SignInAgainButton";
import { sectionCard, sectionHeading, sectionLead } from "~/features/settings/settings.styles";
import {
  deleteCopy,
  deleteDialogBody,
  deleteList,
  deleteRow,
  deleteText,
  deleteTitle,
} from "./DeleteAccountSection.styles";

export const IDENTITY_PENDING_MESSAGE =
  "Your data has been deleted, but we could not finish removing your login. Try again.";

const FAILURE_MESSAGES: Partial<Record<DeleteAccountStatus, string>> = {
  rate_limited: "You have tried this a few times in a short while. Wait a little, then try again.",
  recent_login_required: RECENT_LOGIN_MESSAGE,
  failed: "We could not delete your account. Try again.",
};

export interface DeleteAccountSectionProps {
  /** Outcome of the latest delete request, from the settings route action. */
  status: DeleteAccountStatus;
  /** Sends the delete request with the confirmation phrase. */
  onConfirm: () => void;
}

/**
 * "Delete your account": a danger row and a type-to-confirm dialog. The dialog stays open on
 * failure and on `identity_pending`, where repeating the request finishes the deletion.
 */
export const DeleteAccountSection: FC<DeleteAccountSectionProps> = ({ status, onConfirm }) => {
  const [open, setOpen] = useState(false);
  // Failures from an earlier attempt are not shown again when the dialog is reopened.
  const [attempted, setAttempted] = useState(false);
  // Blocks a second submit before the pending status has rendered (a fast double click).
  const inFlight = useRef(false);

  useEffect(() => {
    if (status !== "submitting") inFlight.current = false;
  }, [status]);

  const identityPending = status === "identity_pending";
  const needsSignIn = attempted && status === "recent_login_required";
  const error = identityPending
    ? IDENTITY_PENDING_MESSAGE
    : attempted
      ? (FAILURE_MESSAGES[status] ?? null)
      : null;

  const handleConfirm = () => {
    if (inFlight.current || status === "submitting") return;
    inFlight.current = true;
    setAttempted(true);
    onConfirm();
  };

  return (
    <Card
      as="section"
      aria-labelledby="delete-account-heading"
      className={sectionCard()}
      id="delete-account-section"
      data-testid="delete-account-section"
    >
      <h2 className={sectionHeading()} id="delete-account-heading">
        Delete your account
      </h2>
      <p className={sectionLead()}>This deletes your Flump account and all your data.</p>
      <div className={deleteRow()}>
        <div className={deleteText()}>
          <p className={deleteTitle()}>This cannot be undone</p>
          <p className={deleteCopy()}>If you would like a copy of your data, download it first.</p>
        </div>
        <Button
          data-testid="delete-account-trigger"
          id="delete-account-trigger"
          size="sm"
          type="button"
          variant="danger"
          onClick={() => {
            setAttempted(false);
            setOpen(true);
          }}
        >
          Delete account
        </Button>
      </div>

      <ConfirmDialog
        id="delete-account-dialog"
        open={open}
        onOpenChange={setOpen}
        title="Delete your account?"
        description={
          <div className={deleteDialogBody()}>
            <span>This deletes the following for good:</span>
            <ul className={deleteList()}>
              <li>Your profile and settings</li>
              <li>Your financial accounts, balances and transactions</li>
              <li>Your bank connections</li>
              <li>Your budget, savings and tax records</li>
              <li>Your check-ins and any imports not yet finished</li>
              <li>AI assistant access and its activity log</li>
              <li>Your login</li>
            </ul>
            <span>
              We keep a short record that an account was deleted, with no personal details, for 24
              months.
            </span>
            <span>This cannot be undone. You are signed out straight away.</span>
          </div>
        }
        confirmLabel={identityPending ? "Try again" : "Delete my account"}
        pendingLabel="Deleting"
        tone="danger"
        requireText={DELETE_ACCOUNT_CONFIRMATION}
        pending={status === "submitting"}
        keepFocusWhilePending
        error={error}
        errorAction={needsSignIn ? <SignInAgainButton /> : undefined}
        onConfirm={handleConfirm}
      />
    </Card>
  );
};
