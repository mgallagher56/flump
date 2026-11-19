import { expect, type Page, test } from "@playwright/test";
import { AUTH_STATE } from "../support/auth";
import { MARKETING_URL } from "../support/env";
import { waitForHydration } from "../support/page";

/**
 * Phone chrome from the owner's report of 2026-11-18: the signed-in footer is one line with the
 * logo and its links at every width (owner ruling: links stay on the logo's line, never a second
 * line) and stays clear of the bottom bar, and the menu button sits on the side its drawer opens.
 */

const BAR = 'nav[aria-label="Main navigation"]';

async function footerLine(page: Page) {
  return page.locator("footer").evaluate((footer) => {
    const shown = (el: Element) => {
      const box = el.getBoundingClientRect();
      return box.width > 0 && box.height > 0;
    };
    const row = footer.firstElementChild as HTMLElement;
    const parts = [
      footer.querySelector('[data-testid="home-logo"]'),
      ...Array.from(footer.querySelectorAll("nav a")),
      footer.querySelector(":scope > div > p"),
    ].filter((el): el is Element => el !== null && shown(el));
    const centres = parts.map((el) => {
      const box = el.getBoundingClientRect();
      return box.top + box.height / 2;
    });
    const text = footer.querySelector(":scope > div > p");
    return {
      links: Array.from(footer.querySelectorAll("nav a"))
        .filter(shown)
        .map((el) => (el.textContent ?? "").trim()),
      companyShown: text ? shown(text) : false,
      // Every part sits on one row: their vertical centres agree within a few pixels.
      centreSpread: Math.max(...centres) - Math.min(...centres),
      rowHeight: row.getBoundingClientRect().height,
      tallestPart: Math.max(...parts.map((el) => el.getBoundingClientRect().height)),
      rowBottom: row.getBoundingClientRect().bottom,
      overflow: row.scrollWidth - row.clientWidth,
      right: Math.max(...parts.map((el) => el.getBoundingClientRect().right)),
    };
  });
}

const PHONE_LINKS = ["Settings", "Calculators", "Send feedback"];
const WIDE_LINKS = ["Settings", "Security", "Data and export", "All calculators", "Send feedback"];

test.describe("signed-in footer", () => {
  test.use({ storageState: AUTH_STATE });

  for (const width of [320, 375, 390, 430, 768, 1024, 1280]) {
    test(`is one line with the logo and its links at ${width} wide, above the bottom bar`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/app/accounts");
      await waitForHydration(page);
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      const line = await footerLine(page);
      expect(line.links).toEqual(width < 768 ? PHONE_LINKS : WIDE_LINKS);
      expect(line.companyShown, "company name shown only where it fits").toBe(width >= 1024);
      expect(line.centreSpread, "everything on one row").toBeLessThanOrEqual(4);
      // One row: the row is no taller than its tallest part (the logo or a 44px link target).
      expect(
        line.rowHeight - line.tallestPart,
        "footer row taller than one row",
      ).toBeLessThanOrEqual(1);
      expect(line.overflow, "row overflows").toBeLessThanOrEqual(0);
      expect(line.right).toBeLessThanOrEqual(width);
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
