import { expect, test } from "@playwright/test";
import { AUTH_STATE } from "../../support/auth";
import { applyPersona } from "../../support/personas";
import { accountNamed, api, entryNamed, kpiCard } from "./budget-links.helpers";

test.use({ storageState: AUTH_STATE });

// L35 (BU-6, audit slice 5): a budget savings line linked to a savings account reads the account's
// monthly saving, so changing it on the account changes the budget, with nothing to retype.
test("L35 a linked savings line follows the account's monthly saving", async ({ page }) => {
  await page.goto("/app");
  await applyPersona(page, "homeowner");

  const isa = await accountNamed(page, "Cash ISA");
  const row = await entryNamed(page, "Cash ISA");
  const before = { monthlyContribution: isa.monthlyContribution ?? null };

  try {
    // The typed £100 row matches the account's £100, so the page offers the link. One tap links it.
    await page.goto("/app/budget");
    const note = page.getByRole("note", { name: "About Cash ISA" });
    await expect(note).toContainText("£100 a month on Cash ISA");
    await note.getByRole("button", { name: "Link to Cash ISA" }).click();
    await expect(page.getByRole("note", { name: "About Cash ISA" })).toHaveCount(0);

    // The saving changes on the account only.
    await api(page, `/accounts/${isa.id}`, "PATCH", { monthlyContribution: 175 });

    // Savings page: Easy access £200 + Cash ISA £175 = £375 saved each month.
    await page.goto("/app/savings");
    await expect(kpiCard(page, "Saved each month")).toContainText("£375");

    // Budget page: the same two, the typed £200 row and the linked line now £175 = £375.
    await page.goto("/app/budget");
    await expect(page.getByTestId("budget-category-savings")).toContainText("£375");
  } finally {
    await api(page, `/accounts/${isa.id}`, "PATCH", before);
    await api(page, `/budget-entries/${row.id}`, "PATCH", {
      linkKind: null,
      linkAccountId: null,
      amount: row.amount,
      category: row.category,
    });
  }
});
