import { Button, Card, FormField, TextInput } from "@repo/ui";
import { type FC, type FormEvent, useEffect, useRef, useState } from "react";
import {
  ACCOUNT_DELETION_PENDING_PATH,
  DELETE_ACCOUNT_CONFIRMATION,
  type DeleteAccountStatus,
  RECENT_LOGIN_MESSAGE,
} from "~/features/settings/account";
import { SignInAgainButton } from "~/features/settings/components/SignInAgainButton";
import {
  finishActions,
  finishCard,
  finishCopy,
  finishForm,
  finishHeading,
} from "./FinishDeletionPanel.styles";

const OUTCOME_MESSAGES: Partial<Record<DeleteAccountStatus, string>> = {
  identity_pending: "We still could not remove your login. Try again.",
  recent_login_required: RECENT_LOGIN_MESSAGE,
  rate_limited: "There have been several attempts in a short while. Wait a little, then try again.",
  failed: "We could not remove your login. Try again.",
};

export interface FinishDeletionPanelProps {
  /** Outcome of the latest delete request, from the settings route action. */
  status: DeleteAccountStatus;
  /** Repeats the delete request; the backend finishes removing the login. */
  onConfirm: () => void;
}

/**
 * Last step of an account deletion that stopped half way: the data is gone but the login is not.
 * Typing DELETE and confirming repeats the (safe to repeat) delete request.
 */
export const FinishDeletionPanel: FC<FinishDeletionPanelProps> = ({ status, onConfirm }) => {
  const [typed, setTyped] = useState("");
  const [attempted, setAttempted] = useState(false);
  // Blocks a second submit before the pending status has rendered (a fast double click).
  const inFlight = useRef(false);
  useEffect(() => {
    if (status !== "submitting") inFlight.current = false;
  }, [status]);

  const pending = status === "submitting";
  const matches = typed.trim().toLowerCase() === DELETE_ACCOUNT_CONFIRMATION.toLowerCase();
  const message = attempted && !pending ? OUTCOME_MESSAGES[status] : undefined;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!matches || pending || inFlight.current) return;
    inFlight.current = true;
    setAttempted(true);
    onConfirm();
  };

  return (
    <Card
      as="section"
      aria-labelledby="finish-deletion-heading"
      className={finishCard()}
      id="finish-deletion-panel"
      data-testid="finish-deletion-panel"
    >
      <h1 className={finishHeading()} id="finish-deletion-heading">
        Finish deleting your account
      </h1>
      <p className={finishCopy()}>Your data has been deleted.</p>
      <p className={finishCopy()}>
        One last step remains: removing your login. After that you will be signed out.
      </p>
      <form className={finishForm()} onSubmit={handleSubmit} noValidate>
        <FormField
          id="finish-deletion-confirmation"
          label={`Type ${DELETE_ACCOUNT_CONFIRMATION} to confirm`}
          error={message}
        >
          {(field) => (
            <TextInput
              id={field.id}
              aria-describedby={field.describedBy}
              autoComplete="off"
              disabled={pending}
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
            />
          )}
        </FormField>
        <div className={finishActions()}>
          <Button
            id="finish-deletion-submit"
            data-testid="finish-deletion-submit"
            type="submit"
            variant="destructive"
            disabled={!matches || pending}
            aria-busy={pending || undefined}
          >
            {pending
              ? "Removing"
              : status === "identity_pending" && attempted
                ? "Try again"
                : "Remove my login"}
          </Button>
          {attempted && status === "recent_login_required" ? (
            <SignInAgainButton returnPath={ACCOUNT_DELETION_PENDING_PATH} />
          ) : null}
        </div>
      </form>
    </Card>
  );
};
