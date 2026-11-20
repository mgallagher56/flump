import type { LoaderFunctionArgs, MiddlewareFunction } from "react-router";
import { redirect } from "react-router";
import { clearInviteCookie, readInviteCookie } from "~/features/invites/invite-cookie.server";
import { redeemInvite } from "~/features/invites/redeem-invite.server";
import { getAuthSession } from "~/utils/auth.server";
import { BackendError } from "./backend-error";
import { isInviteOnly } from "./beta-mode.server";
import { loadRootProfile } from "./root-profile.server";
import { throwRouteError } from "./route-error.server";

/**
 * Paths the gate never checks: signing in and out, invite links (an uninvited person must reach
 * them to join), the erased-account page, and resource routes that answer for themselves (the
 * `/api` proxy passes the backend's own 403 on).
 */
const UNGATED = [
  /^\/login\/?$/,
  /^\/logout\/?$/,
  /^\/callback\/?$/,
  /^\/signup\/?$/i,
  /^\/invite(\/|$)/,
  /^\/sandbox\/?$/,
  /^\/account-deleted\/?$/,
  /^\/account\/export\/?$/,
  /^\/api(\/|$)/,
  /^\/healthz\/?$/,
  /^\/ping\/?$/,
  /^\/robots\.txt$/,
  /^\/csp-report\/?$/,
];

/** The same page, always on this site: leading slashes collapse so `//host` is never a target. */
function samePage(request: Request): string {
  const url = new URL(request.url);
  return `/${url.pathname.replace(/^\/+/, "")}${url.search}`;
}

/** A full page load: a GET that is not a client navigation's `.data` request. */
function isDocumentRequest(request: Request): boolean {
  if (request.method !== "GET") return false;
  const { pathname } = new URL(request.url);
  return !pathname.endsWith(".data") && !UNGATED.some((path) => path.test(pathname));
}

/**
 * The invite gate. While the beta is invite-only, a signed-in page load reads the profile before
 * any loader runs; when the backend answers 403 `not_invited`, the request stops here and the
 * root error boundary shows the one "not invited" page. No other route's loader runs, so its data
 * never reaches the browser. The profile read is the root loader's own (shared per request), so
 * the check costs no extra call. While the beta is open the gate does nothing, as before.
 *
 * Client navigations (`.data`) are not checked here: the gated page has no links, and every
 * backend read refuses an uninvited caller anyway.
 */
export const inviteGateMiddleware: MiddlewareFunction<Response> = async (args, next) => {
  const { request, context } = args;
  if (!isDocumentRequest(request) || !(await isInviteOnly())) return next();
  const session = await getAuthSession(args as unknown as LoaderFunctionArgs, {
    ensureSignedIn: false,
  });
  if (!session.accessToken || !session.user) return next();
  try {
    await loadRootProfile(context, session.accessToken, request.signal);
  } catch (error) {
    // Only "not invited" stops the request; any other failure is the root loader's to handle.
    if (!(error instanceof BackendError && error.kind === "not-invited")) return next();
    // A pending invite (sign-up did not come back to /invite): redeem it here once, then start
    // the page again. Joined opens the app; otherwise the cookie is dropped (so a rate limit is not
    // spent again on every page) and the page loads again as not invited, whose wording says to
    // open the link again while signed in.
    const token = readInviteCookie(request);
    if (token) {
      const outcome = await redeemInvite(session.accessToken, token, request.signal).catch(
        () => "busy" as const,
      );
      throw redirect(outcome === "joined" ? "/app" : samePage(request), {
        headers: { "Set-Cookie": clearInviteCookie(request), "Cache-Control": "no-store" },
      });
    }
    throwRouteError(error);
  }
  return next();
};
