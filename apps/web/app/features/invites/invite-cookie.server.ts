import { BetaInviteToken } from "@flump/api-contract";

/**
 * The invite token between opening an invite link and signing in. HttpOnly (no script sees it),
 * an hour at most, and cleared once redeemed. Sent on every path, because sign-up does not always
 * come back to `/invite` (an email check opened in another tab, a later sign-in from `/login`): the
 * invite gate redeems it wherever a signed-in, not-yet-invited person lands.
 */
export const INVITE_COOKIE_NAME = "flump_invite";
const MAX_AGE_SECONDS = 60 * 60;

function secureFlag(request: Request): string {
  const url = new URL(request.url);
  const behindHttpsProxy =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase() === "https";
  return url.protocol === "https:" || behindHttpsProxy ? "; Secure" : "";
}

export function inviteCookie(token: string, request: Request): string {
  return `${INVITE_COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE_SECONDS}${secureFlag(request)}`;
}

export function clearInviteCookie(request: Request): string {
  return `${INVITE_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secureFlag(request)}`;
}

/** The token from the cookie, or null when absent or not shaped like a token. */
export function readInviteCookie(request: Request): string | null {
  const header = request.headers.get("Cookie") ?? "";
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name !== INVITE_COOKIE_NAME) continue;
    const value = rest.join("=");
    return BetaInviteToken.safeParse(value).success ? value : null;
  }
  return null;
}
