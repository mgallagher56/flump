import { SetMetadata } from "@nestjs/common";

export const ALLOW_UNINVITED = "flump:allow-uninvited";

/**
 * Lets a signed-in caller who is not (yet) in the invite-only beta through the AuthGuard's beta
 * refusal. Only for POST /beta/invites/redeem, which is how they join. The erased-account check
 * still applies: an erased account can never redeem.
 */
export const AllowUninvited = () => SetMetadata(ALLOW_UNINVITED, true);
