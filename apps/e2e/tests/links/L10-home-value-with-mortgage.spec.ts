import { expect, test } from "@playwright/test";
import { openAddAccount, saveAddAccount } from "../../support/add-account-dialog";
import { AUTH_STATE } from "../../support/auth";
import { backendCall } from "../../support/backend";
import { listAccounts } from "../../support/links-api";
import { applyPersona } from "../../support/personas";

test.use({ storageState: AUTH_STATE });

// L10 (system audit slice 4): a home value typed with a new mortgage on Accounts is saved in one
// step as the home, linked to the mortgage, so the Mortgage page, loan to value and net worth all
// read the same property. Loan to value: 186,000 / 310,000 = 0.6, so 60%. Before slice 4 the
// browser made two calls and nothing said which property the mortgage was on.
test("L10 a home value entered with the mortgage is the linked home", async ({ page }) => {
  await page.goto("/app");
  // The renter persona has no property, so the dialog offers the home value field.
  await applyPersona(page, "renter");
  const dialog = await openAddAccount(page);
  await dialog.getByLabel("Name").fill("L10 mortgage");
  await dialog.getByLabel("Account type").selectOption("Mortgage");
  await dialog.getByLabel("Amount owed").fill("186000");
  await dialog.getByLabel("What your home is worth (optional)").fill("310000");
  await saveAddAccount(dialog);

  const accounts = await listAccounts(page);
  const mortgage = accounts.find((a) => a.name === "L10 mortgage");
  const home = accounts.find((a) => a.type === "Property");
  try {
    expect(home).toMatchObject({ balance: 310000, accountSubtype: "home" });
    expect(mortgage?.linkedAccountId).toBe(home?.id);
    await page.goto("/app/mortgage");
    await expect(page.locator("#mortgage-saved")).toContainText("60%");
  } finally {
    if (mortgage) await backendCall(`/accounts/${mortgage.id}`, "DELETE");
    if (home) await backendCall(`/accounts/${home.id}`, "DELETE");
  }
});
