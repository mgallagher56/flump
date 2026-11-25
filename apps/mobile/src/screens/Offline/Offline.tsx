import { Button } from "../../components/Button";
import { OFFLINE_BODY, OFFLINE_HEADING, SIGN_OUT, TRY_AGAIN } from "../../copy/auth";
import { StatusMessage } from "../StatusMessage";

/** Signed in, but Flump could not be reached. Nothing is cleared. The cache comes with S7. */
export function Offline({ onRetry, onSignOut }: { onRetry(): void; onSignOut(): void }) {
  return (
    <StatusMessage heading={OFFLINE_HEADING} body={OFFLINE_BODY}>
      <Button label={TRY_AGAIN} size="lg" onPress={onRetry} />
      <Button label={SIGN_OUT} variant="secondary" onPress={onSignOut} />
    </StatusMessage>
  );
}
