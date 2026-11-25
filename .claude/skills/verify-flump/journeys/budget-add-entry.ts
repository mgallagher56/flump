/**
 * budget-add-entry: on Budget, add a plain expense ("Gym", £40 a month) in edit mode, see the
 * Expenses total and "Left over each month" move by £40, then confirm it survives a reload and the
 * /api/budget-entries read-back.
 *
 * Expects the homeowner persona. Its seeded budget (apps/e2e/support/personas.ts, HOMEOWNER):
 *   money in:  Salary after tax                                 3,450
 *   housing:   Mortgage payment                                 1,250
 *   bills:     190 + 140 + 45 + 55 + 30 + 265                 =   725
 *   expenses:  520 + 180 + 120 + 40 + 180                     = 1,040
 *   savings:   100 + 200                                       =   300
 *   left over: 3,450 - 1,250 - 725 - 1,040 - 300               =   135
 * With Gym at £40: expenses 1,080 and left over 95.
 * Changes saved data: run `verify-flump seed homeowner <run-id>` afterwards for the baseline.
 * Run: verify-flump drive budget-add-entry <run-id>
 */
import { expect, journey, open } from "../scripts/lib.ts";

const NAME = `Gym ${Date.now().toString(36)}`;
const AMOUNT = 40;
const SEEDED = { expenses: 1040, leftOver: 135 };
const pounds = (n: number) => `£${new Intl.NumberFormat("en-GB").format(n)}`;
const figure = (text: string) =>
  Number(/£([\d,]+)/.exec(text)?.[1]?.replaceAll(",", "") ?? Number.NaN);

await journey("budget-add-entry", async ({ page, step, api, save }) => {
  const leftOver = page.getByRole("group", { name: "Left over each month" });
  const expenses = page.getByRole("button", { name: /^Expenses/ });

  await step("open Budget and read the seeded figures", async () => {
    await open(page, "/app/budget");
    await expect(leftOver).toBeVisible();
    expect(figure((await leftOver.textContent()) ?? "")).toBe(SEEDED.leftOver);
    await expect(expenses).toContainText(pounds(SEEDED.expenses));
  });

  await step("choose Edit budget, then Add to expenses", async () => {
    await page.getByRole("button", { name: "Edit budget" }).click();
    await page.getByRole("button", { name: "Add to expenses", exact: true }).click();
    await expect(page.getByRole("textbox", { name: "New entry name in Expenses" })).toBeVisible();
  });

  await step("fill the entry and choose Add to Expenses", async () => {
    await page.getByRole("textbox", { name: "New entry name in Expenses" }).fill(NAME);
    await page.getByRole("textbox", { name: "New entry amount in Expenses" }).fill(String(AMOUNT));
    await page.getByRole("button", { name: "Add to Expenses", exact: true }).click();
    await expect(page.getByLabel(`Amount for ${NAME}`)).toBeVisible();
  });

  await step("finish editing: Expenses and left over move by the entry", async () => {
    await page.getByRole("button", { name: "Finish editing" }).first().click();
    await expect(expenses).toContainText(pounds(SEEDED.expenses + AMOUNT));
    await expect(leftOver).toContainText(pounds(SEEDED.leftOver - AMOUNT));
  });

  await step("reload: the entry and the figures are still there", async () => {
    await open(page, "/app/budget");
    await expect(expenses).toContainText(pounds(SEEDED.expenses + AMOUNT));
    await expect(leftOver).toContainText(pounds(SEEDED.leftOver - AMOUNT));
    await expenses.click();
    await expect(page.getByText(NAME, { exact: true }).first()).toBeVisible();
  });

  await step("read back through /api/budget-entries", async () => {
    const body = (await api("/budget-entries")) as unknown;
    const rows = (
      Array.isArray(body)
        ? body
        : ((body as { items?: unknown[]; data?: unknown[] }).items ??
          (body as { data?: unknown[] }).data ??
          [])
    ) as Array<Record<string, unknown>>;
    const saved = rows.find((r) => r.name === NAME);
    save("api-budget-entry.json", saved ?? { missing: NAME, count: rows.length });
    expect(saved, `entry ${NAME} in GET /api/budget-entries`).toBeTruthy();
    expect(Number(saved?.amount)).toBe(AMOUNT);
  });
});
