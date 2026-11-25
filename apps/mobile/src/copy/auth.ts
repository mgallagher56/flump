/**
 * Sign-in words (E12 S2a, plan section 9.5). Plain en-GB per docs/copy/COPY-GUIDE.md: each message
 * says what happened and what to do next, and never shows WorkOS's own text. The Not invited
 * heading and body are web's (`RouteErrorState`, kind `not-invited`), so both apps say the same.
 */
import type { SignInNotice } from "../auth/sessionMachine";

export const SIGN_IN = "Sign in";
export const CREATE_ACCOUNT = "Create account";
export const SIGN_OUT = "Sign out";
export const TRY_AGAIN = "Try again";

export const SIGN_IN_NOTICES: Record<SignInNotice, string> = {
  denied: "Sign-in was refused. Check you are using the right account, then try again.",
  failed: "Sign-in did not finish. Try again.",
  unavailable: "We could not reach Flump. Check your connection and try again.",
};

export const SIGNED_IN_HEADING = "You are signed in";

export const NOT_INVITED_HEADING = "This account has not been invited yet";
export const NOT_INVITED_BODY =
  "Flump is in a private test. If you were expecting an invitation, check you signed in with the address it was sent to. If you were sent an invite link, open it again while signed in.";

export const SESSION_ENDED_HEADING = "You have been signed out";
export const SESSION_ENDED_BODY =
  "Your sign-in has ended, so we removed it from this phone. Sign in again to carry on.";

export const OFFLINE_HEADING = "We could not reach Flump";
export const OFFLINE_BODY = "You are still signed in. Check your connection and try again.";

export const MISCONFIGURED_HEADING = "This build is misconfigured";
export const MISCONFIGURED_BODY = "It cannot sign in. Install a build from the Flump team.";

export const LOADING_LABEL = "Loading";
