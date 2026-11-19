import { expect, test } from "@playwright/test";
import { AUTH_STATE } from "../../support/auth";
import { applyPersona } from "../../support/personas";
import { api, entryNamed, kpiCard, pounds } from "./budget-links.helpers";

test.use({ storageState: AUTH_STATE });

// L33 (BU-1, BU-2): an income line the person linked to their take-home reads the take-home worked
// out from the saved salary, so a salary change reaches the budget with nothing to retype.
test("L33 a linked take-home line follows the saved salary", async ({ page }) => {
  await page.goto("/app");
  await applyPersona(page, "homeowner");

  const row = await entryNamed(page, "Salary after tax");

  try {
    await api(page, `/budget-entries/${row.id}`, "PATCH", { linkKind: "take_home", amount: 0 });
    await api(page, "/user-profile", "PATCH", { annualSalary: 64000 });

    // The take-home page's hero is the estimate from the saved salary.
    await page.goto("/app/take-home");
    const takeHome = pounds(await page.getByTestId("hero-figure").textContent());

    // Budget page: money in is that take-home (the only income line). The take-home hero moves a
    // pound or two of rounding between its parts (monthlyPayParts), so they agree to within £2.
    await page.goto("/app/budget");
    const moneyIn = pounds(await kpiCard(page, "Money in each month").textContent());
    expect(Math.abs(moneyIn - takeHome)).toBeLessThanOrEqual(2);
    // And it is no longer the typed £3,450.
    expect(moneyIn).not.toBe(3450);
  } finally {
    await api(page, "/user-profile", "PATCH", { annualSalary: 58000 });
    await api(page, `/budget-entries/${row.id}`, "PATCH", { linkKind: null, amount: row.amount });
  }
});
