import AxeBuilder from "@axe-core/playwright";
import { type Browser, expect, type Page, test } from "@playwright/test";
import { MARKETING_URL } from "../support/env";
import { scrollInSteps, untilStill } from "../support/marketingMotion";

/*
 * The new marketing home page (ROLLOUT-PLAN slice M1; UX-GUIDELINES 12.2). These checks need a
 * real browser: layout at each width, the page with no JavaScript, reduced motion, the header's
 * "Reduce motion", the carousel and FAQ by keyboard, the journey's changeovers coming to rest, and axe in
 * both themes. The built marketing site is the one the smoke suite starts.
 */

const HOME = `${MARKETING_URL}/`;
const WIDTHS = [360, 768, 1000, 1440, 1920] as const;
const THEMES = ["light", "dark"] as const;

/** The text and figures every band's moment brings in: still once every moment has finished. */
const MOMENT_PARTS =
  "main :is(h1, h2, h3, p, li, figure, [data-count], [data-hero-value], [data-step], [data-stop-side], [data-stop-pair])";

/**
 * Scrolls to the page's foot most of a screen at a time, re-reading its length as pins lay out (the
 * hero's pin lengthens the page from 1024px), so every band's moment is triggered; then waits for
 * any code they load and for every moment to finish. With motion on it starts once the hero and the
 * journey are live, and holds each step until every journey stop in view is set up, so the
 * changeovers see the scroll go by rather than being set up after it has passed.
 */
async function scrollThrough(page: Page): Promise<void> {
  const motion = !(await page.evaluate(
    () =>
      matchMedia("(prefers-reduced-motion: reduce)").matches ||
      document.documentElement.dataset.motion === "reduce",
  ));
  if (motion) await liveBeforeScroll(page);
  const notReady = await page.evaluate(async (motion) => {
    const atFoot = () =>
      window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
    const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
    const waitingStops = () =>
      Array.from(document.querySelectorAll<HTMLElement>("#journey [data-journey-stop]")).filter(
        (stop) => {
          const r = stop.getBoundingClientRect();
          return r.bottom > 0 && r.top < window.innerHeight && stop.dataset.enhanced !== "true";
        },
      );
    const missed = new Set<string>();
    // Bounded: 300 steps is far past the longest page.
    for (let step = 0; step < 300 && !atFoot(); step++) {
      window.scrollBy({ top: Math.round(window.innerHeight * 0.85), behavior: "instant" });
      // Two frames: the page has drawn this place, so its triggers and observers have seen it.
      await frame();
      await frame();
      // A stop sets itself up as it nears (useGsapMoment); allow it 3 s, then count it missed.
      const since = Date.now();
      while (motion && waitingStops().length > 0 && Date.now() - since < 3000) await frame();
      for (const stop of motion ? waitingStops() : []) missed.add(stop.dataset.stop ?? "?");
    }
    return [...missed];
  }, motion);
  expect(notReady).toEqual([]);
  expect(
    await page.evaluate(
      () => window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2,
    ),
  ).toBe(true);
  await page.waitForLoadState("networkidle");
  await untilStill(page, MOMENT_PARTS);
}

/** Waits for the hero and the journey to be live (GSAP and the scene load after first paint). */
async function liveBeforeScroll(page: Page): Promise<void> {
  await expect(page.getByTestId("home-hero")).toHaveAttribute("data-hero-live", "true", {
    timeout: 15_000,
  });
  await expect(page.locator("#journey")).toHaveAttribute("data-live", "on", { timeout: 15_000 });
}

/**
 * The time limit for a test that scrolls through the pinned scene: the whole page, or the journey
 * flicked both ways. Its time is mostly the scene drawing each frame in software (about 0.15 s a
 * frame on a busy runner) and the moments finishing by time, so it varies with the runner: 22 s at
 * the slowest CI run measured (PR 985), against 30 s for every other test. 60 s keeps more than
 * twice that in hand; a test that hangs still fails.
 */
const SCENE_SCROLL_BUDGET = 60_000;

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

/** Presses Tab from the top of the page until `selector` has focus (at most 30 presses). */
async function tabTo(page: Page, selector: string): Promise<void> {
  for (let i = 0; i < 30; i++) {
    await page.keyboard.press("Tab");
    if (await page.evaluate((sel) => document.activeElement?.matches(sel) ?? false, selector)) {
      return;
    }
  }
  throw new Error(`${selector} was not reached by Tab`);
}

/** The bubble fields' animation names, each once. */
async function driftNames(page: Page): Promise<string[]> {
  const names = await page
    .locator("[data-bubble-field] span")
    .evaluateAll((els) => els.map((el) => getComputedStyle(el).animationName));
  expect(names.length).toBeGreaterThan(0);
  return [...new Set(names)];
}

/** The rough figures band's steps' opacities. */
const stepOpacities = (page: Page) =>
  page
    .locator("#rough-figures [data-step]")
    .evaluateAll((els) => els.map((el) => getComputedStyle(el).opacity));

/**
 * How an element shows inside the journey: its opacity times every ancestor's up to the journey
 * (computed opacity ignores the parents), and whether it is `visibility: hidden`. Runs in the page.
 */
function shownInJourney(el: Element): { opacity: number; hidden: boolean } {
  let opacity = 1;
  let node: Element | null = el;
  while (node && node.id !== "journey") {
    opacity *= Number(getComputedStyle(node).opacity);
    node = node.parentElement;
  }
  return { opacity, hidden: getComputedStyle(el).visibility === "hidden" };
}

test.describe("marketing home: layout", () => {
  for (const theme of THEMES) {
    for (const width of WIDTHS) {
      test(`the hero's layout at ${width}px, ${theme}`, async ({ browser }) => {
        const page = await openPage(browser, {
          viewport: { width, height: 900 },
          colorScheme: theme,
          reducedMotion: "reduce",
        });
        const hero = page.getByTestId("home-hero");
        const heading = await page.getByRole("heading", { level: 1 }).boundingBox();
        const copy = await hero.locator("h1").locator("..").boundingBox();
        // The dashboard's title sits at its card's left, so measure the card.
        const card = await hero.locator("figure").first().boundingBox();
        const ctas = await hero.locator("[data-lit-ctas]").boundingBox();
        const firstCta = await hero
          .getByRole("link", { name: "Interactive preview" })
          .boundingBox();
        const align = await hero
          .locator("h1")
          .locator("..")
          .evaluate((el) => getComputedStyle(el).textAlign);
        expect(heading && copy && card && ctas && firstCta).toBeTruthy();
        if (heading && copy && card && ctas && firstCta) {
          if (width < 1024) {
            // Prototype 11 under 1024px: one centred column, the copy centred and the card
            // centred under it.
            const viewportCentre = width / 2;
            expect(align).toBe("center");
            expect(Math.abs(heading.x + heading.width / 2 - viewportCentre)).toBeLessThan(2);
            expect(Math.abs(ctas.x + ctas.width / 2 - viewportCentre)).toBeLessThan(2);
            expect(Math.abs(card.x + card.width / 2 - viewportCentre)).toBeLessThan(2);
            expect(card.y).toBeGreaterThan(heading.y + heading.height);
          } else {
            // Prototype 11 from 1024px: two columns, the copy column left of the card and
            // left-aligned, its heading and first call to action starting at the column's edge.
            expect(align).toBe("left");
            expect(copy.x + copy.width).toBeLessThan(card.x);
            expect(Math.abs(heading.x - copy.x)).toBeLessThan(2);
            expect(Math.abs(firstCta.x - copy.x)).toBeLessThan(2);
          }
        }
        // Stacked, each hero figure sits on one line ("About 10.2 months" never wraps; PR 975
        // review). Side by side, prototype 11's two-column tiles wrap the breathing room figure
        // at its KpiCard size, so the check holds under 1024px only (listed for the owner).
        if (width < 1024) {
          const lines = await page
            .locator("[data-hero-value]")
            .evaluateAll((els) =>
              els.map((el) =>
                Math.round(
                  el.getBoundingClientRect().height /
                    Number.parseFloat(getComputedStyle(el).lineHeight),
                ),
              ),
            );
          expect(lines).toEqual([1, 1, 1]);
        }
        // No band, bubble or orb makes the page scroll sideways.
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
        await page.context().close();
      });
    }
  }
});

