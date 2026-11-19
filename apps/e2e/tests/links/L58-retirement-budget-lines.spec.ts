import { expect, test } from "@playwright/test";
import { AUTH_STATE } from "../../support/auth";
import { applyPersona } from "../../support/personas";

test.use({ storageState: AUTH_STATE });

// L58 (PP-6): the Retirement page reads the saved budget rows, so "From budget lines" lists them
// with no retyping. Read only: nothing is changed, so nothing needs putting back.
test("L58 Retirement lists the saved budget lines under From budget lines", async ({ page }) => {
  await page.goto("/app");
  await applyPersona(page, "homeowner");

  // Retirement is a friends-beta page; the e2e backend lets the dev user in
  // (RETIREMENT_ALLOWED_USER_IDS in playwright.config.ts).
  await page.goto("/app/retirement");
  const details = page.locator("#retirement-plan-details");
  await details.getByRole("button", { name: "From budget lines" }).click();
  await expect(details.getByText("No spending lines other than housing saved yet.")).toHaveCount(0);
  // Two of the homeowner persona's non-housing rows, with their saved amounts.
  await expect(details.getByText("Groceries", { exact: true })).toBeVisible();
  await expect(details.getByText("£520 / monthly")).toBeVisible();
  await expect(details.getByText("Council tax", { exact: true })).toBeVisible();
});
