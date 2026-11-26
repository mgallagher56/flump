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

export const NOT_INVITED_HEADING = "This account has not been invited yet";
export const NOT_INVITED_BODY =
  "Flump is in a private test. If you were expecting an invitation, check you signed in with the address it was sent to. If you were sent an invite link, open it again while signed in.";

export const SESSION_ENDED_HEADING = "You have been signed out";
export const SESSION_ENDED_BODY =
  "Your sign-in has ended, so we removed it from this phone. Sign in again to carry on.";

export const OFFLINE_HEADING = "We could not reach Flump";
export const OFFLINE_BODY = "You are still signed in. Check your connection and try again.";

export const SIGN_IN_UNAVAILABLE_HEADING = "Sign-in is not available in this app";
/** Developer-facing: only a host app such as Expo Go lacks these; a Flump build always has them. */
export const signInUnavailableBody = (missing: readonly string[]) =>
  `This app does not include what sign-in needs (${missing.join(", ")}). Open Flump in a development build to sign in.`;

export const MISCONFIGURED_HEADING = "This build is misconfigured";
export const MISCONFIGURED_BODY = "It cannot sign in. Install a build from the Flump team.";

export const LOADING_LABEL = "Loading";

/**
 * Terms not agreed (PR #939): the API refuses every request until the terms in force are agreed,
 * which happens on the website. The last sentence is web's (`apps/web/app/features/legal`).
 */
export const TERMS_REQUIRED_HEADING = "Please agree to our terms on the website";
export const TERMS_REQUIRED_BODY =
  "You need to agree to our terms of use before you carry on. Sign in on the Flump website to read and agree to them, then come back and select Try again.";
export const TERMS_REQUIRED_NOTE =
  "If you do not agree, you cannot use Flump. You can still download your data or delete your account on the website.";
export const OPEN_WEBSITE = "Open the Flump website";

/** The version gate (plan section 4.9). No store link until the app has a listing (S19). */
export const UPDATE_REQUIRED_HEADING = "Update Flump to carry on";
export const UPDATE_REQUIRED_BODY =
  "This version of the app is no longer supported. Install the latest version from where you got Flump, then open it again.";
export const CHECK_AGAIN = "Check again";

/**
 * The sign-out confirmation (E12 S2b). It says what sign-out does on each platform, as the owner
 * saw it on 26 November 2026: the phone keeps no sign-in and the next sign-in asks again
 * (`max_age=0`), but on Android a Google account signed in to the phone's browser can still sign
 * in with one tap, which Flump cannot clear. Wording from a Fable decider, adjusted to claim only
 * what was seen.
 */
export const SIGN_OUT_CONFIRM_TITLE = "Sign out of Flump?";
const SIGN_OUT_CONFIRM_BASE =
  "This removes your sign-in from this phone. Your data stays in your Flump account.";
export const signOutConfirmMessage = (platform: "ios" | "android"): string =>
  platform === "android"
    ? `${SIGN_OUT_CONFIRM_BASE} If you sign in with Google, the Google account in this phone's browser can sign you back in without a password.`
    : SIGN_OUT_CONFIRM_BASE;