test.describe("marketing home: without JavaScript and with reduced motion (MK1)", () => {
  test("is complete with no JavaScript: journey stops in order, carousel scrolling natively", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();
    await page.goto(HOME);
    // The header's Reduce motion needs script to do anything, so it is not offered without it.
    await expect(page.getByRole("button", { name: "Reduce motion" })).toBeHidden();
    const stops = page.locator("#journey section[data-journey-stop]");
    await expect(stops).toHaveCount(6);
    // Plain sections in reading order: each stop starts below the one before it.
    const tops = await stops.evaluateAll((items) =>
      items.map((item) => item.getBoundingClientRect().top),
    );
    expect([...tops].sort((a, b) => a - b)).toEqual(tops);
    const list = page.getByRole("list", { name: "Flump features" });
    await expect(list.getByRole("listitem")).toHaveCount(6);
    expect(await list.evaluate((el) => getComputedStyle(el).overflowX)).toBe("auto");
    await list.evaluate((el) => el.scrollBy({ left: 400 }));
    expect(await list.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
    // Every FAQ answer is open and readable, not only the first.
    await expect(page.locator("#faq-answer-pricing")).toBeVisible();
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
    await expect(page.getByTestId("journey-stage")).toHaveAttribute("data-scene", "still");
    await expect(page.locator("[data-enhanced]")).toHaveCount(0);
    // The system setting wins: the header's "Reduce motion" shows on, disabled, and says why.
    const reduce = page.getByRole("banner").getByRole("button", { name: "Reduce motion" });
    await expect(reduce).toHaveAttribute("aria-pressed", "true");
    await expect(reduce).toHaveAttribute("aria-disabled", "true");
    await expect(reduce).toHaveAccessibleDescription("On in your device settings");
    await expect(page.getByRole("button", { name: /^(Pause|Play) animation$/ })).toHaveCount(0);
    await page.close();
  });
});

/**
 * Each close piece's key, place in the stack's box and size, rounded to the pixel. In the box, not
 * on the page: with motion the pinned hero makes the page longer above the close.
 */
async function stackPlaces(page: Page): Promise<string[]> {
  return page.locator("#get-started [data-close-piece]").evaluateAll((els) =>
    els.map((el) => {
      const box = el.closest("[data-close-stack]")?.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      return `${el.getAttribute("data-close-piece")} ${Math.round(r.left - (box?.left ?? 0))},${Math.round(r.top - (box?.top ?? 0))} ${Math.round(r.width)}x${Math.round(r.height)}`;
    }),
  );
}

