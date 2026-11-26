import { Button } from "../../components/Button";
import { CHECK_AGAIN, UPDATE_REQUIRED_BODY, UPDATE_REQUIRED_HEADING } from "../../copy/auth";
import { StatusMessage } from "../StatusMessage";

/**
 * This version is below the server's minimum (plan section 4.9). No store link yet: the app has no
 * store listing until S19 (owner steps OS2 and OS7), so the words say where to update instead.
 */
export function UpdateRequired({ onCheckAgain }: { onCheckAgain(): void }) {
  return (
    <StatusMessage heading={UPDATE_REQUIRED_HEADING} body={UPDATE_REQUIRED_BODY}>
      <Button label={CHECK_AGAIN} variant="secondary" onPress={onCheckAgain} />
    </StatusMessage>
  );
}
