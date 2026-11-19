import { expect, test } from "@playwright/test";
import { openAddAccount, saveAddAccount } from "../../support/add-account-dialog";
import { AUTH_STATE } from "../../support/auth";
import { backendCall } from "../../support/backend";
import { accountsPageRow, accountsRowOnPage, listAccounts, pageApi } from "../../support/links-api";
import { applyPersona } from "../../support/personas";
import { waitOutRateWindow } from "../../support/rate-window";

test.use({ storageState: AUTH_STATE });

// Named "renter-z1-" so it runs last, after the other renter specs (files run in name order, one
// at a time): the user is already the renter, so it spends no reset on a persona switch.

// L10, L08, L19, L20 and L18 (system audit slice 4) in one sequence on the renter persona, who has no
// property, so the Accounts dialog offers the value field. One persona switch and no deletes:
// account deletes and resets share the backend's "destructive" limit of 10 an hour, and the next
// spec's persona switch clears what this one adds. The link project runs one test at a time.
test("L10 L08 L19 L20 L18 mortgages added on Accounts are what the Mortgage page reads", async ({
  page,
}) => {
  // Many calls follow: start in a fresh minute of the request limits (see waitOutRateWindow).
  await waitOutRateWindow();
  await page.goto("/app");
  await applyPersona(page, "renter");

  // L10: a home value typed with a new mortgage is saved in one step as the home, linked to the
  // mortgage. Loan to value: 186,000 / 310,000 = 0.6, so 60%. Before slice 4 the browser made two
  // calls and nothing said which property the mortgage was on.
  let dialog = await openAddAccount(page);
  await dialog.getByLabel("Name").fill("L10 mortgage");
  await dialog.getByLabel("Account type").selectOption("Mortgage");
  await dialog.getByLabel("Amount owed").fill("186000");
  // A rate and years left, so the Mortgage page shows its saved figures rather than asking for them.
  await dialog.getByLabel("Interest rate (optional)").fill("4.5");
  await dialog.getByLabel("Years left (optional)").fill("25");
  await dialog.getByLabel("What your home is worth (optional)").fill("310000");
  await saveAddAccount(dialog);
  let accounts = await listAccounts(page);
  const l10 = accounts.find((a) => a.name === "L10 mortgage");
  const home = accounts.find((a) => a.type === "Property");
  expect(home).toMatchObject({ balance: 310000, accountSubtype: "home" });
  expect(l10?.linkedAccountId).toBe(home?.id);
  await page.goto("/app/mortgage");
  await expect(page.locator("#mortgage-saved")).toContainText("60%");

  // L08: a mortgage added on Accounts carries the rate, payment, term and repayment type the
  // Mortgage page reads. Before slice 4 the Accounts dialog had no rate, payment or term. (The
  // page opens on the first residential mortgage, L10's, so this one is checked as stored.)
  dialog = await openAddAccount(page);
  await dialog.getByLabel("Name").fill("L08 mortgage");
  await dialog.getByLabel("Account type").selectOption("Mortgage");
  await dialog.getByLabel("Amount owed").fill("120000");
  await dialog.getByLabel("Interest rate (optional)").fill("4.5");
  await dialog.getByLabel("Monthly payment (optional)").fill("700");
  await dialog.getByLabel("How it is repaid (optional)").selectOption("repayment");
  await dialog.getByLabel("Years left (optional)").fill("20");
  await saveAddAccount(dialog);
  accounts = await listAccounts(page);
  expect(accounts.find((a) => a.name === "L08 mortgage")).toMatchObject({
    balance: -120000,
    interestRate: 4.5,
    monthlyContribution: 700,
    termMonths: 240,
    repaymentType: "repayment",
  });

  // L19 and L20 (HM-4, DB-1, decision 4 A): a buy-to-let mortgage added with the rental's value
  // stores the value once, as a rental linked to the mortgage, and the Mortgage page's buy-to-let
  // tab shows the account. Before slice 4 the tab read the profile and asked again.
  dialog = await openAddAccount(page);
  await dialog.getByLabel("Name").fill("L19 BTL mortgage");
  await dialog.getByLabel("Account type").selectOption("Mortgage");
  await dialog.getByLabel("Kind of mortgage (optional)").selectOption("btl_mortgage");
  await dialog.getByLabel("Amount owed").fill("150000");
  await dialog.getByLabel("Interest rate (optional)").fill("5");
  await dialog.getByLabel("How it is repaid (optional)").selectOption("interest-only");
  await dialog.getByLabel("What the property is worth (optional)").fill("235000");
  await saveAddAccount(dialog);
  accounts = await listAccounts(page);
  const btl = accounts.find((a) => a.name === "L19 BTL mortgage");
  const rental = accounts.find((a) => a.type === "Property" && a.accountSubtype === "rental");
  expect(rental?.balance).toBe(235000);
  expect(btl?.linkedAccountId).toBe(rental?.id);
  await page.goto("/app/mortgage");
  const saved = page.locator("#mortgage-saved");
  await expect(saved).not.toContainText("£150,000");
  await page.getByRole("tab", { name: "Buy to let" }).click();
  await expect(saved).toContainText("£150,000");

  // L18 as decision 14 option B restates it: a property and its mortgage are linked; the
  // mortgage's share is copied to the property when the pair is set up, and either may then differ
  // (unequal owners with a joint mortgage). Before slice 4 there was no link, and a mortgage's share
  // overwrote its property's.
  const pair = await backendCall<{ mortgage: { id: string }; property: { id: string } }>(
    "/accounts/mortgage-with-property",
    "POST",
    {
      mortgage: { name: "L18 mortgage", balance: 100000, ownership: "joint", sharePercent: 40 },
      property: { name: "L18 home", balance: 200000 },
    },
  );
  accounts = await listAccounts(page);
  const pairProperty = () => accounts.find((a) => a.id === pair.property.id);
  const pairMortgage = () => accounts.find((a) => a.id === pair.mortgage.id);
  expect(pairMortgage()?.linkedAccountId).toBe(pair.property.id);
  expect(pairProperty()).toMatchObject({ ownership: "joint", sharePercent: 40 });
  await expect(await accountsPageRow(page, "L18 home")).toContainText("Joint, 40%");
  await expect(await accountsRowOnPage(page, "L18 mortgage")).toContainText("Joint, 40%");
  await pageApi(page, `/accounts/${pair.mortgage.id}`, "PATCH", { sharePercent: 50 });
  accounts = await listAccounts(page);
  expect(pairMortgage()?.sharePercent).toBe(50);
  expect(pairProperty()?.sharePercent).toBe(40);
  await expect(await accountsPageRow(page, "L18 mortgage")).toContainText("Joint, 50%");
  await expect(await accountsRowOnPage(page, "L18 home")).toContainText("Joint, 40%");
});