test.describe("marketing home: the close's stack (owner, 28 Nov 2026)", () => {
  test("offers the interactive preview and, under it, the sign-in line, with no invite request", async ({
    browser,
  }) => {
    const page = await browser.newPage({ reducedMotion: "reduce" });
    await page.goto(HOME);
    const card = page.getByTestId("home-final-cta");
    await card.scrollIntoViewIfNeeded();
    await expect(card.getByRole("link")).toHaveText(["Interactive preview", "Sign in"]);
    await expect(card.getByRole("link", { name: "Interactive preview" })).toHaveAttribute(
      "data-variant",
      "primary",
    );
    const line = card.getByTestId("invite-sign-in");
    await expect(line).toHaveText("Have an invite link? Sign in.");
    await expect(line.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", /\/login$/);
    const button = await card.getByRole("link", { name: "Interactive preview" }).boundingBox();
    const under = await line.boundingBox();
    expect(button && under && under.y >= button.y + button.height).toBe(true);
    await expect(card.getByText(/request an invite/i)).toHaveCount(0);
    await page.close();
  });

  test("shows prototype 10's gathered stack with real-text Example tags, still under reduced motion", async ({
    browser,
  }) => {
    const page = await browser.newPage({ reducedMotion: "reduce" });
    await page.goto(HOME);
    const close = page.locator("#get-started");
    await close.scrollIntoViewIfNeeded();
    const stack = close.locator("[data-close-stack]");
    await expect(stack).toBeVisible();
    await expect(stack).toHaveAttribute("aria-hidden", "true");
    await expect(stack.locator("[data-close-piece]")).toHaveCount(6);
    await expect(stack.getByText("Example", { exact: true })).toHaveCount(6);
    const before = await stackPlaces(page);
    await untilStill(page, "#get-started [data-close-piece]");
    expect(await stackPlaces(page)).toEqual(before);
    // No script ever placed a piece: each rests where the stylesheet puts it.
    const styled = await stack
      .locator("[data-close-piece]")
      .evaluateAll((els) => els.filter((el) => el.hasAttribute("style")).length);
    expect(styled).toBe(0);
    await page.close();
  });

  test("gathers once and comes to rest exactly where reduced motion shows it", async ({
    browser,
  }) => {
    // It scrolls the journey scene on the way to the close.
    test.setTimeout(SCENE_SCROLL_BUDGET);
    const still = await browser.newPage({ reducedMotion: "reduce" });
    await still.goto(HOME);
    await still.locator("#get-started").scrollIntoViewIfNeeded();
    const rest = await stackPlaces(still);
    expect(rest).toHaveLength(6);
    await still.close();
    const page = await browser.newPage();
    await page.goto(HOME);
    await scrollThrough(page);
    await page.locator("#get-started").scrollIntoViewIfNeeded();
    await untilStill(page, "#get-started [data-close-piece]");
    expect(await stackPlaces(page)).toEqual(rest);
    await page.close();
  });
});

/**
 * The hero as drawn: whether the six pieces show, the "Made from" rows' and the three figures'
 * opacities, and the dashboard's transform. Runs in the page.
 */
function heroDrawn() {
  const root = document.getElementById("home-hero");
  if (!root) throw new Error("no hero");
  const styles = (selector: string) =>
    Array.from(root.querySelectorAll(selector)).map((el) => getComputedStyle(el));
  const layer = styles("[data-hero-layer]")[0];
  return {
    pieces: layer?.display !== "none" && layer?.visibility === "visible",
    rows: styles("[data-hero-row]").map((s) => s.opacity),
    values: styles("[data-hero-value]").map((s) => s.opacity),
    dash: styles("[data-hero-dash]")[0]?.transform,
  };
}

/** The finished, still "Made from" picture: every row and figure readable, no piece over it. */
const FILLED = {
  pieces: false,
  rows: ["1", "1", "1", "1", "1", "1"],
  values: ["1", "1", "1"],
  dash: "none",
};

/** Each piece's box on the page, rounded to the pixel. Runs in the page. */
function pieceBoxes() {
  return Array.from(document.querySelectorAll("[data-hero-piece]")).map((el) => {
    const r = el.getBoundingClientRect();
    return [r.left, r.top, r.width, r.height].map(Math.round);
  });
}

test.describe("marketing home: the hero's start state (owner, 28 Nov 2026)", () => {
  for (const [width, height] of [
    [1440, 900],
    [390, 844],
  ] as const) {
    test(`at ${width}px the first paint already has the pieces apart, before any script but the head's`, async ({
      browser,
    }) => {
      const context = await browser.newContext({ viewport: { width, height } });
      const page = await context.newPage();
      // Only the inline theme script runs: the server HTML and its CSS, as first painted.
      await page.route(/\/assets\/.*\.js(\?|$)/, (route) => route.abort());
      await page.goto(HOME, { waitUntil: "domcontentloaded" });
      const drawn = await page.evaluate(heroDrawn);
      expect(drawn.pieces).toBe(true);
      expect(drawn.rows).toEqual(["0", "0", "0", "0", "0", "0"]);
      expect(drawn.values).toEqual(["0", "0", "0"]);
      // From 1024px the dashboard is pushed back under the pieces; stacked it stays flat.
      if (width >= 1024) expect(drawn.dash).not.toBe("none");
      else expect(drawn.dash).toBe("none");
      // Every piece is drawn apart from the others, wholly inside the window's width.
      const boxes = await page.evaluate(pieceBoxes);
      expect(new Set(boxes.map((b) => `${b[0]},${b[1]}`)).size).toBe(6);
      for (const [left = Number.NaN, , w = Number.NaN] of boxes) {
        expect(left).toBeGreaterThanOrEqual(0);
        expect(left + w).toBeLessThanOrEqual(width);
      }
      await context.close();
    });

    test(`at ${width}px the script takes over the start state with no jump and no layout shift`, async ({
      browser,
    }) => {
      const context = await browser.newContext({ viewport: { width, height } });
      const page = await context.newPage();
      await page.addInitScript(() => {
        const w = window as unknown as Record<string, unknown>;
        const boxes = () =>
          Array.from(document.querySelectorAll("[data-hero-piece]")).map((el) => {
            const r = el.getBoundingClientRect();
            return [r.left, r.top, r.width, r.height].map(Math.round);
          });
        // Shifts of what the script takes over: the hero, its column, the dashboard, the pieces
        // and the bubbles, each moved by a pixel or more, from the frame before the take-over on.
        // The copy's text settles by a pixel as the web font arrives, and the caption's text
        // reflows in place, script or none, so neither counts. Earlier shifts are not the
        // script's: on a machine without Inter installed (CI) the web font replaces the fallback
        // after first paint and reflows the dashboard's text (its info button moved 6px at
        // 358ms, the dashboard grew about 12px), with or without the hero script.
        w.__shift = 0;
        w.__from = Number.POSITIVE_INFINITY;
        w.__shiftSources = [] as string[];
        type Source = {
          node: Node | null;
          previousRect: DOMRectReadOnly;
          currentRect: DOMRectReadOnly;
        };
        const taken = ({ node, previousRect: a, currentRect: b }: Source) => {
          const el = node instanceof Element ? node : (node?.parentElement ?? null);
          const moved = Math.abs(a.x - b.x) >= 1 || Math.abs(a.y - b.y) >= 1;
          return (
            moved &&
            Boolean(
              el?.matches("#home-hero, [data-hero-inner]") ||
                el?.closest("#home-hero [data-hero-stage], #home-hero [data-bubble-field]"),
            )
          );
        };
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as unknown as {
            value: number;
            hadRecentInput: boolean;
            sources: Source[];
          }[]) {
            const at = (entry as unknown as { startTime: number }).startTime;
            if (at < (w.__from as number)) continue;
            if (!entry.hadRecentInput && entry.sources.some(taken)) {
              w.__shift = (w.__shift as number) + entry.value;
              for (const source of entry.sources.filter(taken)) {
                const el =
                  source.node instanceof Element ? source.node : source.node?.parentElement;
                const a = source.previousRect;
                const b = source.currentRect;
                (w.__shiftSources as string[]).push(
                  `${Math.round(performance.now())}ms ${el?.tagName ?? "?"}${el?.id ? `#${el.id}` : ""} ${el?.getAttribute("data-hero-piece") ?? el?.className.toString().slice(0, 40) ?? ""} ${Math.round(a.x)},${Math.round(a.y)} to ${Math.round(b.x)},${Math.round(b.y)}`,
                );
              }
            }
          }
        }).observe({ type: "layout-shift", buffered: true });
        // What the CSS draws, each frame until the take-over: the last of these is the frame
        // just before GSAP takes the pieces.
        let watching = true;
        const frame = () => {
          if (!watching) return;
          if (document.querySelector("[data-hero-piece]")) {
            w.__painted = boxes();
            w.__paintedAt = performance.now();
          }
          requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
        // The moment GSAP has drawn its start state, before its first tick.
        new MutationObserver((records, observer) => {
          if (records.some((r) => (r.target as HTMLElement).dataset.heroLive === "true")) {
            w.__taken = boxes();
            w.__from = (w.__paintedAt as number | undefined) ?? 0;
            watching = false;
            observer.disconnect();
          }
        }).observe(document, {
          attributes: true,
          subtree: true,
          attributeFilter: ["data-hero-live"],
        });
      });
      await page.goto(HOME);
      await expect(page.getByTestId("home-hero")).toHaveAttribute("data-hero-live", "true", {
        timeout: 15_000,
      });
      const { painted, taken, shift, sources } = await page.evaluate(() => {
        const w = window as unknown as Record<string, unknown>;
        return {
          painted: w.__painted,
          taken: w.__taken,
          shift: w.__shift,
          sources: w.__shiftSources,
        };
      });
      expect(painted).toBeTruthy();
      // Within a pixel of where the CSS drew each piece.
      const near = (a: number[][], b: number[][]) =>
        a.every((box, i) => box.every((v, j) => Math.abs(v - (b[i]?.[j] ?? Number.NaN)) <= 1));
      expect(
        near(painted as number[][], taken as number[][]),
        JSON.stringify({ painted, taken }),
      ).toBe(true);
      expect(shift, JSON.stringify(sources)).toBe(0);
      await context.close();
    });
  }

  test("at 390px, where the dashboard starts past its line, the pieces assemble after load", async ({
    browser,
  }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await page.goto(HOME);
    await expect(page.getByTestId("home-hero")).toHaveAttribute("data-hero-live", "true", {
      timeout: 15_000,
    });
    // Scroll triggers it and time completes it (durations.marketing.hero): every row arrives.
    await expect
      .poll(async () => (await page.evaluate(heroDrawn)).rows, { timeout: 15_000 })
      .toEqual(["1", "1", "1", "1", "1", "1"]);
    await context.close();
  });

  test("with reduced motion the hero is the filled picture from the first paint, script or none", async ({
    browser,
  }) => {
    for (const blockScripts of [true, false]) {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        reducedMotion: "reduce",
      });
      const page = await context.newPage();
      if (blockScripts) await page.route(/\/assets\/.*\.js(\?|$)/, (route) => route.abort());
      await page.goto(HOME, { waitUntil: blockScripts ? "domcontentloaded" : "load" });
      expect(await page.evaluate(heroDrawn)).toEqual(FILLED);
      await context.close();
    }
  });

  for (const [width, height] of [
    [1440, 900],
    [390, 844],
  ] as const) {
    test(`with no JavaScript at ${width}px the hero is the filled picture`, async ({ browser }) => {
      const context = await browser.newContext({
        viewport: { width, height },
        javaScriptEnabled: false,
      });
      const page = await context.newPage();
      await page.goto(HOME);
      expect(await page.evaluate(heroDrawn)).toEqual(FILLED);
      await context.close();
    });
  }
});

