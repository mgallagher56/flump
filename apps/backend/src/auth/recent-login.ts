import { ForbiddenException, GoneException } from "@nestjs/common";
import type { AuthenticatedUser } from "./token-verifier";

/** How recently the person must have signed in to delete their account or reset their data. */
export const RECENT_LOGIN_MAX_AGE_SECONDS = 15 * 60;
/** Clock skew allowed between WorkOS and this server for an `auth_time` slightly in the future. */
const CLOCK_SKEW_SECONDS = 60;

const RECENT_LOGIN_REQUIRED = "recent_login_required";
const RECENT_LOGIN_MESSAGE = "For your security, sign in again, then try again.";

/**
 * An erased account (BE-04). 410 Gone, not 401: during identity_pending the WorkOS login still
 * exists, so a 401 would send the web app round a sign-in loop. The web app tells the two apart by
 * `error`.
 */
const ACCOUNT_DELETED = "account_deleted";
const ACCOUNT_DELETED_MESSAGE = "This account has been deleted.";

export function accountDeletedException(): GoneException {
  return new GoneException({
    statusCode: 410,
    error: ACCOUNT_DELETED,
    message: ACCOUNT_DELETED_MESSAGE,
  });
}

/**
 * Recent-login check for destructive routes (BE-04, L1). Uses the WorkOS `auth_time` claim: when
 * the person last actively signed in, carried unchanged across access-token refreshes (unlike
 * `iat`, which moves on every refresh). A token without the claim fails closed: signing in again
 * mints one that has it.
 *
 * The 403 body carries `error: "recent_login_required"` so the web app can send the person to
 * sign in again and bring them back.
 */
export function assertRecentLogin(
  user: Pick<AuthenticatedUser, "authTime"> | undefined,
  nowMs: number = Date.now(),
): void {
  const authTime = user?.authTime;
  const now = nowMs / 1000;
  const fresh =
    typeof authTime === "number" &&
    Number.isFinite(authTime) &&
    authTime <= now + CLOCK_SKEW_SECONDS &&
    now - authTime <= RECENT_LOGIN_MAX_AGE_SECONDS;
  if (!fresh) {
    throw new ForbiddenException({
      statusCode: 403,
      error: RECENT_LOGIN_REQUIRED,
      message: RECENT_LOGIN_MESSAGE,
    });
  }
}
