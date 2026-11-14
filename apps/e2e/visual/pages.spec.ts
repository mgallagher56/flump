import { expect, type Page, test } from "@playwright/test";
import { AUTH_STATE } from "../support/auth";
import { FROZEN_NOW, SERVER_CLOCK_FROZEN } from "../support/clock";
import { VISUAL_ROUTES } from "./routes";

/** Elements whose content depends on the wall clock or the run, hidden from the pixel diff. */
const MASK_SELECTOR = "[data-visual-mask]";

/** Waits until the page has stopped changing: network quiet, web fonts in, layout settled. */
async function settle(page: Page): Promise<void> {
  await page.waitForLoadState("networkidle");
  await page.evaluate(async () => {
    await document.fonts.ready;
    // Two frames, so ResizeObserver-driven charts have drawn at their final size.
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}

/** Elements wider than the viewport at phone width, described for the failure message. */
function horizontalOverflow(page: Page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    const viewport = root.clientWidth;
    if (root.scrollWidth <= viewport)
      return { scrollWidth: root.scrollWidth, viewport, culprits: [] };
    const culprits = [...document.body.querySelectorAll<HTMLElement>("*")]
      .filter((el) => el.getBoundingClientRect().right > viewport + 1)
      .slice(0, 5)
      .map((el) => {
        const id = el.id ? `#${el.id}` : "";
        const cls =
          typeof el.className === "string" && el.className ? `.${el.className.split(" ")[0]}` : "";
        return `${el.tagName.toLowerCase()}${id}${cls} right=${Math.round(el.getBoundingClientRect().right)}`;
      });
    return { scrollWidth: root.scrollWidth, viewport, culprits };
  });
}

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
      // The servers started at FROZEN_NOW and have ticked since: take their current time from
      // the Date header so the browser agrees with the server-rendered dates when it hydrates.
      if (SERVER_CLOCK_FROZEN) {
        const ping = await page.request.get("/healthz");
        const serverDate = ping.headers().date;
        await page.clock.install({
          time: serverDate ? new Date(serverDate) : new Date(FROZEN_NOW),
        });
      }
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
