import { SetMetadata } from "@nestjs/common";

/**
 * Port the AuthGuard uses to refuse tokens of erased accounts (BE-04). Provided in AppModule by
 * AccountDeletionService, so the auth module does not depend on the database.
 */
export interface ErasedAccountCheck {
  isErased(userId: string): Promise<boolean>;
}

export const ERASED_ACCOUNT_CHECK = "ERASED_ACCOUNT_CHECK";

export const ALLOW_ERASED = "flump:allow-erased";

/**
 * Lets an erased account's token through the AuthGuard. Only for DELETE /user-profile, so a
 * deletion whose WorkOS step failed can be retried with the same (or a fresh) token.
 */
export const AllowErasedAccount = () => SetMetadata(ALLOW_ERASED, true);
