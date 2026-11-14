import { expect, test } from "@playwright/test";
import { AUTH_STATE } from "../support/auth";

test.use({ storageState: AUTH_STATE });

test("a complete mortgage shows the saved monthly payment as the hero and a plain scenario outcome", async ({
  page,
}) => {
  await page.goto("/app/mortgage");
  // The homeowner persona stores balance, rate and term on the mortgage account, so the page asks
  // for nothing.
  await expect(page.getByRole("heading", { name: /^Add your years left/ })).toHaveCount(0);

  // The page's single hero surface is the saved monthly payment (a saved fact, ruling D2), never a
  // scenario outcome; the balance sits in the strip below it.
  const hero = page.locator('[data-tone="hero"]');
  await expect(hero).toHaveCount(1);
  await expect(hero).toContainText("Monthly payment");
  await expect(hero).toContainText("£1,250");
  await expect(hero).toContainText("Fixed until");
  await expect(page.locator("#mortgage-saved")).toContainText("£186,000");

  await expect(page.getByRole("region", { name: "Model a change to your mortgage" })).toBeVisible();
  await page.getByRole("tab", { name: "Overpay", exact: true }).click();
  // At £0 the tool shows one prompt and no figures.
  await expect(page.getByText("Move the slider to see what changes")).toBeVisible();
  await expect(page.getByText("Illustration, not saved")).toBeVisible();
});
