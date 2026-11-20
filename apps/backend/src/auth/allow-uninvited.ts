import { SetMetadata } from "@nestjs/common";

export const ALLOW_UNINVITED = "flump:allow-uninvited";

/**
 * Lets a signed-in caller who is not (yet, or no longer) in the invite-only beta through the
 * AuthGuard's beta refusal. Only for POST /beta/invites/redeem, which is how they join, and for the
 * person's data rights: their data export (JSON and CSV) and deleting their account, which a
 * removed member must still be able to do. The erased-account check still applies: an erased
 * account can never redeem.
 */
export const AllowUninvited = () => SetMetadata(ALLOW_UNINVITED, true);
