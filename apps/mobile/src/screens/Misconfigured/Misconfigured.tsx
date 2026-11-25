import { MISCONFIGURED_BODY, MISCONFIGURED_HEADING } from "../../copy/auth";
import { DevLinks } from "../DevLinks";
import { StatusMessage } from "../StatusMessage";

/** A config value is missing or unsafe (plan section 5.3): the app stops before any network call. */
export function Misconfigured() {
  return (
    <StatusMessage heading={MISCONFIGURED_HEADING} body={MISCONFIGURED_BODY}>
      <DevLinks />
    </StatusMessage>
  );
}