test.describe("marketing home: the hero's bubbles (owner, 28 Nov 2026)", () => {
  /** How many bubbles show at each size: more than prototype 11's two, so the hero is not bare. */
  for (const [width, height, least] of [
    [2000, 1250, 6],
    [1440, 900, 6],
    [1000, 800, 3],
    [390, 844, 2],
  ] as const) {
    test(`at ${width}x${height} every bubble keeps clear of the copy, the dashboard and its pieces`, async ({
      browser,
    }) => {
      const context = await browser.newContext({ viewport: { width, height } });
      const page = await context.newPage();
      // The start state, when the floating pieces reach furthest.
      await page.goto(HOME, { waitUntil: "domcontentloaded" });
      const { bubbles, clashes } = await page.evaluate((margin) => {
        const hero = document.getElementById("home-hero");
        if (!hero) throw new Error("no hero");
        const keepClear = [
          hero.querySelector("h1"),
          hero.querySelector("h1 + p"),
          hero.querySelector("[data-lit-ctas]"),
          hero.querySelector("[data-testid=hero-scroll-cue]"),
          hero.querySelector("[data-hero-dash]"),
          ...hero.querySelectorAll("[data-hero-piece]"),
        ].flatMap((el) =>
          el ? [{ name: el.textContent?.slice(0, 24), r: el.getBoundingClientRect() }] : [],
        );
        const shown = Array.from(hero.querySelectorAll<HTMLElement>("[data-bubble-field] > span"))
          .map((el) => el.getBoundingClientRect())
          // Drawn and at least partly in the window.
          .filter((r) => r.width > 0 && r.right > 0 && r.left < window.innerWidth);
        const clashes: string[] = [];
        for (const b of shown) {
          for (const { name, r } of keepClear) {
            const apart =
              b.right + margin <= r.left ||
              b.left >= r.right + margin ||
              b.bottom + margin <= r.top ||
              b.top >= r.bottom + margin;
            if (!apart) clashes.push(`${Math.round(b.left)},${Math.round(b.top)} on "${name}"`);
          }
        }
        return { bubbles: shown.length, clashes };
      }, 12);
      expect(clashes).toEqual([]);
      expect(bubbles).toBeGreaterThanOrEqual(least);
      // Decoration only, and still with reduced motion (checked in MK1 above).
      await expect(page.locator("#home-hero [data-bubble-field]")).toHaveAttribute(
        "aria-hidden",
        "true",
      );
      await context.close();
    });
  }
});

test("marketing home: the close card has a 28px corner and the depth list's cards 20px (radius tokens)", async ({
  browser,
}) => {
  const page = await browser.newPage({ reducedMotion: "reduce" });
  await page.goto(HOME);
  const radius = (selector: string) =>
    page
      .locator(selector)
      .evaluateAll((els) => [
        ...new Set(els.map((el) => getComputedStyle(el).borderTopLeftRadius)),
      ]);
  expect(await radius("[data-testid='home-final-cta'] >> xpath=..")).toEqual(["28px"]);
  expect(await radius("#more-detail li > *")).toEqual(["20px"]);
  await page.close();
});

