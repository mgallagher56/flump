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
        const firstCta = await hero.getByRole("link", { name: "Request an invite" }).boundingBox();
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
    // Nothing ambient moves, so there is no control to stop it.
    await expect(page.getByRole("button", { name: /^(Pause|Play) animation$/ })).toHaveCount(0);
    await page.close();
  });
});

test.describe("marketing home: controls", () => {
  test("the pause control stops the ambient motion and is reachable by keyboard (MK14)", async ({
    page,
  }) => {
    await page.goto(HOME);
    // Beside the section control at the bottom left.
    const pause = page
      .locator("[data-stop-control]")
      .getByRole("button", { name: "Pause animation" });
    await expect(pause).toBeEnabled();
    await pause.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("html")).toHaveAttribute("data-ambient", "paused");
    // The bubbles' scroll-linked drift is switched off while paused.
    const states = await page
      .locator("[data-bubble-field] span")
      .evaluateAll((els) => els.map((el) => getComputedStyle(el).animationName));
    expect(states.length).toBeGreaterThan(0);
    expect(new Set(states)).toEqual(new Set(["none"]));
    // Every control on the page shows the same state.
    await expect(page.getByRole("button", { name: "Play animation" })).toHaveCount(2);
    // An entrance still to play shows at once: the rough figures steps are fully opaque the moment
    // their band is in view, and stay so after "Play animation".
    await page.locator("#rough-figures").scrollIntoViewIfNeeded();
    const opacities = await page
      .locator("#rough-figures [data-step]")
      .evaluateAll((els) => els.map((el) => getComputedStyle(el).opacity));
    expect(opacities).toEqual(["1", "1", "1"]);
    await page
      .locator("[data-stop-control]")
      .getByRole("button", { name: "Play animation" })
      .click();
    await expect(page.locator("html")).not.toHaveAttribute("data-ambient", "paused");
    await page.waitForTimeout(300);
    expect(
      await page
        .locator("#rough-figures [data-step]")
        .evaluateAll((els) => els.map((el) => getComputedStyle(el).opacity)),
    ).toEqual(["1", "1", "1"]);
  });

  test("on a 390px phone the dock's controls are whole 44px targets, the pause control an icon button named Pause animation", async ({
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
    const pause = dock.getByRole("button", { name: "Pause animation" });
    await expect(pause).toBeVisible();
    const boxes = await dock.locator("button").evaluateAll((els) =>
      els.map((el) => {
        const r = el.getBoundingClientRect();
        return { w: Math.round(r.width), h: Math.round(r.height) };
      }),
    );
    expect(boxes).toEqual([
      { w: 44, h: 44 },
      { w: 44, h: 44 },
      { w: 44, h: 44 },
    ]);
    // The count is never clipped, and the two pills sit side by side without touching.
    const fit = await page.evaluate(() => {
      const count = document.querySelector<HTMLElement>("[data-testid=stop-control-label]");
      const nav = document.querySelector("[data-stop-control] nav")?.getBoundingClientRect();
      const motion = document
        .querySelector("[data-stop-control] [data-motion-control]")
        ?.getBoundingClientRect();
      return {
        clipped: count ? count.scrollWidth > count.clientWidth : true,
        apart: nav && motion ? motion.left >= nav.right || motion.top >= nav.bottom : false,
        inside: motion ? motion.right <= window.innerWidth : false,
      };
    });
    expect(fit).toEqual({ clipped: false, apart: true, inside: true });
    // The words are gone from sight but are still the button's name and text.
    await expect(pause).toHaveText("Pause animation");
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
    const parts = "h2, p, [data-stop-side], [data-stop-pair]";
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
    await page.waitForTimeout(4000);
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
    await journey.locator("[data-journey-intro] button").first().focus();
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
