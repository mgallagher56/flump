/**
 * setup-new-user: clear the run's user to an empty new user, see `/` send it to setup, fill income
 * and housing (renting), skip savings and debt, check the review, finish, and land on the dashboard
 * with no net worth yet. A reload of `/` stays on the dashboard, /api/budget-entries holds the saved
 * lines, and Budget shows the rent and other spending.
 *
 * Costs two of the 10 resets an hour: one to clear the user, one to restore the homeowner persona
 * at the end (done in the journey, even when a step fails, so the next journey starts from the
 * baseline). If the restore fails, run `verify-flump seed homeowner <run-id>`.
 * Run: verify-flump drive setup-new-user <run-id>
 */
import { applyPersona, clearToNewUser } from "../../../../apps/e2e/support/personas";
import { expect, journey, open } from "../scripts/lib.ts";

const figure = (text: string) =>
  Number(/£([\d,]+)/.exec(text)?.[1]?.replaceAll(",", "") ?? Number.NaN);

await journey("setup-new-user", async ({ page, step, api, save }) => {
  try {
    await step("clear the user to a new user with nothing saved", async () => {
      await open(page, "/");
      await clearToNewUser(page);
    });

    await step("open / and land on setup", async () => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      await expect(page).toHaveURL(/\/app\/onboarding$/);
      await expect(page.getByRole("heading", { level: 1, name: "Set up Flump" })).toBeVisible();
      await expect(page.getByRole("navigation", { name: "Primary" })).toHaveCount(0);
    });

    await step("fill income and choose Next", async () => {
      const income = page.getByRole("region", { name: "You and income" });
      await income.getByRole("textbox", { name: "Your age" }).fill("31");
      await income.getByRole("radio", { name: /^Employed/ }).check();
      await income.getByRole("textbox", { name: /^Yearly salary before tax/ }).fill("36,000");
      await income.getByRole("combobox", { name: /^Where do you pay tax/ }).selectOption("England");
      await income.getByRole("button", { name: "Next", exact: true }).click();
      await expect(page.getByRole("region", { name: "Housing and spending" })).toBeVisible();
    });

    await step("fill housing as renting and choose Next", async () => {
      const housing = page.getByRole("region", { name: "Housing and spending" });
      await housing.getByRole("radio", { name: "Renting", exact: true }).check();
      await housing.getByRole("textbox", { name: /^Monthly rent/ }).fill("900");
      await housing.getByRole("textbox", { name: /^Other monthly spending/ }).fill("600");
      await housing.getByRole("button", { name: "Next", exact: true }).click();
      await expect(page.getByRole("region", { name: "Savings and debt" })).toBeVisible();
    });

    await step("skip savings and debt and see the review", async () => {
      await page
        .getByRole("region", { name: "Savings and debt" })
        .getByRole("button", { name: "Skip this step" })
        .click();
      await expect(page.getByRole("heading", { name: "Review what will be saved" })).toBeVisible();
      const definitions = page.getByRole("definition");
      await expect(definitions.filter({ hasText: "£36,000" })).toBeVisible();
      await expect(definitions.filter({ hasText: /^Renting$/ })).toBeVisible();
      await expect(definitions.filter({ hasText: "£900 a month" })).toBeVisible();
      await expect(definitions.filter({ hasText: "£600 a month" })).toBeVisible();
      // The take-home estimate follows the tax year's rules: read it, never pin it.
      const estimate =
        (await page
          .getByText(/^Monthly take-home pay \(estimate\)\s*£[\d,]+/)
          .first()
          .textContent()) ?? "";
      const takeHome = figure(estimate);
      save("review-take-home.json", { estimate, takeHome });
      expect(takeHome).toBeGreaterThan(0);
    });

    await step("finish and open the dashboard", async () => {
      await page.getByRole("button", { name: "Finish and open dashboard" }).click();
      await expect(page.getByText("Details saved", { exact: true })).toBeVisible();
      await expect(page).toHaveURL(/\/$/);
      await expect(page.getByRole("heading", { level: 1, name: "Your money" })).toBeVisible();
      const netWorth = page.getByRole("group", { name: "Net worth" });
      await expect(netWorth.getByText("Not set", { exact: true })).toBeVisible();
    });

    await step("reload /: setup is finished, the dashboard stays", async () => {
      await open(page, "/");
      await expect(page).toHaveURL(/\/$/);
      await expect(page.getByRole("heading", { level: 1, name: "Your money" })).toBeVisible();
    });

    await step("read back the saved budget lines through /api/budget-entries", async () => {
      const body = (await api("/budget-entries")) as unknown;
      const rows = (
        Array.isArray(body)
          ? body
          : ((body as { items?: unknown[]; data?: unknown[] }).items ??
            (body as { data?: unknown[] }).data ??
            [])
      ) as Array<Record<string, unknown>>;
      save("api-budget-entries.json", rows);
      // The other spending is its own line. The rent line is linked to the saved housing cost, so
      // its stored amount is not the rent: Budget shows the rent (next step).
      const living = rows.find((r) => r.category === "living");
      expect(Number(living?.amount)).toBe(600);
      expect(rows.some((r) => r.category === "housing" && r.linkKind === "housing")).toBe(true);
      expect(rows.some((r) => r.isIncome === true && Number(r.amount) > 0)).toBe(true);
    });

    await step("Budget shows the rent and the other spending", async () => {
      await open(page, "/app/budget");
      await expect(page.getByRole("button", { name: /^Housing/ })).toContainText("£900");
      await expect(page.getByRole("button", { name: /^Living/ })).toContainText("£600");
    });
  } finally {
    // Restore the baseline for the next journey (a second reset). A separate tab, so the seed's
    // own expected 404 (it probes GET /api/user-profile, which the proxy does not serve) stays out
    // of problems.jsonl.
    const seedPage = await page.context().newPage();
    await open(seedPage, "/");
    const restored = await applyPersona(seedPage, "homeowner");
    save("restored-homeowner.json", restored);
  }
});
