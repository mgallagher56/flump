import { expect, test } from "@playwright/test";
import { AUTH_STATE } from "../support/auth";

test.use({ storageState: AUTH_STATE });

test("a missing term shows one prompt; once saved, the hero is the monthly payment and the outcome is plain", async ({
  page,
}) => {
  await page.goto("/app/mortgage");
  // Balance and rate come from the seeded mortgage account; the term is never stored, so the page
  // shows one prompt and no scenario zone.
  await expect(page.getByRole("heading", { name: /^Add your years left/ })).toBeVisible();
  await expect(page.getByRole("region", { name: "Model a change to your mortgage" })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "Add mortgage details" }).click();
  await page.getByLabel("Years left", { exact: true }).fill("25");
  await page.getByRole("button", { name: "Save", exact: true }).click();

  // The page's single hero surface is the saved monthly payment, never a scenario outcome.
  const hero = page.locator('[data-tone="hero"]');
  await expect(hero).toHaveCount(1);
  await expect(hero).toContainText("Monthly payment");
  await page.getByRole("tab", { name: "Overpay", exact: true }).click();
  await expect(page.getByText("Paid off sooner by", { exact: true })).toBeVisible();
  await expect(page.getByText("Less interest in total (estimate)", { exact: true })).toBeVisible();
  await expect(page.getByText("Illustration, not saved")).toBeVisible();
});
