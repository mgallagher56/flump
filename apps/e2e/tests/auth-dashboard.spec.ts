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
    // Seeded: £15,000 of assets (current plus savings) against a £200,000 mortgage, en-GB.
    await expect(netWorth).toContainText("£15,000");
    await expect(netWorth).toContainText("£200,000");
    await expect(netWorth).toContainText("-£185,000");
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
