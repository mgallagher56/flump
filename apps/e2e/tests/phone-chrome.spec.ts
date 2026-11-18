import { expect, type Page, test } from "@playwright/test";
import { AUTH_STATE } from "../support/auth";
import { MARKETING_URL } from "../support/env";
import { waitForHydration } from "../support/page";

/**
 * Phone chrome from the owner's report of 2026-11-18: the signed-in footer is one line with the
 * logo and stays clear of the bottom bar, and the menu button sits on the side its drawer opens.
 */

const BAR = 'nav[aria-label="Main navigation"]';

async function footerLine(page: Page) {
  return page.locator("footer").evaluate((footer) => {
    const text = footer.querySelector("p");
    const logo = footer.querySelector('[data-testid="home-logo"]');
    const range = document.createRange();
    if (text) range.selectNodeContents(text);
    const lineHeight = text ? Number.parseFloat(getComputedStyle(text).lineHeight) : 0;
    const textBox = range.getBoundingClientRect();
    const logoBox = logo?.getBoundingClientRect();
    return {
      textLines: Math.round(textBox.height / lineHeight),
      // Logo and text share one row: their vertical centres are within a few pixels.
      sameRow: logoBox
        ? Math.abs(logoBox.top + logoBox.height / 2 - (textBox.top + textBox.height / 2)) < 6
        : false,
      links: footer.querySelectorAll("a").length,
      navs: footer.querySelectorAll("nav").length,
      rowBottom: Math.max(textBox.bottom, logoBox?.bottom ?? 0),
      textRight: textBox.right,
    };
  });
}

test.describe("signed-in footer", () => {
  test.use({ storageState: AUTH_STATE });

  for (const width of [320, 375, 390, 430, 1280]) {
    test(`is one line with the logo at ${width} wide, above the bottom bar`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/app/accounts");
      await waitForHydration(page);
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      const line = await footerLine(page);
      expect(line.textLines, "company line wraps").toBe(1);
      expect(line.sameRow, "logo and text on one row").toBe(true);
      expect(line.links, "only the logo link").toBe(1);
      expect(line.navs).toBe(0);
      expect(line.textRight).toBeLessThanOrEqual(width);
      const bar = page.locator(BAR);
      if (width < 768) {
        const barTop = (await bar.boundingBox())?.y ?? 0;
        // Never under the bar, and no empty band between the footer line and the bar.
        expect(line.rowBottom, "footer line under the bar").toBeLessThanOrEqual(barTop);
        expect(barTop - line.rowBottom, "gap above the bar").toBeLessThanOrEqual(32);
      } else {
        await expect(bar).toBeHidden();
      }
    });
  }
});

test.describe("the drawer opens from the side of its menu button", () => {
  test.use({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });

  async function expectRightSide(page: Page, menu: string) {
    const button = page.getByRole("button", { name: menu });
    const buttonBox = await button.boundingBox();
    expect(
      (buttonBox?.x ?? 0) + (buttonBox?.width ?? 0) / 2,
      "menu button on the right",
    ).toBeGreaterThan(375 / 2);
    await button.tap();
    const drawer = page.locator('[data-testid="mobile-nav-drawer"]');
    await expect(drawer).toBeVisible();
    // Measured once the slide-in has stopped: the panel's right edge is the screen's.
    await expect
      .poll(async () => {
        const box = await drawer.boundingBox();
        return Math.round((box?.x ?? 0) + (box?.width ?? 0));
      })
      .toBe(375);
    await expect(page.getByRole("button", { name: "Close navigation menu" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
    await expect(button).toBeFocused();
  }

  test.describe("web app", () => {
    test.use({ storageState: AUTH_STATE });

    test("menu button and drawer both on the right", async ({ page }) => {
      await page.goto("/app/accounts");
      await waitForHydration(page);
      await expectRightSide(page, "Open navigation menu");
      // The bar's More, the other opener, is the last item, also on the right.
      const more = await page
        .locator(BAR)
        .getByRole("button", { name: "More pages" })
        .boundingBox();
      expect((more?.x ?? 0) + (more?.width ?? 0)).toBeGreaterThan(375 * 0.75);
    });
  });

  test("marketing site: menu button and drawer both on the right", async ({ page }) => {
    await page.goto(`${MARKETING_URL}/`);
    await page.locator("#root main").waitFor();
    await expectRightSide(page, "Open navigation menu");
  });
});