test.describe("marketing home: controls", () => {
  test("the header's Reduce motion is reached by Tab and stops all ambient motion at once (MK14)", async ({
    page,
  }) => {
    await page.goto(HOME);
    const reduce = page.getByRole("banner").getByRole("button", { name: "Reduce motion" });
    await expect(reduce).toHaveAttribute("aria-pressed", "false");
    await tabTo(page, "[data-motion-toggle]");
    await page.keyboard.press("Enter");
    await expect(reduce).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
    // Everything stops at once: the bubbles' drift, the scene (back to its still) and every moment.
    expect(await driftNames(page)).toEqual(["none"]);
    await expect(page.getByTestId("journey-stage")).toHaveAttribute("data-scene", "still");
    await expect(page.locator("canvas")).toHaveCount(0);
    await expect(page.locator("[data-enhanced]")).toHaveCount(0);
    // An entrance still to play shows finished: the rough figures steps are fully opaque.
    await page.locator("#rough-figures").scrollIntoViewIfNeeded();
    expect(await stepOpacities(page)).toEqual(["1", "1", "1"]);
    // The in-page pause controls are gone: the header holds the one control.
    await expect(page.getByRole("button", { name: /^(Pause|Play) animation$/ })).toHaveCount(0);
    // Off again: the bubbles drift again without a reload; a finished moment stays finished.
    await reduce.focus();
    await page.keyboard.press("Enter");
    await expect(reduce).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator("html")).not.toHaveAttribute("data-motion", "reduce");
    expect(await driftNames(page)).not.toContain("none");
    expect(await stepOpacities(page)).toEqual(["1", "1", "1"]);
  });

  test("with Reduce motion on, the next load requests no motion library and the page is still and complete", async ({
    page,
  }) => {
    test.setTimeout(SCENE_SCROLL_BUDGET);
    await page.goto(HOME);
    await page.getByRole("banner").getByRole("button", { name: "Reduce motion" }).click();
    const scripts: string[] = [];
    page.on("request", (request) => {
      if (request.resourceType() === "script") scripts.push(request.url());
    });
    await page.reload();
    const preloaded = await page
      .locator('script[src], link[rel="modulepreload"]')
      .evaluateAll((els) =>
        els.map(
          (el) =>
            new URL(el.getAttribute("src") ?? el.getAttribute("href") ?? "", location.href).href,
        ),
      );
    await expect(
      page.getByRole("banner").getByRole("button", { name: "Reduce motion" }),
    ).toHaveAttribute("aria-pressed", "true");
    await scrollThrough(page);
    // Only the first-load scripts: GSAP, the hero's assembly and three.js never download.
    expect(scripts.filter((url) => !preloaded.includes(url))).toEqual([]);
    await expect(page.locator("canvas")).toHaveCount(0);
    await expect(page.getByTestId("journey-stage")).toHaveAttribute("data-scene", "still");
    await expect(page.locator("[data-enhanced]")).toHaveCount(0);
    expect(await driftNames(page)).toEqual(["none"]);
  });

  for (const width of [320, 360, 390, 768, 1000, 1440] as const) {
    test(`at ${width}px "Reduce motion" sits in the bar beside the theme switch, a whole 44px target, never in the menu`, async ({
      browser,
    }) => {
      const page = await openPage(browser, { viewport: { width, height: 800 } });
      await expect(
        page.getByRole("banner").getByRole("button", { name: "Reduce motion" }),
      ).toBeVisible();
      const fit = await page.evaluate(() => {
        const header = document.querySelector("header");
        const shown = (els: Iterable<Element>) =>
          [...els].map((el) => el.getBoundingClientRect()).filter((r) => r.width > 0);
        const motion = header?.querySelector("[data-motion-toggle]")?.getBoundingClientRect();
        const logo = header?.querySelector("a[href='/']")?.getBoundingClientRect();
        const theme = shown(
          header?.querySelectorAll("#theme-toggle-compact, [aria-label='System theme']") ?? [],
        )[0];
        const right = Math.max(
          ...shown(header?.querySelectorAll("a, button") ?? []).map((r) => r.right),
        );
        return {
          size: motion ? `${Math.round(motion.width)}x${Math.round(motion.height)}` : "none",
          clearOfLogo: Boolean(motion && logo && motion.left >= logo.right),
          beforeTheme: Boolean(motion && theme && motion.right <= theme.left),
          gutter: window.innerWidth - right >= 16,
        };
      });
      expect(fit).toEqual({ size: "44x44", clearOfLogo: true, beforeTheme: true, gutter: true });
      if (width < 1024) {
        await page.getByRole("button", { name: "Open navigation menu" }).click();
        await expect(page.getByRole("dialog").getByRole("link", { name: "Sign in" })).toBeVisible();
        await expect(
          page.getByRole("dialog").getByRole("button", { name: "Reduce motion" }),
        ).toHaveCount(0);
      }
      await page.context().close();
    });
  }

  test("on a 390px phone the dock's controls are whole 44px targets, with no motion control beside them", async ({
    browser,
  }) => {
    const page = await openPage(browser, { viewport: { width: 390, height: 844 } });
    const dock = page.locator("[data-stop-control]");
    const next = dock.getByRole("button", { name: /^Next section/ });
    const label = dock.getByTestId("stop-control-label");
    // Step well into the page, past a two-digit count's width ("9 of 14").
    for (let i = 0; i < 8; i++) {
      await next.click();
      await expect(label).toContainText(`${i + 2} of`);
    }
    const boxes = await dock.locator("button").evaluateAll((els) =>
      els.map((el) => {
        const r = el.getBoundingClientRect();
        return { w: Math.round(r.width), h: Math.round(r.height) };
      }),
    );
    // Previous and next only: "Reduce motion" moved to the header.
    expect(boxes).toEqual([
      { w: 44, h: 44 },
      { w: 44, h: 44 },
    ]);
    // The count is never clipped, and the dock stays inside the screen.
    const fit = await page.evaluate(() => {
      const count = document.querySelector<HTMLElement>("[data-testid=stop-control-label]");
      const dock = document.querySelector("[data-stop-control]")?.getBoundingClientRect();
      return {
        clipped: count ? count.scrollWidth > count.clientWidth : true,
        inside: dock ? dock.right <= window.innerWidth : false,
      };
    });
    expect(fit).toEqual({ clipped: false, inside: true });
    await page.context().close();
  });

  test("the stop control steps next and previous and moves focus to each section's heading", async ({
    page,
  }) => {
    await page.goto(HOME);
    // From 1024px the hero's pin adds a run of scroll above every band once GSAP has loaded, so
    // step once the hero is live (a visitor this quick would see the page lengthen under them).
    await expect(page.getByTestId("home-hero")).toHaveAttribute("data-hero-live", "true", {
      timeout: 15_000,
    });
    const control = page.locator("[data-stop-control]");
    const next = control.getByRole("button", { name: /^Next section/ });
    const previous = control.getByRole("button", { name: /^Previous section/ });
    await expect(control.getByTestId("stop-control-label")).toContainText("1 of");
    await expect(previous).toBeDisabled();
    // The second stop's heading, read from the page rather than written here.
    const second = page.locator("[data-home-section]").nth(1);
    const secondHeading = await second.getAttribute("aria-labelledby");
    await next.focus();
    await page.keyboard.press("Enter");
    await expect(control.getByTestId("stop-control-label")).toContainText("2 of");
    await expect(page.locator(`[id="${secondHeading?.split(" ")[0]}"]`)).toBeFocused();
    // Smooth scrolling: it lands just under the header.
    await expect
      .poll(async () => Math.round((await second.boundingBox())?.y ?? -1), { timeout: 10_000 })
      .toBeLessThan(120);
    await expect(second).toBeInViewport();
    await previous.click();
    await expect(control.getByTestId("stop-control-label")).toContainText("1 of");
    await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
  });

  test("?hero=timed plays the earlier timed assembly: never pinned, ending on the finished picture", async ({
    browser,
  }) => {
    const page = await openPage(browser, { viewport: { width: 1440, height: 900 } });
    const scripts: string[] = [];
    const problems: string[] = [];
    page.on("request", (request) => {
      if (request.resourceType() === "script") scripts.push(request.url());
    });
    page.on("pageerror", (error) => problems.push(error.message));
    await page.goto(`${HOME}?hero=timed`);
    const hero = page.getByTestId("home-hero");
    await expect(hero).toHaveAttribute("data-hero-live", "true", { timeout: 15_000 });
    expect(scripts.some((url) => /heroAssembly/.test(url))).toBe(true);
    expect(scripts.some((url) => /heroScroll/.test(url))).toBe(false);
    // Played by time: no pin wraps the hero.
    await expect(page.locator(".pin-spacer")).toHaveCount(0);
    // The longest run is the hero's assembly (durations.marketing.hero, 4,760 ms).
    await expect
      .poll(
        () =>
          hero
            .locator("[data-hero-value]")
            .evaluateAll((els) => els.map((el) => getComputedStyle(el).opacity)),
        { timeout: 15_000 },
      )
      .toEqual(["1", "1", "1"]);
    expect(problems).toEqual([]);
    await page.context().close();
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
    // The band's entrance is set up (GSAP loads after first paint) and has finished, so only an
    // opening answer moves the items.
    await expect(faq.locator("[data-enhanced=true]").first()).toBeAttached({ timeout: 15_000 });
    await untilStill(page, "#faq li");
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

  // Prototype 10's cascade on More detail and the FAQ (owner, 28 Nov 2026, on top of prototype 11;
  // `unstackMoment` in `motion/moments/bandMoments.ts`). `untilStill` only proves a band ends
  // still, which any entrance, or none, passes: this checks the sheets wait in one stack on the
  // first, then leave it one after another, and rest with nothing left on them.
  for (const [band, moving] of [
    ["#more-detail", "[data-deal-item] > *"],
    ["#faq", "[data-deal-item]"],
  ] as const) {
    for (const [width, height] of [
      [1440, 900],
      [390, 844],
    ] as const) {
      test(`${band}'s sheets unstack in turn at ${width}px, as prototype 10, and rest clear`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height });
        await page.goto(HOME);
        const list = page.locator(`${band} ul`).first();
        // The list's top at `share` of the window down: 1.3 is below the cascade's start (85%) but
        // near enough for its set-up; 0.5 is past the start.
        const place = (share: number) =>
          list.evaluate((el, share) => {
            const top = el.getBoundingClientRect().top + window.scrollY;
            window.scrollTo({ top: top - window.innerHeight * share, behavior: "instant" });
          }, share);
        // The bands below lay out as they near, so the list is placed again on each look.
        await expect
          .poll(
            async () => {
              await place(1.3);
              return list.getAttribute("data-enhanced");
            },
            { timeout: 15_000, message: "the list's moment is set up" },
          )
          .toBe("true");
        await place(1.3);

        /** Each sheet's inline translate and depth, its opacity and its expected place in the stack. */
        const read = () =>
          list.evaluate((el, moving) => {
            const items = Array.from(el.querySelectorAll<HTMLElement>("[data-deal-item]"));
            const sheets = Array.from(el.querySelectorAll<HTMLElement>(moving));
            return sheets.map((sheet, i) => {
              const t = sheet.style.transform;
              const m = /translate3d\(([-\d.]+)px, ([-\d.]+)px, ([-\d.]+)px\)/.exec(t);
              const y = m ? Number(m[2]) : 0;
              const z = m ? Number(m[3]) : 0;
              const first = items[0]?.offsetTop ?? 0;
              return {
                y: Math.round(y),
                z: Math.round(z),
                opacity: Number(getComputedStyle(sheet).opacity).toFixed(2),
                perspective: t.includes("perspective(1200px)"),
                stacked: Math.round(first - (items[i]?.offsetTop ?? 0) + i * 7),
              };
            });
          }, moving);

        // The from-state: on the first, each 7px lower and 20px further back, the rest at 85%.
        await expect
          .poll(
            async () =>
              (await read()).map((s, i) => ({
                atStack: Math.abs(s.y - s.stacked) <= 1,
                z: s.z === -i * 20,
                opacity: s.opacity,
                perspective: s.perspective,
              })),
            { message: "the sheets wait in one stack" },
          )
          .toEqual(
            (await read()).map((_, i) => ({
              atStack: true,
              z: true,
              opacity: i ? "0.85" : "1.00",
              perspective: true,
            })),
          );
        const layout = await list.evaluate((el) =>
          Array.from(el.querySelectorAll<HTMLElement>("[data-deal-item]")).map((i) => i.offsetTop),
        );

        // Watch every frame from here: when each sheet leaves the stack and when it lands.
        await list.evaluate((el, moving) => {
          const sheets = Array.from(el.querySelectorAll<HTMLElement>(moving));
          const start = sheets.map((s) => s.style.transform);
          const watch = {
            left: sheets.map(() => -1),
            landed: sheets.map(() => -1),
            done: false,
          };
          (window as unknown as { unstackWatch: typeof watch }).unstackWatch = watch;
          let frame = 0;
          const tick = () => {
            frame++;
            sheets.forEach((s, i) => {
              const t = s.style.transform;
              const m = /translate3d\(([-\d.]+)px, ([-\d.]+)px, ([-\d.]+)px\)/.exec(t);
              const rest =
                Number(getComputedStyle(s).opacity) > 0.999 &&
                (!m || (Math.abs(Number(m[2])) < 0.5 && Math.abs(Number(m[3])) < 0.5));
              if ((watch.left[i] ?? 0) < 0 && t !== start[i]) watch.left[i] = frame;
              if ((watch.landed[i] ?? 0) < 0 && rest && t !== start[i]) watch.landed[i] = frame;
            });
            watch.done = sheets.every((s) => s.style.transform === "");
            if (!watch.done) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }, moving);
        await place(0.5);
        await expect
          .poll(
            () =>
              page.evaluate(
                () => (window as unknown as { unstackWatch: { done: boolean } }).unstackWatch.done,
              ),
            {
              timeout: 15_000,
              message: "the cascade finishes on its own, by time (MK2)",
            },
          )
          .toBe(true);
        const watch = await page.evaluate(
          () =>
            (window as unknown as { unstackWatch: { left: number[]; landed: number[] } })
              .unstackWatch,
        );
        // The sheets behind the first leave the stack in document order, and land in it too.
        const behindLeft = watch.left.slice(1);
        const behindLanded = watch.landed.slice(1);
        expect(behindLeft.every((f) => f > 0)).toBe(true);
        for (let i = 1; i < behindLeft.length; i++) {
          expect(behindLeft[i]).toBeGreaterThan(behindLeft[i - 1] ?? 0);
          expect(behindLanded[i]).toBeGreaterThan(behindLanded[i - 1] ?? 0);
        }

        // At rest: nothing left on any sheet (MK3), fully opaque, and the list never moved.
        const rest = await list.evaluate((el, moving) => {
          const sheets = Array.from(el.querySelectorAll<HTMLElement>(moving));
          return {
            transforms: sheets.map((s) => s.style.transform + getComputedStyle(s).transform),
            opacity: sheets.map((s) => getComputedStyle(s).opacity),
            layout: Array.from(el.querySelectorAll<HTMLElement>("[data-deal-item]")).map(
              (i) => i.offsetTop,
            ),
          };
        }, moving);
        expect(rest.transforms.every((t) => t === "none")).toBe(true);
        expect(rest.opacity.every((o) => o === "1")).toBe(true);
        expect(rest.layout).toEqual(layout);
      });
    }
  }

  // At rest each pinned stop's pair sits in the middle of the window, not under the header with
  // the rest of the window empty (owner, 28 Nov 2026): desktop, a tall desktop window, and the
  // stacked phone layout. A pair too tall to centre clear of the resting orb rises just enough to
  // stay off it, and one taller than that starts under the header.
  for (const [width, height] of [
    [1440, 900],
    [1440, 1300],
    [1000, 800],
    [560, 1267],
    [390, 844],
  ] as const) {
    test(`at rest each journey stop's pair is centred in a ${width} by ${height} window`, async ({
      browser,
    }) => {
      test.setTimeout(SCENE_SCROLL_BUDGET);
      const page = await openPage(browser, { viewport: { width, height } });
      await liveBeforeScroll(page);
      const stops = page.locator("#journey [data-journey-stop]");
      const count = await stops.count();
      expect(count).toBe(6);
      for (let k = 0; k < count; k++) {
        const stop = stops.nth(k);
        // A stop's section top is where its pair has fully arrived and holds still.
        await stop.evaluate((el) => {
          window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY + 40 });
        });
        await expect(stop).toHaveAttribute("data-enhanced", "true", { timeout: 15_000 });
        await untilStill(page, "#journey :is([data-stop-side], [data-stop-pair])");
        const at = await stop.locator("[data-stop-pair]").evaluate((el) => {
          const r = el.getBoundingClientRect();
          const h = window.innerHeight;
          const header = document.querySelector("header")?.getBoundingClientRect().bottom ?? 0;
          // Where the orb rests (the scene's lane, laneFor in journeyLayout.ts): a band of an
          // eighth of the height and a 38px orb on a phone, else a band of 130px held to 11% to
          // 17% of the height and an orb of half the band, at most 66px.
          const phone = window.innerWidth < 768;
          const band = phone ? h * 0.125 : Math.min(0.17 * h, Math.max(0.11 * h, 130));
          const orbTop = h - band - (phone ? 38 : Math.min(66, band / 2));
          return { top: r.top, bottom: r.bottom, height: r.height, h, header, orbTop };
        });
        const label = `stop ${k + 1} at ${Math.round(at.top)} to ${Math.round(at.bottom)}`;
        // Never under the header.
        expect(at.top, label).toBeGreaterThanOrEqual(at.header + 11);
        const centredTop = at.h / 2 - at.height / 2;
        if (centredTop + at.height <= at.orbTop - 16) {
          // Room to centre it clear of the orb: centred.
          expect(Math.abs(at.top - centredTop), label).toBeLessThan(4);
        } else if (at.height <= at.orbTop - 16 - at.header - 12) {
          // Room above the orb but not centred: as low as it goes, still clear of the orb.
          expect(at.bottom, label).toBeLessThanOrEqual(at.orbTop - 15);
          expect(at.bottom, label).toBeGreaterThan(at.orbTop - 20);
        } else {
          // Taller than the space: it starts just under the header.
          expect(at.top, label).toBeLessThan(at.header + 42);
        }
      }
      await page.context().close();
    });
  }

  test("journey changeovers are never left part-way, scrolling fast both ways (MK2)", async ({
    page,
  }) => {
    test.setTimeout(SCENE_SCROLL_BUDGET);
    await page.goto(HOME);
    // The flick must run through set-up changeovers, and measure the journey with its pins. The
    // hero sets itself up only near the top, so wait for it before leaving.
    await liveBeforeScroll(page);
    const journey = page.locator("#journey");
    await journey.scrollIntoViewIfNeeded();
    await expect(journey.locator("[data-journey-stop]").first()).toHaveAttribute(
      "data-enhanced",
      "true",
      { timeout: 15_000 },
    );
    await journey.scrollIntoViewIfNeeded();
    const box = await journey.boundingBox();
    const span = Math.round(box?.height ?? 3000);
    // Fast down and up twice, as a visitor flicking past would.
    for (const direction of [1, -1, 1, -1, 1]) await scrollInSteps(page, direction * span, 8, 40);
    // Time completes every changeover (leave, beat, arrive is under 3 s at the calm scale): wait
    // until the journey is still, then nothing may be part-way.
    const parts = "h2, p, [data-stop-side], [data-stop-pair]";
    await untilStill(page, `#journey :is(${parts})`);
    const partial = await journey.locator(parts).evaluateAll((els, shownSrc) => {
      const shown = new Function(`return ${shownSrc}`)() as typeof shownInJourney;
      return els
        .map((el) => shown(el).opacity)
        .filter((opacity) => opacity > 0.02 && opacity < 0.98);
    }, shownInJourney.toString());
    expect(partial).toEqual([]);
    // Come to rest at the third stop: it shows whole, nothing in it faded or hidden.
    const third = journey.locator("[data-journey-stop]").nth(2);
    await third.evaluate((el) => {
      const header = document.querySelector("header")?.offsetHeight ?? 0;
      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - header });
    });
    await untilStill(page, `#journey :is(${parts})`);
    const thirdParts = await third
      .locator(parts)
      .evaluateAll(
        (els, shownSrc) =>
          els.map((el) => (new Function(`return ${shownSrc}`)() as typeof shownInJourney)(el)),
        shownInJourney.toString(),
      );
    expect(thirdParts.length).toBeGreaterThan(0);
    for (const part of thirdParts) {
      expect(part.opacity).toBeGreaterThan(0.98);
      expect(part.hidden).toBe(false);
    }
  });

  test("the stop control steps from Features through the journey, focusing each stop's heading shown whole", async ({
    page,
  }) => {
    await page.goto(HOME);
    await expect(page.getByTestId("home-hero")).toHaveAttribute("data-hero-live", "true", {
      timeout: 15_000,
    });
    const control = page.locator("[data-stop-control]");
    const label = control.getByTestId("stop-control-label");
    const next = control.getByRole("button", { name: /^Next section/ });
    const sections = page.locator("[data-home-section]");
    const names = await sections.evaluateAll((els) =>
      els.map((el) => el.getAttribute("data-home-section-name")),
    );
    const features = names.indexOf("Five areas");
    expect(features).toBeGreaterThanOrEqual(0);
    // Reach Features, then wait for the journey to go live as it nears.
    for (let i = 0; i < features; i++) {
      await next.click();
      await expect(label).toContainText(`${i + 2} of`);
    }
    await expect(page.locator("#journey")).toHaveAttribute("data-live", "on", { timeout: 10_000 });
    const stops = page.locator("[data-journey-stop]");
    const count = await stops.count();
    for (let k = 0; k < count; k++) {
      const headingId = await stops.nth(k).getAttribute("aria-labelledby");
      await next.click();
      const heading = page.locator(`[id="${headingId}"]`);
      await expect(heading).toBeFocused();
      // Focus landed on a heading already shown whole, not one still waiting to arrive.
      const shown = await heading.evaluate(
        (el, shownSrc) => (new Function(`return ${shownSrc}`)() as typeof shownInJourney)(el),
        shownInJourney.toString(),
      );
      expect(shown).toEqual({ opacity: 1, hidden: false });
      // Wait for the smooth scroll to settle before the next step.
      await expect
        .poll(async () => Math.round((await stops.nth(k).boundingBox())?.y ?? -1), {
          timeout: 10_000,
        })
        .toBeLessThan(120);
    }
  });

  test("Tab goes from the journey's intro through every stop's link in order, each stop shown whole", async ({
    page,
  }) => {
    await page.goto(HOME);
    const journey = page.locator("#journey");
    await journey.scrollIntoViewIfNeeded();
    await expect(journey).toHaveAttribute("data-live", "on", { timeout: 15_000 });
    const firstStop = journey.locator("[data-journey-stop]").first();
    await expect(firstStop).toHaveAttribute("data-enhanced", "true", { timeout: 15_000 });
    // Start from the intro's heading (the intro has no control of its own since "Reduce motion"
    // moved to the header): focusable for this test only, so Tab continues from there.
    await journey.locator("#journey-title").evaluate((heading) => {
      heading.setAttribute("tabindex", "-1");
      (heading as HTMLElement).focus({ preventScroll: true });
    });
    const count = await journey.locator("[data-journey-stop]").count();
    for (let k = 1; k <= count; k++) {
      await page.keyboard.press("Tab");
      const focused = await page.evaluate(() => {
        const el = document.activeElement;
        return {
          tag: el?.tagName,
          stop: el?.closest<HTMLElement>("[data-journey-stop]")?.dataset.stop,
        };
      });
      expect(focused).toEqual({ tag: "A", stop: String(k) });
      const shown = await page.evaluate(
        (shownSrc) =>
          (new Function(`return ${shownSrc}`)() as typeof shownInJourney)(
            document.activeElement as Element,
          ),
        shownInJourney.toString(),
      );
      expect(shown).toEqual({ opacity: 1, hidden: false });
    }
  });
});

