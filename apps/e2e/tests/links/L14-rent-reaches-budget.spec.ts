import { expect, test } from "@playwright/test";
import { AUTH_STATE } from "../../support/auth";
import { applyPersona } from "../../support/personas";
import { api, entryNamed, kpiCard, pounds } from "./budget-links.helpers";

test.use({ storageState: AUTH_STATE });

// L14 (HM-2, BU-4): once the person links their rent line to the saved rent, a rent change in
// their details changes the budget's housing row and left over on Budget and the Dashboard, and
// the housing cost on Retirement (audit slice 5, the housing line).
test("L14 a rent change reaches the linked housing line, Budget, Dashboard and Retirement", async ({
  page,
}) => {
  await page.goto("/app");
  // The renter persona, as the L27 to L31 specs after it use, so no extra persona switch (each
  // switch is one reset against the backend's 10-an-hour destructive limit).
  await applyPersona(page, "renter");

  const row = await entryNamed(page, "Rent");

  try {
    await api(page, `/budget-entries/${row.id}`, "PATCH", { linkKind: "housing", amount: 0 });
    await page.goto("/app/budget");
    const before = pounds(
      await page.locator('[data-figure="budget.surplus"]').first().textContent(),
    );

    // Rent saved in the housing details: £950 to £1,025.
    await api(page, "/user-profile", "PATCH", { monthlyHousingCost: 1025 });

    await page.reload();
    await expect(page.getByTestId("budget-category-housing")).toContainText("£1,025");
    // Left over falls by 1,025 - 950 = £75 (renter: £125 to £50, so it stays a positive figure).
    const after = pounds(
      await page.locator('[data-figure="budget.surplus"]').first().textContent(),
    );
    expect(after).toBe(before - 75);

    await page.goto("/app");
    const dashboard = pounds(
      await page.locator('[data-figure="budget.surplus"]').first().textContent(),
    );
    expect(dashboard).toBe(after);

    // Retirement: £1,025 a month is £12,300 a year in today's prices.
    await page.goto("/app/retirement");
    await expect(kpiCard(page, "Housing in retirement")).toContainText("£12,300");
  } finally {
    await api(page, "/user-profile", "PATCH", { monthlyHousingCost: 950 });
    await api(page, `/budget-entries/${row.id}`, "PATCH", { linkKind: null, amount: row.amount });
  }
});
