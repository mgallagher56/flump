import { expect, type Page, test } from "@playwright/test";
import { AUTH_STATE } from "../../support/auth";
import { linkSpecHeaders } from "../../support/client-address";
import { waitForHydration } from "../../support/page";
import { applyPersona } from "../../support/personas";
import { api, pounds } from "./budget-links.helpers";

// Its own client address, so the per-address ceiling counts this file alone (client-address.ts).
test.use({ storageState: AUTH_STATE, extraHTTPHeaders: linkSpecHeaders(import.meta.filename) });

const CONFLICT = "We did not save this because it was changed somewhere else";

/** Presses Enter in a Settings field and returns the profile save it sends. */
async function saveField(page: Page, label: string | RegExp, value: string) {
  const field = page.getByLabel(label);
  await field.fill(value);
  const [response] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().endsWith("/api/user-profile") && r.request().method() === "PATCH",
    ),
    field.press("Enter"),
  ]);
  return response;
}

// L63 (CS-5, audit slice 8): after a save, this page and the next show the saved value with no
// manual reload, and two saves in a row never read as a change made somewhere else. The profile
// comes from loader data only, and each save reloads it.
test("L63 a save shows on this page and the next, and a second save never conflicts", async ({
  page,
}) => {
  // Homeowner, as the specs before this one left it: no persona switch and no reset here.
  await page.goto("/app");
  await applyPersona(page, "homeowner");

  try {
    await page.goto("/app/profile");
    await waitForHydration(page);

    // Two saves one after the other on the same page: the second sends the version the first
    // returned, so neither is refused.
    expect((await saveField(page, "Yearly salary before tax", "64000")).status()).toBe(200);
    expect((await saveField(page, /Your pension contribution/, "9")).status()).toBe(200);
    await expect(page.getByText(CONFLICT)).toHaveCount(0);

    // The next page, reached in the app (no page load), shows the saved salary's take-home.
    await page.evaluate(() => {
      (window as unknown as { l63NoReload?: boolean }).l63NoReload = true;
    });
    const nav = page.locator("header").first().locator('nav[aria-label="Primary"]');
    await nav.getByRole("link", { name: /^(Pay|Take-home pay)$/ }).click();
    await expect(page).toHaveURL(/\/app\/take-home$/);
    const inApp = pounds(await page.getByTestId("hero-figure").textContent());
    expect(
      await page.evaluate(() => (window as unknown as { l63NoReload?: boolean }).l63NoReload),
    ).toBe(true);

    // The same figure a fresh page load shows, so nothing on screen was out of date.
    await page.reload();
    expect(pounds(await page.getByTestId("hero-figure").textContent())).toBe(inApp);
  } finally {
    await api(page, "/user-profile", "PATCH", { annualSalary: 58000, pensionPercent: 8 });
  }
});