test.describe("marketing home: receding scene", () => {
  // The receding scene at a stop sits halfway between prototype 11's (tint 66% and 22% on Mint,
  // 50% and 14% on Midnight; blur 5px and 4px) and the sharp scene (owner, 28 Nov 2026), so the
  // orbs and the bead track still read as coloured glass behind the cards.
  const RECEDED = {
    light: { blur: "blur(2.5px) saturate(0.95) brightness(1)", strong: 0.33, soft: 0.11 },
    dark: { blur: "blur(2px) saturate(1.25) brightness(1.075)", strong: 0.25, soft: 0.07 },
  } as const;
  for (const theme of THEMES) {
    test(`the receding scene at a stop is halfway between prototype 11's and the sharp scene, ${theme}`, async ({
      browser,
    }) => {
      const page = await openPage(browser, {
        viewport: { width: 1280, height: 900 },
        colorScheme: theme,
      });
      const journey = page.locator("#journey");
      await journey.scrollIntoViewIfNeeded();
      await expect(journey).toHaveAttribute("data-live", "on", { timeout: 15_000 });
      const layers = await journey.locator("[data-journey-scrim]").evaluateAll((els) =>
        els.map((el) => {
          const style = getComputedStyle(el);
          const alphas = [...style.backgroundImage.matchAll(/\/ ([\d.]+)\)/g)].map((m) =>
            Number(m[1]),
          );
          return { filter: style.backdropFilter, strong: alphas[0], soft: alphas[2] };
        }),
      );
      const [blur, tint] = layers;
      expect(blur?.filter).toBe(RECEDED[theme].blur);
      expect(tint?.strong).toBeCloseTo(RECEDED[theme].strong, 3);
      expect(tint?.soft).toBeCloseTo(RECEDED[theme].soft, 3);
      await page.context().close();
    });
  }
});

