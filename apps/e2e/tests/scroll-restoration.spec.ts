import { expect, type Page, test } from "@playwright/test";
import { AUTH_STATE } from "../support/auth";
import { MARKETING_URL } from "../support/env";
import { waitForHydration } from "../support/page";

/**
 * A new page opens at the top with focus on its content, a page loaded fresh is not given another
 * page's offset, and links to an anchor (and the skip link) land on their target (owner report
 * 2026-11-18: "the page is already scrolled towards the bottom"). The marketing site's router had
 * no scroll restoration at all, so a new page kept the old offset. Phone size with touch, where
 * the report came from. Back and forward restoring the old place is covered by the ScrollManager
 * unit tests (marketing) and React Router's own ScrollRestoration (web), not here: those passed
 * before this change too.
 */
test.use({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });

const scrollY = (page: Page) => page.evaluate(() => Math.round(window.scrollY));

/** Scrolls to the foot of the page and waits until the browser reports it there. */
async function scrollToBottom(page: Page): Promise<number> {
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect.poll(() => scrollY(page)).toBeGreaterThan(300);
  // The marketing site saves the offset once a frame: give it one.
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));
  return scrollY(page);
}

test.describe("marketing site", () => {
  test("a footer link opens the next page at the top with focus on its main content", async ({
    page,
  }) => {
    await page.goto(`${MARKETING_URL}/`);
    await page.locator("#root main").waitFor();
    await scrollToBottom(page);
    await page.locator("footer").getByRole("link", { name: "Pricing" }).first().click();
    await expect(page).toHaveURL(/\/pricing$/);
    await expect.poll(() => scrollY(page)).toBe(0);
    await expect(page.locator("main#main")).toBeFocused();
  });

  test("a page loaded fresh after scrolling another opens at the top", async ({ page }) => {
    // Every full page load has the router key "default": an offset saved on one page must not
    // open the next page loaded in the same tab.
    await page.goto(`${MARKETING_URL}/`);
    await page.locator("#root main").waitFor();
    await scrollToBottom(page);
    await page.goto(`${MARKETING_URL}/pricing`);
    await page.locator("#root main").waitFor();
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));
    expect(await scrollY(page)).toBe(0);
  });

  test("the skip link lands on the main content, not on a saved offset", async ({ page }) => {
    await page.goto(`${MARKETING_URL}/`);
    await page.locator("#root main").waitFor();
    await scrollToBottom(page);
    await page.goto(`${MARKETING_URL}/pricing`);
    await page.locator("#root main").waitFor();
    await page.getByRole("link", { name: /^Skip to/ }).focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/pricing#main$/);
    const top = await page.locator("main#main").evaluate((el) => el.getBoundingClientRect().top);
    expect(Math.abs(top), "main content at the top of the screen").toBeLessThanOrEqual(120);
  });

  test("a link to an anchor on another page lands on the anchor", async ({ page }) => {
    await page.goto(`${MARKETING_URL}/`);
    await page.locator("#root main").waitFor();
    await scrollToBottom(page);
    const link = page.locator('footer a[href="/contact#beta"]').first();
    await link.click();
    await expect(page).toHaveURL(/\/contact#beta$/);
    // The target starts near the top of the screen (its scroll margin clears the header), not
    // wherever the old page's offset happened to leave it.
    const top = await page.locator("#beta").evaluate((el) => el.getBoundingClientRect().top);
    expect(top).toBeGreaterThanOrEqual(0);
    expect(top).toBeLessThanOrEqual(160);
  });
});

test.describe("web app", () => {
  test.use({ storageState: AUTH_STATE });

  const BAR = 'nav[aria-label="Main navigation"]';

  test("a bottom-bar link opens the next page at the top with focus on its main content", async ({
    page,
  }) => {
    await page.goto("/app/accounts");
    await waitForHydration(page);
    await scrollToBottom(page);
    await page.locator(BAR).getByRole("link", { name: "Budget" }).tap();
    await expect(page).toHaveURL(/\/app\/budget$/);
    await expect.poll(() => scrollY(page)).toBe(0);
    await expect(page.locator("main#main-content")).toBeFocused();
  });

  test("a drawer link opens the next page at the top, not on the menu button", async ({ page }) => {
    await page.goto("/app/accounts");
    await waitForHydration(page);
    await scrollToBottom(page);
    await page.locator(BAR).getByRole("button", { name: "More pages" }).tap();
    await page
      .locator('[data-testid="mobile-nav-drawer"]')
      .getByRole("link", { name: "Pension" })
      .tap();
    await expect(page).toHaveURL(/\/app\/pension$/);
    await expect.poll(() => scrollY(page)).toBe(0);
    await expect(page.locator("main#main-content")).toBeFocused();
  });
});
