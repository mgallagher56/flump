import { expect, type Page, type TestInfo, test } from "@playwright/test";
import { AUTH_STATE } from "../support/auth";
import { MARKETING_URL, WEB_URL } from "../support/env";
import { horizontalOverflow, settle, syncBrowserClock } from "../support/page";
import { RENTER_ROUTES, VISUAL_ROUTES, type VisualRoute } from "./routes";

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

async function shoot(page: Page, testInfo: TestInfo, route: VisualRoute, snapshot: string) {
  await syncBrowserClock(page);
  const response = await page.goto(route.url);
  if (route.expectedStatus) {
    expect(response?.status(), `${route.url} status`).toBe(route.expectedStatus);
  } else {
    expect(response?.status(), `${route.url} status`).toBeLessThan(400);
  }
  if (route.signedIn) await expect(page).not.toHaveURL(/\/login|\/sandbox/);
  await settle(page);
  if (route.prepare) {
    await route.prepare(page);
    await settle(page);
  }

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

  await expect(page).toHaveScreenshot(`${snapshot}.png`, {
    fullPage: true,
    mask: [page.locator(MASK_SELECTOR)],
  });
}

for (const route of VISUAL_ROUTES) {
  test.describe(route.name, () => {
    if (route.signedIn) test.use({ storageState: AUTH_STATE });

    test(`${route.name} renders as the baseline`, async ({ page }, testInfo) => {
      await shoot(page, testInfo, route, route.name);
    });
  });
}

// The renter pass (projects `*-renter`, after visual/renter.setup.ts has re-seeded the user).
for (const route of RENTER_ROUTES) {
  test.describe(`${route.name}-renter`, () => {
    test.use({ storageState: AUTH_STATE });

    test(
      `${route.name} renders as the renter baseline`,
      { tag: "@renter" },
      async ({ page }, testInfo) => {
        await shoot(page, testInfo, route, `${route.name}-renter`);
      },
    );
  });
}

/**
 * The top bars at the two nav widths (`NAV_BREAKPOINT` 768px, `NAV_WIDE_BREAKPOINT` 1024px), where
 * the compact desktop bar starts and where everything fits. Header only, in the 1280 projects (their
 * theme), at each width: no horizontal overflow, nothing clipped in the inline nav, and a baseline.
 */
const HEADER_CASES = [
  { name: "marketing-header", url: `${MARKETING_URL}/`, signedIn: false },
  { name: "web-header", url: `${WEB_URL}/`, signedIn: true },
] as const;

for (const header of HEADER_CASES) {
  test.describe(header.name, () => {
    if (header.signedIn) test.use({ storageState: AUTH_STATE });

    for (const width of [768, 1024]) {
      test(`${header.name} fits at ${width}px`, async ({ page }, testInfo) => {
        test.skip(!testInfo.project.name.startsWith("1280"), "shot once per theme");
        await page.setViewportSize({ width, height: 800 });
        await syncBrowserClock(page);
        await page.goto(header.url);
        await settle(page);
        const overflow = await horizontalOverflow(page);
        expect(overflow.scrollWidth, `page overflow at ${width}px`).toBeLessThanOrEqual(width);
        const clipped = await page.evaluate(() => {
          const list = document.querySelector("header nav ul");
          return list ? list.scrollWidth - list.clientWidth : 0;
        });
        expect(clipped, `inline nav clipped at ${width}px`).toBeLessThanOrEqual(0);
        await expect(page.locator("header").first()).toHaveScreenshot(
          `${header.name}-${width}.png`,
          { mask: [page.locator(MASK_SELECTOR)] },
        );
      });
    }
  });
}

/**
 * Every nav form marks the current page, visibly and with `aria-current="page"` (owner ruling): on
 * the home page that is the logo from 768 to 1023 (its mark) and the inline "Home" link from 1024
 * in the web app; the logo on the marketing home page. Checked at 768, 900 and 1024.
 */
for (const header of HEADER_CASES) {
  test.describe(`${header.name} current page`, () => {
    if (header.signedIn) test.use({ storageState: AUTH_STATE });

    for (const width of [768, 900, 1024]) {
      test(`${header.name} marks the current page at ${width}px`, async ({ page }, testInfo) => {
        test.skip(testInfo.project.name !== "1280-light", "layout check, once");
        await page.setViewportSize({ width, height: 800 });
        await page.goto(header.url);
        await settle(page);
        const current = page.locator('header [aria-current="page"]').filter({ visible: true });
        await expect(current.first()).toBeVisible();
        // Visible as well as announced: at least one current item draws its mark or fill.
        const marked = await current.evaluateAll((els) =>
          els.some((el) => {
            const after = getComputedStyle(el, "::after");
            const own = getComputedStyle(el);
            const hasMark = after.content !== "none" && after.display !== "none";
            const hasFill =
              own.backgroundColor !== "rgba(0, 0, 0, 0)" && own.backgroundColor !== "transparent";
            return hasMark || hasFill;
          }),
        );
        expect(marked, `current page marked at ${width}px`).toBe(true);
      });
    }
  });
}
