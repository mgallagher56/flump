import { expect, test } from "@playwright/test";
import { AUTH_STATE } from "../../support/auth";
import { applyPersona } from "../../support/personas";
import { accountNamed, api, entryNamed, kpiCard } from "./budget-links.helpers";

test.use({ storageState: AUTH_STATE });

// L36 (BU-6, BU-7, SD-10, audit slice 5): a budget line linked to a loan reads the loan's monthly
// payment, so changing the payment on the Debt side changes the budget's debt line too.
test("L36 a linked debt line follows the loan's monthly payment", async ({ page }) => {
  await page.goto("/app");
  await applyPersona(page, "homeowner");

  const loan = await accountNamed(page, "Car loan");
  const row = await entryNamed(page, "Car loan payment");
  const before = { monthlyContribution: loan.monthlyContribution ?? null };

  try {
    // "Car loan payment" £265 in Bills matches the loan's £265: one tap links it and moves it to Debt.
    await page.goto("/app/budget");
    const note = page.getByRole("note", { name: "About Car loan payment" });
    await expect(note).toContainText("£265 a month on Car loan");
    await note.getByRole("button", { name: "Link to Car loan" }).click();
    await expect(page.getByTestId("budget-category-debt")).toContainText("£265");

    await api(page, `/accounts/${loan.id}`, "PATCH", { monthlyContribution: 300 });

    // Debt page: car loan £300 + credit card £40 = £340 paid each month.
    await page.goto("/app/debt");
    await expect(kpiCard(page, "Paying each month")).toContainText("£340");

    // Budget page: the debt line reads the loan's £300.
    await page.goto("/app/budget");
    await expect(page.getByTestId("budget-category-debt")).toContainText("£300");
  } finally {
    await api(page, `/accounts/${loan.id}`, "PATCH", before);
    await api(page, `/budget-entries/${row.id}`, "PATCH", {
      linkKind: null,
      linkAccountId: null,
      amount: row.amount,
      category: row.category,
    });
  }
});
