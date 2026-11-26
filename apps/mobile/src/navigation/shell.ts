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

/**
 * The same page on the website. Without the web app's address in this build, the marketing site's
 * home page, rather than a page that may not exist there.
 */
export const webPageUrl = (
  shell: Pick<Shell, "marketingOrigin" | "webAppOrigin">,
  route: string,
) => (shell.webAppOrigin ? `${shell.webAppOrigin}${route}` : shell.marketingOrigin);
