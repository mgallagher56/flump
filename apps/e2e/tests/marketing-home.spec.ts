import AxeBuilder from "@axe-core/playwright";
import { type Browser, expect, type Page, test } from "@playwright/test";
import { MARKETING_URL } from "../support/env";

/*
 * The new marketing home page (ROLLOUT-PLAN slice M1; UX-GUIDELINES 12.2). These checks need a
 * real browser: layout at each width, the page with no JavaScript, reduced motion, the pause
 * control, the carousel and FAQ by keyboard, the journey's changeovers coming to rest, and axe in
 * both themes. The built marketing site is the one the smoke suite starts.
 */

const HOME = `${MARKETING_URL}/`;
const WIDTHS = [360, 768, 1000, 1440, 1920] as const;
const THEMES = ["light", "dark"] as const;

/** Scrolls the whole page in steps, so every band's moment is triggered, then waits for time to finish them. */
async function scrollThrough(page: Page): Promise<void> {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < height; y += 500) {
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(120);
  }
  // The longest moment is the hero's assembly (durations.marketing.hero, 4,760 ms).
  await page.waitForTimeout(5500);
}

/** A page in its own context (axe needs one), at the home page. Close it with `page.context().close()`. */
async function openPage(
  browser: Browser,
  options: Parameters<Browser["newContext"]>[0],
): Promise<Page> {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  await page.goto(HOME);
  return page;
}

test.describe("marketing home: layout", () => {
  for (const theme of THEMES) {
    for (const width of WIDTHS) {
      test(`the hero is centred at ${width}px, ${theme}`, async ({ browser }) => {
        const page = await openPage(browser, {
          viewport: { width, height: 900 },
          colorScheme: theme,
          reducedMotion: "reduce",
        });
        const viewportCentre = width / 2;
        for (const locator of [
          page.getByRole("heading", { level: 1 }),
          page.getByTestId("home-hero").getByRole("heading", { name: "Monthly picture" }),
        ]) {
          const box = await locator.boundingBox();
          expect(box).not.toBeNull();
          if (!box) continue;
          // The block is centred; the dashboard's title sits at its card's left, so measure the card.
          const target =
            (await locator.evaluate((el) => el.tagName)) === "H1"
              ? box
              : await page.getByTestId("home-hero").locator("figure").first().boundingBox();
          expect(target).not.toBeNull();
          if (target)
            expect(Math.abs(target.x + target.width / 2 - viewportCentre)).toBeLessThan(2);
        }
        // No band, bubble or orb makes the page scroll sideways.
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
        await page.context().close();
      });
    }
  }
});

test.describe("marketing home: without JavaScript and with reduced motion (MK1)", () => {
  test("is complete with no JavaScript: journey as a list, carousel scrolling natively", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();
    await page.goto(HOME);
    const stops = page.locator("#journey li[data-journey-stop]");
    await expect(stops).toHaveCount(6);
    // A plain vertical list: each stop starts below the one before it.
    const tops = await stops.evaluateAll((items) =>
      items.map((item) => item.getBoundingClientRect().top),
    );
    expect([...tops].sort((a, b) => a - b)).toEqual(tops);
    const list = page.getByRole("list", { name: "Flump features" });
    await expect(list.getByRole("listitem")).toHaveCount(6);
    expect(await list.evaluate((el) => getComputedStyle(el).overflowX)).toBe("auto");
    await list.evaluate((el) => el.scrollBy({ left: 400 }));
    expect(await list.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
    // Every entrance's content is visible: nothing waits for a script to fade it in.
    const hidden = await page
      .locator("main h2, main h3, main p")
      .evaluateAll((els) => els.filter((el) => Number(getComputedStyle(el).opacity) < 1).length);
    expect(hidden).toBe(0);
    await context.close();
  });

  test("with reduced motion loads no motion library and is still and complete", async ({
    browser,
  }) => {
    const page = await browser.newPage({ reducedMotion: "reduce" });
    const scripts: string[] = [];
    page.on("request", (request) => {
      if (request.resourceType() === "script") scripts.push(request.url());
    });
    await page.goto(HOME);
    const preloaded = await page
      .locator('script[src], link[rel="modulepreload"]')
      .evaluateAll((els) =>
        els.map(
          (el) =>
            new URL(el.getAttribute("src") ?? el.getAttribute("href") ?? "", location.href).href,
        ),
      );
    await scrollThrough(page);
    // Only the first-load scripts: GSAP, the hero's assembly and three.js never download.
    expect(scripts.filter((url) => !preloaded.includes(url))).toEqual([]);
    await expect(page.locator("canvas")).toHaveCount(0);
    await expect(page.getByTestId("journey-orb")).toHaveAttribute("data-scene", "still");
    await expect(page.locator("[data-enhanced]")).toHaveCount(0);
    // Nothing ambient moves, so there is no control to stop it.
    await expect(page.getByRole("button", { name: /background animation/ })).toHaveCount(0);
    await page.close();
  });
});

