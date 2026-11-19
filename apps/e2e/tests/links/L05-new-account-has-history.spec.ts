import { expect, test } from "@playwright/test";
import { AUTH_STATE } from "../../support/auth";
import { backendCall } from "../../support/backend";
import { listAccounts, monthLabel, pageApi } from "../../support/links-api";
import { monthKey, seedNow } from "../../support/personas";

test.use({ storageState: AUTH_STATE });

// L05 (CH-1, decision 8 A): a new account records its balance for the month it was added, so
// History has the point at once and October does not change when November starts. Before slice 4
// the account had no row until a check-in or an edit.
test("L05 a new account has a History point for this month with no check-in", async ({ page }) => {
  await page.goto("/app");
  // Start from no accounts, so the new account is the only one History can show. Each later link
  // spec applies its persona again, so nothing else depends on the accounts removed here.
  for (const existing of await listAccounts(page)) {
    await backendCall(`/accounts/${existing.id}`, "DELETE");
  }
  const created = await pageApi<{ id: string }>(page, "/accounts", "POST", {
    name: "L05 new saver",
    type: "Saving",
    balance: 5000,
  });
  try {
    const thisMonth = monthKey(seedNow(), 0);
    const account = (await listAccounts(page)).find((a) => a.id === created.id);
    const [year, month] = thisMonth.split("-").map(Number);
    expect(account?.details).toEqual([
      expect.objectContaining({ year, month, value: 5000, source: "manual" }),
    ]);

    // History has its first recorded month: this month, at the new account's £5,000. With no
    // recorded month it would show "No monthly balances yet" instead.
    await page.goto("/app/accounts/history");
    const history = page.getByTestId("snapshot-history");
    await expect(history).toContainText(`Net worth recorded for ${monthLabel(thisMonth)}: £5,000.`);
    await expect(history).not.toContainText("No monthly balances yet");
  } finally {
    await backendCall(`/accounts/${created.id}`, "DELETE");
  }
});
