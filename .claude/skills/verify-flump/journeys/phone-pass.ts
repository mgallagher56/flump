/**
 * phone-pass: one pass of the main signed-in pages at phone width (375x812, touch). On each page:
 * no horizontal scroll (document scrollWidth no wider than the viewport), the phone navigation is
 * shown and marks the current page (a bottom-bar tab, or the row in the "More pages" drawer), and
 * the page's h1 is visible. Every page is checked before the journey fails, so one run lists every
 * page that breaks; results.json is the second, read-only view of what was measured.
 * Run: verify-flump drive phone-pass <run-id>
 */
import type { Page } from "@playwright/test";
import { expect, journey, open } from "../scripts/lib.ts";

const VIEWPORT = { width: 375, height: 812 };
const BAR = 'nav[aria-label="Main navigation"]';
const DRAWER = '[data-testid="mobile-nav-drawer"]';

interface Case {
  name: string;
  path: string;
  /** The bottom-bar tab that must be current, or null when no tab owns the page. */
  bar: string | null;
  /** The drawer row that must be current, or null when the drawer has no row for the page. */
  drawer: string | null;
  /** Where the page settles when the path redirects. */
  lands?: string;
}

// Same ownership as apps/e2e/tests/phone-nav-current.spec.ts. Forecast and Tax are old paths
// that redirect (Forecast to Savings, Tax to Self Assessment), so they mark their new page's owner.
// The drawer lists Self Assessment only when that page is switched on, which the homeowner is not.
const PAGES: Case[] = [
  { name: "dashboard", path: "/", bar: "Home", drawer: null },
  { name: "accounts", path: "/app/accounts", bar: "Accounts", drawer: null },
  { name: "budget", path: "/app/budget", bar: "Budget", drawer: null },
  { name: "history", path: "/app/accounts/history", bar: "Accounts", drawer: null },
  {
    name: "forecast",
    path: "/app/forecast",
    bar: null,
    drawer: "Savings",
    lands: "/app/savings",
  },
  { name: "debt", path: "/app/debt", bar: null, drawer: "Cards and loans" },
  { name: "savings", path: "/app/savings", bar: null, drawer: "Savings" },
  { name: "pension", path: "/app/pension", bar: null, drawer: "Pension" },
  { name: "mortgage", path: "/app/mortgage", bar: null, drawer: "Mortgage" },
  { name: "retirement", path: "/app/retirement", bar: null, drawer: "Retirement" },
  { name: "take-home", path: "/app/take-home", bar: "Pay", drawer: null },
  { name: "tax", path: "/app/tax", bar: "Pay", drawer: null, lands: "/app/self-assessment" },
  { name: "profile", path: "/app/profile", bar: null, drawer: "Settings" },
];

const currentLabels = (page: Page, scope: string) =>
  page
    .locator(`${scope} [aria-current="page"]`)
    .evaluateAll((els) => els.map((el) => (el.textContent ?? "").replace(/\s+/g, " ").trim()));

interface Result {
  name: string;
  path: string;
  finalUrl: string;
  scrollWidth: number;
  viewportWidth: number;
  barVisible: boolean;
  barCurrent: string[];
  drawerCurrent: string[];
  h1: string | null;
  problems: string[];
}

await journey(
  "phone-pass",
  async ({ page, step, save }) => {
    const results: Result[] = [];

    for (const each of PAGES) {
      await step(`${each.name} at 375 wide`, async () => {
        await open(page, each.path);
        await page.waitForLoadState("networkidle");
        const problems: string[] = [];
        const landed = new URL(page.url()).pathname;
        if (landed !== (each.lands ?? each.path))
          problems.push(`landed on ${landed}, expected ${each.lands ?? each.path}`);

        const { scrollWidth, viewportWidth } = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          viewportWidth: window.innerWidth,
        }));
        if (scrollWidth > viewportWidth)
          problems.push(`horizontal scroll: scrollWidth ${scrollWidth} > ${viewportWidth}`);

        const h1 = page.getByRole("heading", { level: 1 }).first();
        const h1Visible = (await h1.count()) > 0 && (await h1.isVisible());
        const h1Text = h1Visible ? ((await h1.textContent()) ?? "").trim() : null;
        if (!h1Visible) problems.push("no visible h1");

        const bar = page.locator(BAR);
        const barVisible = await bar.isVisible();
        let barCurrent: string[] = [];
        let drawerCurrent: string[] = [];
        if (!barVisible) {
          problems.push("phone navigation bar not shown");
        } else {
          barCurrent = await currentLabels(page, BAR);
          const wantBar = each.bar ? [each.bar] : [];
          if (JSON.stringify(barCurrent) !== JSON.stringify(wantBar))
            problems.push(
              `bar marks ${JSON.stringify(barCurrent)}, expected ${JSON.stringify(wantBar)}`,
            );

          await bar.getByRole("button", { name: "More pages" }).tap();
          const drawer = page.locator(DRAWER);
          await expect(drawer).toBeVisible();
          drawerCurrent = await currentLabels(page, DRAWER);
          const wantDrawer = each.drawer ? [each.drawer] : [];
          if (JSON.stringify(drawerCurrent) !== JSON.stringify(wantDrawer))
            problems.push(
              `drawer marks ${JSON.stringify(drawerCurrent)}, expected ${JSON.stringify(wantDrawer)}`,
            );
          await page.keyboard.press("Escape");
          await expect(drawer).toBeHidden();
        }

        results.push({
          name: each.name,
          path: each.path,
          finalUrl: landed,
          scrollWidth,
          viewportWidth,
          barVisible,
          barCurrent,
          drawerCurrent,
          h1: h1Text,
          problems,
        });
        if (problems.length > 0) console.log(`  ${each.name}: ${problems.join("; ")}`);
      });
    }

    await step("every page passed", async () => {
      save("results.json", results);
      const failing = results.filter((r) => r.problems.length > 0);
      expect(
        failing.map((r) => `${r.name}: ${r.problems.join("; ")}`),
        "pages with phone problems",
      ).toEqual([]);
    });
  },
  { viewport: VIEWPORT, mobile: true },
);