test.describe("marketing home: controls", () => {
  test("the pause control stops the ambient motion and is reachable by keyboard (MK14)", async ({
    page,
  }) => {
    await page.goto(HOME);
    const pause = page
      .getByTestId("home-hero")
      .getByRole("button", { name: "Pause background animation" });
    await expect(pause).toBeEnabled();
    await pause.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("html")).toHaveAttribute("data-ambient", "paused");
    const states = await page
      .locator("[data-bubble-field] span")
      .evaluateAll((els) => els.map((el) => getComputedStyle(el).animationPlayState));
    expect(states.length).toBeGreaterThan(0);
    expect(new Set(states)).toEqual(new Set(["paused"]));
    // Every control on the page shows the same state.
    await expect(page.getByRole("button", { name: "Play background animation" })).toHaveCount(2);
    await page.keyboard.press("Enter");
    await expect(page.locator("html")).not.toHaveAttribute("data-ambient", "paused");
  });

  test("the features carousel steps by keyboard, with dots and never a count (MK9)", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(HOME);
    const band = page.locator("#features");
    await band.scrollIntoViewIfNeeded();
    const dots = band.getByRole("group", { name: "Flump features" }).getByRole("button");
    await expect(dots).toHaveCount(6);
    await expect(dots.first()).toHaveAttribute("aria-current", "true");
    const next = band.getByRole("button", { name: /^Next/ });
    await next.focus();
    await page.keyboard.press("Enter");
    await expect(dots.nth(1)).toHaveAttribute("aria-current", "true", { timeout: 8000 });
    await dots.nth(4).focus();
    await page.keyboard.press("Enter");
    await expect(dots.nth(4)).toHaveAttribute("aria-current", "true", { timeout: 8000 });
    // Dots only: no "4 to 5 of 6" or "1 of 6" anywhere in the band.
    expect(await band.textContent()).not.toMatch(/\d+\s*(to|-)\s*\d+\s*of\s*\d+|\d+\s*of\s*\d+/);
  });

  test("FAQ answers open in place and in order, never overlapping (MK9)", async ({ page }) => {
    await page.goto(HOME);
    const faq = page.locator("#faq");
    await faq.scrollIntoViewIfNeeded();
    await page.waitForTimeout(3000);
    const items = faq.locator("li");
    const count = await items.count();
    for (let i = 1; i < count; i++) {
      await items.nth(i).getByRole("button").click();
      // Sample the boxes while the answer opens, not only at rest.
      for (let frame = 0; frame < 6; frame++) {
        const boxes = await items.evaluateAll((els) =>
          els.map((el) => {
            const r = el.getBoundingClientRect();
            return { top: r.top, bottom: r.bottom };
          }),
        );
        for (let j = 1; j < boxes.length; j++) {
          const above = boxes[j - 1];
          const below = boxes[j];
          if (above && below) expect(below.top).toBeGreaterThanOrEqual(above.bottom - 0.5);
        }
        await page.waitForTimeout(150);
      }
      await expect(items.nth(i).getByRole("button")).toHaveAttribute("aria-expanded", "true");
    }
  });

  test("journey changeovers are never left part-way, scrolling fast both ways (MK2)", async ({
    page,
  }) => {
    await page.goto(HOME);
    const journey = page.locator("#journey");
    await journey.scrollIntoViewIfNeeded();
    const box = await journey.boundingBox();
    const span = Math.round(box?.height ?? 3000);
    // Fast down and up twice, as a visitor flicking past would.
    for (const direction of [1, -1, 1, -1, 1]) {
      for (let step = 0; step < 8; step++) {
        await page.mouse.wheel(0, (direction * span) / 8);
        await page.waitForTimeout(40);
      }
    }
    // Time completes every changeover: leave, beat, arrive is under 3 s at the calm scale.
    await page.waitForTimeout(4000);
    const partial = await journey
      .locator("h3, p, [data-stop-side]")
      .evaluateAll((els) =>
        els
          .map((el) => Number(getComputedStyle(el).opacity))
          .filter((opacity) => opacity > 0.02 && opacity < 0.98),
      );
    expect(partial).toEqual([]);
  });
});

test.describe("marketing home: accessibility", () => {
  for (const theme of THEMES) {
    test(`axe finds no violation once every band has arrived, ${theme}`, async ({ browser }) => {
      const page = await openPage(browser, {
        viewport: { width: 1280, height: 900 },
        colorScheme: theme,
      });
      await scrollThrough(page);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(
        results.violations.map(
          (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
        ),
      ).toEqual([]);
      await page.context().close();
    });
  }
});
