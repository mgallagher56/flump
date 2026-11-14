import { MARKETING_URL } from "../support/env";

export interface VisualRoute {
  /** Snapshot file stem, unique across the table. */
  name: string;
  /** Absolute URL, or a path on the web app. */
  url: string;
  /** Needs the seeded dev-session user. */
  signedIn: boolean;
}

const web = (name: string, path: string, signedIn = true): VisualRoute => ({
  name: `web-${name}`,
  url: path,
  signedIn,
});

const marketing = (name: string, path: string): VisualRoute => ({
  name: `marketing-${name}`,
  url: `${MARKETING_URL}${path}`,
  signedIn: false,
});

/**
 * Every signed-in screen, the signed-out tools index, one calculator and the sandbox in the
 * web app, plus the main marketing pages. Each one is shot at 375 and 1280 in light and dark.
 * Add a row here when a new top-level screen lands.
 */
export const VISUAL_ROUTES: readonly VisualRoute[] = [
  web("dashboard", "/"),
  web("accounts", "/app/accounts"),
  web("accounts-history", "/app/accounts/history"),
  web("budget", "/app/budget"),
  web("debt", "/app/debt"),
  web("forecast", "/app/forecast"),
  web("mortgage", "/app/mortgage"),
  web("pension", "/app/pension"),
  web("profile", "/app/profile"),
  web("savings", "/app/savings"),
  web("self-assessment", "/app/self-assessment"),
  web("take-home", "/app/take-home"),
  web("tools", "/tools", false),
  web("tools-100k-trap", "/tools/uk-100k-tax-trap-calculator", false),
  web("sandbox", "/sandbox", false),
  marketing("home", "/"),
  marketing("pricing", "/pricing"),
  marketing("tools", "/tools"),
  marketing("mcp", "/mcp"),
];
