import { expect, test } from "@playwright/test";
import { AUTH_STATE } from "../../support/auth";
import { linkSpecHeaders } from "../../support/client-address";
import { applyPersona } from "../../support/personas";
import { api, entryNamed, pounds } from "./budget-links.helpers";

// Its own client address, so the per-address ceiling counts this file alone (client-address.ts).
test.use({ storageState: AUTH_STATE, extraHTTPHeaders: linkSpecHeaders(import.meta.filename) });

// L14 (HM-2, BU-4): once the person links their rent line to the saved rent, a rent change in
// their details changes the budget's housing row and left over on Budget and the Dashboard.
// Retirement reads the same figure (engine test in retirement-input.test.ts); this persona has no
// saved retirement plan, so its page shows no housing figure to check here.
test("L14 a rent change reaches the linked housing line, Budget and Dashboard", async ({
  page,
}) => {
  await page.goto("/app");
  // The first renter spec: the homeowner specs ran before it, so this is the project's one persona
  // switch (one reset against the backend's 10-an-hour destructive limit). Every renter spec is
  // named "renter-" so they all run after the homeowner ones, in name order, with no switch back.
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
  } finally {
    await api(page, "/user-profile", "PATCH", { monthlyHousingCost: 950 });
    await api(page, `/budget-entries/${row.id}`, "PATCH", { linkKind: null, amount: row.amount });
  }
});
