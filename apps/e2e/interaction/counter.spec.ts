import { type Browser, expect, test } from "@playwright/test";
import { Actor } from "./actor";
import { InteractionCounter } from "./counter";
import type { FlowCost, RunMode } from "./report";

/**
 * The counting fixture tested on a tiny page whose costs are worked out by hand (AGENTS.md 14).
 * It needs no app: the page is served by `page.route`.
 *
 * The page, in DOM (and so Tab) order:
 *   1. button "Open"   shows the dialog
 *   2. input  "Name"   starts as "ab"
 *   3. select "Category" with options Food, Fuel, Home (Food selected)
 *   4. button "Go"     history.pushState to /second (a route change)
 *   5. dialog "Box"    hidden at first, holding button "Close", which hides it and focuses "Open"
 *
 * The same script runs in every mode: open the dialog, close it, replace "ab" with "xyz", press
 * Enter, pick "Home", press Go.
 */
const FIXTURE_URL = "http://interaction-fixture.test/";
const FIXTURE = `<!doctype html><html lang="en-GB"><head><title>Fixture</title></head><body>
<button id="open">Open</button>
<input id="name" aria-label="Name" value="ab">
<select id="cat" aria-label="Category"><option>Food</option><option>Fuel</option><option>Home</option></select>
<button id="go">Go</button>
<div role="dialog" id="box" aria-label="Box" hidden><button id="close">Close</button></div>
<script>
  const box = document.getElementById("box");
  document.getElementById("open").onclick = () => { box.hidden = false; };
  document.getElementById("close").onclick = () => {
    box.hidden = true;
    document.getElementById("open").focus();
  };
  document.getElementById("go").onclick = () => history.pushState({}, "", "/second");
</script></body></html>`;

async function runScript(browser: Browser, mode: RunMode): Promise<FlowCost> {
  const context = await browser.newContext(
    mode === "phone-touch"
      ? { viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true }
      : { viewport: { width: 1280, height: 800 } },
  );
  try {
    const page = await context.newPage();
    await page.route(`${FIXTURE_URL}**`, (route) =>
      route.fulfill({ body: FIXTURE, contentType: "text/html" }),
    );
    const counter = await InteractionCounter.attach(page);
    await page.goto(FIXTURE_URL);
    const actor = new Actor(page, mode, counter);
    const box = page.getByRole("dialog", { name: "Box" });

    await counter.start();
    await actor.press(page.getByRole("button", { name: "Open" }));
    await expect(box).toBeVisible();
    await actor.press(box.getByRole("button", { name: "Close" }));
    await expect(box).toBeHidden();
    const name = page.getByRole("textbox", { name: "Name" });
    await actor.type(name, "xyz");
    await expect(name).toHaveValue("xyz");
    await actor.key("Enter");
    const category = page.getByRole("combobox", { name: "Category" });
    await actor.choose(category, "Home");
    await expect(category).toHaveValue("Home");
    await actor.press(page.getByRole("button", { name: "Go" }));
    await expect(page).toHaveURL(/\/second$/);
    return await counter.stop();
  } finally {
    await context.close();
  }
}

test.describe("interaction counter", () => {
  test("mouse: counts each click, select-all chord, typed key and transition", async ({
    browser,
  }) => {
    // Clicks: Open 1, Close 2, the Name field 3, the select 4, picking Home 5 (synthetic: the
    //   option list is the browser's own), Go 6. So 6, of which 1 synthetic.
    // Keystrokes: "ab" is not empty, so Ctrl/Cmd+A first: 2 keydowns (modifier, a); "xyz" 3;
    //   Enter 1. So 2 + 3 + 1 = 6.
    // Tab hops: none with a mouse.
    // Transitions: Go changes the path / to /second, 1 route change; the dialog opens once and
    //   closes once. Transitions = 1 route + 1 dialog open = 2.
    expect(await runScript(browser, "desktop-pointer")).toEqual({
      clicks: 6,
      keystrokes: 6,
      tabHops: 0,
      routeChanges: 1,
      dialogOpens: 1,
      dialogCloses: 1,
      transitions: 2,
      syntheticClicks: 1,
    });
  });

  test("touch: taps count as clicks, the same totals as the mouse", async ({ browser }) => {
    // Every click above becomes a tap (a touch pointerdown); the keys are the same. So the same
    // numbers: 6 taps (1 synthetic), 6 keystrokes, 2 transitions.
    expect(await runScript(browser, "phone-touch")).toEqual({
      clicks: 6,
      keystrokes: 6,
      tabHops: 0,
      routeChanges: 1,
      dialogOpens: 1,
      dialogCloses: 1,
      transitions: 2,
      syntheticClicks: 1,
    });
  });

  test("keyboard: counts each Tab hop, and no clicks", async ({ browser }) => {
    // Focus starts on the page body.
    // Open:     Tab to Open (hop 1), Enter.                                  hops 1, keys 2
    // Close:    from Open, Tab to Name (2), Category (3), Go (4), Close (5); Enter. Close puts
    //           focus back on Open.                                          hops 5, keys 7
    // Name:     Tab to Name (6). Tabbing in selects "ab", so no Ctrl+A; type "xyz" (3).
    //                                                                        hops 6, keys 11
    // Enter:    1.                                                           hops 6, keys 12
    // Category: Tab to Category (7); type-ahead "H" (the only option starting with h) (1).
    //                                                                        hops 7, keys 14
    // Go:       Tab to Go (8), Enter.                                        hops 8, keys 16
    // Transitions as with the mouse: 1 route change + 1 dialog open = 2.
    expect(await runScript(browser, "desktop-keyboard")).toEqual({
      clicks: 0,
      keystrokes: 16,
      tabHops: 8,
      routeChanges: 1,
      dialogOpens: 1,
      dialogCloses: 1,
      transitions: 2,
      syntheticClicks: 0,
    });
  });

  test("nothing is counted before start()", async ({ browser }) => {
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      await page.route(`${FIXTURE_URL}**`, (route) =>
        route.fulfill({ body: FIXTURE, contentType: "text/html" }),
      );
      const counter = await InteractionCounter.attach(page);
      await page.goto(FIXTURE_URL);
      // One click and one dialog open before counting starts.
      await page.getByRole("button", { name: "Open" }).click();
      await expect(page.getByRole("dialog", { name: "Box" })).toBeVisible();
      await counter.start();
      // Counted: the Close click (1) and the dialog closing (1). The open happened before start.
      await page.getByRole("button", { name: "Close" }).click();
      await expect(page.getByRole("dialog", { name: "Box" })).toBeHidden();
      expect(await counter.stop()).toMatchObject({
        clicks: 1,
        keystrokes: 0,
        dialogOpens: 0,
        dialogCloses: 1,
        transitions: 0,
      });
    } finally {
      await context.close();
    }
  });
});