test.describe("marketing home: page length (MK11)", () => {
  /** The page's length after a full scroll, back at the top, with every pin and band laid out. */
  async function lengthAfterScroll(page: Page): Promise<number> {
    await scrollThrough(page);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);
    return page.evaluate(() => document.documentElement.scrollHeight);
  }

  for (const width of [390, 1440] as const) {
    test(`at ${width}px the page is as long on arrival as after a full scroll`, async ({
      browser,
    }) => {
      test.setTimeout(SCENE_SCROLL_BUDGET);
      const page = await openPage(browser, { viewport: { width, height: 900 } });
      // Once the hero has its pin (from 1024px) and the journey is live, nothing below should
      // change the length while the visitor reads.
      if (width >= 1024) {
        await expect(page.getByTestId("home-hero")).toHaveAttribute("data-hero-live", "true", {
          timeout: 15_000,
        });
      }
      await expect(page.locator("#journey")).toHaveAttribute("data-live", "on", {
        timeout: 15_000,
      });
      await page.waitForTimeout(500);
      const onArrival = await page.evaluate(() => document.documentElement.scrollHeight);
      const after = await lengthAfterScroll(page);
      expect(Math.abs(after - onArrival)).toBeLessThanOrEqual(4);
      await page.context().close();
    });
  }

  test("a device too slow for the scene drops to the still without changing the page's length", async ({
    browser,
  }) => {
    test.setTimeout(SCENE_SCROLL_BUDGET);
    // Every frame about 45 ms late: a steady 20 fps, under the 28 fps floor.
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await context.addInitScript(() => {
      const raf = window.requestAnimationFrame.bind(window);
      const cancelled = new Set<number>();
      let next = 0;
      window.requestAnimationFrame = (callback) => {
        next += 1;
        const id = next;
        window.setTimeout(() => raf((now) => cancelled.has(id) || callback(now)), 45);
        return id;
      };
      window.cancelAnimationFrame = (id) => {
        cancelled.add(id);
      };
    });
    const slow = await context.newPage();
    await slow.goto(HOME);
    // The length with the hero pinned and the journey live: final from here (the arrival test
    // above), whether or not the scene has started yet.
    await expect(slow.getByTestId("home-hero")).toHaveAttribute("data-hero-live", "true", {
      timeout: 15_000,
    });
    await expect(slow.locator("#journey")).toHaveAttribute("data-live", "on", { timeout: 15_000 });
    const stage = slow.getByTestId("journey-stage");
    const before = await slow.evaluate(() => document.documentElement.scrollHeight);
    await slow.locator("#journey").scrollIntoViewIfNeeded();
    await expect(stage).toHaveAttribute("data-still-reason", "slow-frames", { timeout: 20_000 });
    await expect(stage.locator("canvas")).toHaveCount(0);
    // The still orbs are in the sticky stage, at its edges as prototype 11 places them, so they
    // are behind a later stop too: sky at the left, violet top right, teal at the foot, rose
    // bottom right.
    const lastStop = slow.locator("[data-journey-stop]").last();
    await lastStop.scrollIntoViewIfNeeded();
    const orbs = await stage.locator("[data-scene-still] [data-orb-tone]").evaluateAll((els) =>
      els.map((el) => {
        const r = el.getBoundingClientRect();
        return {
          tone: el.getAttribute("data-orb-tone"),
          // Drawn as glass: its gradient body reached the built CSS.
          painted: getComputedStyle(el).backgroundImage.startsWith("radial-gradient"),
          x: (r.left + r.width / 2) / innerWidth,
          y: (r.top + r.height / 2) / innerHeight,
        };
      }),
    );
    const place = Object.fromEntries(
      orbs.map(({ tone, painted, x, y }) => [
        tone,
        { painted, left: x < 0.1, right: x > 0.85, top: y < 0.3, foot: y > 0.75 },
      ]),
    );
    expect(place).toEqual({
      sky: { painted: true, left: true, right: false, top: true, foot: false },
      violet: { painted: true, left: false, right: true, top: true, foot: false },
      teal: { painted: true, left: false, right: false, top: false, foot: true },
      rose: { painted: true, left: false, right: true, top: false, foot: true },
    });
    expect(
      Math.abs((await slow.evaluate(() => document.documentElement.scrollHeight)) - before),
    ).toBeLessThanOrEqual(4);
    await context.close();
  });
});

