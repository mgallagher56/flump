import { Button } from "../../components/Button";
import { NOT_INVITED_BODY, NOT_INVITED_HEADING, SIGN_OUT } from "../../copy/auth";
import { StatusMessage } from "../StatusMessage";

/** Signed in, but not on the beta list: a way out, not an error (S2b acceptance 7). */
export function NotInvited({ onSignOut }: { onSignOut(): void }) {
  return (
    <StatusMessage heading={NOT_INVITED_HEADING} body={NOT_INVITED_BODY}>
      <Button label={SIGN_OUT} variant="secondary" onPress={onSignOut} />
    </StatusMessage>
  );
}
