import { SIGN_IN_UNAVAILABLE_HEADING, signInUnavailableBody } from "../../copy/auth";
import { DevLinks } from "../DevLinks";
import { StatusMessage } from "../StatusMessage";

/** The host app lacks sign-in's native modules (Expo Go): say so, and keep the dev screens open. */
export function SignInUnavailable({ missing }: { missing: readonly string[] }) {
  return (
    <StatusMessage heading={SIGN_IN_UNAVAILABLE_HEADING} body={signInUnavailableBody(missing)}>
      <DevLinks />
    </StatusMessage>
  );
}
