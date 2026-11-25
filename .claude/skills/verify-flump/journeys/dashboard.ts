/**
 * dashboard: sign in through /login, land on the dashboard with the seeded net worth headline,
 * then sign out from the account menu and land on the marketing site.
 * Run: verify-flump drive dashboard   (expects the homeowner persona: net worth £231,400)
 */
import { expect, hydrated, journey, MARKETING_URL, optionalEnv } from "../scripts/lib.ts";

await journey(
  "dashboard",
  async ({ page, step }) => {
    await step("sign in through /login", async () => {
      await page.goto("/login");
      await expect(page).toHaveURL(/\/$/);
      await expect(page.getByRole("heading", { level: 1, name: "Your money" })).toBeVisible();
    });

    await step("net worth headline shows the persona figure once", async () => {
      const hero = page.locator('[data-tone="hero"]').filter({ hasText: "Net worth" });
      await expect(hero).toContainText(optionalEnv("VERIFY_NET_WORTH") ?? "£231,400");
      await expect(page.locator('[data-figure="netWorth"]')).toHaveCount(1);
    });

    await step("sign out from the account menu", async () => {
      await hydrated(page);
      await page.getByRole("button", { name: "Account menu" }).first().click();
      await page.getByRole("menuitem", { name: "Sign out" }).click();
      await expect(page).toHaveURL(new RegExp(`^${MARKETING_URL}/?$`));
    });

    await step("signed out: the app root sends you to the public site", async () => {
      await page.goto("/");
      await expect(page).toHaveURL(new RegExp(`^${MARKETING_URL}/?$`));
    });
  },
  { signedIn: false },
);
