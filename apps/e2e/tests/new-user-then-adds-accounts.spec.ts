import { expect, test } from "@playwright/test";
import { openAddAccount, saveAddAccount } from "../support/add-account-dialog";
import { AUTH_STATE } from "../support/auth";
import { waitForHydration } from "../support/page";
import { paceReads } from "../support/read-budget";

/**
 * The new user adds more accounts (E11): a savings account and a credit card through the Add
 * account dialog, and the Dashboard's net worth counts both.
 *
 * Runs in the `new-user` project straight after new-user-journey.spec.ts (one worker, files in
 * name order: "journey" sorts before "then", playwright.config.ts), on the state the journey left:
 * one account, "Everyday account" with £1,250, and its budget entries. The same dev user as the
 * journey, signed in with the session global setup saved. Nothing runs after this project, so
 * the accounts are left in place: no delete, no reset.
 */
test.use({ storageState: AUTH_STATE });

const EVERYDAY = { name: "Everyday account", balance: 1250, shown: "£1,250" };
const SAVINGS = { name: "Rainy day saver", type: "Saving", balance: "5,000", shown: "£5,000" };
const CARD = { name: "Shopping card", type: "Credit Card", owed: "300", shown: "£300" };
// Net worth: what you own less what you owe.
//   own: Everyday account 1,250 + Rainy day saver 5,000 = 6,250
//   owe: Shopping card 300
//   net worth: 6,250 - 300 = 5,950
const NET_WORTH = "£5,950";

test("a new user adds a savings account and a credit card, and net worth counts both", async ({
  page,
}) => {
  // Wait for the next read window if this one is nearly spent (read-budget.ts).
  await paceReads();
  await test.step("the journey's account is there", async () => {
    await page.goto("/app/accounts");
    await waitForHydration(page);
    const owned = page.getByRole("list", { name: "What you own" });
    await expect(owned.getByRole("listitem").filter({ hasText: EVERYDAY.name })).toContainText(
      EVERYDAY.shown,
    );
  });

  await test.step("add a savings account", async () => {
    const dialog = await openAddAccount(page);
    await dialog.getByRole("textbox", { name: "Name" }).fill(SAVINGS.name);
    await dialog.getByRole("combobox", { name: "Account type" }).selectOption(SAVINGS.type);
    await dialog.getByRole("textbox", { name: "Balance" }).fill(SAVINGS.balance);
    await saveAddAccount(dialog);
  });

  await test.step("add a credit card", async () => {
    const dialog = await openAddAccount(page);
    await dialog.getByRole("textbox", { name: "Name" }).fill(CARD.name);
    await dialog.getByRole("combobox", { name: "Account type" }).selectOption(CARD.type);
    // A debt asks for the amount owed, as a positive figure.
    await dialog.getByRole("textbox", { name: "Amount owed" }).fill(CARD.owed);
    await saveAddAccount(dialog);
  });

  await test.step("both show on Accounts, in their groups", async () => {
    await page.goto("/app/accounts");
    await waitForHydration(page);
    const owned = page.getByRole("list", { name: "What you own" });
    const savings = owned.getByRole("listitem").filter({ hasText: SAVINGS.name });
    await expect(savings).toContainText("Savings");
    await expect(savings).toContainText(SAVINGS.shown);
    await expect(owned.getByRole("listitem").filter({ hasText: EVERYDAY.name })).toContainText(
      EVERYDAY.shown,
    );

    const owed = page.getByRole("list", { name: "What you owe" });
    const card = owed.getByRole("listitem").filter({ hasText: CARD.name });
    await expect(card).toContainText("Credit card");
    await expect(card).toContainText(CARD.shown);
  });

  await test.step("the Dashboard's net worth is what you own less what you owe", async () => {
    await page.goto("/");
    await waitForHydration(page);
    await expect(page.getByRole("heading", { level: 1, name: "Your money" })).toBeVisible();
    await expect(page.getByRole("group", { name: "Net worth" })).toContainText(NET_WORTH);
  });
});
