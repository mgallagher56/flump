import type { Page } from "@playwright/test";
import { TOOL_SLUGS } from "../../../packages/ui/src/tools/toolCatalog";
import { MARKETING_URL } from "../support/env";
import type { PersonaName } from "../support/personas";

/**
 * Journeys for the phone audit (docs/audit/phone-audit-2026-11/JOURNEYS.md). Each set is one
 * journey's household: its pages, the overlays it opens and the forms it fills. Ids (J1 to J10)
 * match the journey map. Nothing is ever saved, deleted or finished.
 */
export interface PhonePage {
  name: string;
  url: string;
  /** Shoot each secondary tab too (at the two narrowest widths only, to keep the run short). */
  tabs?: boolean;
  /** Also shot at 812x375 landscape. */
  main?: boolean;
  /** A page the journey needs to reach, but which may answer 404 (a removed or optional page). */
  optional?: boolean;
}

export interface PhoneOverlay {
  name: string;
  url: string;
  open: (page: Page) => Promise<void>;
  /** The panel is in the page (the budget wizard), so overlay metrics are skipped. */
  inline?: boolean;
  /** Walk the fields with Tab and record any scroll jump (keyboard-driven jumps). */
  walkFields?: boolean;
}

export interface PhoneSet {
  id: string;
  name: string;
  persona?: PersonaName;
  /** Make the dev user brand new first (runs last: it spends a reset and empties the data). */
  newUser?: boolean;
  pages: PhonePage[];
  overlays?: PhoneOverlay[];
  onboarding?: boolean;
  /** Bottom-bar and drawer navigation checks (scroll after navigation, back, current state). */
  navigation?: boolean;
  /** Axe at 375 light and dark, and the 200% text pass, for this set's pages. */
  a11y?: boolean;
}

