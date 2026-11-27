/**
 * The words for "Download your data", "Delete your account", the last step of a deletion, the app
 * lock and re-authentication (E12 S9, plan 9.10). Plain en-GB per docs/copy/COPY-GUIDE.md.
 *
 * The four `WEB_*` groups are web's words, word for word, from `apps/web/app/features/settings`
 * (`DataExportSection`, `DeleteAccountSection`, `AccountDeletedNotice`, `FinishDeletionPanel` and
 * `account.ts`). `accountDataCopyParity.test.ts` in that folder, run by web's suite, fails when
 * either side changes alone. Everything else here is the app's own: web has no app lock, no share
 * sheet and no in-place re-authentication.
 */

/** Web's `DELETE_ACCOUNT_CONFIRMATION`, the contract's `DELETE_USER_CONFIRMATION`. */
export const DELETE_PHRASE = "DELETE";

/** `DataExportSection`. */
export const WEB_EXPORT = {
  heading: "Download your data",
  description: "Get a copy of your Flump data as one JSON file.",
  button: "Download your data",
  pending: "Preparing your file",
  rateLimited: "You have tried this a few times in a short while. Wait a little, then try again.",
  failed: "We could not prepare your download. Try again.",
} as const;

/** `DeleteAccountSection` and `account.ts`. */
export const WEB_DELETE = {
  heading: "Delete your account",
  description:
    "This deletes your Flump account and all your data. To keep a copy, download your data first.",
  trigger: "Delete account",
  confirmTitle: "Delete your account?",
  listIntro: "This deletes the following for good:",
  list: [
    "Your profile and settings",
    "Your accounts and their balance history",
    "Your budget, savings and tax records",
    "Your check-ins and any imports not yet finished",
    "Your AI connections and their activity log",
    "Your sign-in",
  ],
  retention:
    "We keep a short record that an account was deleted, with no personal details, for 24 months.",
  final: "This cannot be undone. You are signed out straight away.",
  confirm: "Delete my account",
  pending: "Deleting",
  rateLimited: "You have tried this a few times in a short while. Wait a little, then try again.",
  recentLogin: "For your security, sign in again, then try again.",
  failed: "We could not delete your account. Try again.",
  signInAgain: "Sign in again",
} as const;

/** `AccountDeletedNotice`. */
export const WEB_ACCOUNT_DELETED = {
  heading: "Your account has been deleted",
  body: "Your data and your login have been removed, and you have been signed out.",
  thanks: "Thank you for using Flump.",
  homeLink: "Go to the home page",
} as const;

/** `FinishDeletionPanel` (and `AccountDeletedNotice`'s Sign out). */
export const WEB_FINISH_DELETION = {
  heading: "Finish deleting your account",
  deleted: "Your data has been deleted.",
  lastStep: "One last step remains: removing your login. After that you will be signed out.",
  confirm: "Remove my login",
  pending: "Removing",
  retry: "Try again",
  identityPending: "We still could not remove your login. Try again.",
  rateLimited: "You have tried this a few times in a short while. Wait a little, then try again.",
  failed: "We could not remove your login. Try again.",
} as const;

/** "Type DELETE to confirm", as both web panels label the field. */
export const typePhraseLabel = (phrase: string) => `Type ${phrase} to confirm`;

/** The Data page (mobile): its title, the legal links and the one offline line. */
export const DATA_PAGE = {
  title: "Data",
  legalHeading: "Legal pages",
  offline: "You are offline. Downloading your data and deleting your account need a connection.",
} as const;

/** The app's own export words: the share sheet stands in for web's browser download. */
export const EXPORT = {
  /** Said before the file is shared (decided by the coordinator, 27 November 2026). */
  beforeSharing:
    "The file holds all your figures. Once you share it, Flump can no longer protect it.",
  shared: "Flump has removed its copy of the file from this phone.",
} as const;

/** The app's own delete outcomes, beyond web's. */
export const DELETE = {
  /** 503 `account_deletion_unavailable`: the backend's sentence, and that nothing changed. */
  unavailable: "Account deletion is not available right now. Nothing has changed. Try again later.",
  /** No answer in 30 seconds, or the connection dropped: it claims nothing either way. */
  noAnswer:
    "We did not get an answer in time, so we cannot tell yet if your account was deleted. Try again.",
} as const;

/** After "Sign in again", which signs in again in place and keeps the session. */
export const REAUTH = {
  differentAccount:
    "A different account signed in, so nothing has changed. You are still signed in to this account.",
  failed: "Sign-in did not finish. Nothing has changed. Try again.",
  /** No answer, a 5xx, a 429 or a body we could not read: it names no cause. */
  unavailable: "Sign-in could not be checked just now. Nothing has changed. Try again.",
} as const;

/** The same person signed in again: the deletion still waits for their press. */
export const reauthConfirmed = (button: string) =>
  `You signed in again. Select "${button}" to finish.`;

/** The way back from the delete page where it shows in place of another screen. */
export const CANCEL = "Cancel";

/** After the deletion confirmation, on to the sign-in screen. */
export const ACCOUNT_DELETED_CLOSE = "Close";

/** App lock (mobile only). A screen gate on this phone: never called encryption or account protection. */
export const APP_LOCK = {
  label: "App lock",
  hint: "Asks for your face, fingerprint or passcode when you open Flump, and after a minute away.",
  noScreenLock: "Set a screen lock on this phone to use app lock.",
  /** Android only: FLAG_SECURE is set while app lock is on. */
  screenshotsOff: "Screenshots of Flump are off while app lock is on.",
  failed: "We could not change app lock. Try again.",
  promptUnlock: "Unlock Flump",
  promptTurnOn: "Turn on app lock",
  promptTurnOff: "Turn off app lock",
} as const;

/** The cover while the app is locked. It shows no figures. */
export const LOCKED = {
  heading: "Flump is locked",
  body: "Confirm it is you with your face, fingerprint or passcode to carry on.",
  unlock: "Unlock",
  noScreenLock:
    "This phone no longer has a screen lock, so Flump cannot open. Sign out, then sign in again.",
} as const;

/** The iOS Face ID permission sentence (`app.config.ts`). */
export const FACE_ID_PERMISSION = "Flump uses Face ID to open the app when you turn on app lock.";
