import { Button } from "../../components/Button";
import { SIGN_OUT, SIGNED_IN_HEADING } from "../../copy/auth";
import { DevLinks } from "../DevLinks";
import { StatusMessage } from "../StatusMessage";

/** The signed-in placeholder until the check-in (S3) and the app shell (S4). */
export function Home({ onSignOut }: { onSignOut(): void }) {
  return (
    <StatusMessage heading={SIGNED_IN_HEADING}>
      <Button label={SIGN_OUT} variant="secondary" onPress={onSignOut} />
      <DevLinks />
    </StatusMessage>
  );
}
