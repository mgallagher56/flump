import AxeBuilder from "@axe-core/playwright";
import { type Browser, expect, type Page, test } from "@playwright/test";
import { MARKETING_URL } from "../support/env";
import { scrollToFoot, untilStill } from "../support/marketingMotion";

/*
 * The marketing pages built to the approved prototypes after the home page (OTHER-PAGES-PLAN
 * section 5, slices P0 to P3), one row per page, by scene level:
 *
 * - `live` (S1: features, areas, AI connection): still glass orbs in the first band that go live
 *   with three.js where the power policy allows, with the pause control under the calls to action;
 * - `still` (S0: pricing, preview, security, contact, not found): still orbs only, three.js never
 *   reachable, nothing moving on its own, so no pause control; entrances play once;
 * - `legal` (terms, privacy, cookies, accessibility): still orbs in the header band only and no
 *   script after first paint, so neither GSAP nor three.js ever loads.
 *
 * These checks follow the standing rules, not any layout: the page with no JavaScript, reduced
 * motion, the pause control or its absence, what loads, a full scroll with no error at three
 * widths, and axe in both themes once every moment has finished. The built marketing site is the
 * one the smoke suite starts.
 */

type SceneLevel = "live" | "still" | "legal";

interface PageRow {
  name: string;
  path: string;
  /** The h1, as the approved prototype has it. */
  h1: string;
  scene: SceneLevel;
  /** How many children of `main` the page has at least (its bands). */
  bands: number;
  /** The page's decoration, as the server renders it: a selector and its glass orb count. */
  orbs: { selector: string; count: number };
}

const HERO_ORBS = { selector: '[data-testid="hero-stage"]', count: 4 } as const;
const LEGAL_ORBS = { selector: "[data-legal-orbs]", count: 3 } as const;

const PAGES: readonly PageRow[] = [
  { name: "features index", path: "/features", h1: "Everything Flump does" },
  { name: "accounts", path: "/features/accounts", h1: "Accounts and net worth" },
  { name: "budget", path: "/features/budget", h1: "Budget and breathing room" },
  { name: "pay", path: "/features/pay", h1: "Take-home pay and Self Assessment" },
  { name: "savings and pension", path: "/features/savings-and-pension", h1: "Savings and pension" },
  { name: "debt and borrowing", path: "/features/debt-and-borrowing", h1: "Debt and borrowing" },
  { name: "AI connection", path: "/features/ai-connection", h1: "AI connection" },
]
  .map((row): PageRow => ({ ...row, scene: "live", bands: 3, orbs: HERO_ORBS }))
  .concat([
    { name: "pricing", path: "/pricing", h1: "Pricing", scene: "still", bands: 2, orbs: HERO_ORBS },
    {
      name: "preview",
      path: "/preview",
      h1: "Interactive preview",
      scene: "still",
      bands: 5,
      orbs: HERO_ORBS,
    },
    {
      name: "security",
      path: "/security",
      h1: "Security and privacy",
      scene: "still",
      bands: 3,
      orbs: HERO_ORBS,
    },
    {
      name: "contact",
      path: "/contact",
      h1: "Contact Flump",
      scene: "still",
      bands: 2,
      orbs: HERO_ORBS,
    },
    {
      name: "not found",
      path: "/not-a-page",
      h1: "We cannot find that page",
      scene: "still",
      bands: 1,
      orbs: { selector: '[data-testid="not-found-orb"]', count: 1 },
    },
    {
      name: "terms",
      path: "/terms",
      h1: "Terms of use",
      scene: "legal",
      bands: 1,
      orbs: LEGAL_ORBS,
    },
    {
      name: "privacy",
      path: "/privacy",
      h1: "Privacy notice",
      scene: "legal",
      bands: 1,
      orbs: LEGAL_ORBS,
    },
    {
      name: "cookies",
      path: "/cookies",
      h1: "Cookies and browser storage",
      scene: "legal",
      bands: 1,
      orbs: LEGAL_ORBS,
    },
    {
      name: "accessibility",
      path: "/accessibility",
      h1: "Accessibility statement",
      scene: "legal",
      bands: 1,
      orbs: LEGAL_ORBS,
    },
  ]);

