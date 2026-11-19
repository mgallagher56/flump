import { expect, test } from "@playwright/test";
import { AUTH_STATE } from "../../support/auth";
import { applyPersona } from "../../support/personas";
import { api, entryNamed, kpiCard } from "./budget-links.helpers";

test.use({ storageState: AUTH_STATE });

// L57 (JO-8, audit slice 5): a shared rent counts at its share. The saved rent is the whole rent;
// the linked rent line says it is joint and the person's share, and the budget and Retirement both
// count that share. Named L14b so it runs among the renter specs: no extra persona switch.
test("L57 a joint rent at 50% counts at half on Budget and Retirement", async ({ page }) => {
  await page.goto("/app");
  await applyPersona(page, "renter");

  const row = await entryNamed(page, "Rent");

  try {
    await api(page, `/budget-entries/${row.id}`, "PATCH", {
      linkKind: "housing",
      amount: 0,
      ownership: "joint",
      sharePercent: 50,
    });

    // Budget: the renter's saved £950 at 50% is £475.
    await page.goto("/app/budget");
    await expect(page.getByTestId("budget-category-housing")).toContainText("£475");

    // Retirement: the same £475 a month, £5,700 a year in today's prices.
    await page.goto("/app/retirement");
    await expect(kpiCard(page, "Housing in retirement")).toContainText("£5,700");
  } finally {
    await api(page, `/budget-entries/${row.id}`, "PATCH", {
      linkKind: null,
      amount: row.amount,
      ownership: "sole",
      sharePercent: null,
    });
  }
});
