import { HouseholdInvitationToken } from "@flump/api-contract";

/**
 * The household invitation token between opening `/household/join/<token>` and accepting on
 * `/household/join`. HttpOnly (no script sees it), an hour at most, sent only to `/household`
 * paths, and cleared once the link is accepted or found unusable. A separate name from the beta
 * invite cookie (`flump_invite`), so the beta invite gate never reads it.
 */
const HOUSEHOLD_INVITE_COOKIE_NAME = "flump_household_invite";
const MAX_AGE_SECONDS = 60 * 60;
const COOKIE_PATH = "/household";

function secureFlag(request: Request): string {
  const url = new URL(request.url);
  const behindHttpsProxy =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase() === "https";
  return url.protocol === "https:" || behindHttpsProxy ? "; Secure" : "";
}

export function householdInviteCookie(token: string, request: Request): string {
  return `${HOUSEHOLD_INVITE_COOKIE_NAME}=${token}; Path=${COOKIE_PATH}; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE_SECONDS}${secureFlag(request)}`;
}

export function clearHouseholdInviteCookie(request: Request): string {
  return `${HOUSEHOLD_INVITE_COOKIE_NAME}=; Path=${COOKIE_PATH}; HttpOnly; SameSite=Lax; Max-Age=0${secureFlag(request)}`;
}

/** The token from the cookie, or null when absent or not shaped like a token. */
export function readHouseholdInviteCookie(request: Request): string | null {
  const header = request.headers.get("Cookie") ?? "";
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name !== HOUSEHOLD_INVITE_COOKIE_NAME) continue;
    const value = rest.join("=");
    return HouseholdInvitationToken.safeParse(value).success ? value : null;
  }
  return null;
}