const stem = (path: string) =>
  path === "/" ? "home" : path.replace(/^\/(app\/)?/, "").replace(/[/?=#]/g, "_");
const p = (path: string, extra: Partial<PhonePage> = {}): PhonePage => ({
  name: stem(path),
  url: path,
  ...extra,
});

/** The first visible button or link with this name (phone layouts keep hidden desktop copies). */
const button = (name: string | RegExp) => async (page: Page) => {
  await page
    .getByRole("button", { name })
    .or(page.getByRole("link", { name }))
    .filter({ visible: true })
    .first()
    .click();
};
const tabThen = (tab: RegExp, name: RegExp) => async (page: Page) => {
  await page.getByRole("tab", { name: tab }).first().click();
  await button(name)(page);
};

const HOME = p("/", { name: "home", main: true });
const ACCOUNTS = p("/app/accounts", { main: true });
const HISTORY = p("/app/accounts/history");
const BUDGET = p("/app/budget", { main: true });
const DEBT = p("/app/debt", { tabs: true, main: true });
const MORTGAGE = p("/app/mortgage", { tabs: true, main: true });
const PENSION = p("/app/pension", { tabs: true, main: true });
const RETIREMENT = p("/app/retirement", { main: true });
const SAVINGS = p("/app/savings", { tabs: true, main: true });
const TAKE_HOME = p("/app/take-home", { tabs: true });
const SELF_ASSESSMENT = p("/app/self-assessment", { tabs: true, main: true });
const PROFILE = p("/app/profile", { tabs: true });
const IMPORTS = p("/app/imports");

const firstAccount = (match: RegExp) => async (page: Page) => {
  await page.getByRole("link", { name: match }).first().click();
  await page.waitForURL(/\/app\/accounts\/[^/]+$/);
};

const ACCOUNT_OVERLAYS: PhoneOverlay[] = [
  { name: "add-account", url: "/app/accounts", open: button(/^Add account$/), walkFields: true },
  {
    name: "edit-account",
    url: "/app/accounts",
    walkFields: true,
    open: async (page) => {
      await firstAccount(/Current account/)(page);
      await page.getByRole("button", { name: /^Edit/ }).first().click();
    },
  },
  {
    name: "check-in",
    url: "/app/accounts/history?checkIn=1",
    open: async () => {},
    walkFields: true,
  },
  { name: "dashboard-widgets", url: "/", open: button(/^Choose what shows here$/) },
  { name: "nav-drawer-more", url: "/", open: button(/^More pages/) },
  { name: "nav-drawer-topbar", url: "/", open: button(/navigation menu/i) },
  { name: "account-menu", url: "/", open: button(/account menu/i) },
];

const BUDGET_OVERLAYS: PhoneOverlay[] = [
  {
    name: "budget-wizard",
    url: "/app/budget",
    inline: true,
    open: button(/^(Edit|Set up your) budget$/),
  },
  {
    name: "budget-add-category",
    url: "/app/budget",
    walkFields: true,
    // "Add category" sits in the budget editor, behind "Edit budget" (the wizard for a new budget).
    open: async (page) => {
      await button(/^Edit budget$/)(page);
      await button(/^Add category$/)(page);
    },
  },
  {
    name: "housing-rent",
    url: "/app/budget",
    open: async (page) => {
      // The housing dialog opens from inside the Housing row, which starts collapsed.
      await button(/^Housing/)(page);
      await button(/^(Edit|Add) your rent$|^Edit what you pay$/)(page);
    },
    walkFields: true,
  },
  { name: "breathing-room-tip", url: "/app/budget", open: button(/breathing room/i) },
];

const MARKETING_PAGES: PhonePage[] = [
  { name: "mkt-home", url: `${MARKETING_URL}/`, main: true },
  { name: "mkt-tools", url: `${MARKETING_URL}/tools` },
  ...TOOL_SLUGS.map((slug) => ({
    name: `mkt-${stem(`/tools/${slug}`)}`,
    url: `${MARKETING_URL}/tools/${slug}`,
  })),
  ...[
    "/features",
    "/features/accounts",
    "/features/budget",
    "/features/pay",
    "/features/savings-and-pension",
    "/features/debt-and-borrowing",
    "/features/ai-connection",
    "/pricing",
    "/security",
    "/contact",
    "/preview",
  ].map((path) => ({
    name: `mkt-${stem(path)}`,
    url: `${MARKETING_URL}${path}`,
    main: path === "/pricing",
  })),
];

const menuItem = (menu: RegExp, item: RegExp) => async (page: Page) => {
  await button(menu)(page);
  await page.getByRole("menuitem", { name: item }).first().click();
};

/** J11: one person who uses everything, every overlay once. */
const EVERYTHING_OVERLAYS: PhoneOverlay[] = [
  ...ACCOUNT_OVERLAYS,
  ...BUDGET_OVERLAYS.filter((o) => o.name !== "housing-rent"),
  {
    name: "housing-mortgage",
    url: "/app/budget",
    open: async (page) => {
      await button(/^Housing/)(page);
      await button(/^Edit what you pay$/)(page);
    },
    walkFields: true,
  },
  {
    name: "add-savings-account",
    url: "/app/savings",
    open: button(/^Add (an )?account$/),
    walkFields: true,
  },
  { name: "add-debt", url: "/app/debt", open: button(/^Add a debt$/), walkFields: true },
  { name: "edit-debt", url: "/app/debt", open: button(/^Edit Car finance/), walkFields: true },
  {
    name: "edit-mortgage",
    url: "/app/mortgage",
    open: button(/mortgage details|^Edit mortgage|^Edit$/i),
    walkFields: true,
  },
  {
    name: "mortgage-tip",
    url: "/app/mortgage",
    open: button(/^About Starting figures|^Starting figures$/),
  },
  {
    name: "add-pension-pot",
    url: "/app/pension",
    open: button(/^Add pension pot$/),
    walkFields: true,
  },
  { name: "sa-add-income-menu", url: "/app/self-assessment", open: button(/^Add income/) },
  {
    name: "sa-record-dialog",
    url: "/app/self-assessment",
    open: menuItem(/^Add income/, /^Rental income$/),
    walkFields: true,
  },
  {
    name: "sa-copy-last-year",
    url: "/app/self-assessment",
    open: menuItem(/^Add income/, /^Copy from last year$/),
  },
  { name: "sa-row-actions", url: "/app/self-assessment", open: button(/^Actions for /) },
  { name: "sa-year-menu", url: "/app/self-assessment", open: button(/^More for /) },
  {
    name: "sa-delete-record",
    url: "/app/self-assessment",
    open: async (page) => {
      await button(/^Actions for /)(page);
      await page
        .getByRole("menuitem", { name: /^Delete/ })
        .first()
        .click();
    },
  },
  {
    name: "import-undo",
    url: "/app/imports",
    open: async (page) => {
      await page
        .getByRole("link", { name: /General investment account|import/i })
        .first()
        .click();
      await page.waitForURL(/\/app\/imports\/[^/]+$/);
      await button(/^Undo import$/)(page);
    },
  },
  {
    name: "settings-disconnect-ai",
    url: "/app/profile",
    open: tabThen(/^Security/, /^Disconnect /),
  },
  {
    name: "settings-delete-data",
    url: "/app/profile",
    open: tabThen(/^Data/, /^Delete all data$/),
  },
  {
    name: "settings-delete-account",
    url: "/app/profile",
    open: tabThen(/^Data/, /^Delete (my )?account$/),
  },
];

export const PHONE_SETS: PhoneSet[] = [
  {
    id: "J2",
    name: "renter",
    persona: "renter",
    navigation: true,
    a11y: true,
    pages: [HOME, ACCOUNTS, HISTORY, BUDGET, SAVINGS, DEBT, PENSION, TAKE_HOME, PROFILE],
    overlays: [
      ...ACCOUNT_OVERLAYS,
      ...BUDGET_OVERLAYS,
      {
        name: "add-savings-account",
        url: "/app/savings",
        open: button(/^Add (an )?account$/),
        walkFields: true,
      },
    ],
  },
  {
    id: "J3",
    name: "homeowner",
    persona: "homeowner",
    navigation: true,
    a11y: true,
    pages: [HOME, ACCOUNTS, HISTORY, BUDGET, MORTGAGE, SAVINGS, DEBT, PENSION, TAKE_HOME],
    overlays: [
      {
        name: "edit-mortgage",
        url: "/app/mortgage",
        open: button(/mortgage details|^Edit mortgage|^Edit$/i),
        walkFields: true,
      },
      {
        name: "mortgage-tip",
        url: "/app/mortgage",
        open: button(/^About Starting figures|^Starting figures$/),
      },
      {
        name: "housing-mortgage",
        url: "/app/budget",
        open: async (page) => {
          await button(/^Housing/)(page);
          await button(/^Edit what you pay$/)(page);
        },
        walkFields: true,
      },
      {
        name: "add-pension-pot",
        url: "/app/pension",
        open: button(/^Add pension pot$/),
        walkFields: true,
      },
    ],
  },
  {
    id: "J4",
    name: "debtpayer",
    persona: "debtpayer",
    a11y: true,
    pages: [HOME, DEBT, BUDGET, ACCOUNTS],
    overlays: [
      { name: "add-debt", url: "/app/debt", open: button(/^Add a debt$/), walkFields: true },
      {
        name: "edit-debt",
        url: "/app/debt",
        open: button(/^Edit Personal loan/),
        walkFields: true,
      },
      {
        name: "debt-apr-tip",
        url: "/app/debt",
        open: async (page) => {
          await page
            .getByRole("button", { name: /^Add a debt$/ })
            .first()
            .click();
          await page
            .getByRole("button", { name: /Interest rate \(APR\)/ })
            .first()
            .click();
        },
      },
    ],
  },
  {
    id: "J5",
    name: "selfemployed",
    persona: "selfemployed",
    a11y: true,
    pages: [HOME, SELF_ASSESSMENT, MORTGAGE, ACCOUNTS, PROFILE],
    overlays: [
      { name: "sa-add-income-menu", url: "/app/self-assessment", open: button(/^Add income/) },
      {
        name: "sa-record-dialog",
        url: "/app/self-assessment",
        walkFields: true,
        open: async (page) => {
          await page
            .getByRole("button", { name: /^Add income/ })
            .first()
            .click();
          await page.getByRole("menuitem").first().click();
        },
      },
      { name: "sa-year-menu", url: "/app/self-assessment", open: button(/^More for /) },
    ],
  },
  {
    id: "J6",
    name: "retiree",
    persona: "retiree",
    a11y: true,
    pages: [HOME, PENSION, RETIREMENT, SAVINGS, ACCOUNTS],
    overlays: [
      {
        name: "edit-pension-pot",
        url: "/app/pension",
        open: button(/^Edit SIPP|^Edit Current workplace/),
        walkFields: true,
      },
    ],
  },
  {
    id: "J8",
    name: "settings",
    persona: "retiree",
    pages: [PROFILE, IMPORTS, p("/app/imports/does-not-exist"), p("/app/accounts/does-not-exist")],
    overlays: [
      {
        name: "settings-delete-data",
        url: "/app/profile",
        open: tabThen(/^Data/, /^Delete all data$/),
      },
      {
        name: "settings-delete-account",
        url: "/app/profile",
        open: tabThen(/^Data/, /^Delete (my )?account$/),
      },
    ],
  },
  {
    id: "J11",
    name: "everything",
    persona: "everything",
    navigation: true,
    a11y: true,
    pages: [
      ...MARKETING_PAGES,
      HOME,
      ACCOUNTS,
      HISTORY,
      BUDGET,
      SAVINGS,
      DEBT,
      MORTGAGE,
      PENSION,
      RETIREMENT,
      TAKE_HOME,
      SELF_ASSESSMENT,
      IMPORTS,
      PROFILE,
      p("/tools"),
      p("/app/onboarding", { optional: true }),
      p("/nope-404"),
      { name: "mkt-nope-404", url: `${MARKETING_URL}/nope-404` },
    ],
    overlays: EVERYTHING_OVERLAYS,
  },
  {
    id: "J9",
    name: "newuser",
    newUser: true,
    onboarding: true,
    pages: [HOME, ACCOUNTS, HISTORY, BUDGET, SAVINGS, DEBT, PENSION, MORTGAGE, SELF_ASSESSMENT],
  },
  {
    id: "J9",
    name: "out",
    pages: [
      p("/tools"),
      ...TOOL_SLUGS.map((slug) => p(`/tools/${slug}`)),
      p("/nope-404"),
      p("/account-deleted"),
      p("/signup"),
      // Last: with the test-only dev session, /login signs the context in.
      p("/login"),
    ],
  },
  {
    id: "J1",
    name: "mkt",
    pages: [
      { name: "home", url: `${MARKETING_URL}/`, main: true },
      { name: "tools", url: `${MARKETING_URL}/tools` },
      ...TOOL_SLUGS.map((slug) => ({
        name: stem(`/tools/${slug}`),
        url: `${MARKETING_URL}/tools/${slug}`,
      })),
      ...[
        "/features",
        "/features/accounts",
        "/features/budget",
        "/features/pay",
        "/features/savings-and-pension",
        "/features/debt-and-borrowing",
        "/features/ai-connection",
        "/pricing",
        "/security",
        "/contact",
        "/preview",
      ].map((path) => ({
        name: stem(path),
        url: `${MARKETING_URL}${path}`,
        main: path === "/pricing",
      })),
      { name: "nope-404", url: `${MARKETING_URL}/nope-404` },
    ],
    overlays: [{ name: "mkt-menu", url: `${MARKETING_URL}/`, open: button(/menu/i) }],
  },
];
