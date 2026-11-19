import { expect, test } from "@playwright/test";
import { AUTH_STATE } from "../../support/auth";
import { applyPersona } from "../../support/personas";
import { api, entryNamed, pounds } from "./budget-links.helpers";

test.use({ storageState: AUTH_STATE });

// L14 (HM-2, BU-4), the budget half: once the person links their rent line to the saved rent, a
// rent change in their details changes the budget's housing row and left over on Budget and the
// Dashboard. The retirement housing cost waits for the housing follow-up to audit slice 5.
test("L14 a rent change reaches the linked housing line, Budget and Dashboard", async ({
  page,
}) => {
  await page.goto("/app");
  await applyPersona(page, "debtpayer");

  const row = await entryNamed(page, "Rent");

  try {
    await api(page, `/budget-entries/${row.id}`, "PATCH", { linkKind: "housing", amount: 0 });
    await page.goto("/app/budget");
    const before = pounds(
      await page.locator('[data-figure="budget.surplus"]').first().textContent(),
    );

    // Rent saved in the housing details: £850 to £925.
    await api(page, "/user-profile", "PATCH", { monthlyHousingCost: 925 });

    await page.reload();
    await expect(page.getByTestId("budget-category-housing")).toContainText("£925");
    // Left over falls by 925 - 850 = £75.
    const after = pounds(
      await page.locator('[data-figure="budget.surplus"]').first().textContent(),
    );
    expect(after).toBe(before - 75);

    await page.goto("/app");
    const dashboard = pounds(
      await page.locator('[data-figure="budget.surplus"]').first().textContent(),
    );
    expect(dashboard).toBe(after);
  } finally {
    await api(page, "/user-profile", "PATCH", { monthlyHousingCost: 850 });
    await api(page, `/budget-entries/${row.id}`, "PATCH", { linkKind: null, amount: row.amount });
  }
});
