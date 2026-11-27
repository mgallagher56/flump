import { Button } from "../../components/Button";
import { OFFLINE_BODY, OFFLINE_HEADING, SIGN_OUT, TRY_AGAIN } from "../../copy/auth";
import { StatusMessage } from "../StatusMessage";

/**
 * Signed in, but Flump could not be reached and no saved figures are on this phone (S7). Nothing
 * is cleared. Shown in a tab, so the header and tab bar pad the top and bottom.
 */
export function Offline({ onRetry, onSignOut }: { onRetry(): void; onSignOut(): void }) {
  return (
    <StatusMessage heading={OFFLINE_HEADING} body={OFFLINE_BODY} edges={["right", "left"]}>
      <Button label={TRY_AGAIN} size="lg" onPress={onRetry} />
      <Button label={SIGN_OUT} variant="secondary" onPress={onSignOut} />
    </StatusMessage>
  );
}
