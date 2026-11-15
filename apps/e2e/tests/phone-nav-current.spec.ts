import { expect, type Page, test } from "@playwright/test";
import { AUTH_STATE } from "../support/auth";
import { waitForHydration } from "../support/page";

/**
 * Phone navigation marks the right page (R3 chrome). At 390 wide every signed-in app route marks
 * exactly the bottom-bar tab that owns it, or no tab at all with the drawer item marked instead. No
 * route may mark an unrelated tab or drawer item.
 *
 * `bar` is the bottom-bar label that must be current (or null for none). `drawer` is the only drawer
 * row that may be current; when the drawer lists that row it must be current. The drawer leaves out
 * the bar's own pages, so a bar page has no drawer row.
 */
interface Case {
  path: string;
  bar: string | null;
  drawer: string | null;
  /** The drawer lists this row only when the page is switched on for the seeded user. */
  optional?: true;
}

const CASES: Case[] = [
  { path: "/", bar: "Home", drawer: null },
  { path: "/app/accounts", bar: "Accounts", drawer: null },
  { path: "/app/accounts/history", bar: "Accounts", drawer: null },
  { path: "/app/budget", bar: "Budget", drawer: null },
  { path: "/app/take-home", bar: "Pay", drawer: null },
  // Self Assessment lives under Pay; the drawer lists it only when the page is switched on.
  { path: "/app/self-assessment", bar: "Pay", drawer: "Self Assessment", optional: true },
  { path: "/app/savings", bar: null, drawer: "Savings" },
  { path: "/app/pension", bar: null, drawer: "Pension" },
  { path: "/app/debt", bar: null, drawer: "Debt and borrowing" },
  { path: "/app/mortgage", bar: null, drawer: "Mortgage" },
  { path: "/app/profile", bar: null, drawer: "Settings" },
  { path: "/app/profile?tab=ai_connections", bar: null, drawer: "Connect AI" },
  { path: "/app/imports", bar: null, drawer: null },
  { path: "/tools", bar: null, drawer: "Calculators" },
];

const BAR = 'nav[aria-label="Main navigation"]';
const DRAWER = '[data-testid="mobile-nav-drawer"]';

const currentLabels = (page: Page, scope: string) =>
  page
    .locator(`${scope} [aria-current="page"]`)
    .evaluateAll((els) => els.map((el) => (el.textContent ?? "").replace(/\s+/g, " ").trim()));

/** How a bar tab draws: its fill and text colour. */
const look = (page: Page, name: string) =>
  page
    .locator(BAR)
    .getByRole("link", { name })
    .evaluate((el) => {
      const style = getComputedStyle(el);
      return `${style.backgroundColor} ${style.color}`;
    });

test.describe("phone navigation marks the current page", () => {
  test.use({
    storageState: AUTH_STATE,
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });

  for (const each of CASES) {
    test(`${each.path} marks ${each.bar ?? "no tab"} in the bar and ${each.drawer ?? "nothing"} in the drawer`, async ({
      page,
    }) => {
      await page.goto(each.path);
      await waitForHydration(page);
      await expect(page.locator(BAR)).toBeVisible();

      const bar = await currentLabels(page, BAR);
      expect(bar, `bottom bar current item on ${each.path}`).toEqual(each.bar ? [each.bar] : []);

      await page.locator(BAR).getByRole("button", { name: "More pages" }).tap();
      const drawer = page.locator(DRAWER);
      await expect(drawer).toBeVisible();
      const marked = await currentLabels(page, DRAWER);
      // Nothing but the expected row may be current.
      expect(
        marked.filter((label) => label !== each.drawer),
        `drawer current rows on ${each.path}`,
      ).toEqual([]);
      if (each.drawer) {
        const row = drawer.getByRole("link", { name: each.drawer, exact: true });
        if (!each.optional || (await row.count()) > 0)
          await expect(row).toHaveAttribute("aria-current", "page");
      }
    });
  }

  test("leaving Budget by the Housing row clears Budget as current on Mortgage", async ({
    page,
  }) => {
    // Reported in budget round 4: Budget stayed current after this client-side move.
    await page.goto("/app/budget");
    await waitForHydration(page);
    expect(await currentLabels(page, BAR)).toEqual(["Budget"]);
    await page.locator('main a[href="/app/mortgage"]').first().tap();
    await expect(page).toHaveURL(/\/app\/mortgage$/);
    await expect(page.locator(`${BAR} [aria-current="page"]`)).toHaveCount(0);
    // Read the moment Budget stops being current, not polled: the fill used to fade out, so an
    // early frame still showed Budget filled. It must already draw like Accounts.
    expect(await look(page, "Budget"), "Budget straight after leaving Budget").toBe(
      await look(page, "Accounts"),
    );
    await expect(page.getByRole("heading", { level: 1, name: "Your mortgage" })).toBeVisible();
  });

  test("a tab tapped on one page does not look current on the next", async ({ page }) => {
    await page.goto("/");
    await waitForHydration(page);
    const bar = page.locator(BAR);
    await bar.getByRole("link", { name: "Budget" }).tap();
    await expect(page).toHaveURL(/\/app\/budget$/);
    await waitForHydration(page);

    // Move on in the app without moving the finger (as a link in the page would): the touch point
    // stays over Budget, where a touch browser keeps `:hover`.
    await bar.getByRole("button", { name: "More pages" }).dispatchEvent("click");
    await page
      .locator(DRAWER)
      .getByRole("link", { name: "Mortgage", exact: true })
      .dispatchEvent("click");
    await expect(page).toHaveURL(/\/app\/mortgage$/);

    await expect(page.locator(`${BAR} [aria-current="page"]`)).toHaveCount(0);
    // The finger is still over Budget's slot: it must draw like its neighbours, not darker.
    expect(await look(page, "Budget")).toBe(await look(page, "Accounts"));
  });
});
