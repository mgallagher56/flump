import { Button } from "../../components/Button";
import { OUT_OF_STEP_BODY, OUT_OF_STEP_HEADING, SIGN_OUT, TRY_AGAIN } from "../../copy/auth";
import { StatusMessage } from "../StatusMessage";

/**
 * Signed in, but Flump's answer did not match what this version of the app expects (version skew
 * between the app and the backend). Nothing is cleared. Not the offline screen: the connection
 * worked.
 */
export function OutOfStep({ onRetry, onSignOut }: { onRetry(): void; onSignOut(): void }) {
  return (
    <StatusMessage heading={OUT_OF_STEP_HEADING} body={OUT_OF_STEP_BODY}>
      <Button label={TRY_AGAIN} size="lg" onPress={onRetry} />
      <Button label={SIGN_OUT} variant="secondary" onPress={onSignOut} />
    </StatusMessage>
  );
}
