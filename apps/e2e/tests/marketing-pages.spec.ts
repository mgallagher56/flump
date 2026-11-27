import AxeBuilder from "@axe-core/playwright";
import { type Browser, expect, type Page, test } from "@playwright/test";
import { MARKETING_URL } from "../support/env";
import { scrollToFoot, untilStill } from "../support/marketingMotion";

/*
 * The marketing pages built to the approved prototypes after the home page (OTHER-PAGES-PLAN
 * section 5, slice P0 and P1), one row per page. Each page has the hero scene (scene level S1):
 * still glass orbs in the first band that go live with three.js where the power policy allows,
 * bubble fields at band edges and one paced moment per band. These checks follow the standing
 * rules, not any layout: the page with no JavaScript, reduced motion, the pause control, a full
 * scroll with no error at three widths, and axe in both themes once every moment has finished.
 * The built marketing site is the one the smoke suite starts.
 */

interface PageRow {
  name: string;
  path: string;
  /** The h1, as the approved prototype has it. */
  h1: string;
}

const PAGES: readonly PageRow[] = [
  { name: "features index", path: "/features", h1: "Everything Flump does" },
  { name: "accounts", path: "/features/accounts", h1: "Accounts and net worth" },
  { name: "budget", path: "/features/budget", h1: "Budget and breathing room" },
  { name: "pay", path: "/features/pay", h1: "Take-home pay and Self Assessment" },
  { name: "savings and pension", path: "/features/savings-and-pension", h1: "Savings and pension" },
  { name: "debt and borrowing", path: "/features/debt-and-borrowing", h1: "Debt and borrowing" },
  { name: "AI connection", path: "/features/ai-connection", h1: "AI connection" },
];

/** Everything a band's moment brings in: still once every moment has finished. */
const MOMENT_PARTS = "main :is(h1, h2, h3, p, li, figure, [data-arrive-item], [data-deal-item])";

async function openPage(
  browser: Browser,
  path: string,
  options: Parameters<Browser["newContext"]>[0],
): Promise<Page> {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  await page.goto(`${MARKETING_URL}${path}`);
  return page;
}

for (const row of PAGES) {
  test.describe(`marketing ${row.name}`, () => {
    test("is complete with no JavaScript: every band in reading order, nothing waiting to fade in, the still orbs in the hero (MK1, MK11)", async ({
      browser,
    }) => {
      const page = await openPage(browser, row.path, {
        javaScriptEnabled: false,
        viewport: { width: 390, height: 844 },
      });
      await expect(page.getByRole("heading", { level: 1, name: row.h1 })).toBeVisible();
      const tops = await page
        .locator("main > *")
        .evaluateAll((bands) => bands.map((band) => band.getBoundingClientRect().top));
      expect(tops.length).toBeGreaterThanOrEqual(3);
      expect([...tops].sort((a, b) => a - b)).toEqual(tops);
      const faded = await page
        .locator("main h2, main h3, main p, main li")
        .evaluateAll((els) => els.filter((el) => Number(getComputedStyle(el).opacity) < 1).length);
      expect(faded).toBe(0);
      const stage = page.getByTestId("hero-stage");
      await expect(stage).toHaveAttribute("data-scene", "still");
      await expect(stage.locator("[data-glass-orb]")).toHaveCount(4);
      await expect(page.locator("canvas")).toHaveCount(0);
      await page.context().close();
    });

    test("with reduced motion loads no motion library and is still, with no pause control (MK12, MK14)", async ({
      browser,
    }) => {
      const context = await browser.newContext({
        reducedMotion: "reduce",
        viewport: { width: 1280, height: 900 },
      });
      // Listening before the page loads, so no request made on the way is missed.
      const scripts: string[] = [];
      context.on("request", (request) => {
        if (request.resourceType() === "script") scripts.push(request.url());
      });
      const page = await context.newPage();
      await page.goto(`${MARKETING_URL}${row.path}`);
      const preloaded = await page
        .locator('script[src], link[rel="modulepreload"]')
        .evaluateAll((els) =>
          els.map(
            (el) =>
              new URL(el.getAttribute("src") ?? el.getAttribute("href") ?? "", location.href).href,
          ),
        );
      await scrollToFoot(page);
      await page.waitForLoadState("networkidle");
      // Only the first-load scripts: GSAP and three.js never download.
      expect(scripts.filter((url) => !preloaded.includes(url))).toEqual([]);
      await expect(page.locator("canvas")).toHaveCount(0);
      await expect(page.getByTestId("hero-stage")).toHaveAttribute("data-scene", "still");
      await expect(page.locator("[data-enhanced]")).toHaveCount(0);
      await expect(page.getByRole("button", { name: /^(Pause|Play) animation$/ })).toHaveCount(0);
      await page.context().close();
    });

    test("the pause control in the hero stops the ambient motion and is reachable by keyboard (MK14)", async ({
      browser,
    }) => {
      const page = await openPage(browser, row.path, { viewport: { width: 1280, height: 900 } });
      const pause = page.getByTestId(/-hero$/).getByRole("button", { name: "Pause animation" });
      await expect(pause).toBeEnabled();
      await pause.focus();
      await page.keyboard.press("Enter");
      await expect(page.locator("html")).toHaveAttribute("data-ambient", "paused");
      await expect(page.getByRole("button", { name: "Play animation" })).toBeFocused();
      const drift = await page
        .locator("[data-bubble-field] span")
        .evaluateAll((els) => els.map((el) => getComputedStyle(el).animationName));
      expect(drift.length).toBeGreaterThan(0);
      expect(new Set(drift)).toEqual(new Set(["none"]));
      await page.context().close();
    });

    test("a full scroll at 390, 1000 and 1440px throws nothing and logs no error", async ({
      browser,
    }) => {
      const page = await openPage(browser, row.path, { viewport: { width: 390, height: 844 } });
      const problems: string[] = [];
      page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
      page.on("console", (message) => {
        if (message.type() === "error") problems.push(`console: ${message.text()}`);
      });
      for (const width of [390, 1000, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await page.evaluate(() => window.scrollTo(0, 0));
        await scrollToFoot(page);
        await page.waitForLoadState("networkidle");
      }
      expect(problems).toEqual([]);
      await page.context().close();
    });

    for (const theme of ["light", "dark"] as const) {
      test(`axe finds no violation once every moment has finished, ${theme}`, async ({
        browser,
      }) => {
        const page = await openPage(browser, row.path, {
          viewport: { width: 1280, height: 900 },
          colorScheme: theme,
        });
        await scrollToFoot(page);
        await untilStill(page, MOMENT_PARTS);
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
}
