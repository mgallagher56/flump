import AxeBuilder from "@axe-core/playwright";
import { type Browser, expect, type Page, test } from "@playwright/test";
import { MARKETING_URL } from "../support/env";
import { scrollToFoot, untilStill } from "../support/marketingMotion";

/*
 * The marketing pages built to the approved prototypes after the home page (OTHER-PAGES-PLAN
 * section 5, slice P0 and P1), one row per page. Each page has the hero scene (scene level S1):
 * still glass orbs in the first band that go live with three.js where the power policy allows,
 * bubble fields at band edges and one paced moment per band. These checks follow the standing
 * rules, not any layout: the page with no JavaScript, reduced motion, the header's "Reduce
 * motion", a full scroll with no error at three widths, and axe in both themes once every moment has finished.
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

/*
 * The close on the area and AI connection pages (`TicketClose`): prototype 10's gathered stack of
 * the home hero's pieces (owner, 28 Nov 2026), each piece tagged "Example" in real text, still
 * under reduced motion. The features index has no close.
 */
for (const row of PAGES.filter((page) => page.path !== "/features")) {
  test(`marketing ${row.name}: the close shows the gathered stack, still under reduced motion`, async ({
    browser,
  }) => {
    const page = await openPage(browser, row.path, {
      reducedMotion: "reduce",
      viewport: { width: 1280, height: 900 },
    });
    const close = page.getByTestId("feature-final-cta");
    await close.scrollIntoViewIfNeeded();
    const stack = close.locator("[data-close-stack]");
    await expect(stack).toBeVisible();
    await expect(stack).toHaveAttribute("aria-hidden", "true");
    await expect(stack.locator("[data-close-piece]")).toHaveCount(6);
    await expect(stack.getByText("Example", { exact: true })).toHaveCount(6);
    const places = () =>
      stack
        .locator("[data-close-piece]")
        .evaluateAll((els) =>
          els.map(
            (el) => `${el.hasAttribute("style")} ${JSON.stringify(el.getBoundingClientRect())}`,
          ),
        );
    const before = await places();
    await untilStill(page, "[data-close-piece]");
    expect(await places()).toEqual(before);
    expect(before.every((place) => place.startsWith("false "))).toBe(true);
    await page.context().close();
  });
}

/*
 * The soft cards' corners, from the radius tokens (STYLE-GUIDE section 5; coordinator, 28 Nov
 * 2026): the close card `showcase` (28px), the "What you see" and AI cards `panel` (20px), the
 * features groups and goal cards `tray` (24px; the prototype's goal cards are 22px).
 */
const CORNERS: readonly { path: string; card: string; selector: string; px: number }[] = [
  {
    path: "/features",
    card: "feature group",
    selector: "section[aria-labelledby^='group-']",
    px: 24,
  },
  { path: "/features", card: "goal card", selector: "#start-here [data-arrive-item] > *", px: 24 },
  { path: "/features/pay", card: "fact card", selector: "#what-you-see li > *", px: 20 },
  {
    path: "/features/pay",
    card: "close card",
    selector: "[data-testid='feature-final-cta']",
    px: 28,
  },
  { path: "/features/ai-connection", card: "fact card", selector: "#what-you-see li > *", px: 20 },
  { path: "/features/ai-connection", card: "question card", selector: "#questions li > *", px: 20 },
  {
    path: "/features/ai-connection",
    card: "close card",
    selector: "[data-testid='feature-final-cta']",
    px: 28,
  },
];

for (const corner of CORNERS) {
  test(`marketing ${corner.path}: the ${corner.card} has a ${corner.px}px corner`, async ({
    browser,
  }) => {
    const page = await openPage(browser, corner.path, {
      reducedMotion: "reduce",
      viewport: { width: 1280, height: 900 },
    });
    const radii = await page
      .locator(corner.selector)
      .evaluateAll((els) => els.map((el) => getComputedStyle(el).borderTopLeftRadius));
    expect(radii.length).toBeGreaterThan(0);
    expect(new Set(radii)).toEqual(new Set([`${corner.px}px`]));
    await page.context().close();
  });
}

/*
 * No invite request anywhere (owner, 28 Nov 2026: invite links are shared by hand). Every page has
 * no "Request an invite" text and no link to the contact page's old `#beta` section, and the home
 * page is checked here too since its spec is about motion and layout.
 */
const OTHER_PATHS = [
  "/",
  "/pricing",
  "/contact",
  "/preview",
  "/security",
  "/privacy",
  "/terms",
  "/cookies",
  "/accessibility",
] as const;

async function expectNoInviteRequest(page: Page): Promise<void> {
  await expect(page.getByText(/request an invite/i)).toHaveCount(0);
  await expect(page.locator('a[href*="#beta"]')).toHaveCount(0);
  await expect(page.locator("#beta")).toHaveCount(0);
}

