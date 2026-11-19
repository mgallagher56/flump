import { expect, test } from "@playwright/test";
import { AUTH_STATE } from "../../support/auth";
import { backendCall } from "../../support/backend";
import { accountsPageRow, listAccounts, monthLabel, pageApi } from "../../support/links-api";
import { applyPersona, monthKey, seedNow } from "../../support/personas";

test.use({ storageState: AUTH_STATE });

// L68 (CH-2, decision 8 A): an account whose newest record is last month (an import of last
// month's figure gives one) takes a correction of that month as today's balance. Before slice 4
// only a current-month write moved the balance, so it stayed at the old figure.
test("L68 correcting the latest recorded month also corrects today's balance", async ({ page }) => {
  await page.goto("/app");
  // A persona with this month and the months before it recorded, so History compares last month
  // with this month. The homeowner, as the spec before this one uses, so no reset is spent.
  await applyPersona(page, "homeowner");
  const lastMonth = monthKey(seedNow(), 1);
  const staged = await backendCall<{ batchId: string }>("/imports", "POST", {
    idempotencyKey: `l68-${Date.now()}`,
    accounts: [{ ref: "l68", name: "L68 saver", type: "Saving" }],
    balances: [{ accountRef: "l68", month: lastMonth, value: 1000 }],
  });
  await backendCall(`/imports/${staged.batchId}/commit`, "POST", {});
  const account = (await listAccounts(page)).find((a) => a.name === "L68 saver");
  if (!account) throw new Error("the import did not create the account");
  try {
    await pageApi(page, `/snapshots/${lastMonth}`, "PUT", {
      values: [{ accountId: account.id, value: 10000 }],
    });
    const after = (await listAccounts(page)).find((a) => a.id === account.id);
    expect(after?.balance).toBe(10000);

    // The Accounts page shows the corrected balance.
    await expect(await accountsPageRow(page, "L68 saver")).toContainText("£10,000");

    // History shows the corrected figure for last month, in the change by account table.
    await page.goto("/app/accounts/history");
    await page.getByRole("button", { name: "Show changes by account" }).click();
    const changes = page.getByTestId("snapshot-change-accounts");
    await expect(changes.locator("caption")).toContainText(
      `${monthLabel(lastMonth)} to ${monthLabel(monthKey(seedNow(), 0))}`,
    );
    const row = changes.getByRole("row").filter({ hasText: "L68 saver" });
    await expect(row).toContainText("£10,000");
    await expect(row).not.toContainText("£1,000");
  } finally {
    await backendCall(`/accounts/${account.id}`, "DELETE");
  }
});
