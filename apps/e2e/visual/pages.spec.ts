import { expect, type Page, test } from "@playwright/test";
import { AUTH_STATE } from "../support/auth";
import { horizontalOverflow, settle, syncBrowserClock } from "../support/page";
import { VISUAL_ROUTES } from "./routes";

/** Elements whose content depends on the wall clock or the run, hidden from the pixel diff. */
const MASK_SELECTOR = "[data-visual-mask]";

/** SVG gradient stops whose colour computes to black: an unresolved CSS variable falls back to it. */
function blackGradientStops(page: Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll("stop")]
      .filter((stop) => {
        const colour = getComputedStyle(stop).stopColor.replace(/\s/g, "");
        return colour === "rgb(0,0,0)" || colour === "rgba(0,0,0,1)" || colour === "#000000";
      })
      .map((stop) => {
        const gradient = stop.closest("linearGradient, radialGradient");
        return `${gradient?.id || gradient?.tagName || "stop"} offset=${stop.getAttribute("offset")}`;
      }),
  );
}

for (const route of VISUAL_ROUTES) {
  test.describe(route.name, () => {
    if (route.signedIn) test.use({ storageState: AUTH_STATE });

    test(`${route.name} renders as the baseline`, async ({ page }, testInfo) => {
      await syncBrowserClock(page);
      const response = await page.goto(route.url);
      expect(response?.status(), `${route.url} status`).toBeLessThan(400);
      if (route.signedIn) await expect(page).not.toHaveURL(/\/login|\/sandbox/);
      await settle(page);

      // The theme under test is the one the project emulates through prefers-color-scheme.
      const scheme = testInfo.project.use.colorScheme;
      await expect(page.locator("html")).toHaveAttribute("data-theme", String(scheme));

      // Cheap layout checks first: each would have caught a 2026-11-14 pre-release defect.
      expect((await page.title()).trim(), "document <title>").not.toBe("");
      expect(await blackGradientStops(page), "SVG gradient stops computing to black").toEqual([]);
      if ((page.viewportSize()?.width ?? 0) <= 375) {
        const overflow = await horizontalOverflow(page);
        expect(overflow.culprits, `horizontal overflow at ${overflow.viewport}px`).toEqual([]);
        expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.viewport);
      }

      await expect(page).toHaveScreenshot(`${route.name}.png`, {
        fullPage: true,
        mask: [page.locator(MASK_SELECTOR)],
      });
    });
  });
}
