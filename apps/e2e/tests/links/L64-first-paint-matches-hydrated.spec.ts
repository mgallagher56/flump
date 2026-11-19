import { expect, type Page, test } from "@playwright/test";
import { AUTH_STATE } from "../../support/auth";
import { waitForHydration } from "../../support/page";
import { applyPersona } from "../../support/personas";
import { api } from "./budget-links.helpers";

test.use({ storageState: AUTH_STATE });

/** The primary bar's top-level items and whether the setup checklist shows. */
async function firstView(page: Page) {
  const nav = page.locator("header").first().locator('nav[aria-label="Primary"]');
  return {
    nav: (await nav.locator(":scope > ul > li").allTextContents()).map((t) => t.trim()),
    checklist: await page.getByTestId("setup-checklist").count(),
  };
}

// L64 (CS-2, CS-4, decision 13, audit slice 8): the server's first paint and the hydrated page
// show the same navigation and the same setup checklist state, with no hydration error. The
// navigation is drawn from the root loader's profile and the checklist's dismissed flag is saved
// on the profile, so neither depends on browser state.
test("L64 the first paint and the hydrated Dashboard show the same pages and checklist", async ({
  page,
  browser,
}) => {
  await page.goto("/app");
  await applyPersona(page, "homeowner");

  try {
    // Not the default set: no Debt, no Savings or Pension, and Self Assessment chosen. And the
    // checklist closed, which before lived only in browser storage.
    await api(page, "/user-profile", "PATCH", { enabledPages: ["accounts", "budget", "tax"] });
    await api(page, "/user-profile/checklist", "PATCH", { dismissed: true });

    // The server's markup alone: a page with scripts off never hydrates.
    const serverOnly = await browser.newContext({
      storageState: AUTH_STATE,
      javaScriptEnabled: false,
    });
    const serverPage = await serverOnly.newPage();
    await serverPage.goto("/app");
    const server = await firstView(serverPage);
    await serverOnly.close();

    const hydrationErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error" && /hydrat|#418|#423|did not match/i.test(message.text())) {
        hydrationErrors.push(message.text());
      }
    });
    await page.goto("/app");
    await waitForHydration(page);

    expect(server.nav).not.toContain("Savings and pension");
    expect(server.checklist).toBe(0);
    // Effects run just after hydration; anything that changed the view would show here.
    await expect.poll(() => firstView(page)).toEqual(server);
    expect(hydrationErrors).toEqual([]);
  } finally {
    await api(page, "/user-profile/checklist", "PATCH", { dismissed: false });
    await api(page, "/user-profile", "PATCH", {
      enabledPages: ["accounts", "budget", "savings", "debt", "pension", "mortgage"],
    });
  }
});