for (const path of OTHER_PATHS) {
  test(`marketing ${path}: no invite request and no link to #beta`, async ({ browser }) => {
    const page = await openPage(browser, path, {
      reducedMotion: "reduce",
      viewport: { width: 1280, height: 900 },
    });
    await expect(page.locator("main")).toBeVisible();
    await expectNoInviteRequest(page);
    await page.context().close();
  });
}

/*
 * The background bubbles are glass orbs like the journey's, not flat circles with a rim line
 * (owner, 28 Nov 2026): every bubble on the home page, an area page and the AI connection page
 * draws its glass layers (highlight, sheen, caustic and body, one radial gradient each) and no
 * 1px inset ring, in both themes.
 */
for (const theme of ["light", "dark"] as const) {
  test(`marketing bubble fields in ${theme}: glass layers and no rim line`, async ({ browser }) => {
    const context = await browser.newContext({
      colorScheme: theme,
      reducedMotion: "reduce",
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();
    for (const path of ["/", "/features/pay", "/features/ai-connection"]) {
      await page.goto(`${MARKETING_URL}${path}`);
      const looks = await page.locator("[data-bubble-field] span").evaluateAll((els) =>
        els.map((el) => {
          const style = getComputedStyle(el);
          return {
            layers: style.backgroundImage.split("radial-gradient(").length - 1,
            ring: /0px 0px 0px 1px inset|inset 0px 0px 0px 1px/.test(style.boxShadow),
          };
        }),
      );
      expect(looks.length, path).toBeGreaterThan(2);
      expect(
        looks.filter((look) => look.ring || look.layers < 4),
        path,
      ).toEqual([]);
    }
    await context.close();
  });
}

for (const row of PAGES) {
  test.describe(`marketing ${row.name}`, () => {
    test("asks no one to request an invite: the hero's one primary Interactive preview, and the close's preview and sign-in line", async ({
      browser,
    }) => {
      const page = await openPage(browser, row.path, {
        reducedMotion: "reduce",
        viewport: { width: 1280, height: 900 },
      });
      await expectNoInviteRequest(page);
      const heroLinks = page.locator("main > :first-child [data-lit-ctas] a");
      await expect(heroLinks).toHaveText(["Interactive preview"]);
      await expect(heroLinks.first()).toHaveAttribute("data-variant", "primary");
      // The features index has no close.
      if (row.path !== "/features") {
        const close = page.getByTestId("feature-final-cta");
        await expect(close.getByRole("link")).toHaveText(["Interactive preview", "Sign in"]);
        await expect(close.getByTestId("invite-sign-in")).toHaveText(
          "Have an invite link? Sign in.",
        );
        await expect(close.getByRole("link", { name: "Sign in" })).toHaveAttribute(
          "href",
          /\/login$/,
        );
      }
      await page.context().close();
    });

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

    test("with reduced motion loads no motion library and is still, the header's Reduce motion shown on and disabled (MK12, MK14)", async ({
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
      // The system setting wins: the header's "Reduce motion" shows on, disabled, and says why.
      const reduce = page.getByRole("banner").getByRole("button", { name: "Reduce motion" });
      await expect(reduce).toHaveAttribute("aria-pressed", "true");
      await expect(reduce).toHaveAttribute("aria-disabled", "true");
      await expect(reduce).toHaveAccessibleDescription("On in your device settings");
      // Pressing it changes nothing (aria-disabled keeps it reachable, so the press is dispatched).
      await reduce.dispatchEvent("click");
      await expect(page.locator("html")).not.toHaveAttribute("data-motion", "reduce");
      await expect(reduce).toHaveAttribute("aria-pressed", "true");
      await expect(page.getByRole("button", { name: /^(Pause|Play) animation$/ })).toHaveCount(0);
      await page.context().close();
    });

    test("the header's Reduce motion is reached by Tab and stops all ambient motion at once (MK14)", async ({
      browser,
    }) => {
      const page = await openPage(browser, row.path, { viewport: { width: 1280, height: 900 } });
      const reduce = page.getByRole("banner").getByRole("button", { name: "Reduce motion" });
      await expect(reduce).toHaveAttribute("aria-pressed", "false");
      for (let i = 0; i < 30; i++) {
        await page.keyboard.press("Tab");
        if (await reduce.evaluate((el) => el === document.activeElement)) break;
      }
      await expect(reduce).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(reduce).toHaveAttribute("aria-pressed", "true");
      await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
      const drift = await page
        .locator("[data-bubble-field] span")
        .evaluateAll((els) => els.map((el) => getComputedStyle(el).animationName));
      expect(drift.length).toBeGreaterThan(0);
      expect(new Set(drift)).toEqual(new Set(["none"]));
      await expect(page.getByTestId("hero-stage")).toHaveAttribute("data-scene", "still");
      await expect(page.locator("[data-enhanced]")).toHaveCount(0);
      // The hero's own pause control is gone: the header holds the one control.
      await expect(page.getByRole("button", { name: /^(Pause|Play) animation$/ })).toHaveCount(0);
      await page.context().close();
    });

    for (const width of [390, 1000, 1440] as const) {
      test(`a full scroll at ${width}px throws nothing and logs no error`, async ({ browser }) => {
        const page = await openPage(browser, row.path, { viewport: { width, height: 900 } });
        const problems: string[] = [];
        page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
        page.on("console", (message) => {
          if (message.type() === "error") problems.push(`console: ${message.text()}`);
        });
        await scrollToFoot(page);
        await page.waitForLoadState("networkidle");
        expect(problems).toEqual([]);
        await page.context().close();
      });
    }

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

test.describe("marketing: the header's Reduce motion across pages (MK14)", () => {
  /**
   * A desktop page that records what <html> carries when <body> first appears: nothing can paint
   * before then, so that is the state of the first paint. `press` uses the keyboard.
   */
  async function openRecorded(browser: Browser) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await context.addInitScript(() => {
      const record = new MutationObserver(() => {
        if (!document.body) return;
        (window as unknown as { motionAtBody: string | null }).motionAtBody =
          document.documentElement.getAttribute("data-motion");
        record.disconnect();
      });
      record.observe(document, { childList: true, subtree: true });
    });
    const page = await context.newPage();
    const reduce = page.getByRole("banner").getByRole("button", { name: "Reduce motion" });
    return {
      context,
      page,
      reduce,
      atBody: () =>
        page.evaluate(() => (window as unknown as { motionAtBody: string | null }).motionAtBody),
      press: async (pressed: "true" | "false") => {
        await reduce.focus();
        await page.keyboard.press("Enter");
        await expect(reduce).toHaveAttribute("aria-pressed", pressed);
      },
    };
  }

  test("is remembered across a page change and a fresh load, applied before first paint", async ({
    browser,
  }) => {
    const { context, page, reduce, atBody, press } = await openRecorded(browser);
    await page.goto(`${MARKETING_URL}/features`);
    expect(await atBody()).toBeNull();
    await press("true");

    // A page change inside the site keeps it.
    const primary = page.getByRole("navigation", { name: "Primary" });
    await primary.getByRole("button", { name: "Features" }).click();
    await primary.getByRole("link", { name: /^Accounts/ }).click();
    await expect(page).toHaveURL(/\/features\/accounts$/);
    await expect(reduce).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");

    // A fresh load has it from the first paint.
    await page.goto(`${MARKETING_URL}/features/pay`);
    expect(await atBody()).toBe("reduce");
    await expect(reduce).toHaveAttribute("aria-pressed", "true");

    // Off again: the next load is back to the system setting.
    await press("false");
    await page.reload();
    expect(await atBody()).toBeNull();
    await expect(reduce).toHaveAttribute("aria-pressed", "false");
    await context.close();
  });

  test("with it on, a fresh load requests no motion library and every band is still", async ({
    browser,
  }) => {
    const { context, page, reduce, press } = await openRecorded(browser);
    await page.goto(`${MARKETING_URL}/features/budget`);
    await press("true");
    const scripts: string[] = [];
    context.on("request", (request) => {
      if (request.resourceType() === "script") scripts.push(request.url());
    });
    await page.goto(`${MARKETING_URL}/features/pay`);
    const preloaded = await page
      .locator('script[src], link[rel="modulepreload"]')
      .evaluateAll((els) =>
        els.map(
          (el) =>
            new URL(el.getAttribute("src") ?? el.getAttribute("href") ?? "", location.href).href,
        ),
      );
    await expect(reduce).toHaveAttribute("aria-pressed", "true");
    await scrollToFoot(page);
    await page.waitForLoadState("networkidle");
    // Only the first-load scripts: GSAP and three.js never download.
    expect(scripts.filter((url) => !preloaded.includes(url))).toEqual([]);
    await expect(page.locator("canvas")).toHaveCount(0);
    await expect(page.getByTestId("hero-stage")).toHaveAttribute("data-scene", "still");
    await expect(page.locator("[data-enhanced]")).toHaveCount(0);
    const faded = await page
      .locator("main h2, main h3, main p, main li")
      .evaluateAll((els) => els.filter((el) => Number(getComputedStyle(el).opacity) < 1).length);
    expect(faded).toBe(0);
    await context.close();
  });
});
