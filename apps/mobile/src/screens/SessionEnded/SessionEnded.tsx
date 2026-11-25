import { Button } from "../../components/Button";
import { SESSION_ENDED_BODY, SESSION_ENDED_HEADING, SIGN_IN } from "../../copy/auth";
import { StatusMessage } from "../StatusMessage";

/** WorkOS refused the refresh token or the API refused a fresh one; the phone is already cleared. */
export function SessionEnded({ onSignIn }: { onSignIn(): void }) {
  return (
    <StatusMessage heading={SESSION_ENDED_HEADING} body={SESSION_ENDED_BODY}>
      <Button label={SIGN_IN} size="lg" onPress={onSignIn} />
    </StatusMessage>
  );
}
