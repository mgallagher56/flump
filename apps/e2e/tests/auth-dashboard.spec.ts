import { expect, test } from "@playwright/test";
import { AUTH_STATE } from "../support/auth";
import { MARKETING_URL } from "../support/env";

test.describe("sign in and out", () => {
  test("signing in lands on the dashboard with the net worth headline", async ({ page }) => {
    // Signed out with no stored session: the real /login route starts the (test-only) session.
    await page.goto("/login");
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { name: "Your money" })).toBeVisible();

    const netWorth = page.locator('[data-tone="hero"]').filter({ hasText: "Net worth" });
    await expect(netWorth).toBeVisible();
    // Seeded homeowner persona: £427,000 of assets against £195,600 of debts. The hero shows net worth only, and
    // net worth appears once on the page (E16 P6).
    await expect(netWorth).toContainText("£231,400");
    await expect(page.locator('[data-figure="netWorth"]')).toHaveCount(1);
  });

  test.describe("when signed in", () => {
    test.use({ storageState: AUTH_STATE });

    test("logging out returns to the public marketing page", async ({ page }) => {
      await page.goto("/");
      // Sign out lives in the account menu (T-IA-6): open it, then pick the menu item.
      await page.getByRole("button", { name: "Account menu" }).first().click();
      await page.getByRole("menuitem", { name: "Sign out" }).click();
      await expect(page).toHaveURL(new RegExp(`^${MARKETING_URL}/?$`));
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

      // The session is really gone: the app root sends a signed-out visitor to the public site.
      await page.goto("/");
      await expect(page).toHaveURL(new RegExp(`^${MARKETING_URL}/?$`));
    });
  });
});
