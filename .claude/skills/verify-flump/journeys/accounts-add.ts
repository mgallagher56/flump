/**
 * accounts-add: add a current account from the Accounts page, see it listed, confirm it survives
 * a reload and the /api read-back, and see the dashboard net worth rise by its balance.
 * Run: verify-flump drive accounts-add
 */
import { expect, journey, open } from "../scripts/lib.ts";

const NAME = `Verify current ${Date.now().toString(36)}`;
const BALANCE = 2500;
const pounds = (n: number) => `£${new Intl.NumberFormat("en-GB").format(n)}`;
const figure = (text: string) =>
  Number(/£([\d,]+)/.exec(text)?.[1]?.replaceAll(",", "") ?? Number.NaN);

await journey("accounts-add", async ({ page, step, api, save }) => {
  let before = 0;
  await step("read net worth on the dashboard", async () => {
    await open(page, "/");
    const hero = page.locator('[data-figure="netWorth"]');
    await expect(hero).toBeVisible();
    before = figure((await hero.textContent()) ?? "");
    expect(before).toBeGreaterThan(0);
  });

  await step("open Add account from the Accounts page", async () => {
    await open(page, "/app/accounts");
    await page.getByRole("main").getByRole("link", { name: "Add account", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Add account" })).toBeVisible();
  });

  await step("fill and save a current account", async () => {
    const dialog = page.getByRole("dialog", { name: "Add account" });
    await dialog.getByRole("textbox", { name: "Name" }).fill(NAME);
    await dialog.getByRole("combobox", { name: "Account type" }).selectOption("Current");
    await dialog.getByRole("textbox", { name: "Balance" }).fill(String(BALANCE));
    await dialog.getByRole("button", { name: "Add account", exact: true }).click();
    await expect(dialog).toBeHidden();
    const row = page
      .getByRole("list", { name: "What you own" })
      .getByRole("listitem")
      .filter({ hasText: NAME });
    await expect(row).toContainText("Current account");
    await expect(row).toContainText(pounds(BALANCE));
  });

  await step("reload: the account is still listed", async () => {
    await page.reload();
    const row = page
      .getByRole("list", { name: "What you own" })
      .getByRole("listitem")
      .filter({ hasText: NAME });
    await expect(row).toContainText(pounds(BALANCE));
  });

  await step("read back through /api/accounts", async () => {
    const body = (await api("/accounts")) as unknown;
    const rows = (
      Array.isArray(body)
        ? body
        : ((body as { items?: unknown[]; data?: unknown[] }).items ??
          (body as { data?: unknown[] }).data ??
          [])
    ) as Array<Record<string, unknown>>;
    const saved = rows.find((r) => r.name === NAME);
    save("api-account.json", saved ?? { missing: NAME, count: rows.length });
    expect(saved, `account ${NAME} in GET /api/accounts`).toBeTruthy();
    expect(Number(saved?.balance)).toBe(BALANCE);
  });

  await step("dashboard net worth rose by the balance", async () => {
    await open(page, "/");
    const hero = page.locator('[data-figure="netWorth"]');
    await expect(hero).toContainText(pounds(before + BALANCE));
    save("net-worth.json", { before, after: before + BALANCE });
  });
});
