import type { LoaderFunctionArgs, MiddlewareFunction } from "react-router";
import { redirect } from "react-router";
import { TERMS_ACCEPTANCE_PATH } from "~/features/settings/account";
import { getAuthSession } from "~/utils/auth.server";
import { BackendError } from "./backend-error";
import { isUngatedPath } from "./invite-gate.server";
import { loadRootProfile } from "./root-profile.server";

/** True for the backend's 403 `terms_not_accepted`: the caller has not agreed to the terms in force. */
export function isTermsNotAccepted(error: unknown): boolean {
  return (
    error instanceof BackendError && error.status === 403 && error.code === "terms_not_accepted"
  );
}

/**
 * Pages a person who has not agreed can still open: the invite gate's ungated paths (sign-in and
 * out, invite links, the erased-account page, the data export download, resource routes) and the
 * acceptance page itself, which carries the download, delete and sign-out actions.
 */
export function isTermsExemptPath(pathname: string): boolean {
  return (
    pathname === TERMS_ACCEPTANCE_PATH ||
    pathname === `${TERMS_ACCEPTANCE_PATH}/` ||
    isUngatedPath(pathname)
  );
}

/** The acceptance page, coming back to this page (always a path on this site) afterwards. */
export function termsAcceptanceRedirect(request: Request): Response {
  const url = new URL(request.url);
  const here = `/${url.pathname.replace(/^\/+/, "").replace(/\.data$/, "")}${url.search}`;
  return redirect(`${TERMS_ACCEPTANCE_PATH}?next=${encodeURIComponent(here)}`, {
    headers: { "Cache-Control": "no-store" },
  });
}

/**
 * The terms gate (terms acceptance). A signed-in page load reads the profile before any loader
 * runs (the invite gate's read, shared per request, so no extra call); when the backend answers
 * 403 `terms_not_accepted`, the request goes to the acceptance page and no other loader runs.
 * Runs after the invite gate, so an uninvited person sees "not invited" rather than the terms.
 * Client navigations (`.data`) are caught by the root loader, which reads the same profile.
 */
export const termsGateMiddleware: MiddlewareFunction<Response> = async (args, next) => {
  const { request, context } = args;
  const { pathname } = new URL(request.url);
  if (request.method !== "GET" || pathname.endsWith(".data") || isTermsExemptPath(pathname)) {
    return next();
  }
  const session = await getAuthSession(args as unknown as LoaderFunctionArgs, {
    ensureSignedIn: false,
  });
  if (!session.accessToken || !session.user) return next();
  try {
    await loadRootProfile(context, session.accessToken, request.signal);
  } catch (error) {
    if (isTermsNotAccepted(error)) throw termsAcceptanceRedirect(request);
  }
  return next();
};
