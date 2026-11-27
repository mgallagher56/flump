import { createContext, useContext } from "react";

/**
 * What the signed-in shell gives every tab and page (E12 S4): whether the session was restored
 * without reaching Flump, the way to sign out (which asks first), Try again, and the two websites.
 * `SessionGate` provides it while someone is signed in.
 */
export interface Shell {
  readonly offline: boolean;
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

/** Web's accounts page, where an account is added until the app can (S8). */
export const ADD_ACCOUNT_WEB_ROUTE = "/app/accounts";
/** Web's net worth choices in Settings (`NET_WORTH_SETTINGS_HREF`), until the app has them (S9). */
export const NET_WORTH_SETTINGS_WEB_ROUTE = "/app/profile?tab=profile#net-worth";
/** Web's form for adding the home's value (`ADD_HOME_VALUE_HREF`), until the app has it (S8). */
export const ADD_HOME_VALUE_WEB_ROUTE = "/app/accounts?add=property";
/** Web's budget page, where a budget and its spending are added until the app has it (S10). */
export const BUDGET_WEB_ROUTE = "/app/budget";
/** Web's net worth history, where earlier months are added until the app can (S8). */
export const NET_WORTH_HISTORY_WEB_ROUTE = "/app/accounts/history";
/** Web's page for one account, where it is edited until the app can (S8). */
export const accountWebRoute = (id: string) => `/app/accounts/${encodeURIComponent(id)}`;
