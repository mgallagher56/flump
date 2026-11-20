import { expect, type Page, test } from "@playwright/test";
import { AUTH_STATE } from "../../support/auth";
import { linkSpecHeaders } from "../../support/client-address";
import { waitForHydration } from "../../support/page";
import { applyPersona } from "../../support/personas";
import { api, entryNamed, leftOver, pounds } from "./budget-links.helpers";

// Its own client address, so the per-address ceiling counts this file alone (client-address.ts).
test.use({ storageState: AUTH_STATE, extraHTTPHeaders: linkSpecHeaders(import.meta.filename) });

// E11: a budget line edited in place on Budget (its amount and how often) moves the Budget totals
// and the Dashboard's left over by the same amount. Named "L59" so it runs among the homeowner
// specs (playwright.config.ts): no persona switch, no reset.
//
// The homeowner persona's seeded budget (support/personas.ts, HOMEOWNER):
//   money in:  Salary after tax                                   3,450
//   housing:   Mortgage payment                                   1,250
//   bills:     190 + 140 + 45 + 55 + 30 + 265                   =   725
//   expenses:  Groceries 520 + Travel 180 + Eating out 120
//              + Subscriptions 40 + Everything else 180         = 1,040
//   savings:   100 + 200                                         =   300
//   left over: 3,450 - 1,250 - 725 - 1,040 - 300                 =   135
//
// The edit: "Eating out" goes from £120 a month to £1,800 a year.
//   £1,800 a year is 1,800 / 12 = £150 a month, so the line rises by 150 - 120 = £30.
//   expenses:  1,040 + 30 = 1,070
//   left over: 135 - 30   = 105
const LINE = "Eating out";
const SEEDED = { expenses: 1040, expensesShown: "£1,040", leftOver: 135 };
const EDITED = {
  amount: "1800",
  frequency: "annual",
  expensesShown: "£1,070",
  leftOver: 105,
};

const expensesRow = (page: Page) => page.getByRole("button", { name: /^Expenses/ });

async function openBudget(page: Page): Promise<void> {
  await page.goto("/app/budget");
  await waitForHydration(page);
}

/** The Dashboard's left over, read from its "Left over each month" figure. */
async function dashboardLeftOver(page: Page): Promise<number> {
  await page.goto("/app");
  await waitForHydration(page);
  await expect(page.getByRole("main")).toContainText("Left over each month");
  return leftOver(page);
}

test("L59 editing a budget line's amount and frequency moves Budget and the Dashboard", async ({
  page,
}) => {
  await page.goto("/app");
  await applyPersona(page, "homeowner");

  const row = await entryNamed(page, LINE);
  const saved = {
    amount: row.amount,
    frequency: (row as { frequency?: string }).frequency ?? "monthly",
  };

  try {
    await test.step("the seeded figures", async () => {
      await openBudget(page);
      await expect(expensesRow(page)).toContainText(SEEDED.expensesShown);
      expect(await leftOver(page)).toBe(SEEDED.leftOver);
      expect(await dashboardLeftOver(page)).toBe(SEEDED.leftOver);
    });

    await test.step("edit the line's amount and frequency in place", async () => {
      await openBudget(page);
      await page.getByRole("button", { name: "Edit budget" }).click();

      // Fields by accessible name, so an added control (a Joint switch, a share field) or a
      // change in field order leaves this step working.
      const frequency = page.getByRole("combobox", { name: `How often for ${LINE}` });
      await frequency.selectOption(EDITED.frequency);
      await expect(frequency).toHaveValue(EDITED.frequency);

      const amount = page.getByRole("textbox", { name: `Amount for ${LINE}` });
      await amount.fill(EDITED.amount);
      // The amount saves on blur.
      await amount.blur();

      await page.getByRole("button", { name: "Finish editing" }).first().click();
      await expect(expensesRow(page)).toContainText(EDITED.expensesShown);
      await expect(page.getByRole("group", { name: "Left over each month" })).toContainText(
        `£${EDITED.leftOver}`,
      );
    });

    await test.step("Budget and the Dashboard show the new left over after a reload", async () => {
      await openBudget(page);
      await expect(expensesRow(page)).toContainText(EDITED.expensesShown);
      expect(await leftOver(page)).toBe(EDITED.leftOver);
      expect(await dashboardLeftOver(page)).toBe(EDITED.leftOver);
    });

    // The saved line as the API now holds it: £1,800 a year.
    const edited = (await entryNamed(page, LINE)) as { amount: number; frequency?: string };
    expect(edited.amount).toBe(1800);
    expect(edited.frequency).toBe(EDITED.frequency);
  } finally {
    // Put the seeded line back, so later specs see the same seeded totals. A failure here is
    // reported without hiding the test's own error, if there was one; if the line is still
    // changed, applyPersona (which compares amount and frequency) resets it in the next spec.
    try {
      await api(page, `/budget-entries/${row.id}`, "PATCH", saved);
    } catch (restoreError) {
      console.error(`L59 could not put "${LINE}" back:`, restoreError);
    }
  }

  await test.step("after the line is put back, the figures are the seeded ones", async () => {
    await openBudget(page);
    await expect(expensesRow(page)).toContainText(SEEDED.expensesShown);
    expect(pounds(await expensesRow(page).textContent())).toBe(SEEDED.expenses);
    expect(await leftOver(page)).toBe(SEEDED.leftOver);
    expect(await dashboardLeftOver(page)).toBe(SEEDED.leftOver);
  });
});
