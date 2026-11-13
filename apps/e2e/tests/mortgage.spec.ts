import { expect, test } from "@playwright/test";
import { AUTH_STATE } from "../support/auth";

test.use({ storageState: AUTH_STATE });

test("the hero sits on the saved balance, and the overpayment outcome is a plain card", async ({
  page,
}) => {
  await page.goto("/app/mortgage");
  // Balance and rate come from the seeded mortgage account; the term is never stored.
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByLabel("Remaining term (years)").fill("25");
  await page.getByRole("button", { name: /^Save/ }).click();
  await page.getByRole("tab", { name: "Overpayment simulator" }).click();

  // The page's single hero surface is the saved balance, never a scenario outcome.
  const hero = page.locator('[data-tone="hero"]');
  await expect(hero).toHaveCount(1);
  await expect(hero).toContainText("Remaining balance");
  await expect(page.getByText("Time shaved off", { exact: true })).toBeVisible();
  await expect(page.getByText("Interest saved", { exact: true })).toBeVisible();
  await expect(page.getByText("Illustration, not saved")).toBeVisible();
});
