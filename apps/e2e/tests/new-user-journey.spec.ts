import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { AXE_TAGS } from "../a11y/checks";
import { clearToNewUser } from "../support/personas";
import { paceReads } from "../support/read-budget";

/**
 * Setup is not in the visual and accessibility suites (the seeded user has finished it and is sent
 * to the dashboard), so its first two steps get an axe check here, inside the real app shell.
 */
async function expectNoAxeViolations(page: Page, where: string): Promise<void> {
  const { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  expect(violations.map((v) => `${where}: ${v.id} (${v.nodes.length})`)).toEqual([]);
}

/**
 * The new-user journey (E11 F-11, E23): sign in with nothing saved, finish setup (income and
 * housing as a renter; savings and debt left for later), add a first account, add a first budget
 * entry, and see the dashboard show both.
 *
 * The suite has a single user, so this spec clears it and runs in its own project after the
 * persona specs (playwright.config.ts). Global setup seeds the persona again on the next run.
 */

const ACCOUNT = { name: "Everyday account", balance: "1,250", shown: "£1,250" };
const ENTRY = { name: "Food shop", amount: 400, shown: "£400" };
/**
 * The housing step's answers. Setup saves the rent as the profile's housing cost and a "Rent
 * Payment" line linked to it (Housing on Budget), and the other spending as a "General living and
 * outgoings" line (category "living", shown as "Living").
 */
const HOUSING = {
  rent: { typed: "900", amount: 900, shown: "£900" },
  other: { typed: "600", amount: 600, shown: "£600" },
};
// Monthly spending once the journey's own entry is added: 900 rent + 600 living + 400 food = 1,900.
const SPENDING = { amount: 1900, shown: "£1,900" };

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
  // Runs straight after the links project in the same read window: wait if it is nearly spent.
  await paceReads();
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

  await test.step("setup: income and housing filled, savings and debt left for later", async () => {
    const income = page.getByRole("region", { name: "You and income" });
    await income.getByRole("textbox", { name: "Your age" }).fill("31");
    await income.getByRole("radio", { name: /^Employed/ }).check();
    await income.getByRole("textbox", { name: /^Yearly salary before tax/ }).fill("36,000");
    await income.getByRole("combobox", { name: /^Where do you pay tax/ }).selectOption("England");
    await expectNoAxeViolations(page, "setup step 1");
    await income.getByRole("button", { name: "Next", exact: true }).click();

    // Housing is filled as renting: a rent and other spending are budget lines only. Renting has
    // no home value or mortgage field, so setup creates no account (services/onboarding-seed.ts
    // seeds a home or mortgage account only for "Paying a mortgage" or "Own with no mortgage").
    const housing = page.getByRole("region", { name: "Housing and spending" });
    await expect(housing).toBeVisible();
    await housing.getByRole("radio", { name: "Renting", exact: true }).check();
    await housing.getByRole("textbox", { name: /^Monthly rent/ }).fill(HOUSING.rent.typed);
    await housing
      .getByRole("textbox", { name: /^Other monthly spending/ })
      .fill(HOUSING.other.typed);
    await expectNoAxeViolations(page, "setup step 2");
    await housing.getByRole("button", { name: "Next", exact: true }).click();
    // No balances or debts, so the savings step is left for later.
    const savings = page.getByRole("region", { name: "Savings and debt" });
    await savings.getByRole("button", { name: "Skip this step" }).click();
    // Skipping savings leads straight to the review: setup has no bank step.

    await expect(page.getByRole("heading", { name: "Review what will be saved" })).toBeVisible();
    await expect(page.getByRole("definition").filter({ hasText: "£36,000" })).toBeVisible();
    // The housing answers as typed, each a monthly figure.
    await expect(page.getByRole("definition").filter({ hasText: /^Renting$/ })).toBeVisible();
    await expect(
      page.getByRole("definition").filter({ hasText: `${HOUSING.rent.shown} a month` }),
    ).toBeVisible();
    await expect(
      page.getByRole("definition").filter({ hasText: `${HOUSING.other.shown} a month` }),
    ).toBeVisible();
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

    // R2-5: each group is a list; the row shows the name, its type and the balance.
    const owned = page.getByRole("list", { name: "What you own" });
    const row = owned.getByRole("listitem").filter({ hasText: ACCOUNT.name });
    await expect(row).toBeVisible();
    await expect(row).toContainText("Current account");
    await expect(row).toContainText(ACCOUNT.shown);
  });

  // L05 (CH-1, decision 8 A, system audit slice 4): the new account records its balance for the
  // month it was added, so History has its first point at once, with no check-in. Before slice 4
  // the account had no row and History said "No monthly balances yet". This user starts with no
  // accounts, so the point is this account's alone. (Here, not in the links project, because this
  // journey already starts from an empty user and costs no reset.)
  await test.step("L05 the new account is this month's first History point", async () => {
    await open(page, "/app/accounts/history");
    const history = page.getByTestId("snapshot-history");
    const month = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/London",
      month: "long",
      year: "numeric",
    }).format(new Date());
    await expect(history).toContainText(`Net worth recorded for ${month}: ${ACCOUNT.shown}.`);
    await expect(history).not.toContainText("No monthly balances yet");
  });

  await test.step("add a first budget entry", async () => {
    await open(page, "/app/budget");
    // Setup saved the take-home estimate as the budget's income, shown once as money in (R2-6).
    await expect(page.getByText("Money in each month", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Income/ })).toHaveCount(0);
    // What setup saved from the housing step: the rent as the Housing line (linked to the saved
    // rent) and the other spending as its own "Living" line. Nothing else is spending yet.
    await expect(page.getByRole("button", { name: /^Housing/ })).toContainText(HOUSING.rent.shown);
    await expect(page.getByRole("button", { name: /^Living/ })).toContainText(HOUSING.other.shown);
    // Entries are added in place with Edit budget (round 3); the change saves as you go.
    await page.getByRole("button", { name: "Edit budget" }).click();
    await page.getByRole("button", { name: "Add to expenses" }).click();
    await page.getByRole("textbox", { name: "New entry name in Expenses" }).fill(ENTRY.name);
    await page
      .getByRole("textbox", { name: "New entry amount in Expenses" })
      .fill(String(ENTRY.amount));
    await page.getByRole("button", { name: "Add to Expenses" }).click();
    await expect(page.getByLabel(`Amount for ${ENTRY.name}`)).toBeVisible();
    await page.getByRole("button", { name: "Finish editing" }).first().click();

    await expect(page.getByRole("button", { name: /^Expenses/ })).toContainText(ENTRY.shown);
    // Take-home less rent 900, living 600 and the food shop 400: takeHome - 1,900.
    await expect(page.getByRole("group", { name: "Left over each month" })).toContainText(
      pounds(takeHome - SPENDING.amount),
    );
  });

  await test.step("the dashboard shows the net worth and the budget summary", async () => {
    await open(page, "/");
    await expect(page.getByRole("heading", { level: 1, name: "Your money" })).toBeVisible();

    // One account and no debts: net worth is its balance.
    await expect(page.getByRole("group", { name: "Net worth" })).toContainText(ACCOUNT.shown);

    const budget = page.getByRole("region", { name: "Budget", exact: true });
    await expect(budget.getByText("Spending each month", { exact: true })).toBeVisible();
    // Spending each month: rent 900 + living 600 + food shop 400 = £1,900.
    await expect(budget.getByText(SPENDING.shown, { exact: true })).toBeVisible();
    // The take-home estimate less the £1,900 of spending.
    await expect(page.getByRole("main")).toContainText(
      new RegExp(`Left over each month\\s*${pounds(takeHome - SPENDING.amount)}`),
    );
  });
});
