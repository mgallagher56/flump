import { expect, type Page, test } from "@playwright/test";
import { clearToNewUser } from "../support/personas";

/**
 * The new-user journey (E11 F-11, E23): sign in with nothing saved, finish setup, add a first
 * account, add a first budget entry, and see the dashboard show both.
 *
 * The suite has a single user, so this spec clears it and runs in its own project after the
 * persona specs (playwright.config.ts). Global setup seeds the persona again on the next run.
 */

const ACCOUNT = { name: "Everyday account", balance: "1,250", shown: "£1,250" };
const ENTRY = { name: "Food shop", amount: 400, shown: "£400" };

const pounds = (value: number) => `£${new Intl.NumberFormat("en-GB").format(value)}`;

/** Server-rendered pages take clicks only once hydrated: wait for the network to go quiet. */
async function open(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
}

test("a new user sets up, adds an account and a budget entry, and the dashboard shows both", async ({
  page,
}) => {
  // Five screens and four saves in one test: twice the suite default.
  test.setTimeout(60_000);
  // Signed out with no stored session: the real /login route starts the (test-only) session.
  await page.goto("/login");
  await expect(page).toHaveURL(/\/$/);
  await clearToNewUser(page);

  let takeHome = 0;

  await test.step("a user who has not finished setup lands on it", async () => {
    await open(page, "/");
    await expect(page).toHaveURL(/\/app\/onboarding$/);
    await expect(page.getByRole("heading", { level: 1, name: "Set up Flump" })).toBeVisible();
    // Setup is a focused flow: no app navigation.
    await expect(page.getByRole("navigation", { name: "Primary" })).toHaveCount(0);
  });

  await test.step("setup: income is required, the other steps can be left for later", async () => {
    const income = page.getByRole("region", { name: "You and income" });
    await income.getByRole("spinbutton", { name: "Your age" }).fill("31");
    await income.getByRole("radio", { name: /^Employed/ }).check();
    await income.getByRole("textbox", { name: /^Yearly salary before tax/ }).fill("36,000");
    await income.getByRole("combobox", { name: /^Where do you pay tax/ }).selectOption("England");
    await income.getByRole("button", { name: "Next", exact: true }).click();

    // No housing costs, balances or debts here, so setup creates no account and no spending.
    const housing = page.getByRole("region", { name: "Housing and spending" });
    await housing.getByRole("button", { name: "Skip this step" }).click();
    const savings = page.getByRole("region", { name: "Savings and debt" });
    await savings.getByRole("button", { name: "Skip this step" }).click();
    // Skipping savings leads straight to the review: setup has no bank step.

    await expect(page.getByRole("heading", { name: "Review what will be saved" })).toBeVisible();
    await expect(page.getByRole("definition").filter({ hasText: "£36,000" })).toBeVisible();
    // The take-home estimate follows the tax rules of the day, so read it rather than pin it.
    const estimate =
      (await page
        .getByText(/^Monthly take-home pay \(estimate\)\s*£[\d,]+/)
        .first()
        .textContent()) ?? "";
    takeHome = Number(/£([\d,]+)/.exec(estimate)?.[1]?.replaceAll(",", ""));
    expect(takeHome).toBeGreaterThan(0);

    await page.getByRole("button", { name: "Finish and open dashboard" }).click();
    // Exact match: the toast also renders a screen-reader status line ("Success: Details saved").
    await expect(page.getByText("Details saved", { exact: true })).toBeVisible();
  });

  await test.step("the dashboard starts with nothing to show for accounts", async () => {
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { level: 1, name: "Your money" })).toBeVisible();
    const netWorth = page.getByRole("group", { name: "Net worth" });
    await expect(netWorth.getByText("Not set", { exact: true })).toBeVisible();
    await expect(netWorth.getByText("Add an account to see your net worth.")).toBeVisible();
  });

  await test.step("add a first account with a balance", async () => {
    await open(page, "/app/accounts");
    await expect(page.getByRole("heading", { name: "No accounts yet" })).toBeVisible();
    // A link before hydration (#701), so it works as soon as it shows.
    await page.getByRole("link", { name: "Add account", exact: true }).click();

    const dialog = page.getByRole("dialog", { name: "Add account" });
    await dialog.getByRole("textbox", { name: "Name" }).fill(ACCOUNT.name);
    await dialog.getByRole("combobox", { name: "Account type" }).selectOption("Current");
    await dialog.getByRole("textbox", { name: "Balance" }).fill(ACCOUNT.balance);
    await dialog.getByRole("button", { name: "Add account", exact: true }).click();
    await expect(dialog).toBeHidden();

    const owned = page.getByRole("table", { name: "What you own" });
    await expect(
      owned.getByRole("row", { name: `${ACCOUNT.name} Current account ${ACCOUNT.shown}` }),
    ).toBeVisible();
  });

  await test.step("add a first budget entry", async () => {
    await open(page, "/app/budget");
    // Setup saved the take-home estimate as the budget's income, shown once as money in (R2-6).
    await expect(page.getByText("Money in each month", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Income/ })).toHaveCount(0);
    // Entries are added in place with Edit budget (round 3); the change saves as you go.
    await page.getByRole("button", { name: "Edit budget" }).click();
    await page.getByRole("button", { name: "Add to expenses" }).click();
    await page.getByRole("textbox", { name: "New entry name in Expenses" }).fill(ENTRY.name);
    await page
      .getByRole("textbox", { name: "New entry amount in Expenses" })
      .fill(String(ENTRY.amount));
    await page.getByRole("button", { name: "Add to Expenses" }).click();
    await expect(page.getByLabel(`Amount for ${ENTRY.name}`)).toBeVisible();
    await page.getByRole("button", { name: "Finish editing" }).click();

    await expect(page.getByRole("button", { name: /^Expenses 1 entry/ })).toContainText(
      ENTRY.shown,
    );
    await expect(page.getByRole("group", { name: "Left over each month" })).toContainText(
      pounds(takeHome - ENTRY.amount),
    );
  });

  await test.step("the dashboard shows the net worth and the budget summary", async () => {
    await open(page, "/");
    await expect(page.getByRole("heading", { level: 1, name: "Your money" })).toBeVisible();

    // One account and no debts: net worth is its balance.
    await expect(page.getByRole("group", { name: "Net worth" })).toContainText(ACCOUNT.shown);

    const budget = page.getByRole("region", { name: "Budget", exact: true });
    await expect(budget.getByText("Spending each month", { exact: true })).toBeVisible();
    await expect(budget.getByText(ENTRY.shown, { exact: true })).toBeVisible();
    // The take-home estimate less the one entry.
    await expect(page.getByRole("main")).toContainText(
      new RegExp(`Left over each month\\s*${pounds(takeHome - ENTRY.amount)}`),
    );
  });
});