test.describe("marketing home: no errors", () => {
  // The scene, GSAP and the hero's assembly load only after first paint and as the visitor
  // scrolls, so a load-only check never reaches them. Scroll the whole page at each width, with
  // motion on, and fail on any uncaught error or console error (PR 975: a resize during the
  // scene's shader compile threw before its frame code existed).
  for (const width of [390, 1000, 1440] as const) {
    test(`a full scroll at ${width}px throws nothing and logs no error`, async ({ browser }) => {
      test.setTimeout(SCENE_SCROLL_BUDGET);
      const page = await openPage(browser, { viewport: { width, height: 900 } });
      const problems: string[] = [];
      page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
      page.on("console", (message) => {
        if (message.type() === "error") problems.push(`console: ${message.text()}`);
      });
      await scrollThrough(page);
      // Back up through the journey, so its scene resizes and redraws on the way.
      await page.locator("#journey").scrollIntoViewIfNeeded();
      await page.setViewportSize({ width: width - 40, height: 860 });
      await page.waitForTimeout(1500);
      expect(problems).toEqual([]);
      await page.context().close();
    });
  }
});

test.describe("marketing home: accessibility", () => {
  for (const theme of THEMES) {
    test(`axe finds no violation once every band has arrived, ${theme}`, async ({ browser }) => {
      test.setTimeout(SCENE_SCROLL_BUDGET);
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
