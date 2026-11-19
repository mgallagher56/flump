import { expect, type Locator, type Page } from "@playwright/test";
import { waitForHydration } from "./page";

/** Opens the Accounts page's Add account dialog, after hydration. */
export async function openAddAccount(page: Page): Promise<Locator> {
  await page.goto("/app/accounts");
  await waitForHydration(page);
  await page.getByRole("button", { name: "Add account", exact: true }).first().click();
  const dialog = page.getByRole("dialog", { name: "Add account" });
  await expect(dialog).toBeVisible();
  return dialog;
}

/** Saves the Add account dialog and waits for it to close. */
export async function saveAddAccount(dialog: Locator): Promise<void> {
  await dialog.getByRole("button", { name: "Add account", exact: true }).click();
  await expect(dialog).toBeHidden();
}