/** Text only three.js's renderer holds, so a script that has it is three.js however it is named. */
const THREE_MARKER = "WebGLRenderer";

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
      expect(tops.length).toBeGreaterThanOrEqual(row.bands);
      expect([...tops].sort((a, b) => a - b)).toEqual(tops);
      const faded = await page
        .locator("main h2, main h3, main p, main li")
        .evaluateAll((els) => els.filter((el) => Number(getComputedStyle(el).opacity) < 1).length);
      expect(faded).toBe(0);
      const orbs = page.locator(row.orbs.selector);
      await expect(orbs).toHaveAttribute("aria-hidden", "true");
      await expect(orbs.locator("[data-glass-orb]")).toHaveCount(row.orbs.count);
      if (row.orbs === HERO_ORBS) await expect(orbs).toHaveAttribute("data-scene", "still");
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
      if (row.orbs === HERO_ORBS) {
        await expect(page.getByTestId("hero-stage")).toHaveAttribute("data-scene", "still");
      }
      await expect(page.locator("[data-enhanced]")).toHaveCount(0);
      await expect(page.getByRole("button", { name: /^(Pause|Play) animation$/ })).toHaveCount(0);
      await page.context().close();
    });

    if (row.scene === "live") {
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
    } else {
      test(`never loads three.js${row.scene === "legal" ? " or any script after first paint" : ""}, and has no pause control since nothing moves on its own (MK12, MK14)`, async ({
        browser,
      }) => {
        const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
        const loaded: { url: string; body: Promise<string> }[] = [];
        context.on("response", (response) => {
          if (response.request().resourceType() === "script") {
            loaded.push({ url: response.url(), body: response.text().catch(() => "") });
          }
        });
        const page = await context.newPage();
        await page.goto(`${MARKETING_URL}${row.path}`);
        const preloaded = await page
          .locator('script[src], link[rel="modulepreload"]')
          .evaluateAll((els) =>
            els.map(
              (el) =>
                new URL(el.getAttribute("src") ?? el.getAttribute("href") ?? "", location.href)
                  .href,
            ),
          );
        await scrollToFoot(page);
        await page.waitForLoadState("networkidle");
        const bodies = await Promise.all(loaded.map((script) => script.body));
        expect(loaded.length).toBeGreaterThan(0);
        expect(
          loaded.filter((_, i) => bodies[i]?.includes(THREE_MARKER)).map((script) => script.url),
        ).toEqual([]);
        if (row.scene === "legal") {
          expect(
            loaded.map((script) => script.url).filter((url) => !preloaded.includes(url)),
          ).toEqual([]);
        }
        await expect(page.locator("canvas")).toHaveCount(0);
        await expect(page.getByRole("button", { name: /^(Pause|Play) animation$/ })).toHaveCount(0);
        await context.close();
      });
    }

    if (row.scene === "legal") {
      // The prototype goes wide from 900px, where its big orbs run into the reading column; the
      // owner ruled the wide layout starts at 1000px ("Yes, from 1000px", 28 Nov 2026).
      for (const width of [900, 950, 999] as const) {
        test(`at ${width}px no header orb overlaps the reading column (MP8)`, async ({
          browser,
        }) => {
          const page = await openPage(browser, row.path, { viewport: { width, height: 900 } });
          const column = await page
            .getByRole("heading", { level: 1, name: row.h1 })
            .evaluate((h1) => {
              const column = h1.parentElement?.parentElement;
              if (!column) throw new Error("The h1 has no reading column around it");
              const r = column.getBoundingClientRect();
              return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
            });
          const orbs = await page.locator("[data-legal-orbs] [data-glass-orb]").evaluateAll((els) =>
            els
              .map((el) => el.getBoundingClientRect())
              .filter((r) => r.width > 0)
              .map((r) => ({ left: r.left, right: r.right, top: r.top, bottom: r.bottom })),
          );
          expect(orbs.length).toBeGreaterThan(0);
          const overlapping = orbs.filter(
            (o) =>
              o.left < column.right &&
              o.right > column.left &&
              o.top < column.bottom &&
              o.bottom > column.top,
          );
          expect(overlapping).toEqual([]);
          await page.context().close();
        });
      }
    }

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
