import { createContext, useContext } from "react";
import type { SavedFigures } from "../data/offlineCache";

/**
 * What the signed-in shell gives every tab and page (E12 S4): whether the session was restored
 * without reaching Flump, the way to sign out (which asks first), Try again, and the two websites.
 * `SessionGate` provides it while someone is signed in.
 */
export interface Shell {
  readonly offline: boolean;
  /**
   * Offline, the saved figures' oldest time (E12 S7), or null when there are none to show: the
   * screens that read data then show `Offline`.
   */
  readonly saved?: SavedFigures | null;
  /** Offline, the saved figures are still being read. */
  readonly restoringSaved?: boolean;
  /** A quiet reconnect from the saved figures' Try again is running. */
  readonly checking?: boolean;
  /** Offline with saved figures: a quiet reconnect, the figures staying on screen. */
  tryAgainQuietly?(): void;
  signOut(): void;
  retry(): void;
  readonly marketingOrigin: string;
  readonly webAppOrigin: string | null;
}

export const ShellContext = createContext<Shell | null>(null);

export function useShell(): Shell {
  const shell = useContext(ShellContext);
  if (!shell) throw new Error("useShell is for screens inside the signed-in shell (SessionGate).");
  return shell;
}

/** A link to the website: where it goes, and whether that is the page itself. */
export interface WebLink {
  readonly url: string;
  /** False when this build has no web app address and the link goes to the marketing home page. */
  readonly exact: boolean;
}

/**
 * The same page on the website. Without the web app's address in this build, the marketing site's
 * home page, rather than a page that may not exist there; `exact` says which, so the button can say
 * truthfully where it goes.
 */
export const webLink = (
  shell: Pick<Shell, "marketingOrigin" | "webAppOrigin">,
  route: string,
): WebLink =>
  shell.webAppOrigin
    ? { url: `${shell.webAppOrigin}${route}`, exact: true }
    : { url: shell.marketingOrigin, exact: false };

/** Web's onboarding, where a person with no profile yet sets up. */
export const SET_UP_WEB_ROUTE = "/app/onboarding";

/** The app's own net worth choices: Settings, Profile, opened at the group (E12 S9). */
export const NET_WORTH_SETTINGS_ROUTE = "/settings/profile?focus=net-worth";
/** Web's Profile settings, where the rest of the profile is changed (E12 S9). */
export const PROFILE_SETTINGS_WEB_ROUTE = "/app/profile?tab=profile";
/** Web's Security settings, where the password is changed: the app never takes one (E12 S9). */
export const SECURITY_SETTINGS_WEB_ROUTE = "/app/profile?tab=security";
/** Web's budget page, where a budget and its spending are added until the app has it (S10). */
export const BUDGET_WEB_ROUTE = "/app/budget";
/** Web's net worth history, where earlier months are added until the app can (S8). */
export const NET_WORTH_HISTORY_WEB_ROUTE = "/app/accounts/history";
/** Web's mortgage page, which owns a mortgage's detail (`ownerPageFor`), until the app has it (S11). */
export const MORTGAGE_WEB_ROUTE = "/app/mortgage";
/** Web's debts page, which owns a debt's or student loan's detail, until the app has it (S12). */
export const DEBTS_WEB_ROUTE = "/app/debt";
