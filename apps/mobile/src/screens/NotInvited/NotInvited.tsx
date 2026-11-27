import { Button } from "../../components/Button";
import { NOT_INVITED_BODY, NOT_INVITED_HEADING, SIGN_OUT } from "../../copy/auth";
import { AccountDataActions } from "../AccountDataActions";
import { StatusMessage } from "../StatusMessage";

export interface NotInvitedProps {
  onSignOut(): void;
  /**
   * Opens "Delete your account" (E12 S9). With it, "Download your data" shows too, as on web's
   * not-invited page: a removed member keeps their data until they delete it.
   */
  onDeleteAccount?: () => void;
}

/** Signed in, but not on the beta list: a way out, not an error (S2b acceptance 7). */
export function NotInvited({ onSignOut, onDeleteAccount }: NotInvitedProps) {
  return (
    <StatusMessage heading={NOT_INVITED_HEADING} body={NOT_INVITED_BODY}>
      <Button label={SIGN_OUT} variant="secondary" onPress={onSignOut} />
      {onDeleteAccount ? <AccountDataActions onOpenDelete={onDeleteAccount} /> : null}
    </StatusMessage>
  );
}
