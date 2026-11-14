import type { Page } from "@playwright/test";
import { TOOL_SLUGS } from "../../../packages/ui/src/tools/toolCatalog";
import { MARKETING_URL } from "../support/env";
import type { PersonaName } from "../support/personas";

export interface SweepPage {
  /** File stem: the path without its leading slash, "/" as "_", the root as "home". */
  name: string;
  /** Absolute URL, or a path on the web app. */
  url: string;
  /** Shoot every secondary `role="tab"` too, as `<name>--<tab>`. */
  tabs?: boolean;
  /** Skip the page when it answers 404 (pages that may not exist). */
  optional?: boolean;
}

export interface SweepDialog {
  name: string;
  url: string;
  /** Opens the dialog, sheet or menu. Never clicks a final Save, Delete or Finish. */
  open: (page: Page) => Promise<void>;
  /** Only at this width (the mobile nav menu). */
  width?: number;
  /** Renders in the page rather than as a dialog (the budget wizard): no dialog to wait for. */
  inline?: boolean;
}

export interface SweepSet {
  name: string;
  /** Re-seed as this persona first; absent means signed out. */
  persona?: PersonaName;
  pages?: SweepPage[];
  dialogs?: SweepDialog[];
  onboarding?: boolean;
  /** Viewport shots only (dialogs), no full page. */
  viewportOnly?: boolean;
}

const stem = (path: string) =>
  path === "/" ? "home" : path.replace(/^\/(app\/)?/, "").replace(/\//g, "_");
const page = (path: string, extra: Partial<SweepPage> = {}): SweepPage => ({
  name: stem(path),
  url: path,
  ...extra,
});

/** Signed-in pages, the same for both households. Forecast is a 301 to Savings now (E16 F21). */
const APP_PAGES: SweepPage[] = [
  { name: "home", url: "/" },
  page("/app/accounts"),
  page("/app/accounts/history"),
  page("/app/budget"),
  page("/app/debt", { tabs: true }),
  page("/app/mortgage", { tabs: true }),
  page("/app/pension", { tabs: true }),
  page("/app/savings", { tabs: true }),
  page("/app/take-home", { tabs: true }),
  page("/app/self-assessment", { tabs: true }),
  page("/app/profile", { tabs: true }),
];

const button = (name: string | RegExp) => async (p: Page) => {
  await p.getByRole("button", { name }).first().click();
};

const DIALOGS: SweepDialog[] = [
  { name: "add-account", url: "/app/accounts", open: button(/^Add account$/) },
  {
    name: "edit-account",
    url: "/app/accounts",
    open: async (p) => {
      await p
        .getByRole("link", { name: /Current account/ })
        .first()
        .click();
      await p.waitForURL(/\/app\/accounts\/[^/]+$/);
      await p.getByRole("button", { name: /^Edit/ }).first().click();
    },
  },
  { name: "add-debt", url: "/app/debt", open: button(/^Add a debt$/) },
  { name: "edit-debt", url: "/app/debt", open: button(/^Edit Car loan/) },
  {
    name: "budget-wizard",
    url: "/app/budget",
    inline: true,
    open: button(/^(Edit|Set up your) budget$/),
  },
  { name: "budget-add-category", url: "/app/budget", open: button(/^Add category$/) },
  { name: "check-in", url: "/app/accounts/history?checkIn=1", open: async () => {} },
  { name: "dashboard-widgets", url: "/", open: button(/^Choose what shows here$/) },
  { name: "add-savings-account", url: "/app/savings", open: button(/^Add (an )?account$/) },
  // The self assessment payslip and cost forms sit behind the page's opt-in, which saves the
  // profile, so they are left out for a PAYE household (and the receipt dialog needs a saved record).
  {
    name: "settings-delete-account",
    url: "/app/profile",
    open: async (p) => {
      await p.getByRole("tab", { name: /^Data/ }).click();
      await p
        .getByRole("button", { name: /^Delete account$/ })
        .first()
        .click();
    },
  },
  { name: "mobile-nav-more", url: "/", width: 375, open: button(/^More pages/) },
  { name: "account-menu", url: "/", open: button(/account menu/i) },
];

const toolPages = (base: string) =>
  TOOL_SLUGS.map((slug) => ({ name: stem(`/tools/${slug}`), url: `${base}/tools/${slug}` }));

export const SWEEP_SETS: SweepSet[] = [
  { name: "renter", persona: "renter", pages: APP_PAGES },
  { name: "mortgage", persona: "homeowner", pages: APP_PAGES },
  { name: "dialogs", persona: "homeowner", dialogs: DIALOGS, viewportOnly: true },
  { name: "onboarding", persona: "homeowner", onboarding: true },
  {
    name: "out",
    pages: [
      page("/tools"),
      ...toolPages(""),
      { name: "sandbox", url: "/sandbox?persona=medium" },
      { name: "sandbox--debt", url: "/sandbox?persona=debt" },
      { name: "sandbox--high", url: "/sandbox?persona=high" },
      page("/nope-404"),
      page("/signup"),
      // Last: with the test-only dev session, /login signs the context in.
      page("/login"),
    ],
  },
  {
    name: "mkt",
    pages: [
      { name: "home", url: `${MARKETING_URL}/` },
      { name: "tools", url: `${MARKETING_URL}/tools` },
      ...toolPages(MARKETING_URL),
      ...["/pricing", "/security", "/mcp", "/contact"].map((p) => ({
        name: stem(p),
        url: `${MARKETING_URL}${p}`,
      })),
      ...["/privacy", "/terms"].map((p) => ({
        name: stem(p),
        url: `${MARKETING_URL}${p}`,
        optional: true,
      })),
      { name: "nope-404", url: `${MARKETING_URL}/nope-404` },
    ],
  },
];
