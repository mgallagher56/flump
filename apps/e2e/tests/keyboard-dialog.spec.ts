import { expect, type Page, test } from "@playwright/test";
import { AUTH_STATE } from "../support/auth";
import { waitForHydration } from "../support/page";

/**
 * A phone's on-screen keyboard shrinks the visual viewport, not the layout viewport. A bottom sheet
 * fixed at `bottom: 0` then sat under the keyboard and the browser panned the page for every field,
 * so the add-account dialog bounced between inputs (owner report 2026-11-18). Desktop Chromium has
 * no on-screen keyboard, so this replaces `window.visualViewport` with a stand-in and shrinks it as a
 * keyboard would. It checks the app's side (the dialog sits on the keyboard and keeps each field
 * visible without moving); how a real iOS or Android keyboard pans is not covered here.
 */
test.use({
  storageState: AUTH_STATE,
  viewport: { width: 375, height: 812 },
  hasTouch: true,
  isMobile: true,
  // The sheet's slide-in would move it while it is measured.
  reducedMotion: "reduce",
});

const KEYBOARD = 336;

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    class FakeViewport extends EventTarget {
      height = window.innerHeight;
      offsetTop = 0;
      offsetLeft = 0;
      pageTop = 0;
      pageLeft = 0;
      scale = 1;
      width = window.innerWidth;
    }
    const viewport = new FakeViewport();
    Object.defineProperty(window, "visualViewport", { configurable: true, get: () => viewport });
    (window as unknown as { setKeyboard: (px: number) => void }).setKeyboard = (px: number) => {
      viewport.height = window.innerHeight - px;
      viewport.dispatchEvent(new Event("resize"));
    };
  });
});

const setKeyboard = (page: Page, px: number) =>
  page.evaluate((value) => {
    (window as unknown as { setKeyboard: (px: number) => void }).setKeyboard(value);
    return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }, px);

async function openAddAccount(page: Page) {
  await page.goto("/app/accounts");
  await waitForHydration(page);
  await page.getByRole("link", { name: "Add account", exact: true }).first().click();
  const dialog = page.getByRole("dialog", { name: "Add account" });
  await expect(dialog).toBeVisible();
  return dialog;
}

test("the add-account dialog sits on the keyboard and stays put between fields", async ({
  page,
}) => {
  const dialog = await openAddAccount(page);
  const name = dialog.getByRole("textbox", { name: "Name" });
  const balance = dialog.getByRole("textbox", { name: "Balance" });

  await name.focus();
  await setKeyboard(page, KEYBOARD);
  const visibleBottom = 812 - KEYBOARD;
  const first = await dialog.boundingBox();
  // The dialog ends at the top of the keyboard, inside what can be seen.
  expect(Math.round((first?.y ?? 0) + (first?.height ?? 0))).toBe(visibleBottom);
  expect(first?.y ?? -1).toBeGreaterThanOrEqual(0);

  // The next field: the page does not move, the dialog does not move, the field and its label show.
  const pageY = await page.evaluate(() => window.scrollY);
  await balance.focus();
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));
  expect(await page.evaluate(() => window.scrollY)).toBe(pageY);
  const second = await dialog.boundingBox();
  expect(Math.abs((second?.y ?? 0) - (first?.y ?? 0)), "dialog moved").toBeLessThanOrEqual(1);
  expect(Math.abs((second?.height ?? 0) - (first?.height ?? 0))).toBeLessThanOrEqual(1);
  const field = await balance.boundingBox();
  expect((field?.y ?? 0) + (field?.height ?? 0)).toBeLessThanOrEqual(visibleBottom);
  const label = await dialog.getByText("Balance", { exact: true }).first().boundingBox();
  expect(label?.y ?? -1).toBeGreaterThanOrEqual(0);

  // The keyboard closes: the dialog goes back to the bottom of the screen.
  await setKeyboard(page, 0);
  const closed = await dialog.boundingBox();
  expect(Math.round((closed?.y ?? 0) + (closed?.height ?? 0))).toBe(812);
});
