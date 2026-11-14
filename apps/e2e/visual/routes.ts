import type { Page } from "@playwright/test";
import { MARKETING_URL } from "../support/env";

export interface VisualRoute {
  /** Snapshot file stem, unique across the table. */
  name: string;
  /** Absolute URL, or a path on the web app. */
  url: string;
  /** Needs the seeded dev-session user. */
  signedIn: boolean;
  /** Runs after the page settles, to reach a state behind a click (for example a later step). */
  prepare?: (page: Page) => Promise<void>;
  /** HTTP status the page answers with; defaults to any status below 400. */
  expectedStatus?: number;
}

const web = (
  name: string,
  path: string,
  signedIn = true,
  prepare?: VisualRoute["prepare"],
): VisualRoute => ({
  name: `web-${name}`,
  url: path,
  signedIn,
  prepare,
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
  // Setup is not here: the seeded user has finished it, so /app/onboarding sends them to the
  // dashboard (R3). The setup screens are covered by their Storybook stories (light, dark, a11y)
  // and walked end to end by tests/new-user-journey.spec.ts.
  web("profile", "/app/profile"),
  { ...web("not-found-app", "/app/not-a-page"), expectedStatus: 404 },
  { ...web("not-found", "/not-a-page", false), expectedStatus: 404 },
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

/** Tags the renter-pass tests; the homeowner projects leave them out, the renter projects keep only them. */
export const RENTER_TAG = /@renter/;

/** Routes whose content depends on the household, shot again after the renter re-seed. */
const RENTER_ROUTE_NAMES = [
  "dashboard",
  "accounts",
  "budget",
  "debt",
  "mortgage",
  "pension",
  "savings",
  "take-home",
].map((name) => `web-${name}`);

export const RENTER_ROUTES: readonly VisualRoute[] = VISUAL_ROUTES.filter((route) =>
  RENTER_ROUTE_NAMES.includes(route.name),
);
