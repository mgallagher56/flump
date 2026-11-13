import { expect, test } from "@playwright/test";
import { AUTH_STATE } from "../support/auth";

test.use({ storageState: AUTH_STATE });

test("the overpayment simulator tab renders with the hero on 'Time shaved off'", async ({
  page,
}) => {
  await page.goto("/app/mortgage");
  // Balance and rate come from the seeded mortgage account; the term is never stored.
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByLabel("Remaining term (years)").fill("25");
  await page.getByRole("button", { name: /^Save/ }).click();
  await page.getByRole("tab", { name: "Overpayment simulator" }).click();

  const timeShaved = page.locator('[data-tone="hero"]').filter({ hasText: "Time shaved off" });
  await expect(timeShaved).toBeVisible();
  await expect(page.getByText("Interest saved", { exact: true })).toBeVisible();
});
