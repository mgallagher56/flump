import { expect, test } from "@playwright/test";
import { openAddAccount, saveAddAccount } from "../../support/add-account-dialog";
import { AUTH_STATE } from "../../support/auth";
import { backendCall } from "../../support/backend";
import { type LinkAccount, listAccounts, pageApi } from "../../support/links-api";
import { applyPersona } from "../../support/personas";

test.use({ storageState: AUTH_STATE });

// L19 and L20 (HM-4, DB-1, decision 4 A): a buy-to-let mortgage added on Accounts, with the
// rental's value, is what the Mortgage page's buy-to-let tab shows, and the value has one store:
// a rental Property account linked to the mortgage. Before slice 4 the tab read the profile and
// asked for the balance again, and a buy-to-let value was never stored as an account.
// The Mortgage page shows its Residential and Buy to let tabs only to someone with both kinds, so
// the renter is given a residential mortgage too (removed afterwards), and the test opens the
// Buy to let tab itself.
test("L19 L20 a buy-to-let mortgage and its rental from Accounts show on the Mortgage page", async ({
  page,
}) => {
  await page.goto("/app");
  await applyPersona(page, "renter");
  const residential = await pageApi<{ id: string }>(page, "/accounts", "POST", {
    name: "L19 home mortgage",
    type: "Mortgage",
    accountSubtype: "residential_mortgage",
    balance: 90000,
    interestRate: 4,
    termMonths: 240,
  });
  let mortgage: LinkAccount | undefined;
  let rental: LinkAccount | undefined;
  try {
    const dialog = await openAddAccount(page);
    await dialog.getByLabel("Name").fill("L19 BTL mortgage");
    await dialog.getByLabel("Account type").selectOption("Mortgage");
    await dialog.getByLabel("Kind of mortgage (optional)").selectOption("btl_mortgage");
    await dialog.getByLabel("Amount owed").fill("150000");
    await dialog.getByLabel("Interest rate (optional)").fill("5");
    await dialog.getByLabel("How it is repaid (optional)").selectOption("interest-only");
    await dialog.getByLabel("What the property is worth (optional)").fill("235000");
    await saveAddAccount(dialog);

    const accounts = await listAccounts(page);
    mortgage = accounts.find((a) => a.name === "L19 BTL mortgage");
    rental = accounts.find((a) => a.type === "Property" && a.accountSubtype === "rental");
    // L20: one store for the rental's value, linked to its mortgage.
    expect(rental?.balance).toBe(235000);
    expect(mortgage?.linkedAccountId).toBe(rental?.id);
    // L19: the buy-to-let tab reads the account.
    await page.goto("/app/mortgage");
    const saved = page.locator("#mortgage-saved");
    // The page opens on the residential mortgage.
    await expect(saved).toContainText("£90,000");
    await expect(saved).not.toContainText("£150,000");
    await page.getByRole("tab", { name: "Buy to let" }).click();
    await expect(saved).toContainText("£150,000");
  } finally {
    if (mortgage) await backendCall(`/accounts/${mortgage.id}`, "DELETE");
    if (rental) await backendCall(`/accounts/${rental.id}`, "DELETE");
    await backendCall(`/accounts/${residential.id}`, "DELETE");
  }
});
