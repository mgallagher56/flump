import { expect, test } from "@playwright/test";
import { AUTH_STATE } from "../support/auth";

test.use({ storageState: AUTH_STATE });

test("a complete mortgage shows the saved balance as the hero and a plain scenario outcome", async ({
  page,
}) => {
  await page.goto("/app/mortgage");
  // The homeowner persona stores balance, rate and term on the mortgage account, so the page asks
  // for nothing.
  await expect(page.getByRole("heading", { name: /^Add your years left/ })).toHaveCount(0);

  // The page's single hero surface is the saved balance, never a scenario outcome.
  const hero = page.locator('[data-tone="hero"]');
  await expect(hero).toHaveCount(1);
  await expect(hero).toContainText("Remaining balance");
  await expect(hero).toContainText("£186,000");
  await expect(page.getByText("Paid off by", { exact: true })).toBeVisible();

  await expect(page.getByRole("region", { name: "Model a change to your mortgage" })).toBeVisible();
  await page.getByRole("tab", { name: "Overpay", exact: true }).click();
  await expect(page.getByText("Paid off sooner by", { exact: true })).toBeVisible();
  await expect(page.getByText("Less interest in total (estimate)", { exact: true })).toBeVisible();
  await expect(page.getByText("Illustration, not saved")).toBeVisible();
});
